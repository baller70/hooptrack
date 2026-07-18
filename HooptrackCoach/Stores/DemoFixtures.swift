import Foundation

#if DEBUG
enum DemoFixtures {
    static let snapshot = CoachSnapshot(
        players: [
            Player(id: 7, name: "Maya Johnson", email: "maya.player@example.com", totalRecordings: 18, recordingsLast7d: 4, hoursLast7d: 3.5, currentStreakDays: 6, lastQuizScore: 92, upcomingCount: 2, overdueCount: 0),
            Player(id: 9, name: "Andre Lewis", email: "andre.lewis@example.com", totalRecordings: 11, recordingsLast7d: 2, hoursLast7d: 2.1, currentStreakDays: 3, lastQuizScore: 84, upcomingCount: 1, overdueCount: 1),
            Player(id: 12, name: "Sofia Martinez", email: "sofia.martinez@example.com", totalRecordings: 24, recordingsLast7d: 6, hoursLast7d: 4.8, currentStreakDays: 9, lastQuizScore: 96, upcomingCount: 3, overdueCount: 0)
        ],
        groups: [
            CoachGroup(id: 101, name: "Varsity Guard Group", groupType: "team", playerLimit: 12, description: "Primary guard development roster", createdAt: "2026-07-01T12:00:00Z"),
            CoachGroup(id: 102, name: "Saturday Skill Lab", groupType: "training_session", playerLimit: 8, description: "Small-group finishing and shot prep", createdAt: "2026-07-08T12:00:00Z")
        ],
        members: [
            CoachGroupMember(id: 201, groupId: 101, playerId: 7, playerName: "Maya Johnson", playerEmail: "maya.player@example.com"),
            CoachGroupMember(id: 202, groupId: 101, playerId: 12, playerName: "Sofia Martinez", playerEmail: "sofia.martinez@example.com")
        ],
        invites: [
            CoachGroupInvite(id: 301, groupId: 102, email: "andre.lewis@example.com", status: "sent", playerName: "Andre Lewis", createdAt: "2026-07-17T14:00:00Z"),
            CoachGroupInvite(id: 302, groupId: 101, email: "jayden.walker@example.com", status: "pending", playerName: nil, createdAt: "2026-07-18T09:30:00Z")
        ],
        workouts: [
            Workout(id: 401, title: "Finishing Through Contact", description: "Balance, pace, and two-foot finishes.", category: "Finishing", drillCount: 4, timerMode: "duration", durationSeconds: 1800, creatorName: "Coach Rivera"),
            Workout(id: 402, title: "Handle Into Pull-Up", description: "Game-speed reps from both wings.", category: "Shooting", drillCount: 5, timerMode: "reps", durationSeconds: 1500, creatorName: "Coach Rivera")
        ],
        schedule: [
            ScheduleItem(id: 501, title: "Assigned Workout", date: "2026-07-18", scheduledDate: "2026-07-18", completed: false, workoutTitle: "Finishing Through Contact", workoutCategory: "Finishing", playerName: "Maya Johnson", notes: "Complete before evening practice."),
            ScheduleItem(id: 502, title: "Move Study", date: "2026-07-17", scheduledDate: "2026-07-17", completed: true, workoutTitle: "Hang Dribble Freeze", workoutCategory: "Handle", playerName: "Sofia Martinez", notes: "Reviewed and approved.")
        ],
        recordings: [
            Recording(id: 601, drillName: "Mikan Contact Series", workoutTitle: "Finishing Through Contact", playerName: "Maya Johnson", duration: 74, notes: "Better balance on left side.", createdAt: "2026-07-18T13:30:00Z"),
            Recording(id: 602, drillName: "Wing Pull-Up Reads", workoutTitle: "Handle Into Pull-Up", playerName: "Andre Lewis", duration: 96, notes: "Needs tighter elbow path.", createdAt: "2026-07-16T18:05:00Z")
        ],
        activity: [
            ActivityItem(kind: "recording", at: "2026-07-18T13:30:00Z", playerId: 7, playerName: "Maya Johnson", title: "Submitted Mikan Contact Series", subtitle: "74 second recording"),
            ActivityItem(kind: "schedule", at: "2026-07-17T20:05:00Z", playerId: 12, playerName: "Sofia Martinez", title: "Completed Hang Dribble Freeze", subtitle: "Reviewed workout assignment"),
            ActivityItem(kind: "quiz", at: "2026-07-16T16:20:00Z", playerId: 9, playerName: "Andre Lewis", title: "Scored 84 on spacing quiz", subtitle: "Classroom progress")
        ],
        contacts: [
            MessageContact(id: 7, name: "Maya Johnson", role: .player),
            MessageContact(id: 9, name: "Andre Lewis", role: .player)
        ],
        messages: [
            DirectMessage(id: 701, body: "Strong work on the left-side finishes today.", createdAt: "2026-07-18T14:05:00Z", senderId: 8),
            DirectMessage(id: 702, body: "I assigned a quick follow-up for tomorrow.", createdAt: "2026-07-18T14:07:00Z", senderId: 8),
            DirectMessage(id: 703, body: "Got it, I will finish it before practice.", createdAt: "2026-07-18T14:08:00Z", senderId: 7)
        ],
        progress: ProgressReport(period: "month", gpa: 3.6, overallLetter: "A-", totalHours: 14.4, streakDays: 9, totalRecordings: 53, strongest: "Finishing footwork", weakest: "Pull-up balance", analysis: "Roster completion is trending up with strong recording consistency from the guard group.")
    )
}
#endif
