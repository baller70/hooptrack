import SwiftUI

struct CoachRootView: View {
    @EnvironmentObject private var appState: CoachAppState

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
                CoachShellView()
            }
        }
    }
}

struct RoleBlockedView: View {
    @EnvironmentObject private var appState: CoachAppState
    let user: User

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "person.badge.shield.checkmark")
                .font(.system(size: 48, weight: .semibold))
                .foregroundStyle(HT.orange)
            Text("role.blocked.title")
                .font(.title2.weight(.bold))
            Text("role.blocked.message")
                .font(.body)
                .foregroundStyle(HT.slate)
                .multilineTextAlignment(.center)
            Text(user.email)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(HT.ink)
            Button("auth.signOut") {
                Task { await appState.logout() }
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(HT.paper)
        .accessibilityIdentifier("role-blocked-view")
    }
}
