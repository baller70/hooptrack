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

    func testCoachParityNavigationCoversWebWorkflows() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--factory-screenshot", "01-coach-dashboard"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["01-coach-dashboard-screen"].waitForExistence(timeout: 5))

        let requiredEntries = ["Players", "Teams", "Assign", "Library", "Calendar", "Review", "Messages", "Alerts", "AI", "Progress"]
        if app.tabBars.buttons["More"].exists {
            app.tabBars.buttons["More"].tap()
        }
        for entry in requiredEntries {
            XCTAssertTrue(
                app.tabBars.buttons[entry].exists || app.buttons[entry].exists || app.staticTexts[entry].exists || app.cells[entry].exists,
                "Missing native parity entry: \(entry)"
            )
        }

        if app.tabBars.buttons["Library"].exists {
            app.tabBars.buttons["Library"].tap()
        } else if app.tabBars.buttons["More"].exists {
            app.tabBars.buttons["More"].tap()
            app.cells["Library"].tap()
        }
        XCTAssertTrue(app.descendants(matching: .any)["coach-library-screen"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["library-create-workout"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["library-create-drill"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["library-create-move"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["library-create-quiz"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["library-create-classroom"].exists)
    }

    func testPlayerDetailFlowCoversCalendarAssignCompareAndReturn() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--factory-screenshot", "01-coach-dashboard"]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))

        if app.tabBars.buttons["Players"].exists {
            app.tabBars.buttons["Players"].tap()
        } else if app.tabBars.buttons["More"].exists {
            app.tabBars.buttons["More"].tap()
            app.cells["Players"].tap()
        }

        XCTAssertTrue(app.descendants(matching: .any)["coach-roster-screen"].waitForExistence(timeout: 5))
        app.descendants(matching: .any)["roster-player-7"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["player-detail-screen"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["player-detail-open-calendar"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["player-detail-open-compare"].exists)
        XCTAssertTrue(app.descendants(matching: .any)["player-detail-assign-outcome"].exists)

        app.descendants(matching: .any)["player-detail-open-compare"].tap()
        XCTAssertTrue(app.descendants(matching: .any)["coach-recording-compare-screen"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.descendants(matching: .any)["recording-create-clip"].exists)
        app.navigationBars.buttons.element(boundBy: 0).tap()
        XCTAssertTrue(app.descendants(matching: .any)["player-detail-screen"].waitForExistence(timeout: 5))
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
