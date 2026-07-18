import SwiftUI

@main
struct HooptrackCoachApp: App {
    @StateObject private var appState = CoachAppState()

    var body: some Scene {
        WindowGroup {
            CoachRootView()
                .environmentObject(appState)
                .task {
                    await appState.bootstrap()
                }
                .onOpenURL { url in
                    appState.handleDeepLink(url)
                }
        }
    }
}
