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
    case coach
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

struct Drill: Codable, Identifiable, Equatable {
    let id: Int
    let workoutId: Int?
    let name: String
    let description: String?
    let category: String?
    let durationSeconds: Int?
    let timerMode: String?
    let targetReps: Int?

    enum CodingKeys: String, CodingKey {
        case id, name, description, category
        case workoutId = "workout_id"
        case durationSeconds = "duration_seconds"
        case timerMode = "timer_mode"
        case targetReps = "target_reps"
    }
}

struct WorkoutDetail: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let description: String?
    let category: String?
    let timerMode: String?
    let durationSeconds: Int?
    let drills: [Drill]?

    enum CodingKeys: String, CodingKey {
        case id, title, description, category, drills
        case timerMode = "timer_mode"
        case durationSeconds = "duration_seconds"
    }
}

struct MoveStudy: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let category: String?
    let description: String?
    let youtubeURL: String?
    let assignedPlayerId: Int?
    let assignedPlayerName: String?
    let timerMode: String?
    let durationSeconds: Int?
    let targetReps: Int?

    enum CodingKeys: String, CodingKey {
        case id, title, category, description
        case youtubeURL = "youtube_url"
        case assignedPlayerId = "assigned_to_player_id"
        case assignedPlayerName = "assigned_player_name"
        case timerMode = "timer_mode"
        case durationSeconds = "duration_seconds"
        case targetReps = "target_reps"
    }
}

struct Quiz: Codable, Identifiable, Equatable {
    let id: Int
    let title: String
    let type: String?
    let timerMode: String?
    let durationSeconds: Int?
    let position: String?
    let gameSituation: String?
    let questionCount: Int?
    let bestScore: Int?
    let questions: [QuizQuestion]?

    enum CodingKeys: String, CodingKey {
        case id, title, type, position, questions
        case timerMode = "timer_mode"
        case durationSeconds = "duration_seconds"
        case gameSituation = "game_situation"
        case questionCount = "question_count"
        case bestScore = "best_score"
    }
}

struct QuizQuestion: Codable, Identifiable, Equatable {
    var id: String { questionText }
    let questionText: String
    let videoURL: String?
    let options: [String]
    let correctAnswer: String

    enum CodingKeys: String, CodingKey {
        case options
        case questionText = "question_text"
        case videoURL = "video_url"
        case correctAnswer = "correct_answer"
    }
}

struct ScheduleItem: Codable, Identifiable, Equatable {
    let id: Int
    let title: String?
    let date: String?
    let scheduledDate: String?
    let completed: Bool
    let itemType: String?
    let itemId: Int?
    let workoutTitle: String?
    let workoutCategory: String?
    let playerName: String?
    let notes: String?
    let startTime: String?
    let endTime: String?

    enum CodingKeys: String, CodingKey {
        case id, title, date, completed, notes
        case itemType = "item_type"
        case itemId = "item_id"
        case scheduledDate = "scheduled_date"
        case workoutTitle = "workout_title"
        case workoutCategory = "workout_category"
        case playerName = "player_name"
        case startTime = "start_time"
        case endTime = "end_time"
    }
}

struct Recording: Codable, Identifiable, Equatable {
    let id: Int
    let drillId: Int?
    let drillName: String?
    let workoutTitle: String?
    let playerName: String?
    let duration: Int?
    let durationSeconds: Int?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, duration, notes
        case drillId = "drill_id"
        case drillName = "drill_name"
        case workoutTitle = "workout_title"
        case playerName = "player_name"
        case durationSeconds = "duration_seconds"
        case createdAt = "created_at"
    }
}

struct NotificationItem: Codable, Identifiable, Equatable {
    let id: Int
    let message: String
    let type: String?
    let readAt: String?
    let createdAt: String?
    let scheduledFor: String?
    let linkURL: String?

    enum CodingKeys: String, CodingKey {
        case id, message, type
        case readAt = "read_at"
        case createdAt = "created_at"
        case scheduledFor = "scheduled_for"
        case linkURL = "link_url"
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

struct ThreadMessage: Codable, Identifiable, Equatable {
    let id: Int
    let senderId: Int
    let senderName: String?
    let body: String
    let contextType: String?
    let contextId: Int?
    let contextTitle: String?
    let createdAt: String?
    let attachmentType: String?
    let attachmentFilename: String?

    enum CodingKeys: String, CodingKey {
        case id, body
        case senderId = "sender_id"
        case senderName = "sender_name"
        case contextType = "context_type"
        case contextId = "context_id"
        case contextTitle = "context_title"
        case createdAt = "created_at"
        case attachmentType = "attachment_type"
        case attachmentFilename = "attachment_filename"
    }
}

struct MessageAttachment: Equatable {
    let fileURL: URL
    let type: String
    let mimeType: String
    let durationSeconds: Int?
}

struct CalendarEventInput: Equatable {
    let playerID: Int
    let title: String
    let type: String
    let startsAt: String
    let endsAt: String?
    let location: String?
    let opponent: String?
    let notes: String?
}

struct ScheduleAssignmentInput: Equatable {
    let playerID: Int
    let itemType: String
    let itemID: Int?
    let title: String?
    let scheduledDate: String
    let notes: String?
    let startTime: String?
    let endTime: String?
}

struct BulkScheduleInput: Equatable {
    let playerID: Int
    let items: [BulkScheduleItem]
    let dates: [String]
}

struct BulkScheduleItem: Equatable {
    let itemType: String
    let itemID: Int?
    let title: String?
    let notes: String?
    let startTime: String?
    let endTime: String?
}

struct AIWorkoutResult: Codable, Equatable {
    let title: String?
    let description: String?
    let category: String?
    let drills: [Drill]?
}

struct AIQuizResult: Codable, Equatable {
    let title: String?
    let questions: [QuizQuestion]?
}

struct AIMoveRecommendation: Codable, Identifiable, Equatable {
    var id: String { title }
    let title: String
    let category: String?
    let reason: String?
    let description: String?
}

struct AppBanner: Identifiable, Equatable {
    let id = UUID()
    let title: String
    let message: String
}
