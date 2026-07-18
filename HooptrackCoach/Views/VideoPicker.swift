import SwiftUI

struct MessagesView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var draft = "Great work. I added one follow-up assignment."

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("assign.player", selection: $appState.selectedPlayerId) {
                    ForEach(appState.snapshot.players) { player in
                        Text(player.name).tag(Optional(player.id))
                    }
                }
                .pickerStyle(.menu)
                .padding()

                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(appState.snapshot.messages) { message in
                            HStack {
                                if message.senderId == appState.selectedPlayerId { Spacer(minLength: 36) }
                                Text(message.body)
                                    .font(.body)
                                    .foregroundStyle(message.senderId == appState.selectedPlayerId ? .white : HT.ink)
                                    .padding(12)
                                    .background(message.senderId == appState.selectedPlayerId ? HT.orange : .white)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                if message.senderId != appState.selectedPlayerId { Spacer(minLength: 36) }
                            }
                        }
                    }
                    .padding()
                }

                HStack(spacing: 10) {
                    TextField("message.placeholder", text: $draft, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        Task {
                            if await appState.sendMessage(draft) {
                                draft = ""
                            }
                        }
                    } label: {
                        Image(systemName: "paperplane.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityLabel(Text("message.send"))
                }
                .padding()
                .background(.white)
            }
            .background(HT.paper)
            .navigationTitle("tab.messages")
            .toolbar {
                Button {
                    appState.selectedTab = .assign
                } label: {
                    Image(systemName: "calendar.badge.plus")
                }
                .accessibilityLabel(Text("tab.assign"))
            }
        }
        .accessibilityIdentifier("05-messages-controls-screen")
    }
}
