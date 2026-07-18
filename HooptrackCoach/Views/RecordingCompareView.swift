import SwiftUI

struct RecordingCompareView: View {
    @EnvironmentObject private var appState: CoachAppState
    var player: Player?

    private var recordings: [Recording] {
        guard let player else { return appState.snapshot.recordings }
        return appState.snapshot.recordings.filter { $0.playerName == player.name }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Compare Recordings")
                                .font(.headline)
                            Text("Select two recordings for playback review, then create a shared clip from the source recording.")
                                .font(.caption)
                                .foregroundStyle(HT.slate)
                            ForEach(recordings) { recording in
                                Toggle(isOn: Binding(
                                    get: { appState.selectedRecordingIds.contains(recording.id) },
                                    set: { isOn in
                                        if isOn { appState.selectedRecordingIds.insert(recording.id) } else { appState.selectedRecordingIds.remove(recording.id) }
                                    }
                                )) {
                                    DetailLine(title: recording.drillName ?? "Recording", detail: recording.notes ?? "\(recording.durationSeconds ?? recording.duration ?? 0)s")
                                }
                                .accessibilityIdentifier("compare-recording-\(recording.id)")
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Playback And Clip Review")
                                .font(.headline)
                            HStack(spacing: 8) {
                                ForEach(recordings.filter { appState.selectedRecordingIds.contains($0.id) }.prefix(2)) { recording in
                                    VStack {
                                        Image(systemName: "play.rectangle.fill")
                                            .font(.largeTitle)
                                        Text(recording.drillName ?? "Clip")
                                            .font(.caption)
                                            .multilineTextAlignment(.center)
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 120)
                                    .background(HT.ink)
                                    .foregroundStyle(.white)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                            }
                            Button {
                                Task {
                                    if let recording = recordings.first {
                                        _ = try? await appState.client.clipRecording(id: recording.id, start: 0, end: min(recording.durationSeconds ?? recording.duration ?? 10, 10), title: "Coach review clip")
                                        await appState.refresh()
                                    }
                                }
                            } label: {
                                Label("Create Review Clip", systemImage: "scissors")
                            }
                            .buttonStyle(.bordered)
                            .accessibilityIdentifier("recording-create-clip")
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("Compare")
        }
        .accessibilityIdentifier("coach-recording-compare-screen")
    }
}
