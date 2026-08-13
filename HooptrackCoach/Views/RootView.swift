import SwiftUI

struct CoachRootView: View {
    @StateObject private var appState = CoachAppState()

    var body: some View {
        Group {
            switch appState.phase {
            case .loading:
                ProgressView("loading")
                    .tint(HT.orange)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(HT.paper.ignoresSafeArea())
                    .accessibilityIdentifier("coach-loading-screen")
            case .signedOut:
                AuthView()
            case let .signedIn(user):
                CoachShellView()
                    .accessibilityIdentifier("coach-native-shell-\(user.id)")
            case .blockedRole:
                CoachRoleBlockedView()
            }
        }
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
            appState.nativePushStatus = "Registration failed"
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(HT.paper.ignoresSafeArea())
        .accessibilityIdentifier("coach-role-blocked")
    }
}
