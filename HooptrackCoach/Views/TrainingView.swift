import SwiftUI

struct AssignWorkoutView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var dueDate = Date()
    @State private var notes = "Focus on balance after contact and log one recording."

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("assign.player")
                                .font(.headline)
                            Picker("assign.player", selection: $appState.selectedPlayerId) {
                                ForEach(appState.snapshot.players) { player in
                                    Text(player.name).tag(Optional(player.id))
                                }
                            }
                            .pickerStyle(.inline)
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("assign.workout")
                                .font(.headline)
                            ForEach(appState.snapshot.workouts) { workout in
                                Button {
                                    appState.selectedWorkoutId = workout.id
                                } label: {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text(workout.title)
                                                .font(.subheadline.weight(.semibold))
                                            Text(workout.category ?? String(localized: "workout.training"))
                                                .font(.caption)
                                                .foregroundStyle(HT.slate)
                                        }
                                        Spacer()
                                        if appState.selectedWorkoutId == workout.id {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundStyle(HT.green)
                                        }
                                    }
                                }
                                .buttonStyle(.plain)
                                .padding(.vertical, 4)
                            }
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            DatePicker("assign.dueDate", selection: $dueDate, displayedComponents: .date)
                            TextField("assign.notes", text: $notes, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                Task { await appState.assignWorkout(date: dueDate, notes: notes) }
                            } label: {
                                Label("assign.send", systemImage: "paperplane.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .disabled(appState.snapshot.players.isEmpty || appState.snapshot.workouts.isEmpty)
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("tab.assign")
        }
        .accessibilityIdentifier("03-assign-workout-screen")
    }
}
