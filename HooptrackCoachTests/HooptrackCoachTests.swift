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
        XCTAssertFalse(snapshot.schedule.isEmpty)
        XCTAssertFalse(snapshot.recordings.isEmpty)
        XCTAssertFalse(snapshot.activity.isEmpty)
        XCTAssertFalse(snapshot.messages.isEmpty)
        XCTAssertNotNil(snapshot.progress)
        #endif
    }

    func testServerErrorMessageIsUserVisible() {
        let error = APIError.server(status: 403, message: "Coach access only")
        XCTAssertEqual(error.errorDescription, "Coach access only")
    }
}
