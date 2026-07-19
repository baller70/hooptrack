import SwiftUI
import UIKit
import UserNotifications

extension Notification.Name {
    static let coachPushToken = Notification.Name("coachPushToken")
    static let coachPushRegistrationFailed = Notification.Name("coachPushRegistrationFailed")
}

final class CoachAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(name: .coachPushToken, object: token)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .coachPushRegistrationFailed, object: error)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .badge, .sound]
    }
}

@main
struct HooptrackCoachApp: App {
    @UIApplicationDelegateAdaptor(CoachAppDelegate.self) private var appDelegate
    @StateObject private var appState = CoachAppState()

    var body: some Scene {
        WindowGroup {
            CoachNativeRootView()
                .environmentObject(appState)
                .task {
                    await appState.bootstrap()
                }
                .onOpenURL { url in
                    appState.handleDeepLink(url)
                }
                .onReceive(NotificationCenter.default.publisher(for: .coachPushToken)) { notification in
                    guard let token = notification.object as? String else { return }
                    Task { await appState.registerAPNSToken(token) }
                }
                .onReceive(NotificationCenter.default.publisher(for: .coachPushRegistrationFailed)) { _ in
                    appState.nativePushStatus = String(localized: "push.registrationFailed")
                }
        }
    }
}

private struct CoachNativeRootView: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        Group {
            switch appState.phase {
            case .loading:
                ProgressView("loading")
                    .tint(HT.orange)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(HT.paper)
            case .signedOut:
                AuthView()
            case .signedIn:
                CoachShellView()
            case .blockedRole:
                CoachRoleBlockedView()
            }
        }
    }
}

private struct CoachRoleBlockedView: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        ContentUnavailableView {
            Label("role.blocked.title", systemImage: "lock.shield")
        } description: {
            Text("role.blocked.message")
        } actions: {
            Button("auth.signOut") {
                Task { await appState.logout() }
            }
            .buttonStyle(.borderedProminent)
            .tint(HT.orange)
        }
        .background(HT.paper)
        .accessibilityIdentifier("coach-role-blocked")
    }
}
