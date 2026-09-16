import XCTest
@testable import HooptrackPlayer

final class HooptrackPlayerTests: XCTestCase {
    func testAppBundleDeclaresExecutableMetadata() {
        let expectedBundleIdentifier = "com.kevinhouston.hooptrackplayer"
        let appBundle = Bundle(identifier: expectedBundleIdentifier) ?? Bundle.main

        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleExecutable") as? String, "HooptrackPlayer")
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleName") as? String, "HooptrackPlayer")
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundlePackageType") as? String, "APPL")
        XCTAssertEqual(appBundle.bundleIdentifier, expectedBundleIdentifier)
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String, "1.0")
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String, "6")

        guard let executableURL = appBundle.executableURL else {
            XCTFail("Expected the app bundle to resolve an executable URL")
            return
        }

        XCTAssertEqual(executableURL.lastPathComponent, "HooptrackPlayer")
        XCTAssertTrue(FileManager.default.isExecutableFile(atPath: executableURL.path))
    }

    func testPlayerUsesNativeShellAndProductionAPI() throws {
        let appBundle = Bundle(identifier: "com.kevinhouston.hooptrackplayer") ?? Bundle.main
        XCTAssertEqual(appBundle.bundleIdentifier, "com.kevinhouston.hooptrackplayer")
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String, "1.0")
        XCTAssertEqual(appBundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String, "6")

        let videoURL = HoopTrackAPI().recordingVideoURL(id: 42)
        XCTAssertEqual(videoURL.absoluteString, "https://hooptrack.194-146-12-139.sslip.io/api/recordings/42/video")

        let projectRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let rootViewSource = try String(
            contentsOf: projectRoot.appending(path: "HooptrackPlayer/Views/RootView.swift"),
            encoding: .utf8
        )
        for forbiddenShellSymbol in ["WKWebView", "PlayerWebSession", "UIViewRepresentable", "WKNavigationDelegate"] {
            XCTAssertFalse(
                rootViewSource.contains(forbiddenShellSymbol),
                "RootView must launch the native Player shell without \(forbiddenShellSymbol)."
            )
        }

        let state = AppState(client: HoopTrackAPI())
        let coach = User(id: 91, email: "coach@example.com", role: .trainer, name: "Coach Example")
        state.acceptAuthenticated(coach)
        if state.phase != .blockedRole(coach) {
            XCTFail("Coach accounts must remain blocked from the Player app.")
        }
    }

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

    func testFactoryGenericScreenshotAliasesCoverSixDistinctScenes() {
        #if DEBUG
        let aliases = ["primary", "workflow", "detail", "progress", "control", "outcome"]
        XCTAssertEqual(
            aliases.compactMap { FactoryScreenshotScene.resolve($0)?.rawValue },
            ["overview", "workout-flow", "move-study", "progress-history", "team-messages", "completed-outcome"]
        )
        #endif
    }

    @MainActor
    func testPlayerRoleLockRejectsCoachAccounts() {
        let state = AppState(client: HoopTrackAPI())
        let coach = User(id: 91, email: "coach@example.com", role: .trainer, name: "Coach Example")

        state.acceptAuthenticated(coach)

        if state.phase != .blockedRole(coach) {
            XCTFail("Coach accounts must remain blocked from the Player app.")
        }
    }

    func testServerErrorMessageIsUserVisible() {
        let error = APIError.server(status: 403, message: "Player access only")
        XCTAssertEqual(error.errorDescription, "Player access only")
    }
}
