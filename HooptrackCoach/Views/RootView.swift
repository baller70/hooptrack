import SwiftUI
import UIKit
import UserNotifications
import WebKit

private let hoopTrackOrigin = URL(string: "https://hooptrack.194-146-12-139.sslip.io")!

struct CoachRootView: View {
    @StateObject private var session = CoachWebSession()

    var body: some View {
        ZStack {
            Color(red: 0.97, green: 0.98, blue: 0.99)
                .ignoresSafeArea()

            CoachWebView(session: session)

            if session.isLoading {
                ProgressView()
                    .tint(.orange)
                    .padding(14)
                    .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
                    .accessibilityLabel("Loading HoopTrack Coach")
            }

            if let message = session.errorMessage {
                ContentUnavailableView {
                    Label("HoopTrack is unavailable", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(message)
                } actions: {
                    Button("Try Again") {
                        session.retry()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                }
                .padding()
                .background(Color(.systemBackground))
            }
        }
        .onOpenURL { session.open($0) }
        .onReceive(NotificationCenter.default.publisher(for: .coachPushToken)) { notification in
            guard let token = notification.object as? String else { return }
            session.registerPushToken(token)
        }
        .onReceive(NotificationCenter.default.publisher(for: .hoopTrackCoachAuthenticated)) { _ in
            requestPushAuthorization()
        }
        .accessibilityIdentifier(session.screenshotIdentifier)
    }

    private func requestPushAuthorization() {
        guard !session.isFactoryScreenshot else { return }
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else {
                if settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional {
                    DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
                }
                return
            }
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
                guard granted else { return }
                DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
            }
        }
    }
}

extension Notification.Name {
    static let hoopTrackCoachAuthenticated = Notification.Name("hoopTrackCoachAuthenticated")
}

@MainActor
final class CoachWebSession: ObservableObject {
    @Published var isLoading = true
    @Published var errorMessage: String?

    private weak var webView: WKWebView?
    private var loadedInitialRequest = false
    private var attemptedFactoryLogin = false
    private var announcedAuthentication = false
    private var pendingPushToken: String?

    #if DEBUG
    private let screenshotScene = FactoryScreenshotScene.current
    #endif

    var isFactoryScreenshot: Bool {
        #if DEBUG
        screenshotScene != nil
        #else
        false
        #endif
    }

    var screenshotIdentifier: String {
        #if DEBUG
        if let screenshotScene { return "\(screenshotScene.rawValue)-screen" }
        #endif
        return "hooptrack-coach-web-app"
    }

    private var initialPath: String {
        #if DEBUG
        if let screenshotScene { return screenshotScene.routePath }
        #endif
        return "/coach"
    }

    func attach(_ webView: WKWebView) {
        self.webView = webView
        guard !loadedInitialRequest else { return }
        loadedInitialRequest = true
        load(path: initialPath)
    }

    func retry() {
        errorMessage = nil
        isLoading = true
        if let url = webView?.url {
            webView?.load(URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData, timeoutInterval: 30))
        } else {
            load(path: initialPath)
        }
    }

    func open(_ deepLink: URL) {
        let path = deepLink.path.isEmpty ? "/coach" : deepLink.path
        guard path.hasPrefix("/") else { return }
        load(path: path)
    }

    func navigationStarted() {
        isLoading = true
        errorMessage = nil
    }

    func navigationFinished(in webView: WKWebView) {
        guard let url = webView.url else { return }
        if url.path == "/login", attemptFactoryLogin(in: webView) {
            return
        }
        isLoading = false
        errorMessage = nil
        if url.host == hoopTrackOrigin.host, url.path != "/login" {
            if !announcedAuthentication {
                announcedAuthentication = true
                NotificationCenter.default.post(name: .hoopTrackCoachAuthenticated, object: nil)
            }
            flushPushToken(in: webView)
        }
    }

    func navigationFailed(_ error: Error) {
        isLoading = false
        errorMessage = "Check your connection and try again."
    }

    func registerPushToken(_ token: String) {
        pendingPushToken = token
        if let webView { flushPushToken(in: webView) }
    }

    private func load(path: String) {
        guard var url = URL(string: path, relativeTo: hoopTrackOrigin)?.absoluteURL else { return }
        var cachePolicy = URLRequest.CachePolicy.useProtocolCachePolicy
        #if DEBUG
        if screenshotScene != nil, var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            components.queryItems = (components.queryItems ?? []) + [URLQueryItem(name: "factory_reload", value: UUID().uuidString)]
            url = components.url ?? url
            cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
        }
        #endif
        webView?.load(URLRequest(url: url, cachePolicy: cachePolicy, timeoutInterval: 30))
    }

    private func attemptFactoryLogin(in webView: WKWebView) -> Bool {
        #if DEBUG
        guard screenshotScene != nil, !attemptedFactoryLogin else { return false }
        let environment = ProcessInfo.processInfo.environment
        guard let username = environment["FACTORY_REVIEW_USERNAME"],
              let password = environment["FACTORY_REVIEW_PASSWORD"] else {
            isLoading = false
            errorMessage = "Factory screenshot credentials are not configured."
            return false
        }
        attemptedFactoryLogin = true
        let credentials = javascriptJSON(["email": username, "password": password])
        let route = javascriptJSON(["path": screenshotScene?.routePath ?? "/coach", "nonce": UUID().uuidString])
        let script = """
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(\(credentials))
        }).then(function(response) {
          if (!response.ok) throw new Error('login failed');
          return fetch('/api/auth/me', { cache: 'no-store' });
        }).then(function(response) {
          if (!response.ok) throw new Error('session verification failed');
          window.location.replace(\(route).path + '?factory_reload=' + encodeURIComponent(\(route).nonce));
        }).catch(function() {
          document.title = 'Factory authentication failed';
        });
        """
        webView.evaluateJavaScript(script)
        return true
        #else
        return false
        #endif
    }

    private func flushPushToken(in webView: WKWebView) {
        guard let token = pendingPushToken, webView.url?.path != "/login" else { return }
        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif
        let payload: [String: String] = [
            "device_token": token,
            "environment": environment,
            "bundle_id": Bundle.main.bundleIdentifier ?? "com.kevinhouston.hooptrackcoach"
        ]
        let script = """
        fetch('/api/push/apns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(\(javascriptJSON(payload)))
        });
        """
        pendingPushToken = nil
        webView.evaluateJavaScript(script)
    }

    private func javascriptJSON(_ value: Any) -> String {
        guard JSONSerialization.isValidJSONObject(value),
              let data = try? JSONSerialization.data(withJSONObject: value),
              let json = String(data: data, encoding: .utf8) else {
            return "null"
        }
        return json
    }
}

private struct CoachWebView: UIViewRepresentable {
    @ObservedObject var session: CoachWebSession

    func makeCoordinator() -> Coordinator {
        Coordinator(session: session)
    }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.applicationNameForUserAgent = "HoopTrackCoach/1.0"
        configuration.userContentController.add(context.coordinator, name: "openSettings")

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.keyboardDismissMode = .interactive
        webView.scrollView.refreshControl = UIRefreshControl()
        webView.scrollView.refreshControl?.addTarget(context.coordinator, action: #selector(Coordinator.refresh), for: .valueChanged)
        webView.isOpaque = false
        webView.backgroundColor = .systemBackground
        session.attach(webView)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate, WKScriptMessageHandler {
        private let session: CoachWebSession
        private weak var webView: WKWebView?

        init(session: CoachWebSession) {
            self.session = session
        }

        @objc func refresh() {
            webView?.reload()
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "openSettings",
                  let settingsURL = URL(string: UIApplication.openSettingsURLString),
                  UIApplication.shared.canOpenURL(settingsURL) else { return }
            UIApplication.shared.open(settingsURL)
        }

        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation?) {
            self.webView = webView
            session.navigationStarted()
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation?) {
            webView.scrollView.refreshControl?.endRefreshing()
            session.navigationFinished(in: webView)
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation?, withError error: Error) {
            webView.scrollView.refreshControl?.endRefreshing()
            session.navigationFailed(error)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation?, withError error: Error) {
            webView.scrollView.refreshControl?.endRefreshing()
            session.navigationFailed(error)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let url = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if url.host == hoopTrackOrigin.host || url.scheme == "about" {
                decisionHandler(.allow)
            } else {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
            }
        }

        func webView(
            _ webView: WKWebView,
            requestMediaCapturePermissionFor origin: WKSecurityOrigin,
            initiatedByFrame frame: WKFrameInfo,
            type: WKMediaCaptureType,
            decisionHandler: @escaping (WKPermissionDecision) -> Void
        ) {
            decisionHandler(origin.host == hoopTrackOrigin.host ? .grant : .deny)
        }
    }
}
