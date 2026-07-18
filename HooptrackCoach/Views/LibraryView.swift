import SwiftUI

struct LibraryView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var workoutTitle = "Closeout Footwork"
    @State private var drillName = "Closeout Slide Reps"
    @State private var moveTitle = "One-Dribble Escape"
    @State private var quizTitle = "Transition Reads"
    @State private var classroomTitle = "Late Game Classroom"

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    CreationPanel(
                        title: "Create Workout",
                        detail: "Saves drills through /api/workouts.",
                        text: $workoutTitle,
                        identifier: "library-create-workout"
                    ) {
                        Task {
                            let drill = Drill(id: 0, workoutId: nil, name: "Closeout to slide", description: "Two reps each direction.", category: "Defense", durationSeconds: 60, timerMode: "timed", targetReps: nil)
                            _ = try? await appState.client.createWorkout(title: workoutTitle, description: "Coach-created native workout", category: "Defense", drills: [drill])
                            await appState.refresh()
                        }
                    }

                    CreationPanel(
                        title: "Create Drill",
                        detail: "Adds a drill to the selected workout through /api/drills.",
                        text: $drillName,
                        identifier: "library-create-drill"
                    ) {
                        Task {
                            if let workoutID = appState.selectedWorkoutId ?? appState.snapshot.workouts.first?.id {
                                _ = try? await appState.client.createDrill(
                                    workoutID: workoutID,
                                    name: drillName,
                                    description: "Coach-created native drill",
                                    category: "Defense",
                                    durationSeconds: 60,
                                    timerMode: "timed",
                                    targetReps: nil
                                )
                                await appState.refresh()
                            }
                        }
                    }

                    CreationPanel(
                        title: "Create Move",
                        detail: "Saves move study through /api/moves.",
                        text: $moveTitle,
                        identifier: "library-create-move"
                    ) {
                        Task {
                            _ = try? await appState.client.createMove(title: moveTitle, category: "Handle", description: "Native coach move study", youtubeURL: nil, assignedPlayerID: appState.selectedPlayerId)
                            await appState.refresh()
                        }
                    }

                    CreationPanel(
                        title: "Create Quiz",
                        detail: "Saves classroom checks through /api/quizzes.",
                        text: $quizTitle,
                        identifier: "library-create-quiz"
                    ) {
                        Task {
                            let question = QuizQuestion(questionText: "Which lane fills first in transition?", videoURL: nil, options: ["Rim", "Corner", "Trail"], correctAnswer: "Rim")
                            _ = try? await appState.client.createQuiz(title: quizTitle, question: question)
                            await appState.refresh()
                        }
                    }

                    CreationPanel(
                        title: "Create Classroom Work",
                        detail: "Saves classroom checks through /api/quizzes.",
                        text: $classroomTitle,
                        identifier: "library-create-classroom"
                    ) {
                        Task {
                            let question = QuizQuestion(questionText: "What should the trail player read first?", videoURL: nil, options: ["Matchup", "Shot clock", "Bench"], correctAnswer: "Matchup")
                            _ = try? await appState.client.createClassroomWork(title: classroomTitle, position: "any", gameSituation: "late_game", question: question)
                            await appState.refresh()
                        }
                    }

                    DetailSection(title: "Workouts") {
                        ForEach(appState.snapshot.workouts) { workout in
                            DetailLine(title: workout.title, detail: workout.description ?? workout.category ?? "workout")
                        }
                    }

                    DetailSection(title: "Moves") {
                        ForEach(appState.snapshot.moves) { move in
                            DetailLine(title: move.title, detail: move.description ?? move.category ?? "move")
                        }
                    }

                    DetailSection(title: "Classroom Quizzes") {
                        ForEach(appState.snapshot.quizzes) { quiz in
                            DetailLine(title: quiz.title, detail: "\(quiz.questionCount ?? quiz.questions?.count ?? 0) questions")
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("Library")
        }
        .accessibilityIdentifier("coach-library-screen")
    }
}

private struct CreationPanel: View {
    let title: String
    let detail: String
    @Binding var text: String
    let identifier: String
    let action: () -> Void

    var body: some View {
        Panel {
            VStack(alignment: .leading, spacing: 10) {
                Text(title).font(.headline)
                Text(detail).font(.caption).foregroundStyle(HT.slate)
                TextField(title, text: $text)
                    .textFieldStyle(.roundedBorder)
                Button(action: action) {
                    Label(title, systemImage: "plus.circle")
                }
                .buttonStyle(.borderedProminent)
                .accessibilityIdentifier(identifier)
            }
        }
    }
}
