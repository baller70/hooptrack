import Foundation
import SwiftUI
import UIKit
import UserNotifications

@MainActor
final class CoachAppState: ObservableObject {
    enum Phase: Equatable {
        case loading
        case signedOut
        case signedIn(User)
        case blockedRole(User)
    }

    @Published var phase: Phase = .loading
    @Published var selectedTab: CoachTab = .dashboard
    @Published var snapshot = CoachSnapshot.empty
    @Published var selectedPlayerId: Int?
    @Published var selectedWorkoutId: Int?
    @Published var selectedGroupId: Int?
    @Published var selectedRecordingIds: Set<Int> = []
    @Published var availableDrills: [Drill] = []
    @Published var selectedDrillId: Int?
    @Published var nativePushStatus = "Not enabled"
    @Published var banner: AppBanner?
    @Published var isScreenshotMode = false

    let client: HoopTrackAPI

    init(client: HoopTrackAPI = HoopTrackAPI()) {
        self.client = client
    }

    func bootstrap() async {
        #if DEBUG
        if let scene = FactoryScreenshotScene.current {
            isScreenshotMode = true
            applyDemo(scene: scene)
            return
        }
        #endif

        do {
            let user = try await client.currentUser()
            acceptAuthenticated(user)
            await refresh()
        } catch {
            phase = .signedOut
        }
    }

    func signIn(email: String, password: String) async {
        do {
            let user = try await client.login(email: email, password: password)
            acceptAuthenticated(user)
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "auth.failed"), message: error.localizedDescription)
        }
    }

    func logout() async {
        try? await client.logout()
        client.clearSession()
        phase = .signedOut
        snapshot = .empty
    }

    func refresh() async {
        guard case .signedIn = phase, !isScreenshotMode else { return }
        do {
            async let players = client.players()
            async let groupsEnvelope = client.groups()
            async let workouts = client.workouts()
            async let moves = client.moves()
            async let quizzes = client.quizzes()
            async let schedule = client.schedule()
            async let recordings = client.recordings()
            async let activity = client.activity()
            async let progress = client.progress()
            async let contacts = client.contacts()
            async let notifications = client.notifications()
            async let unreadNotifications = client.unreadNotificationCount()

            let loadedPlayers = try await players
            let loadedGroups = try await groupsEnvelope
            let loadedContacts = try await contacts
            let messageTarget = loadedContacts.first?.id ?? loadedPlayers.first?.id
            let messages: [DirectMessage]
            if let messageTarget {
                messages = try await client.messages(with: messageTarget)
            } else {
                messages = []
            }

            snapshot = CoachSnapshot(
                players: loadedPlayers,
                groups: loadedGroups.groups,
                members: loadedGroups.members,
                invites: loadedGroups.invites,
                workouts: try await workouts,
                moves: (try? await moves) ?? [],
                quizzes: (try? await quizzes) ?? [],
                schedule: try await schedule,
                recordings: try await recordings,
                activity: try await activity,
                contacts: loadedContacts,
                messages: messages,
                threadMessages: [],
                notifications: (try? await notifications) ?? [],
                unreadNotificationCount: (try? await unreadNotifications) ?? 0,
                progress: try? await progress
            )
            selectedPlayerId = selectedPlayerId ?? loadedPlayers.first?.id
            selectedWorkoutId = selectedWorkoutId ?? snapshot.workouts.first?.id
            selectedGroupId = selectedGroupId ?? snapshot.groups.first?.id
            if let selectedWorkoutId {
                await loadDrills(workoutID: selectedWorkoutId)
            }
            banner = nil
        } catch {
            banner = AppBanner(title: String(localized: "offline.title"), message: String(localized: "offline.message"))
        }
    }

    func createGroup(name: String, type: String, limit: Int?, description: String?) async {
        guard !isScreenshotMode else { return }
        do {
            _ = try await client.createGroup(name: name, type: type, limit: limit, description: description)
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func invite(email: String, message: String?) async {
        guard !isScreenshotMode, let groupId = selectedGroupId else { return }
        do {
            _ = try await client.invitePlayer(groupID: groupId, email: email, message: message)
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func assignWorkout(date: Date, notes: String?) async {
        guard !isScreenshotMode, let playerId = selectedPlayerId, let workoutId = selectedWorkoutId else { return }
        do {
            _ = try await client.assignWorkout(playerID: playerId, workoutID: workoutId, date: date, notes: notes)
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func createScheduleItem(itemType: String, itemID: Int?, title: String?, date: Date, notes: String?) async {
        guard !isScreenshotMode, let playerID = selectedPlayerId else { return }
        do {
            _ = try await client.createScheduleItem(ScheduleAssignmentInput(
                playerID: playerID,
                itemType: itemType,
                itemID: itemID,
                title: title,
                scheduledDate: HoopTrackAPI.dayFormatter.string(from: date),
                notes: notes,
                startTime: nil,
                endTime: nil
            ))
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func bulkAssign(itemTypes: [String], date: Date, notes: String?) async {
        guard !isScreenshotMode, let playerID = selectedPlayerId else { return }
        do {
            let items = itemTypes.map {
                BulkScheduleItem(itemType: $0, itemID: nil, title: "\($0.capitalized) assignment", notes: notes, startTime: nil, endTime: nil)
            }
            _ = try await client.bulkAssign(BulkScheduleInput(
                playerID: playerID,
                items: items,
                dates: [HoopTrackAPI.dayFormatter.string(from: date)]
            ))
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func createCalendarEvent(title: String, type: String, date: Date, notes: String?) async {
        guard !isScreenshotMode, let playerID = selectedPlayerId else { return }
        do {
            let day = HoopTrackAPI.dayFormatter.string(from: date)
            _ = try await client.createCalendarEvent(CalendarEventInput(
                playerID: playerID,
                title: title,
                type: type,
                startsAt: "\(day)T09:00",
                endsAt: "\(day)T10:00",
                location: nil,
                opponent: nil,
                notes: notes
            ))
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    @discardableResult
    func sendMessage(_ body: String) async -> Bool {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !isScreenshotMode, !trimmed.isEmpty, let playerId = selectedPlayerId else { return false }
        do {
            try await client.sendMessage(to: playerId, body: trimmed)
            snapshot.messages = try await client.messages(with: playerId)
            return true
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
            return false
        }
    }

    func markAssignment(_ item: ScheduleItem, completed: Bool) async {
        guard !isScreenshotMode else { return }
        do {
            try await client.setScheduleCompletion(id: item.id, completed: completed)
            await refresh()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func refreshThread(contextType: String, contextID: Int) async {
        guard !isScreenshotMode else { return }
        do {
            snapshot.threadMessages = try await client.threadMessages(contextType: contextType, contextID: contextID)
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    @discardableResult
    func sendThreadMessage(contextType: String, contextID: Int, contextTitle: String?, body: String, attachment: MessageAttachment? = nil) async -> Bool {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !isScreenshotMode, !trimmed.isEmpty || attachment != nil else { return false }
        do {
            try await client.sendThreadMessage(
                contextType: contextType,
                contextID: contextID,
                contextTitle: contextTitle,
                body: trimmed.isEmpty ? "Shared an attachment." : trimmed,
                attachment: attachment
            )
            snapshot.threadMessages = try await client.threadMessages(contextType: contextType, contextID: contextID)
            return true
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
            return false
        }
    }

    func markNotificationRead(_ notification: NotificationItem) async {
        guard !isScreenshotMode else { return }
        do {
            try await client.markNotificationRead(id: notification.id)
            snapshot.notifications = try await client.notifications()
            snapshot.unreadNotificationCount = try await client.unreadNotificationCount()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func markAllNotificationsRead() async {
        guard !isScreenshotMode else { return }
        do {
            try await client.markAllNotificationsRead()
            snapshot.notifications = try await client.notifications()
            snapshot.unreadNotificationCount = try await client.unreadNotificationCount()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func loadDrills(workoutID: Int) async {
        guard !isScreenshotMode else { return }
        do {
            availableDrills = try await client.workout(id: workoutID).drills ?? []
            selectedDrillId = availableDrills.contains(where: { $0.id == selectedDrillId })
                ? selectedDrillId
                : availableDrills.first?.id
        } catch {
            report(error)
        }
    }

    func requestNativePush() async {
        guard !isScreenshotMode else { return }
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
            guard granted else {
                nativePushStatus = "Permission denied"
                return
            }
            nativePushStatus = "Registering"
            UIApplication.shared.registerForRemoteNotifications()
        } catch {
            nativePushStatus = "Registration failed"
            report(error)
        }
    }

    func registerAPNSToken(_ token: String) async {
        guard !isScreenshotMode else { return }
        do {
            #if DEBUG
            let environment = "sandbox"
            #else
            let environment = "production"
            #endif
            try await client.registerAPNS(
                deviceToken: token,
                environment: environment,
                bundleID: Bundle.main.bundleIdentifier ?? "com.kevinhouston.hooptrackcoach"
            )
            nativePushStatus = "Enabled"
        } catch {
            nativePushStatus = "Registration failed"
            report(error)
        }
    }

    func report(_ error: Error) {
        banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
    }

    func runAIWorkflow(kind: String) async {
        guard !isScreenshotMode else { return }
        do {
            let playerName = snapshot.players.first(where: { $0.id == selectedPlayerId })?.name
            switch kind {
            case "workout":
                _ = try await client.aiWorkout(playerName: playerName, skillLevel: "intermediate", focusAreas: ["finishing", "footwork"], duration: 30, autoSave: false)
            case "quiz":
                _ = try await client.aiQuiz(topic: "late game spacing", difficulty: "medium", questionCount: 3, autoSave: false)
            case "progress":
                if let selectedPlayerId { _ = try await client.aiProgress(playerID: selectedPlayerId) }
            case "feedback":
                if let drillID = snapshot.recordings.first?.drillId { _ = try await client.aiFeedback(drillID: drillID, duration: 60) }
            case "moves":
                if let selectedPlayerId { _ = try await client.aiMoves(playerID: selectedPlayerId, skillLevel: "intermediate") }
            default:
                _ = try await client.aiInspiration(playerName: playerName)
            }
            banner = AppBanner(title: "AI workflow complete", message: "\(kind.capitalized) request used the shared HoopTrack backend.")
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func handleDeepLink(_ url: URL) {
        guard url.host == "coach" || url.path.contains("/coach") || url.path.contains("/dashboard") else { return }
        if url.path.contains("teams") { selectedTab = .teams }
        else if url.path.contains("players") { selectedTab = .players }
        else if url.path.contains("workouts") || url.path.contains("moves") || url.path.contains("classroom") { selectedTab = .library }
        else if url.path.contains("calendar") { selectedTab = .calendar }
        else if url.path.contains("notifications") { selectedTab = .notifications }
        else if url.path.contains("ai") || url.path.contains("analyze") { selectedTab = .ai }
        else if url.path.contains("progress") { selectedTab = .progress }
        else if url.path.contains("messages") || url.path.contains("chat") { selectedTab = .messages }
        else if url.path.contains("recordings") || url.path.contains("activity") || url.path.contains("capture") { selectedTab = .review }
        else { selectedTab = .dashboard }
    }

    private func acceptAuthenticated(_ user: User) {
        if user.role == .trainer {
            phase = .signedIn(user)
        } else {
            phase = .blockedRole(user)
            client.clearSession()
        }
    }

    #if DEBUG
    private func applyDemo(scene: FactoryScreenshotScene) {
        let user = User(id: 8, email: "coach.rivera@example.com", role: .trainer, name: "Coach Rivera")
        phase = .signedIn(user)
        snapshot = DemoFixtures.snapshot
        selectedPlayerId = DemoFixtures.snapshot.players.first?.id
        selectedWorkoutId = DemoFixtures.snapshot.workouts.first?.id
        selectedGroupId = DemoFixtures.snapshot.groups.first?.id
        selectedRecordingIds = Set(DemoFixtures.snapshot.recordings.prefix(2).map(\.id))
        availableDrills = [
            Drill(id: 801, workoutId: 401, name: "Mikan Contact Series", description: nil, category: "Finishing", durationSeconds: 60, timerMode: "timed", targetReps: nil),
            Drill(id: 802, workoutId: 402, name: "Wing Pull-Up Reads", description: nil, category: "Shooting", durationSeconds: 60, timerMode: "timed", targetReps: nil)
        ]
        selectedDrillId = availableDrills.first?.id
        selectedTab = scene.tab
    }
    #endif
}

enum CoachTab: Hashable {
    case dashboard
    case players
    case teams
    case assign
    case library
    case calendar
    case review
    case messages
    case notifications
    case ai
    case progress
    case account
}
