import SwiftUI

struct ScheduleComposerView: View {
    @EnvironmentObject private var appState: CoachAppState
    @State private var date = Date()
    @State private var eventTitle = "Film room"
    @State private var notes = "Shared calendar assignment from Coach."
    @State private var selectedTypes = Set(["workout", "move", "quiz"])

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Bulk Schedule Composer")
                                .font(.headline)
                            Picker("Player", selection: $appState.selectedPlayerId) {
                                ForEach(appState.snapshot.players) { player in
                                    Text(player.name).tag(Optional(player.id))
                                }
                            }
                            DatePicker("Date", selection: $date, displayedComponents: .date)
                            TextField("Notes", text: $notes, axis: .vertical)
                                .textFieldStyle(.roundedBorder)
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Item Types")
                                .font(.headline)
                            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 2), spacing: 8) {
                                ForEach(appState.snapshot.supportedScheduleTypes, id: \.self) { type in
                                    Toggle(type.capitalized, isOn: Binding(
                                        get: { selectedTypes.contains(type) },
                                        set: { isOn in
                                            if isOn { selectedTypes.insert(type) } else { selectedTypes.remove(type) }
                                        }
                                    ))
                                    .toggleStyle(.button)
                                    .accessibilityIdentifier("schedule-type-\(type)")
                                }
                            }
                            Button {
                                Task { await appState.bulkAssign(itemTypes: Array(selectedTypes), date: date, notes: notes) }
                            } label: {
                                Label("Bulk Assign", systemImage: "square.stack.3d.up")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .accessibilityIdentifier("schedule-bulk-assign")
                        }
                    }

                    Panel {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Calendar Event")
                                .font(.headline)
                            TextField("Title", text: $eventTitle)
                                .textFieldStyle(.roundedBorder)
                            Button {
                                Task { await appState.createCalendarEvent(title: eventTitle, type: "FILM", date: date, notes: notes) }
                            } label: {
                                Label("Create Event", systemImage: "calendar.badge.plus")
                            }
                            .buttonStyle(.bordered)
                            .accessibilityIdentifier("schedule-create-calendar-event")
                        }
                    }

                    DetailSection(title: "Scheduled Work") {
                        ForEach(appState.snapshot.schedule) { item in
                            DetailLine(title: item.workoutTitle ?? item.title ?? "Assignment", detail: "\(item.itemType ?? "workout") for \(item.playerName ?? "player")")
                        }
                    }
                }
                .padding()
            }
            .background(HT.paper)
            .navigationTitle("Calendar")
        }
        .accessibilityIdentifier("coach-calendar-screen")
    }
}
