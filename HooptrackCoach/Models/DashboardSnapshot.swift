import Foundation

struct CoachSnapshot: Equatable {
    var players: [Player]
    var groups: [CoachGroup]
    var members: [CoachGroupMember]
    var invites: [CoachGroupInvite]
    var workouts: [Workout]
    var moves: [MoveStudy]
    var quizzes: [Quiz]
    var schedule: [ScheduleItem]
    var recordings: [Recording]
    var activity: [ActivityItem]
    var contacts: [MessageContact]
    var messages: [DirectMessage]
    var threadMessages: [ThreadMessage]
    var notifications: [NotificationItem]
    var unreadNotificationCount: Int
    var progress: ProgressReport?

    static let empty = CoachSnapshot(
        players: [],
        groups: [],
        members: [],
        invites: [],
        workouts: [],
        moves: [],
        quizzes: [],
        schedule: [],
        recordings: [],
        activity: [],
        contacts: [],
        messages: [],
        threadMessages: [],
        notifications: [],
        unreadNotificationCount: 0,
        progress: nil
    )

    var pendingInviteCount: Int { invites.filter { ($0.status ?? "pending") == "pending" }.count }
    var acceptedRosterCount: Int { max(players.count, members.count) }
    var unreadMessageCount: Int { messages.filter { $0.senderId != nil }.count }
    var unreadWorkflowCount: Int { unreadNotificationCount + unreadMessageCount }
    var reviewQueueCount: Int { recordings.count }
    var completedAssignments: Int { schedule.filter(\.completed).count }
    var openAssignments: Int { schedule.filter { !$0.completed }.count }
    var supportedScheduleTypes: [String] { ["workout", "move", "quiz", "quote", "event", "film", "game"] }
}

struct GroupsEnvelope: Codable, Equatable {
    let groups: [CoachGroup]
    let members: [CoachGroupMember]
    let invites: [CoachGroupInvite]
}

struct CreatedEnvelope: Codable, Equatable {
    let id: Int
}

struct CountEnvelope: Codable, Equatable {
    let count: Int
}

struct SuccessEnvelope: Codable, Equatable {
    let success: Bool
}
