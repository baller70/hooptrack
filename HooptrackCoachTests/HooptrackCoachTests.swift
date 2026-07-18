import XCTest
@testable import HooptrackCoach

final class HooptrackCoachTests: XCTestCase {
    func testAppBundleDeclaresExecutableMetadata() {
        let expectedBundleIdentifier = "com.kevinhouston.hooptrackcoach"
        let appBundle = Bundle(identifier: expectedBundleIdentifier) ?? Bundle.main

        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleExecutable") as? String, "HooptrackCoach")
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleName") as? String, "HooptrackCoach")
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundlePackageType") as? String, "APPL")
        XCTAssertEqual(appBundle.bundleIdentifier, expectedBundleIdentifier)
    }

    func testFactoryFixtureCoversCoreCoachSurface() {
        #if DEBUG
        let snapshot = DemoFixtures.snapshot
        XCTAssertFalse(snapshot.players.isEmpty)
        XCTAssertFalse(snapshot.groups.isEmpty)
        XCTAssertFalse(snapshot.members.isEmpty)
        XCTAssertFalse(snapshot.invites.isEmpty)
        XCTAssertFalse(snapshot.workouts.isEmpty)
        XCTAssertFalse(snapshot.moves.isEmpty)
        XCTAssertFalse(snapshot.quizzes.isEmpty)
        XCTAssertFalse(snapshot.schedule.isEmpty)
        XCTAssertFalse(snapshot.recordings.isEmpty)
        XCTAssertFalse(snapshot.activity.isEmpty)
        XCTAssertFalse(snapshot.messages.isEmpty)
        XCTAssertFalse(snapshot.threadMessages.isEmpty)
        XCTAssertFalse(snapshot.notifications.isEmpty)
        XCTAssertGreaterThan(snapshot.unreadNotificationCount, 0)
        XCTAssertNotNil(snapshot.progress)
        #endif
    }

    func testCoachParityFixtureCoversRequiredWorkflowTypes() {
        #if DEBUG
        let snapshot = DemoFixtures.snapshot
        XCTAssertTrue(snapshot.supportedScheduleTypes.contains("workout"))
        XCTAssertTrue(snapshot.supportedScheduleTypes.contains("move"))
        XCTAssertTrue(snapshot.supportedScheduleTypes.contains("quiz"))
        XCTAssertTrue(snapshot.supportedScheduleTypes.contains("quote"))
        XCTAssertTrue(snapshot.supportedScheduleTypes.contains("event"))
        XCTAssertTrue(snapshot.supportedScheduleTypes.contains("film"))
        XCTAssertTrue(snapshot.supportedScheduleTypes.contains("game"))
        XCTAssertTrue(snapshot.schedule.contains { $0.itemType == "film" })
        XCTAssertTrue(snapshot.threadMessages.contains { $0.attachmentType != nil })
        XCTAssertTrue(snapshot.notifications.contains { $0.readAt == nil })
        XCTAssertGreaterThanOrEqual(snapshot.recordings.count, 2)
        #endif
    }

    func testCoachTabSetIncludesRecoveredParitySurfaces() {
        let recoveredTabs: Set<CoachTab> = [.players, .library, .calendar, .notifications, .ai, .review, .messages]
        XCTAssertTrue(recoveredTabs.contains(.players))
        XCTAssertTrue(recoveredTabs.contains(.library))
        XCTAssertTrue(recoveredTabs.contains(.calendar))
        XCTAssertTrue(recoveredTabs.contains(.notifications))
        XCTAssertTrue(recoveredTabs.contains(.ai))
    }

    func testServerErrorMessageIsUserVisible() {
        let error = APIError.server(status: 403, message: "Coach access only")
        XCTAssertEqual(error.errorDescription, "Coach access only")
    }
}
