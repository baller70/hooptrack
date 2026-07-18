import SwiftUI

struct PlayersView: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(appState.snapshot.players) { player in
                        NavigationLink {
                            PlayerDetailView(player: player)
                                .onAppear {
                                    appState.selectedPlayerId = player.id
                                }
                        } label: {
                            PlayerRosterRow(player: player)
                        }
                        .accessibilityIdentifier("roster-player-\(player.id)")
                    }
                } header: {
                    Text("Dedicated Roster")
                }
            }
            .navigationTitle("Players")
            .toolbar {
                Button {
                    Task { await appState.refresh() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .accessibilityLabel(Text("Refresh roster"))
            }
        }
        .accessibilityIdentifier("coach-roster-screen")
    }
}

private struct PlayerRosterRow: View {
    let player: Player

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "person.crop.circle.fill")
                .font(.title2)
                .foregroundStyle(HT.orange)
            VStack(alignment: .leading, spacing: 4) {
                Text(player.name)
                    .font(.subheadline.weight(.semibold))
                Text(player.email)
                    .font(.caption)
                    .foregroundStyle(HT.slate)
                HStack {
                    RowBadge(text: "\(player.totalRecordings ?? 0) clips", color: HT.orange)
                    RowBadge(text: "\(player.upcomingCount ?? 0) due", color: HT.green)
                }
            }
        }
    }
}
