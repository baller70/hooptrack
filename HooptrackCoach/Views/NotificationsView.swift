import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject private var appState: CoachAppState

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        Label("Native Push", systemImage: "iphone.radiowaves.left.and.right")
                        Spacer()
                        Text(appState.nativePushStatus)
                            .font(.caption)
                            .foregroundStyle(HT.slate)
                    }
                    Button {
                        Task { await appState.requestNativePush() }
                    } label: {
                        Label("Enable Native Alerts", systemImage: "bell.and.waves.left.and.right")
                    }
                    .accessibilityIdentifier("notifications-enable-native-push")
                    HStack {
                        Label("Unread", systemImage: "bell.badge")
                        Spacer()
                        Text("\(appState.snapshot.unreadNotificationCount)")
                            .font(.headline)
                    }
                    .accessibilityIdentifier("notifications-unread-count")
                    Button {
                        Task { await appState.markAllNotificationsRead() }
                    } label: {
                        Label("Mark All Read", systemImage: "checkmark.circle")
                    }
                    .accessibilityIdentifier("notifications-mark-all-read")
                }

                Section("Notifications") {
                    ForEach(appState.snapshot.notifications) { notification in
                        Button {
                            Task { await appState.markNotificationRead(notification) }
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(notification.message)
                                    .font(.subheadline.weight(notification.readAt == nil ? .bold : .regular))
                                Text(notification.type ?? "notification")
                                    .font(.caption)
                                    .foregroundStyle(HT.slate)
                            }
                        }
                        .accessibilityIdentifier("notification-row-\(notification.id)")
                    }
                }

                Section {
                    Button {
                        Task {
                            try? await appState.client.sendDueNotifications()
                            await appState.refresh()
                        }
                    } label: {
                        Label("Send Due Notifications", systemImage: "paperplane")
                    }
                    .accessibilityIdentifier("notifications-send-due")
                }
            }
            .navigationTitle("Notifications")
        }
        .accessibilityIdentifier("coach-notifications-screen")
    }
}
