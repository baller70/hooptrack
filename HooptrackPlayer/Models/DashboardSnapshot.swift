import Foundation

struct DashboardSnapshot: Equatable {
    var workouts: [Workout]
    var moves: [MoveStudy]
    var schedule: [ScheduleItem]
    var recordings: [Recording]
    var invites: [TeamInvite]
    var memberships: [TeamMembership]
    var progress: ProgressReport?

    static let empty = DashboardSnapshot(
        workouts: [],
        moves: [],
        schedule: [],
        recordings: [],
        invites: [],
        memberships: [],
        progress: nil
    )

    init(
        workouts: [Workout],
        moves: [MoveStudy],
        schedule: [ScheduleItem],
        recordings: [Recording],
        invites: InviteEnvelope,
        progress: ProgressReport?
    ) {
        self.workouts = workouts
        self.moves = moves
        self.schedule = schedule
        self.recordings = recordings
        self.invites = invites.invites
        self.memberships = invites.memberships
        self.progress = progress
    }

    init(
        workouts: [Workout],
        moves: [MoveStudy],
        schedule: [ScheduleItem],
        recordings: [Recording],
        invites: [TeamInvite],
        memberships: [TeamMembership],
        progress: ProgressReport?
    ) {
        self.workouts = workouts
        self.moves = moves
        self.schedule = schedule
        self.recordings = recordings
        self.invites = invites
        self.memberships = memberships
        self.progress = progress
    }
}

struct InviteEnvelope: Codable, Equatable {
    let invites: [TeamInvite]
    let memberships: [TeamMembership]
}

