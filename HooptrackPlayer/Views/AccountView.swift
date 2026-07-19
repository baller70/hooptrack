import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var appState: AppState
    @State private var password = ""
    @State private var showingDelete = false
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("account.session") {
                    if case let .signedIn(user) = appState.phase {
                        LabeledContent("auth.name", value: user.name)
                        LabeledContent("auth.email", value: user.email)
                    }
                    Button("auth.signOut") {
                        Task { await appState.logout() }
                    }
                }
                Section("account.legal") {
                    Link("privacy.policy", destination: URL(string: "https://hooptrack.194-146-12-139.sslip.io/privacy")!)
                    Link("support", destination: URL(string: "https://hooptrack.194-146-12-139.sslip.io/support")!)
                }
                Section("account.delete") {
                    SecureField("auth.password", text: $password)
                    Button("account.deleteButton", role: .destructive) {
                        showingDelete = true
                    }
                    .disabled(password.isEmpty)
                }
            }
            .navigationTitle("tab.account")
            .confirmationDialog("account.deleteConfirm", isPresented: $showingDelete, titleVisibility: .visible) {
                Button("account.deleteButton", role: .destructive) {
                    Task {
                        do {
                            try await appState.deleteAccount(password: password)
                        } catch {
                            deleteError = error.localizedDescription
                        }
                    }
                }
            }
            .alert("retry.title", isPresented: Binding(get: { deleteError != nil }, set: { _ in deleteError = nil })) {
                Button("ok", role: .cancel) {}
            } message: {
                Text(deleteError ?? "")
            }
        }
        .accessibilityIdentifier("completed-outcome-screen")
    }
}
