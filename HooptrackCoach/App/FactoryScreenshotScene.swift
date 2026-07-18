import Foundation

#if DEBUG
enum FactoryScreenshotScene: String {
    case dashboard = "01-coach-dashboard"
    case teams = "02-create-group-invite"
    case assignWorkout = "03-assign-workout"
    case recordingReview = "04-recording-review"
    case messages = "05-messages-controls"
    case completedOutcome = "06-completed-outcome"

    static var current: FactoryScreenshotScene? {
        let arguments = ProcessInfo.processInfo.arguments
        guard let index = arguments.firstIndex(of: "--factory-screenshot"),
              arguments.indices.contains(index + 1) else {
            return nil
        }
        return FactoryScreenshotScene(rawValue: arguments[index + 1])
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
