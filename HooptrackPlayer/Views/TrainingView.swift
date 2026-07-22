import SwiftUI

struct TrainingView: View {
    @EnvironmentObject private var appState: AppState
    @State private var segment: Int

    init() {
        #if DEBUG
        _segment = State(initialValue: FactoryScreenshotScene.current == .moveStudy ? 1 : 0)
        #else
        _segment = State(initialValue: 0)
        #endif
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Picker("tab.train", selection: $segment) {
                        Text("training.workouts").tag(0)
                        Text("training.moves").tag(1)
                        Text("training.plan").tag(2)
                    }
                    .pickerStyle(.segmented)

                    if segment == 0 {
                        WorkoutList(segment: $segment)
                    } else if segment == 1 {
                        MoveList()
                    } else {
                        PlanList()
                    }
                }
                .padding()
            }
            .background(HT.paper.ignoresSafeArea())
            .navigationTitle("tab.train")
        }
        .accessibilityIdentifier(segment == 1 ? "move-study-screen" : "workout-flow-screen")
    }
}

private struct WorkoutList: View {
    @EnvironmentObject private var appState: AppState
    @Binding var segment: Int

    var body: some View {
        ForEach(appState.dashboard.workouts) { workout in
            Panel {
                VStack(alignment: .leading, spacing: 12) {
                    Text(workout.title)
                        .font(.headline)
                    Text(workout.notes ?? String(localized: "training.noWorkoutNotes"))
                        .foregroundStyle(HT.slate)
                    HStack {
                        Label("\(workout.drillCount ?? 0)", systemImage: "list.bullet")
                        Spacer()
                        Button("training.viewPlan") {
                            segment = 2
                        }
                            .buttonStyle(.borderedProminent)
                            .tint(HT.teal)
                    }
                }
            }
        }
    }
}

private struct MoveList: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ForEach(appState.dashboard.moves) { move in
            Panel {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Text(move.title)
                            .font(.headline)
                        Spacer()
                        Text(move.category ?? "")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(HT.teal)
                    }
                    Text(move.description ?? "")
                        .foregroundStyle(HT.slate)
                    Label(move.coachingPoints ?? String(localized: "training.focusPoints"), systemImage: "scope")
                        .font(.subheadline)
                }
            }
        }
    }
}

private struct PlanList: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ForEach(appState.dashboard.schedule) { item in
            Panel {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 5) {
                        Text(item.workoutTitle ?? item.title ?? String(localized: "today.trainingItem"))
                            .font(.headline)
                        Text(item.date ?? "")
                            .foregroundStyle(HT.slate)
                    }
                    Spacer()
                    Button {
                        Task { await appState.completeScheduleItem(item, completed: !item.completed) }
                    } label: {
                        Image(systemName: item.completed ? "checkmark.circle.fill" : "circle")
                    }
                    .accessibilityLabel(item.completed ? Text("training.markIncomplete") : Text("training.markComplete"))
                }
            }
        }
    }
}
