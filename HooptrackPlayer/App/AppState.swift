import Foundation
import SwiftUI

@MainActor
final class AppState: ObservableObject {
    enum Phase: Equatable {
        case loading
        case signedOut
        case signedIn(User)
        case blockedRole(User)
    }

    @Published var phase: Phase = .loading
    @Published var selectedTab: PlayerTab = .today
    @Published var dashboard = DashboardSnapshot.empty
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
            await refreshDashboard()
        } catch {
            phase = .signedOut
        }
    }

    func signIn(email: String, password: String) async {
        await authenticate {
            try await client.login(email: email, password: password)
        }
    }

    func register(name: String, email: String, password: String) async {
        await authenticate {
            try await client.register(name: name, email: email, password: password)
        }
    }

    func logout() async {
        try? await client.logout()
        client.clearSession()
        phase = .signedOut
        dashboard = .empty
    }

    func refreshDashboard() async {
        guard case .signedIn = phase, !isScreenshotMode else { return }
        do {
            async let workouts = client.workouts()
            async let moves = client.moves()
            async let schedule = client.schedule()
            async let recordings = client.recordings()
            async let invites = client.invites()
            async let progress = client.progress(period: "month")
            dashboard = try await DashboardSnapshot(
                workouts: workouts,
                moves: moves,
                schedule: schedule,
                recordings: recordings,
                invites: invites,
                progress: progress
            )
            banner = nil
        } catch {
            banner = AppBanner(
                title: String(localized: "offline.title"),
                message: String(localized: "offline.message")
            )
        }
    }

    func completeScheduleItem(_ item: ScheduleItem, completed: Bool) async {
        do {
            try await client.setScheduleCompletion(id: item.id, completed: completed)
            await refreshDashboard()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func respondToInvite(_ invite: TeamInvite, action: InviteAction) async {
        do {
            try await client.respondToInvite(id: invite.id, action: action)
            await refreshDashboard()
        } catch {
            banner = AppBanner(title: String(localized: "retry.title"), message: error.localizedDescription)
        }
    }

    func deleteAccount(password: String) async throws {
        try await client.deleteAccount(password: password)
        client.clearSession()
        phase = .signedOut
        dashboard = .empty
    }

    private func authenticate(_ operation: () async throws -> User) async {
        do {
            let user = try await operation()
            acceptAuthenticated(user)
            await refreshDashboard()
        } catch {
            banner = AppBanner(title: String(localized: "auth.failed"), message: error.localizedDescription)
        }
    }

    private func acceptAuthenticated(_ user: User) {
        if user.role == .player {
            phase = .signedIn(user)
        } else {
            phase = .blockedRole(user)
            client.clearSession()
        }
    }

    #if DEBUG
    private func applyDemo(scene: FactoryScreenshotScene) {
        let user = User(id: 7, email: "maya.player@example.com", role: .player, name: "Maya Johnson")
        phase = .signedIn(user)
        dashboard = DemoFixtures.snapshot
        selectedTab = scene.tab
    }
    #endif
}

enum PlayerTab: Hashable {
    case today
    case capture
    case train
    case progress
    case team
    case account
}

struct AppBanner: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let message: String
}

