import XCTest

final class HooptrackPlayerUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testPrimaryWorkflowAndAccessibilityAudit() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--factory-screenshot", "overview"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        XCTAssertTrue(app.staticTexts["Today"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["overview-screen"].exists)
        try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .hitRegion, .sufficientElementDescription, .textClipped, .trait])

        app.tabBars.buttons["Train"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["workout-flow-screen"].waitForExistence(timeout: 5))
    }

    func testWorkoutAndMoveScreenshotScenesAreDistinct() throws {
        let workoutApp = XCUIApplication()
        workoutApp.launchArguments = ["--factory-screenshot", "workout-flow"]
        workoutApp.launch()
        XCTAssertTrue(workoutApp.descendants(matching: .any)["workout-flow-screen"].waitForExistence(timeout: 10))
        XCTAssertTrue(workoutApp.staticTexts["Finishing Through Contact"].exists)
        workoutApp.terminate()

        let moveApp = XCUIApplication()
        moveApp.launchArguments = ["--factory-screenshot", "move-study"]
        moveApp.launch()
        XCTAssertTrue(moveApp.descendants(matching: .any)["move-study-screen"].waitForExistence(timeout: 10))
        XCTAssertTrue(moveApp.staticTexts["Hang Dribble Freeze"].exists)
    }

    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            let app = XCUIApplication()
            app.launchArguments = ["--factory-screenshot", "overview"]
            app.launch()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        }
    }
}
