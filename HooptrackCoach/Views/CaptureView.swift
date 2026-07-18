import SwiftUI
import AVKit

struct ReviewView: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
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
        .accessibilityIdentifier("04-recording-review-screen")
    }
}
