import SwiftUI

struct TeamView: View {
    @EnvironmentObject private var appState: AppState
    @State private var message = ""

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    requestsPanel
                    membershipsPanel
                    CoachChatPanel(message: $message)
                }
                .padding()
            }
            .background(HT.paper.ignoresSafeArea())
            .navigationTitle("tab.team")
        }
        .accessibilityIdentifier("team-messages-screen")
    }

    private var requestsPanel: some View {
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
    }

    private var membershipsPanel: some View {
        Panel {
            VStack(alignment: .leading, spacing: 12) {
                Text("team.memberships")
                    .font(.headline)
                ForEach(appState.dashboard.memberships) { membership in
                    Label(membership.groupName ?? String(localized: "team.group"), systemImage: "person.3")
                }
            }
        }
    }
}

private struct CoachChatPanel: View {
    @EnvironmentObject private var appState: AppState
    @Binding var message: String

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 12) {
                Text("team.safeChat")
                    .font(.headline)
                Text("team.safeChatBody")
                    .foregroundStyle(HT.slate)
                coachPicker
                ForEach(appState.coachMessages.suffix(6)) { coachMessage in
                    CoachMessageBubble(message: coachMessage, isCurrentUser: coachMessage.senderId == appState.currentUserId)
                }
                TextField(String(localized: "team.messagePlaceholder"), text: $message, axis: .vertical)
                    .lineLimit(3, reservesSpace: true)
                    .textFieldStyle(.roundedBorder)
                    .disabled(appState.selectedCoachId == nil)
                Button {
                    Task {
                        if await appState.sendCoachMessage(message) {
                            message = ""
                        }
                    }
                } label: {
                    Label("team.send", systemImage: "paperplane.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .tint(HT.orange)
                .disabled(message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || appState.selectedCoachId == nil)
            }
        }
    }

    private var coachPicker: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(appState.coachContacts) { coach in
                    Button(coach.name) {
                        Task { await appState.selectCoach(coach) }
                    }
                    .buttonStyle(.bordered)
                    .tint(appState.selectedCoachId == coach.id ? HT.teal : HT.slate)
                }
            }
        }
    }
}

private struct CoachMessageBubble: View {
    let message: DirectMessage
    let isCurrentUser: Bool

    var body: some View {
        HStack {
            if isCurrentUser { Spacer(minLength: 44) }
            Text(message.body)
                .font(.subheadline)
                .padding(10)
                .background(isCurrentUser ? HT.orange.opacity(0.12) : HT.line.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 8))
            if !isCurrentUser { Spacer(minLength: 44) }
        }
    }
}
