import Foundation
import SwiftUI

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
            async let schedule = client.schedule()
            async let recordings = client.recordings()
            async let activity = client.activity()
            async let progress = client.progress()
            async let contacts = client.contacts()

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
                schedule: try await schedule,
                recordings: try await recordings,
                activity: try await activity,
                contacts: loadedContacts,
                messages: messages,
                progress: try? await progress
            )
            selectedPlayerId = selectedPlayerId ?? loadedPlayers.first?.id
            selectedWorkoutId = selectedWorkoutId ?? snapshot.workouts.first?.id
            selectedGroupId = selectedGroupId ?? snapshot.groups.first?.id
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

    func handleDeepLink(_ url: URL) {
        guard url.host == "coach" || url.path.contains("/coach") || url.path.contains("/dashboard") else { return }
        if url.path.contains("teams") { selectedTab = .teams }
        else if url.path.contains("progress") { selectedTab = .progress }
        else if url.path.contains("messages") || url.path.contains("chat") { selectedTab = .messages }
        else if url.path.contains("recordings") || url.path.contains("activity") { selectedTab = .review }
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
        selectedTab = scene.tab
    }
    #endif
}

enum CoachTab: Hashable {
    case dashboard
    case teams
    case assign
    case review
    case messages
    case progress
    case account
}
