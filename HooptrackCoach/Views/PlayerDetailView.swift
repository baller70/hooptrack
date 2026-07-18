import SwiftUI

struct PlayerDetailView: View {
    @EnvironmentObject private var appState: CoachAppState
    let player: Player

    private var activity: [ActivityItem] {
        appState.snapshot.activity.filter { $0.playerId == player.id }
    }

    private var assignments: [ScheduleItem] {
        appState.snapshot.schedule.filter { $0.playerName == player.name }
    }

    private var recordings: [Recording] {
        appState.snapshot.recordings.filter { $0.playerName == player.name }
    }

    private var moves: [MoveStudy] {
        appState.snapshot.moves.filter { $0.assignedPlayerId == nil || $0.assignedPlayerId == player.id }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Panel {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(player.name)
                            .font(.title2.bold())
                        Text(player.email)
                            .foregroundStyle(HT.slate)
                        LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 10) {
                            MetricPill(title: "Recordings", value: "\(player.totalRecordings ?? 0)", color: HT.orange)
                            MetricPill(title: "Streak", value: "\(player.currentStreakDays ?? 0)", color: HT.green)
                            MetricPill(title: "Quiz", value: "\(player.lastQuizScore ?? 0)", color: HT.ink)
                            MetricPill(title: "Overdue", value: "\(player.overdueCount ?? 0)", color: HT.slate)
                        }
                    }
                }

                Panel {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Player Detail Workflows")
                            .font(.headline)
                        Button {
                            appState.selectedPlayerId = player.id
                            appState.selectedTab = .calendar
                        } label: {
                            Label("Open calendar and assign work", systemImage: "calendar.badge.plus")
                        }
                        .accessibilityIdentifier("player-detail-open-calendar")
                        NavigationLink {
                            RecordingCompareView(player: player)
                        } label: {
                            Label("Compare recordings and clip review", systemImage: "rectangle.split.2x1")
                        }
                        .accessibilityIdentifier("player-detail-open-compare")
                        Button {
                            appState.selectedPlayerId = player.id
                            appState.selectedTab = .assign
                        } label: {
                            Label("Assign from detail", systemImage: "paperplane")
                        }
                        .accessibilityIdentifier("player-detail-assign-outcome")
                    }
                }

                DetailSection(title: "Activity") {
                    ForEach(activity) { item in
                        ActivityRow(item: item)
                    }
                }

                DetailSection(title: "Player Workouts And Moves") {
                    ForEach(assignments.prefix(4)) { item in
                        DetailLine(title: item.workoutTitle ?? item.title ?? "Assignment", detail: item.notes ?? item.itemType ?? "schedule")
                    }
                    ForEach(moves.prefix(4)) { move in
                        DetailLine(title: move.title, detail: move.description ?? move.category ?? "move")
                    }
                }

                DetailSection(title: "Recordings") {
                    ForEach(recordings) { recording in
                        DetailLine(title: recording.drillName ?? "Recording", detail: recording.notes ?? "\(recording.durationSeconds ?? recording.duration ?? 0)s")
                    }
                }
            }
            .padding()
        }
        .background(HT.paper)
        .navigationTitle("Player Detail")
        .onAppear {
            appState.selectedPlayerId = player.id
        }
        .accessibilityIdentifier("player-detail-screen")
    }
}

struct DetailSection<Content: View>: View {
    let title: String
    let content: Content

    init(title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 10) {
                Text(title).font(.headline)
                content
            }
        }
    }
}

struct DetailLine: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            Text(detail)
                .font(.caption)
                .foregroundStyle(HT.slate)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}
