import SwiftUI

struct TodayView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let banner = appState.banner {
                        Panel {
                            Label(banner.title, systemImage: "wifi.slash")
                                .font(.headline)
                            Text(banner.message)
                                .foregroundStyle(HT.slate)
                            Button("retry.refresh") {
                                Task { await appState.refreshDashboard() }
                            }
                        }
                    }

                    HStack(spacing: 10) {
                        MetricPill(title: "metric.streak", value: "\(appState.dashboard.progress?.streak ?? 0)", color: HT.orange)
                        MetricPill(title: "metric.effort", value: "\(appState.dashboard.progress?.effort ?? 0)%", color: HT.teal)
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("today.assigned")
                                .font(.headline)
                            ForEach(appState.dashboard.schedule.prefix(3)) { item in
                                HStack {
                                    Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(item.completed ? HT.teal : HT.slate)
                                    VStack(alignment: .leading) {
                                        Text(item.workoutTitle ?? item.title ?? String(localized: "today.trainingItem"))
                                            .font(.subheadline.weight(.semibold))
                                        Text(item.notes ?? String(localized: "today.noNotes"))
                                            .font(.caption)
                                            .foregroundStyle(HT.slate)
                                    }
                                    Spacer()
                                }
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("today.nextMove")
                                .font(.headline)
                            if let move = appState.dashboard.moves.first {
                                Text(move.title)
                                    .font(.title3.weight(.semibold))
                                Text(move.coachingPoints ?? move.description ?? "")
                                    .foregroundStyle(HT.slate)
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("today.recent")
                                .font(.headline)
                            ForEach(appState.dashboard.recordings.prefix(2)) { recording in
                                Label(recording.drillName ?? String(localized: "capture.training"), systemImage: "play.rectangle")
                                    .accessibilityIdentifier("recent-recording-\(recording.id)")
                            }
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper.ignoresSafeArea())
            .navigationTitle("today.title")
            .toolbar {
                Button {
                    Task { await appState.refreshDashboard() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .accessibilityLabel(Text("retry.refresh"))
            }
        }
        .accessibilityIdentifier("overview-screen")
    }
}

