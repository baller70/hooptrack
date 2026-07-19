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
            case .signedIn:
                PlayerShellView()
            case let .blockedRole(user):
                RoleBlockedView(user: user)
            }
        }
        .environmentObject(appState)
        .task {
            await appState.bootstrap()
        }
    }
}
