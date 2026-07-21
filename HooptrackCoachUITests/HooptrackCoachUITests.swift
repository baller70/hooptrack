import XCTest

final class HooptrackCoachUITests: XCTestCase {
    private let scenes = [
        ("01-coach-dashboard", "01-coach-dashboard-screen"),
        ("02-create-group-invite", "02-create-group-invite-screen"),
        ("03-assign-workout", "03-assign-workout-screen"),
        ("04-recording-review", "04-recording-review-screen"),
        ("05-messages-controls", "05-messages-controls-screen"),
        ("06-completed-outcome", "06-completed-outcome-screen")
    ]

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func configuredApp(scene: String, file: StaticString = #filePath, line: UInt = #line) -> XCUIApplication {
        let environment = ProcessInfo.processInfo.environment
        let app = XCUIApplication()
        app.launchArguments = ["--factory-screenshot", scene]
        var launchEnvironment: [String: String] = [:]
        for key in ["FACTORY_REVIEW_USERNAME", "FACTORY_REVIEW_PASSWORD", "FACTORY_SCREENSHOT_NONCE"] {
            if let value = environment[key], !value.isEmpty {
                launchEnvironment[key] = value
            }
        }
        app.launchEnvironment = launchEnvironment
        return app
    }

    private func launchRealScreen(scene: String, identifier: String, file: StaticString = #filePath, line: UInt = #line) -> XCUIApplication {
        let app = configuredApp(scene: scene, file: file, line: line)
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10), file: file, line: line)
        XCTAssertTrue(
            app.descendants(matching: .any)[identifier].firstMatch.waitForExistence(timeout: 10),
            "The real Coach scene for \(scene) did not display \(identifier).",
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
            XCTAssertGreaterThanOrEqual(control.frame.width + 0.01, 44, "\(control.label) is narrower than 44 points.", file: file, line: line)
            XCTAssertGreaterThanOrEqual(control.frame.height + 0.01, 44, "\(control.label) is shorter than 44 points.", file: file, line: line)
        }
    }

    func testPrimaryWorkflowAndAccessibilityAudit() throws {
        let app = launchRealScreen(scene: scenes[0].0, identifier: scenes[0].1)
        XCTAssertTrue(app.staticTexts["HoopTrack Coach"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Teams"].firstMatch.exists)
        assertMinimumInteractiveHitAreas(in: app)
        try app.performAccessibilityAudit(for: [.contrast, .sufficientElementDescription, .textClipped, .trait])
    }

    func testAllProductionRoutesAndScreenshotsAreDistinct() throws {
        let screenshotDirectory = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("hooptrack-coach-real-scenes", isDirectory: true)
        try? FileManager.default.removeItem(at: screenshotDirectory)
        try FileManager.default.createDirectory(at: screenshotDirectory, withIntermediateDirectories: true)
        var screenshotPayloads: [Data] = []

        for (scene, identifier) in scenes {
            let app = launchRealScreen(scene: scene, identifier: identifier)
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

    func testRequestedCoachWorkflowStatesAreReachable() throws {
        for (scene, identifier) in scenes {
            let app = launchRealScreen(scene: scene, identifier: identifier)
            switch scene {
            case "01-coach-dashboard":
                XCTAssertTrue(app.staticTexts["HoopTrack Coach"].firstMatch.exists)
            case "02-create-group-invite":
                XCTAssertTrue(app.staticTexts["Create team or group"].firstMatch.exists)
            case "03-assign-workout":
                XCTAssertTrue(app.staticTexts["Workout"].firstMatch.exists)
            case "04-recording-review":
                XCTAssertTrue(app.staticTexts["Capture And Upload"].firstMatch.exists)
            case "05-messages-controls":
                XCTAssertTrue(app.staticTexts["Context Thread"].firstMatch.exists)
            case "06-completed-outcome":
                XCTAssertTrue(app.staticTexts["Progress summary"].firstMatch.exists)
            default:
                XCTFail("Unexpected scene \(scene)")
            }
            app.terminate()
        }
    }

    func testLaunchPerformance() throws {
        let app = configuredApp(scene: scenes[0].0)
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            app.launch()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        }
    }
}
