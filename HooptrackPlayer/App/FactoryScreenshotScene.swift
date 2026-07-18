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
        return FactoryScreenshotScene(rawValue: args[index + 1])
    }

    var routePath: String {
        switch self {
        case .overview: return "/player"
        case .workoutFlow: return "/dashboard/workouts"
        case .moveStudy: return "/dashboard/moves"
        case .progressHistory: return "/dashboard/progress"
        case .teamMessages: return "/dashboard/chat"
        case .completedOutcome: return "/dashboard/profile"
        }
    }

    var tab: PlayerTab {
        switch self {
        case .overview: .today
        case .workoutFlow: .train
        case .moveStudy: .train
        case .progressHistory: .progress
        case .teamMessages: .team
        case .completedOutcome: .capture
        }
    }
}
#endif
