import SwiftUI

struct DashboardView: View {
    @EnvironmentObject private var appState: CoachAppState

    private var snapshot: CoachSnapshot { appState.snapshot }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 2), spacing: 10) {
                        MetricPill(title: "metric.roster", value: "\(snapshot.acceptedRosterCount)", color: HT.orange)
                        MetricPill(title: "metric.openWork", value: "\(snapshot.openAssignments)", color: HT.ink)
                        MetricPill(title: "metric.pendingInvites", value: "\(snapshot.pendingInviteCount)", color: HT.slate)
                        MetricPill(title: "metric.reviewQueue", value: "\(snapshot.reviewQueueCount)", color: HT.green)
                    }
                    .accessibilityIdentifier("dashboard-metrics")

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("dashboard.today")
                                .font(.headline)
                            ForEach(snapshot.schedule.prefix(4)) { item in
                                HStack(alignment: .top) {
                                    Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(item.completed ? HT.green : HT.orange)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(item.workoutTitle ?? item.title ?? String(localized: "assignment.workout"))
                                            .font(.subheadline.weight(.semibold))
                                        Text(item.playerName ?? String(localized: "player.connected"))
                                            .font(.caption)
                                            .foregroundStyle(HT.slate)
                                    }
                                    Spacer()
                                }
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("dashboard.activity")
                                .font(.headline)
                            ForEach(snapshot.activity.prefix(5)) { item in
                                ActivityRow(item: item)
                            }
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("HoopTrack Coach")
            .toolbar {
                Button {
                    Task { await appState.refresh() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .accessibilityLabel(Text("retry.title"))
            }
        }
        .accessibilityIdentifier("01-coach-dashboard-screen")
    }
}

struct ActivityRow: View {
    let item: ActivityItem

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .frame(width: 28, height: 28)
                .background(HT.orange.opacity(0.12))
                .clipShape(Circle())
                .foregroundStyle(HT.orange)
            VStack(alignment: .leading, spacing: 3) {
                Text(item.title)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(HT.ink)
                Text(item.subtitle ?? item.playerName ?? "")
                    .font(.caption)
                    .foregroundStyle(HT.slate)
            }
            Spacer()
        }
    }

    private var icon: String {
        switch item.kind {
        case "recording": return "play.rectangle"
        case "quiz": return "checklist"
        case "schedule": return "calendar"
        default: return "bolt"
        }
    }
}
