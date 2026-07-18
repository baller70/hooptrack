import SwiftUI

struct ProgressViewScreen: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 2), spacing: 10) {
                        MetricPill(title: "progress.completed", value: "\(appState.snapshot.completedAssignments)", color: HT.green)
                        MetricPill(title: "progress.recordings", value: "\(appState.snapshot.progress?.totalRecordings ?? appState.snapshot.recordings.count)", color: HT.orange)
                        MetricPill(title: "progress.streak", value: "\(appState.snapshot.progress?.streakDays ?? 0)", color: HT.ink)
                        MetricPill(title: "progress.gpa", value: String(format: "%.1f", appState.snapshot.progress?.gpa ?? 0), color: HT.slate)
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("progress.summary")
                                .font(.headline)
                            Text(appState.snapshot.progress?.analysis ?? String(localized: "progress.empty"))
                                .foregroundStyle(HT.slate)
                            HStack {
                                RowBadge(text: appState.snapshot.progress?.strongest ?? String(localized: "progress.strongest"), color: HT.green)
                                RowBadge(text: appState.snapshot.progress?.overallLetter ?? "A-", color: HT.orange)
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("progress.timeline")
                                .font(.headline)
                            ForEach(appState.snapshot.activity) { item in
                                ActivityRow(item: item)
                            }
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("tab.progress")
        }
        .accessibilityIdentifier("06-completed-outcome-screen")
    }
}
