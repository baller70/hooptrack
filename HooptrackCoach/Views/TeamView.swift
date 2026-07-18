import SwiftUI

struct TeamView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var groupName = "New Skill Group"
    @State private var inviteEmail = "player@example.com"
    @State private var inviteMessage = "Join this HoopTrack group so I can assign your next workout."

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("teams.create")
                                .font(.headline)
                            TextField("teams.name", text: $groupName)
                                .textFieldStyle(.roundedBorder)
                            Picker("teams.type", selection: .constant("team")) {
                                Text("teams.type.team").tag("team")
                                Text("teams.type.session").tag("training_session")
                            }
                            .pickerStyle(.segmented)
                            Button {
                                Task { await appState.createGroup(name: groupName, type: "team", limit: nil, description: nil) }
                            } label: {
                                Label("teams.createButton", systemImage: "plus.circle")
                            }
                            .buttonStyle(.borderedProminent)
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("teams.invite")
                                .font(.headline)
                            Picker("teams.group", selection: $appState.selectedGroupId) {
                                ForEach(appState.snapshot.groups) { group in
                                    Text(group.name).tag(Optional(group.id))
                                }
                            }
                            TextField("auth.email", text: $inviteEmail)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .textFieldStyle(.roundedBorder)
                            TextField("message.placeholder", text: $inviteMessage, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                Task { await appState.invite(email: inviteEmail, message: inviteMessage) }
                            } label: {
                                Label("teams.inviteButton", systemImage: "paperplane")
                            }
                            .buttonStyle(.bordered)
                        }
                    }

                    SectionHeader("teams.roster")
                    ForEach(appState.snapshot.members) { member in
                        Panel {
                            HStack {
                                Image(systemName: "person.crop.circle.fill")
                                    .font(.title2)
                                    .foregroundStyle(HT.orange)
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(member.playerName ?? String(localized: "player.connected"))
                                        .font(.subheadline.weight(.semibold))
                                    Text(member.playerEmail ?? "")
                                        .font(.caption)
                                        .foregroundStyle(HT.slate)
                                }
                                Spacer()
                                RowBadge(text: String(localized: "status.accepted"), color: HT.green)
                            }
                        }
                    }

                    SectionHeader("teams.inviteStatus")
                    ForEach(appState.snapshot.invites) { invite in
                        Panel {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(invite.email ?? invite.playerName ?? String(localized: "player.invited"))
                                        .font(.subheadline.weight(.semibold))
                                    Text(appState.snapshot.groups.first(where: { $0.id == invite.groupId })?.name ?? String(localized: "teams.group"))
                                        .font(.caption)
                                        .foregroundStyle(HT.slate)
                                }
                                Spacer()
                                RowBadge(text: invite.status ?? String(localized: "status.pending"), color: HT.orange)
                            }
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("tab.teams")
        }
        .accessibilityIdentifier("02-create-group-invite-screen")
    }
}

struct SectionHeader: View {
    let title: LocalizedStringKey

    init(_ title: LocalizedStringKey) {
        self.title = title
    }

    var body: some View {
        Text(title)
            .font(.headline)
            .foregroundStyle(HT.ink)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
