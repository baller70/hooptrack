import SwiftUI

struct RootView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        Group {
            switch appState.phase {
            case .loading:
                ProgressView(String(localized: "loading"))
                    .accessibilityIdentifier("loading-view")
            case .signedOut:
                AuthView()
            case let .blockedRole(user):
                RoleBlockedView(user: user)
            case .signedIn:
                PlayerShellView()
            }
        }
    }
}

