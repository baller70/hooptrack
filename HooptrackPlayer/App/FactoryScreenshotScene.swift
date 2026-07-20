import Foundation

#if DEBUG
enum FactoryScreenshotScene: String {
    case overview
    case workoutFlow = "workout-flow"
    case moveStudy = "move-study"
    case progressHistory = "progress-history"
    case teamMessages = "team-messages"
    case completedOutcome = "completed-outcome"

    static var current: FactoryScreenshotScene? {
        let args = ProcessInfo.processInfo.arguments
        guard let index = args.firstIndex(of: "--factory-screenshot"),
              args.indices.contains(index + 1) else {
            return nil
        }
        return resolve(args[index + 1])
    }

    static func resolve(_ id: String) -> FactoryScreenshotScene? {
        if let scene = FactoryScreenshotScene(rawValue: id) {
            return scene
        }
        return switch id {
        case "primary": .overview
        case "workflow": .workoutFlow
        case "detail": .moveStudy
        case "progress": .progressHistory
        case "control": .teamMessages
        case "outcome": .completedOutcome
        default: nil
        }
    }

    static var nonce: String? {
        guard current != nil else { return nil }
        return ProcessInfo.processInfo.environment["FACTORY_SCREENSHOT_NONCE"]
    }

    var routePath: String {
        switch self {
        case .overview: return "/player"
        case .workoutFlow: return "/player/workouts"
        case .moveStudy: return "/player/moves"
        case .progressHistory: return "/player/progress"
        case .teamMessages: return "/player/requests"
        case .completedOutcome: return "/player/profile"
        }
    }

    var tab: PlayerTab {
        switch self {
        case .overview: .today
        case .workoutFlow: .train
        case .moveStudy: .train
        case .progressHistory: .progress
        case .teamMessages: .team
        case .completedOutcome: .account
        }
    }
}
#endif
