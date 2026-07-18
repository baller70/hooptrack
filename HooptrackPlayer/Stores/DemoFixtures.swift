import Foundation

#if DEBUG
enum DemoFixtures {
    static let snapshot = DashboardSnapshot(
        workouts: [
            Workout(id: 101, title: "Finishing Through Contact", category: "Finishing", notes: "Three blocks focused on balance, pace, and two-foot finishes.", drillCount: 4, creatorName: "Coach Rivera"),
            Workout(id: 102, title: "Handle Into Pull-Up", category: "Shooting", notes: "Game-speed reps from both wings.", drillCount: 5, creatorName: "Coach Rivera")
        ],
        moves: [
            MoveStudy(id: 201, title: "Hang Dribble Freeze", category: "Handle", description: "Sell the pause, read the defender's top foot, then attack the open hip.", coachingPoints: "Eyes up. Drop your shoulder after the freeze. Finish with two strong steps.", creatorName: "Coach Rivera"),
            MoveStudy(id: 202, title: "Inside Hand Extension", category: "Finishing", description: "Protect the ball with your body while extending away from the shot blocker.", coachingPoints: "Jump off outside foot. Keep the ball high on release.", creatorName: "Coach Rivera")
        ],
        schedule: [
            ScheduleItem(id: 301, title: "Assigned Workout", date: "2026-07-18", completed: false, workoutTitle: "Finishing Through Contact", notes: "Complete before evening practice."),
            ScheduleItem(id: 302, title: "Move Study", date: "2026-07-19", completed: true, workoutTitle: "Hang Dribble Freeze", notes: "Review focus points.")
        ],
        recordings: [
            Recording(id: 401, drillName: "Mikan Contact Series", workoutTitle: "Finishing Through Contact", duration: 74, notes: "Better balance on left side.", createdAt: "2026-07-18T13:30:00Z"),
            Recording(id: 402, drillName: "Wing Pull-Up Reads", workoutTitle: "Handle Into Pull-Up", duration: 96, notes: "Keep elbow tighter.", createdAt: "2026-07-16T18:05:00Z")
        ],
        invites: [
            TeamInvite(id: 501, groupName: "Varsity Guard Group", coachId: 8, coachName: "Coach Rivera", status: "pending")
        ],
        memberships: [
            TeamMembership(id: 601, groupName: "Summer Skill Lab", coachId: 8, coachName: "Coach Rivera")
        ],
        progress: ProgressReport(
            streak: 5,
            effort: 92,
            consistency: 86,
            iq: 81,
            recommendations: ["Finish today's contact series.", "Review the hang dribble freeze before practice."]
        )
    )

    static let coachContacts = [MessageContact(id: 8, name: "Coach Rivera", role: .trainer)]
    static let coachMessages = [
        DirectMessage(id: 701, body: "Strong work on the left-side finishes today.", createdAt: "2026-07-18T14:05:00Z", senderId: 8),
        DirectMessage(id: 702, body: "I will review the next workout before practice.", createdAt: "2026-07-18T14:07:00Z", senderId: 7),
    ]
}
#endif
