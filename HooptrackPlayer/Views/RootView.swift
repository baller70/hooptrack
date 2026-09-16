import SwiftUI

struct RootView: View {
    @StateObject private var appState = AppState()

    var body: some View {
        Group {
            switch appState.phase {
            case .loading:
                ProgressView()
                    .tint(HT.orange)
                    .accessibilityLabel("Loading HoopTrack Player")
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
