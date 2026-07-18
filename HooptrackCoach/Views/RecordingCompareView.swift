import SwiftUI
import AVKit

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
                                    VStack(spacing: 8) {
                                        RecordingVideoView(recording: recording, autoplay: false)
                                            .frame(minHeight: 150)
                                        Text(recording.drillName ?? "Clip")
                                            .font(.caption)
                                            .multilineTextAlignment(.center)
                                    }
                                    .frame(maxWidth: .infinity)
                                    .background(.black)
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

struct RecordingVideoView: View {
    @EnvironmentObject private var appState: CoachAppState
    let recording: Recording
    let autoplay: Bool
    @State private var player: AVPlayer?

    var body: some View {
        Group {
            if appState.isScreenshotMode {
                ZStack {
                    Color.black
                    Image(systemName: "play.rectangle.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.white)
                }
            } else if let player {
                VideoPlayer(player: player)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(.black)
                    .tint(.white)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .task(id: recording.id) {
            guard !appState.isScreenshotMode else { return }
            let cookies = HTTPCookieStorage.shared.cookies(for: appState.client.recordingVideoURL(id: recording.id)) ?? []
            let asset = AVURLAsset(
                url: appState.client.recordingVideoURL(id: recording.id),
                options: [AVURLAssetHTTPCookiesKey: cookies]
            )
            let nextPlayer = AVPlayer(playerItem: AVPlayerItem(asset: asset))
            player = nextPlayer
            if autoplay { nextPlayer.play() }
        }
        .onDisappear { player?.pause() }
        .accessibilityLabel("Playback for \(recording.drillName ?? "recording")")
    }
}
