import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        NavigationStack {
            List {
                Section("account.session") {
                    if case let .signedIn(user) = appState.phase {
                        LabeledContent("account.name", value: user.name)
                        LabeledContent("auth.email", value: user.email)
                    }
                    Button("auth.signOut") {
                        Task { await appState.logout() }
                    }
                }
                Section("account.legal") {
                    Link("account.privacy", destination: URL(string: "https://hooptrack.194-146-12-139.sslip.io/privacy")!)
                    Link("account.support", destination: URL(string: "https://hooptrack.194-146-12-139.sslip.io/support")!)
                }
            }
            .navigationTitle("account.title")
        }
    }
}
