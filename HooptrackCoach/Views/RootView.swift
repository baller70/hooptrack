import SwiftUI

struct CoachRootView: View {
    @StateObject private var appState = CoachAppState()

    var body: some View {
        Group {
            switch appState.phase {
            case .loading:
                CoachLoadingView()
            case .signedOut:
                AuthView()
            case .signedIn:
                CoachShellView()
            case .blockedRole(let user):
                ContentUnavailableView {
                    Label("Coach access only", systemImage: "person.crop.circle.badge.exclamationmark")
                } description: {
                    Text("\(user.email) is not assigned to a coach or trainer role.")
                } actions: {
                    Button("Sign Out") {
                        Task { await appState.logout() }
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    .frame(minWidth: 44, minHeight: 44)
                }
                .padding()
            }
        }
        .environmentObject(appState)
        .background(HT.paper.ignoresSafeArea())
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
        .onReceive(NotificationCenter.default.publisher(for: .coachPushRegistrationFailed)) { notification in
            guard let error = notification.object as? Error else { return }
            appState.nativePushStatus = "Registration failed"
            appState.report(error)
        }
    }
}

private struct CoachLoadingView: View {
    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .tint(HT.orange)
            Text("HoopTrack Coach")
                .font(.title2.weight(.bold))
                .foregroundStyle(HT.ink)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(HT.paper)
        .accessibilityIdentifier("coach-loading-view")
        .accessibilityLabel("Loading HoopTrack Coach")
    }
}
