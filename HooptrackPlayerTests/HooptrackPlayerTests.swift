import XCTest
@testable import HooptrackPlayer

final class HooptrackPlayerTests: XCTestCase {
    func testFactoryFixtureCoversCorePlayerSurface() {
        #if DEBUG
        let snapshot = DemoFixtures.snapshot
        XCTAssertFalse(snapshot.workouts.isEmpty)
        XCTAssertFalse(snapshot.moves.isEmpty)
        XCTAssertFalse(snapshot.schedule.isEmpty)
        XCTAssertFalse(snapshot.recordings.isEmpty)
        XCTAssertFalse(snapshot.invites.isEmpty)
        XCTAssertFalse(snapshot.memberships.isEmpty)
        XCTAssertNotNil(snapshot.progress)
        #endif
    }

    func testServerErrorMessageIsUserVisible() {
        let error = APIError.server(status: 403, message: "Player access only")
        XCTAssertEqual(error.errorDescription, "Player access only")
    }
}

