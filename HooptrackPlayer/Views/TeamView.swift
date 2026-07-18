import SwiftUI

struct TeamView: View {
    @EnvironmentObject private var appState: AppState
    @State private var message = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("team.requests")
                                .font(.headline)
                            ForEach(appState.dashboard.invites) { invite in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(invite.groupName ?? String(localized: "team.request"))
                                        .font(.subheadline.weight(.semibold))
                                    Text(invite.coachName ?? "")
                                        .foregroundStyle(HT.slate)
                                    HStack {
                                        Button("team.accept") {
                                            Task { await appState.respondToInvite(invite, action: .accept) }
                                        }
                                        .buttonStyle(.borderedProminent)
                                        .tint(HT.teal)
                                        Button("team.decline") {
                                            Task { await appState.respondToInvite(invite, action: .decline) }
                                        }
                                        .buttonStyle(.bordered)
                                    }
                                }
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("team.memberships")
                                .font(.headline)
                            ForEach(appState.dashboard.memberships) { membership in
                                Label(membership.groupName ?? String(localized: "team.group"), systemImage: "person.3")
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("team.safeChat")
                                .font(.headline)
                            Text("team.safeChatBody")
                                .foregroundStyle(HT.slate)
                            TextField(String(localized: "team.messagePlaceholder"), text: $message, axis: .vertical)
                                .lineLimit(3, reservesSpace: true)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                message = ""
                            } label: {
                                Label("team.send", systemImage: "paperplane.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(HT.orange)
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper.ignoresSafeArea())
            .navigationTitle("tab.team")
        }
        .accessibilityIdentifier("team-messages-screen")
    }
}

