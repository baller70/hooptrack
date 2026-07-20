import Foundation

#if DEBUG
enum FactoryScreenshotScene: String {
    case dashboard = "01-coach-dashboard"
    case teams = "02-create-group-invite"
    case assignWorkout = "03-assign-workout"
    case recordingReview = "04-recording-review"
    case messages = "05-messages-controls"
    case completedOutcome = "06-completed-outcome"

    static func resolve(_ value: String) -> FactoryScreenshotScene? {
        switch value {
        case "primary": return .dashboard
        case "workflow": return .teams
        case "detail": return .assignWorkout
        case "progress": return .recordingReview
        case "control": return .messages
        case "outcome": return .completedOutcome
        default: return FactoryScreenshotScene(rawValue: value)
        }
    }

    static var current: FactoryScreenshotScene? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--factory-screenshot"),
              arguments.indices.contains(index + 1) else {
            return nil
        }
        return resolve(arguments[index + 1])
    }

    var routePath: String {
        switch self {
        case .dashboard: return "/coach"
        case .teams: return "/coach/teams"
        case .assignWorkout: return "/coach/workouts"
        case .recordingReview: return "/coach/activity"
        case .messages: return "/coach/players"
        case .completedOutcome: return "/coach/progress"
        }
    }

    var tab: CoachTab {
        switch self {
        case .dashboard: return .dashboard
        case .teams: return .teams
        case .assignWorkout: return .assign
        case .recordingReview: return .review
        case .messages: return .messages
        case .completedOutcome: return .progress
        }
    }
}
#endif
