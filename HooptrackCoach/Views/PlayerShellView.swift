import SwiftUI

struct CoachShellView: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        TabView(selection: $appState.selectedTab) {
            DashboardView()
                .tabItem { Label("tab.dashboard", systemImage: "rectangle.grid.2x2") }
                .tag(CoachTab.dashboard)
            TeamView()
                .tabItem { Label("tab.teams", systemImage: "person.3") }
                .tag(CoachTab.teams)
            AssignWorkoutView()
                .tabItem { Label("tab.assign", systemImage: "calendar.badge.plus") }
                .tag(CoachTab.assign)
            ReviewView()
                .tabItem { Label("tab.review", systemImage: "play.rectangle") }
                .tag(CoachTab.review)
            MessagesView()
                .tabItem { Label("tab.messages", systemImage: "bubble.left.and.bubble.right") }
                .tag(CoachTab.messages)
            ProgressViewScreen()
                .tabItem { Label("tab.progress", systemImage: "chart.line.uptrend.xyaxis") }
                .tag(CoachTab.progress)
            AccountView()
                .tabItem { Label("account.title", systemImage: "person.crop.circle") }
                .tag(CoachTab.account)
        }
        .tint(HT.orange)
        .safeAreaInset(edge: .top) {
            if let banner = appState.banner {
                HStack {
                    Image(systemName: "wifi.exclamationmark")
                    VStack(alignment: .leading) {
                        Text(banner.title).font(.caption.weight(.bold))
                        Text(banner.message).font(.caption2)
                    }
                    Spacer()
                    Button("retry.title") { Task { await appState.refresh() } }
                        .font(.caption.weight(.semibold))
                }
                .padding(10)
                .background(Color.yellow.opacity(0.22))
            }
        }
    }
}
