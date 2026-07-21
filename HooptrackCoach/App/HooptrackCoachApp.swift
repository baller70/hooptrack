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

    var body: some Scene {
        WindowGroup {
            #if DEBUG
            if FactoryScreenshotScene.current != nil {
                CoachFactoryRoot()
            } else {
                CoachRootView()
            }
            #else
            CoachRootView()
            #endif
        }
    }
}

#if DEBUG
private struct CoachFactoryRoot: View {
    @StateObject private var appState = CoachAppState()

    var body: some View {
        CoachShellView()
            .environmentObject(appState)
            .task { await appState.bootstrap() }
    }
}
#endif
