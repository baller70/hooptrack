import XCTest

final class HooptrackPlayerUITests: XCTestCase {
    private let scenes = [
        ("overview", "overview-screen"),
        ("workout-flow", "workout-flow-screen"),
        ("move-study", "move-study-screen"),
        ("progress-history", "progress-history-screen"),
        ("team-messages", "team-messages-screen"),
        ("completed-outcome", "completed-outcome-screen")
    ]

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    private func configuredApp(scene: String, file: StaticString = #filePath, line: UInt = #line) -> XCUIApplication {
        let environment = ProcessInfo.processInfo.environment
        let app = XCUIApplication()
        app.launchArguments = ["--factory-screenshot", scene]

        var launchEnvironment: [String: String] = [:]
        if let username = environment["FACTORY_REVIEW_USERNAME"], !username.isEmpty,
           let password = environment["FACTORY_REVIEW_PASSWORD"], !password.isEmpty {
            launchEnvironment["FACTORY_REVIEW_USERNAME"] = username
            launchEnvironment["FACTORY_REVIEW_PASSWORD"] = password
        }
        if let nonce = environment["FACTORY_SCREENSHOT_NONCE"], !nonce.isEmpty {
            launchEnvironment["FACTORY_SCREENSHOT_NONCE"] = nonce
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
            "The Player screenshot scene \(scene) did not display \(identifier).",
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
        let app = launchRealScreen(scene: scenes[0].0, identifier: scenes[0].1)
        let startCapture = app.buttons["Start Capture"].firstMatch
        XCTAssertTrue(startCapture.waitForExistence(timeout: 10))
        startCapture.tap()
        XCTAssertTrue(app.staticTexts["Capture"].firstMatch.waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Record now"].firstMatch.exists)
        assertMinimumInteractiveHitAreas(in: app)
        try app.performAccessibilityAudit(for: [.contrast, .elementDetection, .hitRegion, .sufficientElementDescription, .textClipped, .trait])
    }

    func testAllProductionRoutesAndScreenshotsAreDistinct() throws {
        let screenshotDirectory = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("hooptrack-player-real-scenes", isDirectory: true)
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
        XCTAssertEqual(Set(screenshotPayloads).count, 6, "All six Player screenshots must show distinct real app screens.")
    }

    func testLaunchPerformance() throws {
        let app = configuredApp(scene: scenes[0].0)
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            app.launch()
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 10))
        }
    }
}
