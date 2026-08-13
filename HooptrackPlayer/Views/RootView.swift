import SwiftUI

struct RootView: View {
    @StateObject private var appState = AppState()

    var body: some View {
        Group {
            switch appState.phase {
            case .loading:
                ProgressView("loading")
                    .tint(HT.orange)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(HT.paper.ignoresSafeArea())
                    .accessibilityIdentifier("loading-screen")
            case .signedOut:
                AuthView()
            case let .signedIn(user):
                PlayerShellView()
                    .accessibilityIdentifier("player-native-shell-\(user.id)")
            case let .blockedRole(user):
                RoleBlockedView(user: user)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(HT.paper.ignoresSafeArea())
            }
        }
        .environmentObject(appState)
        .task {
            await appState.bootstrap()
        }
    }
}
