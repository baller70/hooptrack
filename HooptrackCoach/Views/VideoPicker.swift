import SwiftUI
import UIKit

struct MessagesView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var draft = "Great work. I added one follow-up assignment."
    @State private var contextDraft = "Adding this note to the recording review thread."

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                Picker("assign.player", selection: $appState.selectedPlayerId) {
                    ForEach(appState.snapshot.players) { player in
                        Text(player.name).tag(Optional(player.id))
                    }
                }
                .pickerStyle(.menu)
                .padding()

                ScrollView {
                    VStack(alignment: .leading, spacing: 12) {
                        Panel {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Context Thread")
                                    .font(.headline)
                                Text("Recording context supports attachments through /api/messages/thread.")
                                    .font(.caption)
                                    .foregroundStyle(HT.slate)
                                ForEach(appState.snapshot.threadMessages) { message in
                                    DetailLine(title: message.senderName ?? "Coach", detail: message.attachmentType.map { "\(message.body) attachment: \($0)" } ?? message.body)
                                }
                                HStack {
                                    TextField("Thread note", text: $contextDraft, axis: .vertical)
                                        .textFieldStyle(.roundedBorder)
                                    Button {
                                        Task {
                                            if let recording = appState.snapshot.recordings.first,
                                               await appState.sendThreadMessage(contextType: "recording", contextID: recording.id, contextTitle: recording.drillName, body: contextDraft) {
                                                contextDraft = ""
                                            }
                                        }
                                    } label: {
                                        Image(systemName: "paperclip.badge.plus")
                                    }
                                    .buttonStyle(.bordered)
                                    .accessibilityLabel(Text("Send context thread with attachment support"))
                                    .accessibilityIdentifier("messages-context-attachment")
                                }
                            }
                        }

                        ForEach(appState.snapshot.messages) { message in
                            HStack {
                                if message.senderId == appState.selectedPlayerId { Spacer(minLength: 36) }
                                Text(message.body)
                                    .font(.body)
                                    .foregroundStyle(message.senderId == appState.selectedPlayerId ? .white : HT.ink)
                                    .padding(12)
                                    .background(message.senderId == appState.selectedPlayerId ? HT.orange : .white)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                if message.senderId != appState.selectedPlayerId { Spacer(minLength: 36) }
                            }
                        }
                    }
                    .padding()
                }

                HStack(spacing: 10) {
                    TextField("message.placeholder", text: $draft, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                    Button {
                        Task {
                            if await appState.sendMessage(draft) {
                                draft = ""
                            }
                        }
                    } label: {
                        Image(systemName: "paperplane.fill")
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityLabel(Text("message.send"))
                }
                .padding()
                .background(.white)
            }
            .background(HT.paper)
            .navigationTitle("tab.messages")
            .toolbar {
                Button {
                    Task {
                        if let recording = appState.snapshot.recordings.first {
                            await appState.refreshThread(contextType: "recording", contextID: recording.id)
                        }
                    }
                } label: {
                    Image(systemName: "bubble.left.and.text.bubble.right")
                }
                .accessibilityLabel(Text("Load context thread"))
                Button {
                    appState.selectedTab = .assign
                } label: {
                    Image(systemName: "calendar.badge.plus")
                }
                .accessibilityLabel(Text("tab.assign"))
            }
        }
        .accessibilityIdentifier("05-messages-controls-screen")
    }
}

struct VideoPicker: UIViewControllerRepresentable {
    let sourceType: UIImagePickerController.SourceType
    let onPicked: (URL) -> Void

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(sourceType) ? sourceType : .photoLibrary
        picker.mediaTypes = ["public.movie"]
        picker.videoQuality = .typeHigh
        picker.delegate = context.coordinator
        picker.accessibilityLabel = "Coach video picker"
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onPicked: onPicked)
    }

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let onPicked: (URL) -> Void

        init(onPicked: @escaping (URL) -> Void) {
            self.onPicked = onPicked
        }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            picker.dismiss(animated: true)
            if let url = info[.mediaURL] as? URL {
                onPicked(url)
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
        }
    }
}
