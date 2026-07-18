import SwiftUI

struct AIWorkflowView: View {
    @EnvironmentObject private var appState: CoachAppState

    private let workflows = [
        ("workout", "AI Workout", "figure.basketball"),
        ("quiz", "AI Quiz", "checklist"),
        ("progress", "AI Progress", "chart.line.uptrend.xyaxis"),
        ("feedback", "AI Feedback", "text.bubble"),
        ("moves", "AI Moves", "move.3d"),
        ("inspiration", "AI Inspiration", "sparkles")
    ]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Picker("Player", selection: $appState.selectedPlayerId) {
                        ForEach(appState.snapshot.players) { player in
                            Text(player.name).tag(Optional(player.id))
                        }
                    }
                }

                Section("AI-Assisted Coach Workflows") {
                    ForEach(workflows, id: \.0) { workflow in
                        Button {
                            Task { await appState.runAIWorkflow(kind: workflow.0) }
                        } label: {
                            Label(workflow.1, systemImage: workflow.2)
                        }
                        .accessibilityIdentifier("ai-workflow-\(workflow.0)")
                    }
                }
            }
            .navigationTitle("AI")
        }
        .accessibilityIdentifier("coach-ai-screen")
    }
}
