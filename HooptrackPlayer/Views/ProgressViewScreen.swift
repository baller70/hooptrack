import SwiftUI

struct ProgressViewScreen: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    HStack(spacing: 10) {
                        MetricPill(title: "metric.consistency", value: "\(appState.dashboard.progress?.consistency ?? 0)%", color: HT.teal)
                        MetricPill(title: "metric.iq", value: "\(appState.dashboard.progress?.iq ?? 0)%", color: HT.orange)
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("progress.history")
                                .font(.headline)
                            ForEach(appState.dashboard.recordings) { recording in
                                HStack {
                                    VStack(alignment: .leading) {
                                        Text(recording.drillName ?? String(localized: "capture.training"))
                                            .font(.subheadline.weight(.semibold))
                                        Text(recording.workoutTitle ?? "")
                                            .font(.caption)
                                            .foregroundStyle(HT.slate)
                                    }
                                    Spacer()
                                    Text("\(recording.duration ?? 0)s")
                                        .foregroundStyle(HT.slate)
                                }
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("progress.next")
                                .font(.headline)
                            ForEach(appState.dashboard.progress?.recommendations ?? [], id: \.self) { item in
                                Label(item, systemImage: "arrow.up.forward.circle")
                            }
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper.ignoresSafeArea())
            .navigationTitle("tab.progress")
        }
        .accessibilityIdentifier("progress-history-screen")
    }
}

