import SwiftUI
import UIKit
import UserNotifications

extension Notification.Name {
    static let coachPushToken = Notification.Name("coachPushToken")
    static let coachPushRegistrationFailed = Notification.Name("coachPushRegistrationFailed")
}

final class CoachAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        NotificationCenter.default.post(name: .coachPushToken, object: token)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .coachPushRegistrationFailed, object: error)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        [.banner, .badge, .sound]
    }
}

@main
struct HooptrackCoachApp: App {
    @UIApplicationDelegateAdaptor(CoachAppDelegate.self) private var appDelegate
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
                .onReceive(NotificationCenter.default.publisher(for: .coachPushToken)) { notification in
                    guard let token = notification.object as? String else { return }
                    Task { await appState.registerAPNSToken(token) }
                }
                .onReceive(NotificationCenter.default.publisher(for: .coachPushRegistrationFailed)) { notification in
                    guard let error = notification.object as? Error else { return }
                    appState.nativePushStatus = "Registration failed"
                    appState.report(error)
                }
        }
    }
}
