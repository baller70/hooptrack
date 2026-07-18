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

struct Player: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let email: String
    let totalRecordings: Int?
    let recordingsLast7d: Int?
    let hoursLast7d: Double?
    let currentStreakDays: Int?
    let lastQuizScore: Int?
    let upcomingCount: Int?
    let overdueCount: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, email
        case totalRecordings = "total_recordings"
        case recordingsLast7d = "recordings_last_7d"
        case hoursLast7d = "hours_last_7d"
        case currentStreakDays = "current_streak_days"
        case lastQuizScore = "last_quiz_score"
        case upcomingCount = "upcoming_count"
        case overdueCount = "overdue_count"
    }
}

struct CoachGroup: Codable, Identifiable, Equatable {
    let id: Int
    let name: String
    let groupType: String?
    let playerLimit: Int?
    let description: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, name, description
        case groupType = "group_type"
        case playerLimit = "player_limit"
        case createdAt = "created_at"
    }
}

struct CoachGroupMember: Codable, Identifiable, Equatable {
    let id: Int
    let groupId: Int?
    let playerId: Int?
    let playerName: String?
    let playerEmail: String?

    enum CodingKeys: String, CodingKey {
        case id
        case groupId = "group_id"
        case playerId = "player_id"
        case playerName = "player_name"
        case playerEmail = "player_email"
    }
}

struct CoachGroupInvite: Codable, Identifiable, Equatable {
    let id: Int
    let groupId: Int?
    let email: String?
    let status: String?
    let playerName: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, email, status
        case groupId = "group_id"
        case playerName = "player_name"
        case createdAt = "created_at"
    }
}

struct Workout: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let description: String?
    let category: String?
    let drillCount: Int?
    let timerMode: String?
    let durationSeconds: Int?
    let creatorName: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, category
        case drillCount = "drill_count"
        case timerMode = "timer_mode"
        case durationSeconds = "duration_seconds"
        case creatorName = "creator_name"
    }
}

struct ScheduleItem: Codable, Identifiable, Equatable {
    let id: Int
    let title: String?
    let date: String?
    let scheduledDate: String?
    let completed: Bool
    let workoutTitle: String?
    let workoutCategory: String?
    let playerName: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id, title, date, completed, notes
        case scheduledDate = "scheduled_date"
        case workoutTitle = "workout_title"
        case workoutCategory = "workout_category"
        case playerName = "player_name"
    }
}

struct Recording: Codable, Identifiable, Equatable {
    let id: Int
    let drillName: String?
    let workoutTitle: String?
    let playerName: String?
    let duration: Int?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, duration, notes
        case drillName = "drill_name"
        case workoutTitle = "workout_title"
        case playerName = "player_name"
        case createdAt = "created_at"
    }
}

struct ActivityItem: Codable, Identifiable, Equatable {
    var id: String { "\(kind)-\(at)-\(playerId ?? 0)-\(title)" }
    let kind: String
    let at: String
    let playerId: Int?
    let playerName: String?
    let title: String
    let subtitle: String?

    enum CodingKeys: String, CodingKey {
        case kind, at, title, subtitle
        case playerId = "player_id"
        case playerName = "player_name"
    }
}

struct ProgressReport: Codable, Equatable {
    let period: String?
    let gpa: Double?
    let overallLetter: String?
    let totalHours: Double?
    let streakDays: Int?
    let totalRecordings: Int?
    let strongest: String?
    let weakest: String?
    let analysis: String?

    enum CodingKeys: String, CodingKey {
        case period, gpa, strongest, weakest, analysis
        case overallLetter = "overall_letter"
        case totalHours = "total_hours"
        case streakDays = "streak_days"
        case totalRecordings = "total_recordings"
    }
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

struct AppBanner: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let message: String
}
