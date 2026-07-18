import XCTest

final class HooptrackCoachUITests: XCTestCase {
    private let scenes = [
        ("01-coach-dashboard", "HoopTrack Coach"),
        ("02-create-group-invite", "Teams And Training Sessions"),
        ("03-assign-workout", "Workouts"),
        ("04-recording-review", "Activity"),
        ("05-messages-controls", "Notifications"),
        ("06-completed-outcome", "Progress Report")
    ]

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func configuredApp(scene: String, file: StaticString = #filePath, line: UInt = #line) -> XCUIApplication {
        let environment = ProcessInfo.processInfo.environment
        let app = XCUIApplication()
        guard let username = environment["FACTORY_REVIEW_USERNAME"], !username.isEmpty,
              let password = environment["FACTORY_REVIEW_PASSWORD"], !password.isEmpty else {
            XCTFail("The factory review account must be supplied by the test runner.", file: file, line: line)
            return app
        }
        app.launchArguments = ["--factory-screenshot", scene]
        app.launchEnvironment = [
            "FACTORY_REVIEW_USERNAME": username,
            "FACTORY_REVIEW_PASSWORD": password
        ]
        return app
    }

    private func launchRealScreen(scene: String, heading: String, file: StaticString = #filePath, line: UInt = #line) -> XCUIApplication {
        let app = configuredApp(scene: scene, file: file, line: line)
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15), file: file, line: line)
        XCTAssertTrue(
            app.staticTexts[heading].firstMatch.waitForExistence(timeout: 30),
            "The real Coach route for \(scene) did not display \(heading).",
            file: file,
            line: line
        )
        return app
    }

    private func assertMinimumInteractiveHitAreas(in app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) {
        let controls = [XCUIElement.ElementType.button, .link].flatMap {
            app.descendants(matching: $0).allElementsBoundByIndex.filter(\.isHittable)
        }
        XCTAssertFalse(controls.isEmpty, "The production screen must expose interactive controls.", file: file, line: line)
        for control in controls {
            XCTAssertGreaterThanOrEqual(control.frame.width, 44, "\(control.label) is narrower than 44 points.", file: file, line: line)
            XCTAssertGreaterThanOrEqual(control.frame.height, 44, "\(control.label) is shorter than 44 points.", file: file, line: line)
        }
    }

    func testPrimaryWorkflowAndAccessibilityAudit() throws {
        let app = launchRealScreen(scene: scenes[0].0, heading: scenes[0].1)
        XCTAssertTrue(app.buttons["Roster"].firstMatch.exists)
        assertMinimumInteractiveHitAreas(in: app)
        try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .sufficientElementDescription, .textClipped, .trait])
    }

    func testAllProductionRoutesAndScreenshotsAreDistinct() throws {
        let screenshotDirectory = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("hooptrack-coach-real-scenes", isDirectory: true)
        try? FileManager.default.removeItem(at: screenshotDirectory)
        try FileManager.default.createDirectory(at: screenshotDirectory, withIntermediateDirectories: true)
        var screenshotPayloads: [Data] = []

        for (scene, heading) in scenes {
            let app = launchRealScreen(scene: scene, heading: heading)
            let screenshotData = XCUIScreen.main.screenshot().pngRepresentation
            let screenshotURL = screenshotDirectory.appendingPathComponent("\(scene).png")
            try screenshotData.write(to: screenshotURL)
            XCTAssertGreaterThan(screenshotData.count, 50_000)
            screenshotPayloads.append(screenshotData)
            app.terminate()
        }

        XCTAssertEqual(screenshotPayloads.count, 6)
        XCTAssertEqual(Set(screenshotPayloads).count, 6, "All six Coach screenshots must show distinct real app screens.")
    }

    func testLaunchPerformance() throws {
        let app = configuredApp(scene: scenes[0].0)
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            app.launch()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 15))
        }
    }
}
