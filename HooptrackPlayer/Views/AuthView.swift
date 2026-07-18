import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var appState: AppState
    @State private var mode: AuthMode = .signIn
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("app.name")
                            .font(.largeTitle.weight(.bold))
                            .foregroundStyle(HT.ink)
                        Text("auth.subtitle")
                            .font(.headline)
                            .foregroundStyle(HT.slate)
                    }
                    .padding(.top, 30)

                    Picker("auth.mode", selection: $mode) {
                        Text("auth.signIn").tag(AuthMode.signIn)
                        Text("auth.register").tag(AuthMode.register)
                    }
                    .pickerStyle(.segmented)

                    Panel {
                        VStack(spacing: 14) {
                            if mode == .register {
                                TextField(String(localized: "auth.name"), text: $name)
                                    .textContentType(.name)
                                    .submitLabel(.next)
                            }
                            TextField(String(localized: "auth.email"), text: $email)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .submitLabel(.next)
                            SecureField(String(localized: "auth.password"), text: $password)
                                .textContentType(mode == .register ? .newPassword : .password)
                                .submitLabel(.done)
                            Button {
                                Task { await submit() }
                            } label: {
                                Label(mode == .signIn ? String(localized: "auth.signIn") : String(localized: "auth.createAccount"), systemImage: "person.crop.circle.badge.checkmark")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(HT.orange)
                            .disabled(isSubmitting || email.isEmpty || password.count < 6 || (mode == .register && name.isEmpty))
                            .accessibilityIdentifier("auth-submit")
                        }
                        .textFieldStyle(.roundedBorder)
                    }

                    Link(destination: URL(string: "https://hooptrack.194-146-12-139.sslip.io/privacy")!) {
                        Label("privacy.policy", systemImage: "hand.raised")
                    }
                    Link(destination: URL(string: "https://hooptrack.194-146-12-139.sslip.io/support")!) {
                        Label("support", systemImage: "questionmark.circle")
                    }
                }
                .padding()
            }
            .background(HT.paper.ignoresSafeArea())
            .alert(item: $appState.banner) { banner in
                Alert(title: Text(banner.title), message: Text(banner.message), dismissButton: .default(Text("ok")))
            }
        }
    }

    private func submit() async {
        isSubmitting = true
        defer { isSubmitting = false }
        if mode == .signIn {
            await appState.signIn(email: email, password: password)
        } else {
            await appState.register(name: name, email: email, password: password)
        }
    }
}

private enum AuthMode {
    case signIn
    case register
}

struct RoleBlockedView: View {
    @EnvironmentObject private var appState: AppState
    let user: User

    var body: some View {
        VStack(spacing: 18) {
            Image(systemName: "lock.shield")
                .font(.system(size: 44))
                .foregroundStyle(HT.orange)
            Text("roleBlocked.title")
                .font(.title2.weight(.semibold))
            Text("roleBlocked.message")
                .multilineTextAlignment(.center)
                .foregroundStyle(HT.slate)
            Button("auth.signOut") {
                Task { await appState.logout() }
            }
            .buttonStyle(.borderedProminent)
            .tint(HT.ink)
        }
        .padding()
    }
}

