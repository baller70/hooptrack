import SwiftUI

struct AuthView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var email = ""
    @State private var password = ""
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 22) {
                Spacer()
                VStack(alignment: .leading, spacing: 8) {
                    Text("HoopTrack Coach")
                        .font(.largeTitle.weight(.bold))
                        .foregroundStyle(HT.ink)
                    Text("auth.subtitle")
                        .font(.body)
                        .foregroundStyle(HT.slate)
                }

                VStack(spacing: 12) {
                    TextField("auth.email", text: $email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .padding(14)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    SecureField("auth.password", text: $password)
                        .textContentType(.password)
                        .padding(14)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                Button {
                    Task {
                        isSubmitting = true
                        await appState.signIn(email: email, password: password)
                        isSubmitting = false
                    }
                } label: {
                    Label(isSubmitting ? String(localized: "auth.signingIn") : String(localized: "auth.signIn"), systemImage: "person.crop.circle.badge.checkmark")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(isSubmitting || email.isEmpty || password.isEmpty)

                Text("auth.existingAccount")
                    .font(.footnote)
                    .foregroundStyle(HT.slate)
                Spacer()
            }
            .padding(24)
            .background(HT.paper)
            .navigationTitle("auth.title")
            .alert(item: $appState.banner) { banner in
                Alert(title: Text(banner.title), message: Text(banner.message), dismissButton: .default(Text("ok")))
            }
        }
        .accessibilityIdentifier("auth-view")
    }
}
