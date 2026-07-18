import XCTest

final class HooptrackCoachUITests: XCTestCase {
    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testPrimaryWorkflowAndAccessibilityAudit() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--factory-screenshot", "01-coach-dashboard"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["01-coach-dashboard-screen"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Coach your roster in one view"].waitForExistence(timeout: 5) || app.staticTexts["HoopTrack Coach"].exists)
        try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .hitRegion, .sufficientElementDescription, .textClipped, .trait])

        app.tabBars.buttons["Assign"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["03-assign-workout-screen"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.staticTexts["Finishing Through Contact"].exists)
    }

    func testSixScreenshotScenesAreDistinct() throws {
        let scenes = [
            "01-coach-dashboard",
            "02-create-group-invite",
            "03-assign-workout",
            "04-recording-review",
            "05-messages-controls",
            "06-completed-outcome"
        ]

        for scene in scenes {
            let app = XCUIApplication()
            app.launchArguments = ["--factory-screenshot", scene]
            app.launch()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
            XCTAssertTrue(app.descendants(matching: .any)["\(scene)-screen"].waitForExistence(timeout: 5))
            app.terminate()
        }
    }

    func testLaunchPerformance() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            let app = XCUIApplication()
            app.launchArguments = ["--factory-screenshot", "01-coach-dashboard"]
            app.launch()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        }
    }
}
