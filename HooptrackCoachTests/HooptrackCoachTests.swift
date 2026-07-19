import XCTest
@testable import HooptrackCoach

final class HooptrackCoachTests: XCTestCase {
    override func tearDown() {
        MockURLProtocol.reset()
        super.tearDown()
    }

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

    func testFactoryScreenshotAliasesCoverSixDistinctCoachScreens() {
        #if DEBUG
        XCTAssertEqual(FactoryScreenshotScene.resolve("primary"), .dashboard)
        XCTAssertEqual(FactoryScreenshotScene.resolve("workflow"), .teams)
        XCTAssertEqual(FactoryScreenshotScene.resolve("detail"), .assignWorkout)
        XCTAssertEqual(FactoryScreenshotScene.resolve("progress"), .recordingReview)
        XCTAssertEqual(FactoryScreenshotScene.resolve("control"), .messages)
        XCTAssertEqual(FactoryScreenshotScene.resolve("outcome"), .completedOutcome)
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

    func testCoachHomeLinksResolveToImplementedDashboardRoutes() throws {
        let projectRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let coachPage = projectRoot.appending(path: "app/coach/page.tsx")
        let source = try String(contentsOf: coachPage)
        let requiredRoutes = [
            "/dashboard/players",
            "/dashboard/teams",
            "/dashboard/activity",
            "/dashboard/workouts",
            "/dashboard/moves/upload",
            "/dashboard/progress"
        ]

        for route in requiredRoutes {
            XCTAssertTrue(source.contains("href=\"\(route)\""), "Coach page is missing \(route)")
            XCTAssertTrue(
                FileManager.default.fileExists(atPath: projectRoot.appending(path: "app\(route)/page.tsx").path),
                "\(route) must resolve to an implemented App Router page"
            )
        }

        XCTAssertFalse(source.contains("href=\"/coach/players\""))
        XCTAssertFalse(source.contains("href=\"/coach/teams\""))
        XCTAssertFalse(source.contains("href=\"/coach/workouts\""))
    }

    func testSharedCoachAPIUsesExistingBackendRoutes() async throws {
        let client = makeMockClient()
        let videoURL = URL(fileURLWithPath: "/private/tmp/coach-api-upload-test.mp4")
        try Data("video".utf8).write(to: videoURL)

        _ = try await client.login(email: "trainer@example.test", password: "password")
        _ = try await client.currentUser()
        _ = try await client.players()
        _ = try await client.groups()
        _ = try await client.workout(id: 401)
        _ = try await client.moves(playerID: 7)
        _ = try await client.quizzes()
        _ = try await client.createWorkout(
            title: "Closeout Footwork",
            description: "Shared workout",
            category: "Defense",
            drills: [Drill(id: 0, workoutId: nil, name: "Closeout", description: nil, category: "Defense", durationSeconds: 60, timerMode: "timed", targetReps: nil)]
        )
        _ = try await client.createDrill(workoutID: 401, name: "Closeout", description: "Shared drill", category: "Defense", durationSeconds: 60, timerMode: "timed", targetReps: nil)
        _ = try await client.createMove(title: "Escape Dribble", category: "Handle", description: nil, youtubeURL: nil, assignedPlayerID: 7)
        _ = try await client.createQuiz(
            title: "Late Clock Reads",
            question: QuizQuestion(questionText: "Best outlet?", videoURL: nil, options: ["Corner", "Rim"], correctAnswer: "Rim")
        )
        _ = try await client.createClassroomWork(
            title: "Late Game Classroom",
            position: "any",
            gameSituation: "late_game",
            question: QuizQuestion(questionText: "First read?", videoURL: nil, options: ["Matchup", "Clock"], correctAnswer: "Matchup")
        )
        _ = try await client.createScheduleItem(ScheduleAssignmentInput(playerID: 7, itemType: "film", itemID: nil, title: "Film", scheduledDate: "2026-07-18", notes: nil, startTime: nil, endTime: nil))
        _ = try await client.bulkAssign(BulkScheduleInput(playerID: 7, items: [BulkScheduleItem(itemType: "game", itemID: nil, title: "Game", notes: nil, startTime: nil, endTime: nil)], dates: ["2026-07-18"]))
        _ = try await client.createCalendarEvent(CalendarEventInput(playerID: 7, title: "Film room", type: "FILM", startsAt: "2026-07-18T09:00", endsAt: nil, location: nil, opponent: nil, notes: nil))
        _ = try await client.notifications(unreadOnly: true, playerID: 7)
        _ = try await client.unreadNotificationCount()
        try await client.markNotificationRead(id: 721)
        try await client.markAllNotificationsRead()
        try await client.sendDueNotifications()
        try await client.registerAPNS(deviceToken: String(repeating: "a", count: 64), environment: "sandbox", bundleID: "com.kevinhouston.hooptrackcoach")
        _ = try await client.threadMessages(contextType: "recording", contextID: 601)
        try await client.sendThreadMessage(contextType: "recording", contextID: 601, contextTitle: "Review", body: "Shared context")
        _ = try await client.createRecording(playerID: 7, drillID: 801, blobKey: "coach-test.mp4", duration: 20, notes: "Coach upload", reps: nil)
        try await client.uploadRecordingVideo(recordingID: 906, blobKey: "coach-test.mp4", fileURL: videoURL)
        _ = try await client.clipRecording(id: 601, start: 0, end: 10, title: "Coach review clip")
        _ = try await client.aiWorkout(playerName: "Maya", skillLevel: "intermediate", focusAreas: ["finishing"], duration: 30, autoSave: false)
        _ = try await client.aiQuiz(topic: "spacing", difficulty: "medium", questionCount: 3, autoSave: false)
        _ = try await client.aiProgress(playerID: 7)
        _ = try await client.aiFeedback(drillID: 801, duration: 60)
        _ = try await client.aiMoves(playerID: 7, skillLevel: "intermediate")
        _ = try await client.aiInspiration(playerName: "Maya")

        let requested = MockURLProtocol.requests.map { request in
            "\(request.httpMethod ?? "GET") \(request.url?.path ?? "")\(request.url?.query.map { "?\($0)" } ?? "")"
        }
        let expectedRoutes = [
            "POST /api/auth/login",
            "GET /api/auth/me",
            "GET /api/players?activity=true",
            "GET /api/coach/groups",
            "GET /api/workouts/401",
            "GET /api/moves?playerId=7",
            "GET /api/quizzes",
            "POST /api/workouts",
            "POST /api/drills",
            "POST /api/moves",
            "POST /api/quizzes",
            "POST /api/schedule",
            "POST /api/suite/calendar/create",
            "GET /api/notifications?limit=50&unread_only=true&playerId=7",
            "GET /api/notifications/unread-count",
            "PUT /api/notifications/721/read",
            "POST /api/notifications/mark-all-read",
            "POST /api/notifications/due",
            "POST /api/push/apns",
            "GET /api/messages/thread?context_type=recording&context_id=601",
            "POST /api/messages/thread",
            "POST /api/recordings",
            "POST /api/recordings/upload",
            "POST /api/recordings/601/clip",
            "POST /api/ai/workout",
            "POST /api/ai/quiz",
            "GET /api/ai/progress?playerId=7",
            "POST /api/ai/feedback",
            "POST /api/ai/moves",
            "POST /api/ai/inspiration"
        ]

        for route in expectedRoutes {
            XCTAssertTrue(requested.contains(route), "Missing shared backend request: \(route). Captured: \(requested.joined(separator: " | "))")
        }
        XCTAssertFalse(requested.contains { $0.contains("/mobile") || $0.contains("/ios") })
        XCTAssertTrue(MockURLProtocol.requests.allSatisfy { $0.url?.host == "example.test" })
    }

    func testServerErrorMessageIsUserVisible() {
        let error = APIError.server(status: 403, message: "Coach access only")
        XCTAssertEqual(error.errorDescription, "Coach access only")
    }

    private func makeMockClient() -> HoopTrackAPI {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        var schedulePostCount = 0
        MockURLProtocol.handler = { request in
            let path = request.url?.path ?? ""
            let query = request.url?.query.map { "?\($0)" } ?? ""
            let method = request.httpMethod ?? "GET"
            let body: String
            switch (method, path, query) {
            case ("POST", "/api/auth/login", _),
                 ("GET", "/api/auth/me", _):
                body = #"{"user":{"id":1,"name":"Coach","email":"trainer@example.test","role":"trainer"}}"#
            case ("GET", "/api/players", "?activity=true"):
                body = #"{"players":[]}"#
            case ("GET", "/api/coach/groups", _):
                body = #"{"groups":[],"members":[],"invites":[]}"#
            case ("GET", "/api/workouts/401", _):
                body = #"{"workout":{"id":401,"title":"Finishing","description":"Shared","category":"Finishing","drill_count":1,"timer_mode":"timed","duration_seconds":60,"creator_name":"Coach"},"drills":[]}"#
            case ("GET", "/api/moves", "?playerId=7"):
                body = #"{"moves":[]}"#
            case ("GET", "/api/quizzes", _):
                body = #"{"quizzes":[]}"#
            case ("POST", "/api/schedule", _):
                schedulePostCount += 1
                body = schedulePostCount == 2 ? #"{"count":1}"# : #"{"id":900}"#
            case ("POST", "/api/ai/workout", _):
                body = #"{"workout":{"title":"AI Workout","description":"Shared","category":"Skill","drills":[]}}"#
            case ("POST", "/api/ai/quiz", _):
                body = #"{"quiz":{"title":"AI Quiz","questions":[]}}"#
            case ("GET", "/api/ai/progress", "?playerId=7"):
                body = #"{"period":"month","gpa":3.6,"overall_letter":"A-","total_hours":10.5,"streak_days":4,"total_recordings":12,"strongest":"Finishing","weakest":"Balance","analysis":"Shared report"}"#
            case ("POST", "/api/ai/feedback", _):
                body = #"{"feedback":"Keep the base wider."}"#
            case ("POST", "/api/ai/moves", _):
                body = #"[]"#
            case ("POST", "/api/ai/inspiration", _):
                body = #"{"message":"Stay locked in."}"#
            case ("GET", "/api/notifications", "?limit=50&unread_only=true&playerId=7"):
                body = #"{"notifications":[]}"#
            case ("GET", "/api/notifications/unread-count", _):
                body = #"{"count":2}"#
            case ("GET", "/api/messages/thread", "?context_type=recording&context_id=601"):
                body = #"{"messages":[]}"#
            case ("POST", "/api/recordings/upload", _):
                body = #"{"success":true}"#
            case ("PUT", "/api/notifications/721/read", _),
                 ("POST", "/api/notifications/mark-all-read", _),
                 ("POST", "/api/notifications/due", _),
                 ("POST", "/api/push/apns", _):
                body = #"{"success":true}"#
            case ("POST", "/api/workouts", _),
                 ("POST", "/api/drills", _),
                 ("POST", "/api/moves", _),
                 ("POST", "/api/quizzes", _),
                 ("POST", "/api/suite/calendar/create", _),
                 ("POST", "/api/messages/thread", _),
                 ("POST", "/api/recordings", _),
                 ("POST", "/api/recordings/601/clip", _):
                body = #"{"id":900}"#
            default:
                throw NSError(
                    domain: "Unknown mock route: \(method) \(path)\(query)",
                    code: 1
                )
            }
            return (200, Data(body.utf8))
        }
        return HoopTrackAPI(baseURL: URL(string: "https://example.test")!, session: URLSession(configuration: configuration))
    }
}

private final class MockURLProtocol: URLProtocol {
    static var requests: [URLRequest] = []
    static var handler: ((URLRequest) throws -> (Int, Data))?

    static func reset() {
        requests = []
        handler = nil
    }

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        Self.requests.append(request)
        do {
            let (statusCode, data) = try Self.handler?(request) ?? (200, Data(#"{"success":true}"#.utf8))
            let response = HTTPURLResponse(url: request.url!, statusCode: statusCode, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
