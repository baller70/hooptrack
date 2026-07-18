import SwiftUI
import PhotosUI
import UIKit

struct CaptureView: View {
    @EnvironmentObject private var appState: AppState
    @State private var notes = ""
    @State private var reps = ""
    @State private var pickerSource: UIImagePickerController.SourceType?
    @State private var isUploading = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Label("capture.title", systemImage: "camera.fill")
                                .font(.headline)
                            Text("capture.body")
                                .foregroundStyle(HT.slate)
                            TextField(String(localized: "capture.reps"), text: $reps)
                                .keyboardType(.numberPad)
                                .textFieldStyle(.roundedBorder)
                            TextField(String(localized: "capture.notes"), text: $notes, axis: .vertical)
                                .lineLimit(3, reservesSpace: true)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                pickerSource = .camera
                            } label: {
                                Label("capture.start", systemImage: "record.circle")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(HT.orange)
                            .disabled(isUploading || appState.isScreenshotMode)
                            .accessibilityIdentifier("capture-start")
                            Button {
                                pickerSource = .photoLibrary
                            } label: {
                                Label("capture.chooseVideo", systemImage: "photo.on.rectangle")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.bordered)
                            .disabled(isUploading || appState.isScreenshotMode)
                            if isUploading {
                                ProgressView("capture.uploading")
                                    .accessibilityIdentifier("capture-uploading")
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("capture.review")
                                .font(.headline)
                            ForEach(appState.dashboard.recordings) { recording in
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(recording.drillName ?? String(localized: "capture.training"))
                                        .font(.subheadline.weight(.semibold))
                                    Text(recording.notes ?? String(localized: "today.noNotes"))
                                        .font(.caption)
                                        .foregroundStyle(HT.slate)
                                }
                                Divider()
                            }
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper.ignoresSafeArea())
            .navigationTitle("tab.capture")
        }
        .sheet(item: Binding(
            get: { pickerSource.map(PickerSource.init) },
            set: { pickerSource = $0?.source }
        )) { picker in
            VideoPicker(sourceType: picker.source) { url in
                Task { await upload(url: url) }
            }
        }
        .accessibilityIdentifier("capture-screen")
    }

    private func upload(url: URL) async {
        isUploading = true
        defer { isUploading = false }
        do {
            let mp4 = try await VideoExport.mp4(from: url)
            let drill = try await appState.client.freePlayDrill()
            let duration = await VideoExport.durationSeconds(for: mp4)
            let blobKey = "ios-\(UUID().uuidString).mp4"
            let recordingID = try await appState.client.createRecording(
                drillID: drill.id,
                blobKey: blobKey,
                duration: duration,
                notes: notes,
                reps: Int(reps)
            )
            try await appState.client.uploadRecordingVideo(recordingID: recordingID, blobKey: blobKey, fileURL: mp4)
            notes = ""
            reps = ""
            await appState.refreshDashboard()
        } catch {
            appState.banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }
}

private struct PickerSource: Identifiable {
    let source: UIImagePickerController.SourceType
    var id: Int { source.rawValue }
}
