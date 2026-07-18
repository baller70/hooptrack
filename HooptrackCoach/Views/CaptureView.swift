import SwiftUI
import AVFoundation
import AVKit
import PhotosUI
import UIKit

struct ReviewView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var pickerSource: UIImagePickerController.SourceType?
    @State private var uploadNotes = "Coach teaching-film upload."
    @State private var isUploading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Label("Capture And Upload", systemImage: "camera.fill")
                                .font(.headline)
                            TextField("Coach notes", text: $uploadNotes, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                            HStack {
                                Button {
                                    pickerSource = .camera
                                } label: {
                                    Label("Capture", systemImage: "record.circle")
                                }
                                .buttonStyle(.borderedProminent)
                                .disabled(isUploading || appState.isScreenshotMode)
                                .accessibilityIdentifier("coach-capture-start")
                                Button {
                                    pickerSource = .photoLibrary
                                } label: {
                                    Label("Upload", systemImage: "square.and.arrow.up")
                                }
                                .buttonStyle(.bordered)
                                .disabled(isUploading || appState.isScreenshotMode)
                                .accessibilityIdentifier("coach-upload-video")
                            }
                            if isUploading {
                                ProgressView("Uploading")
                                    .accessibilityIdentifier("coach-uploading")
                            }
                        }
                    }

                    NavigationLink {
                        RecordingCompareView()
                    } label: {
                        Label("Open Compare Recordings", systemImage: "rectangle.split.2x1")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                    .accessibilityIdentifier("review-open-compare")

                    ForEach(appState.snapshot.recordings) { recording in
                        Panel {
                            VStack(alignment: .leading, spacing: 12) {
                                ZStack {
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(HT.ink)
                                        .frame(height: 150)
                                    VStack(spacing: 8) {
                                        Image(systemName: "play.circle.fill")
                                            .font(.system(size: 42))
                                            .foregroundStyle(.white)
                                        Text("review.recording")
                                            .foregroundStyle(.white)
                                            .font(.caption.weight(.semibold))
                                    }
                                }
                                Text(recording.drillName ?? String(localized: "review.untitled"))
                                    .font(.headline)
                                Text(recording.playerName ?? String(localized: "player.connected"))
                                    .font(.subheadline)
                                    .foregroundStyle(HT.slate)
                                Text(recording.notes ?? String(localized: "review.noNotes"))
                                    .font(.body)
                                HStack {
                                    RowBadge(text: "\(recording.duration ?? 0)s", color: HT.orange)
                                    RowBadge(text: String(localized: "review.ready"), color: HT.green)
                                    Spacer()
                                    Link(destination: URL(string: "https://hooptrack.194-146-12-139.sslip.io/support")!) {
                                        Image(systemName: "questionmark.circle")
                                    }
                                    .accessibilityLabel(Text("account.support"))
                                }
                            }
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("tab.review")
        }
        .sheet(item: Binding(
            get: { pickerSource.map(PickerSource.init) },
            set: { pickerSource = $0?.source }
        )) { picker in
            VideoPicker(sourceType: picker.source) { url in
                Task { await upload(url: url) }
            }
        }
        .accessibilityIdentifier("04-recording-review-screen")
    }

    private func upload(url: URL) async {
        guard let drillID = appState.snapshot.recordings.compactMap(\.drillId).first else {
            appState.banner = AppBanner(title: String(localized: "retry.title"), message: "A shared drill is required before uploading coach media.")
            return
        }
        isUploading = true
        defer { isUploading = false }
        do {
            let duration = await durationSeconds(for: url)
            let blobKey = "ios-coach-\(UUID().uuidString).mp4"
            let recordingID = try await appState.client.createRecording(drillID: drillID, blobKey: blobKey, duration: duration, notes: uploadNotes, reps: nil)
            try await appState.client.uploadRecordingVideo(recordingID: recordingID, blobKey: blobKey, fileURL: url)
            uploadNotes = ""
            await appState.refresh()
        } catch {
            appState.banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    private func durationSeconds(for url: URL) async -> Int {
        let asset = AVURLAsset(url: url)
        let duration = (try? await asset.load(.duration)) ?? .zero
        return max(0, Int(CMTimeGetSeconds(duration).rounded()))
    }
}

private struct PickerSource: Identifiable {
    let source: UIImagePickerController.SourceType
    var id: Int { source.rawValue }
}
