import SwiftUI

struct PlayerShellView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            TodayView()
                .tabItem { Label("tab.today", systemImage: "house") }
                .tag(PlayerTab.today)
            CaptureView()
                .tabItem { Label("tab.capture", systemImage: "camera") }
                .tag(PlayerTab.capture)
            TrainingView()
                .tabItem { Label("tab.train", systemImage: "figure.basketball") }
                .tag(PlayerTab.train)
            ProgressViewScreen()
                .tabItem { Label("tab.progress", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(PlayerTab.progress)
            TeamView()
                .tabItem { Label("tab.team", systemImage: "person.2") }
                .tag(PlayerTab.team)
            AccountView()
                .tabItem { Label("tab.account", systemImage: "person.crop.circle") }
                .tag(PlayerTab.account)
        }
        .tint(HT.orange)
    }
}

