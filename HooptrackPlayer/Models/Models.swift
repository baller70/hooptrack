import Foundation

struct User: Codable, Identifiable, Equatable {
    let id: Int
    let email: String
    let role: UserRole
    let name: String
}

enum UserRole: String, Codable, Equatable {
    case player
    case trainer
}

struct Workout: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let category: String?
    let notes: String?
    let drillCount: Int?
    let creatorName: String?

    enum CodingKeys: String, CodingKey {
        case id, title, category, notes
        case drillCount = "drill_count"
        case creatorName = "creator_name"
    }
}

struct Drill: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let category: String?
    let durationSeconds: Int?
    let timerMode: String?
    let targetReps: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, category
        case durationSeconds = "duration_seconds"
        case timerMode = "timer_mode"
        case targetReps = "target_reps"
    }
}

struct WorkoutDetail: Codable, Equatable {
    let workout: Workout
    let drills: [Drill]
}

struct MoveStudy: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let category: String?
    let description: String?
    let coachingPoints: String?
    let creatorName: String?

    enum CodingKeys: String, CodingKey {
        case id, title, category, description
        case coachingPoints = "coaching_points"
        case creatorName = "creator_name"
    }
}

struct Recording: Codable, Identifiable, Equatable {
    let id: Int
    let drillName: String?
    let workoutTitle: String?
    let duration: Int?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, duration, notes
        case drillName = "drill_name"
        case workoutTitle = "workout_title"
        case createdAt = "created_at"
    }
}

struct ScheduleItem: Codable, Identifiable, Equatable {
    let id: Int
    let title: String?
    let date: String?
    let completed: Bool
    let workoutTitle: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id, title, date, completed, notes
        case workoutTitle = "workout_title"
    }
}

struct TeamInvite: Codable, Identifiable, Equatable {
    let id: Int
    let groupName: String?
    let coachName: String?
    let status: String?

    enum CodingKeys: String, CodingKey {
        case id, status
        case groupName = "group_name"
        case coachName = "coach_name"
    }
}

struct TeamMembership: Codable, Identifiable, Equatable {
    let id: Int
    let groupName: String?
    let coachName: String?

    enum CodingKeys: String, CodingKey {
        case id
        case groupName = "group_name"
        case coachName = "coach_name"
    }
}

struct ProgressReport: Codable, Equatable {
    let streak: Int?
    let effort: Int?
    let consistency: Int?
    let iq: Int?
    let recommendations: [String]?
}

struct MessageContact: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let role: UserRole
}

struct DirectMessage: Codable, Identifiable, Equatable {
    let id: Int
    let body: String
    let createdAt: String?
    let senderId: Int?

    enum CodingKeys: String, CodingKey {
        case id, body
        case createdAt = "created_at"
        case senderId = "sender_id"
    }
}

enum InviteAction: String, Codable {
    case accept
    case decline
}

