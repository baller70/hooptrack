import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var password = ""
    @State private var showingDelete = false
    @State private var deleteError: String?

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
                    Link("account.privacy", destination: HoopTrackEnvironment.publicURL("privacy"))
                    Link("account.support", destination: HoopTrackEnvironment.publicURL("support"))
                }
                Section("account.delete") {
                    Text("account.deleteExplanation")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    SecureField("auth.password", text: $password)
                    Button("account.deleteButton", role: .destructive) {
                        showingDelete = true
                    }
                    .disabled(password.isEmpty)
                }
            }
            .navigationTitle("account.title")
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
    }
}
