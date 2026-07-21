import Foundation

enum HoopTrackEnvironment {
    static let origin: URL = {
        guard
            let value = Bundle.main.object(forInfoDictionaryKey: "HoopTrackAPIBaseURL") as? String,
            let url = URL(string: value),
            url.scheme == "https",
            url.user == nil,
            url.password == nil,
            url.host != nil
        else {
            preconditionFailure("HoopTrackAPIBaseURL must be an absolute HTTPS URL without embedded credentials")
        }
        return url
    }()

    static func publicURL(_ path: String) -> URL {
        origin.appending(path: path.trimmingCharacters(in: CharacterSet(charactersIn: "/")))
    }
}

final class HoopTrackAPI {
    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder

    init(
        baseURL: URL = HoopTrackEnvironment.origin,
        session: URLSession = .shared
    ) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = JSONDecoder()
    }

    func login(email: String, password: String) async throws -> User {
        let response: UserEnvelope = try await request(
            "api/auth/login",
            method: "POST",
            body: ["email": email, "password": password]
        )
        return response.user
    }

    func currentUser() async throws -> User {
        let response: UserEnvelope = try await request("api/auth/me")
        return response.user
    }

    func logout() async throws {
        let _: SuccessEnvelope = try await request("api/auth/logout", method: "POST")
    }

    func players() async throws -> [Player] {
        let response: PlayersEnvelope = try await request("api/players?activity=true")
        return response.players
    }

    func groups() async throws -> GroupsEnvelope {
        try await request("api/coach/groups")
    }

    func createGroup(name: String, type: String, limit: Int?, description: String?) async throws -> Int {
        var payload: [String: Any] = ["name": name, "group_type": type]
        if let limit {
            payload["player_limit"] = limit
        }
        if let description, !description.isEmpty {
            payload["description"] = description
        }
        let response: CreatedEnvelope = try await request("api/coach/groups", method: "POST", body: payload)
        return response.id
    }

    func invitePlayer(groupID: Int, email: String, message: String?) async throws -> Int {
        var payload: [String: Any] = ["email": email]
        if let message, !message.isEmpty {
            payload["message"] = message
        }
        let response: CreatedEnvelope = try await request("api/coach/groups/\(groupID)/invites", method: "POST", body: payload)
        return response.id
    }

    func workouts() async throws -> [Workout] {
        let response: WorkoutsEnvelope = try await request("api/workouts")
        return response.workouts
    }

    func workout(id: Int) async throws -> WorkoutDetail {
        let response: WorkoutDetailEnvelope = try await request("api/workouts/\(id)")
        return WorkoutDetail(
            id: response.workout.id,
            title: response.workout.title,
            description: response.workout.description,
            category: response.workout.category,
            timerMode: response.workout.timerMode,
            durationSeconds: response.workout.durationSeconds,
            drills: response.drills
        )
    }

    func moves(playerID: Int? = nil) async throws -> [MoveStudy] {
        let path = playerID.map { "api/moves?playerId=\($0)" } ?? "api/moves"
        let response: MovesEnvelope = try await request(path)
        return response.moves
    }

    func quizzes() async throws -> [Quiz] {
        let response: QuizzesEnvelope = try await request("api/quizzes")
        return response.quizzes
    }

    func createWorkout(title: String, description: String?, category: String, drills: [Drill]) async throws -> Int {
        let payload: [String: Any] = [
            "title": title,
            "description": description ?? "",
            "category": category,
            "drills": drills.map { drill in
                var drillPayload: [String: Any] = [
                    "name": drill.name,
                    "description": drill.description ?? "",
                    "category": drill.category ?? category,
                    "duration_seconds": drill.durationSeconds ?? 60,
                    "timer_mode": drill.timerMode ?? "timed"
                ]
                if let targetReps = drill.targetReps {
                    drillPayload["target_reps"] = targetReps
                }
                return drillPayload
            }
        ]
        let response: CreatedEnvelope = try await request("api/workouts", method: "POST", body: payload)
        return response.id
    }

    func createDrill(workoutID: Int, name: String, description: String?, category: String, durationSeconds: Int, timerMode: String, targetReps: Int?) async throws -> Int {
        var payload: [String: Any] = [
            "workout_id": workoutID,
            "name": name,
            "description": description ?? "",
            "category": category,
            "duration_seconds": durationSeconds,
            "timer_mode": timerMode,
            "rest_seconds": 0
        ]
        if let targetReps {
            payload["target_reps"] = targetReps
        }
        let response: CreatedEnvelope = try await request("api/drills", method: "POST", body: payload)
        return response.id
    }

    func createMove(title: String, category: String, description: String?, youtubeURL: String?, assignedPlayerID: Int?) async throws -> Int {
        var payload: [String: Any] = [
            "title": title,
            "category": category,
            "description": description ?? "",
            "youtube_url": youtubeURL ?? "",
            "video_type": "youtube"
        ]
        if let assignedPlayerID {
            payload["assigned_to_player_id"] = assignedPlayerID
        }
        let response: CreatedEnvelope = try await request("api/moves", method: "POST", body: payload)
        return response.id
    }

    func createQuiz(title: String, question: QuizQuestion) async throws -> Int {
        let payload: [String: Any] = [
            "title": title,
            "type": "multiple_choice",
            "questions": [[
                "question_text": question.questionText,
                "video_url": question.videoURL ?? "",
                "options": question.options,
                "correct_answer": question.correctAnswer
            ]]
        ]
        let response: CreatedEnvelope = try await request("api/quizzes", method: "POST", body: payload)
        return response.id
    }

    func createClassroomWork(title: String, position: String, gameSituation: String, question: QuizQuestion) async throws -> Int {
        let payload: [String: Any] = [
            "title": title,
            "type": "mixed",
            "timer_mode": "stopwatch",
            "duration_seconds": NSNull(),
            "position": position,
            "game_situation": gameSituation,
            "questions": [[
                "question_text": question.questionText,
                "video_url": question.videoURL ?? "",
                "options": question.options,
                "correct_answer": question.correctAnswer
            ]]
        ]
        let response: CreatedEnvelope = try await request("api/quizzes", method: "POST", body: payload)
        return response.id
    }

    func schedule() async throws -> [ScheduleItem] {
        let response: ScheduleEnvelope = try await request("api/schedule")
        return response.schedule
    }

    func assignWorkout(playerID: Int, workoutID: Int, date: Date, notes: String?) async throws -> Int {
        var payload: [String: Any] = [
            "player_id": playerID,
            "workout_id": workoutID,
            "item_type": "workout",
            "scheduled_date": Self.dayFormatter.string(from: date)
        ]
        if let notes, !notes.isEmpty {
            payload["notes"] = notes
        }
        let response: CreatedEnvelope = try await request("api/schedule", method: "POST", body: payload)
        return response.id
    }

    func createScheduleItem(_ input: ScheduleAssignmentInput) async throws -> Int {
        var payload: [String: Any] = [
            "player_id": input.playerID,
            "item_type": input.itemType,
            "scheduled_date": input.scheduledDate
        ]
        if let itemID = input.itemID { payload["item_id"] = itemID }
        if let title = input.title, !title.isEmpty { payload["title"] = title }
        if let notes = input.notes, !notes.isEmpty { payload["notes"] = notes }
        if let startTime = input.startTime, !startTime.isEmpty { payload["start_time"] = startTime }
        if let endTime = input.endTime, !endTime.isEmpty { payload["end_time"] = endTime }
        let response: CreatedEnvelope = try await request("api/schedule", method: "POST", body: payload)
        return response.id
    }

    func bulkAssign(_ input: BulkScheduleInput) async throws -> Int {
        let payload: [String: Any] = [
            "bulk": true,
            "player_id": input.playerID,
            "dates": input.dates,
            "items": input.items.map { item in
                var itemPayload: [String: Any] = ["item_type": item.itemType]
                if let itemID = item.itemID { itemPayload["item_id"] = itemID }
                if let title = item.title { itemPayload["title"] = title }
                if let notes = item.notes { itemPayload["notes"] = notes }
                if let startTime = item.startTime { itemPayload["start_time"] = startTime }
                if let endTime = item.endTime { itemPayload["end_time"] = endTime }
                return itemPayload
            }
        ]
        let response: CountEnvelope = try await request("api/schedule", method: "POST", body: payload)
        return response.count
    }

    func createCalendarEvent(_ input: CalendarEventInput) async throws -> Int {
        var payload: [String: Any] = [
            "player_id": input.playerID,
            "title": input.title,
            "type": input.type,
            "startsAt": input.startsAt
        ]
        if let endsAt = input.endsAt { payload["endsAt"] = endsAt }
        if let location = input.location { payload["location"] = location }
        if let opponent = input.opponent { payload["opponent"] = opponent }
        if let notes = input.notes { payload["notes"] = notes }
        let response: CreatedEnvelope = try await request("api/suite/calendar/create", method: "POST", body: payload)
        return response.id
    }

    func recordings() async throws -> [Recording] {
        let response: RecordingsEnvelope = try await request("api/recordings")
        return response.recordings
    }

    func createRecording(playerID: Int?, drillID: Int, blobKey: String, duration: Int, notes: String, reps: Int?) async throws -> Int {
        var payload: [String: EncodableValue] = [
            "drillId": .int(drillID),
            "blobKey": .string(blobKey),
            "duration": .int(duration),
            "notes": .string(notes)
        ]
        if let playerID {
            payload["playerId"] = .int(playerID)
        }
        if let reps {
            payload["rep_count"] = .int(reps)
        }
        let response: CreatedEnvelope = try await request("api/recordings", method: "POST", encodableBody: payload)
        return response.id
    }

    func uploadRecordingVideo(recordingID: Int, blobKey: String, fileURL: URL) async throws {
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: baseURL.appending(path: "api/recordings/upload"))
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var data = Data()
        data.appendMultipartField(name: "recording_id", value: "\(recordingID)", boundary: boundary)
        data.appendMultipartField(name: "blob_key", value: blobKey, boundary: boundary)
        let video = try Data(contentsOf: fileURL)
        data.appendMultipartFile(
            name: "video",
            filename: sanitizedMultipartToken(fileURL.lastPathComponent),
            mimeType: "video/mp4",
            fileData: video,
            boundary: boundary
        )
        data.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = data

        let (responseData, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.server(status: http.statusCode, message: ErrorEnvelope.decodeMessage(from: responseData))
        }
    }

    func clipRecording(id: Int, start: Int, end: Int, title: String) async throws -> Int {
        let response: CreatedEnvelope = try await request(
            "api/recordings/\(id)/clip",
            method: "POST",
            body: ["clip_start": start, "clip_end": end, "title": title]
        )
        return response.id
    }

    func activity() async throws -> [ActivityItem] {
        let response: ActivityEnvelope = try await request("api/activity?limit=80")
        return response.items
    }

    func progress(period: String = "month") async throws -> ProgressReport {
        try await request("api/progress/report?period=\(period)")
    }

    func contacts() async throws -> [MessageContact] {
        let response: ContactsEnvelope = try await request("api/users/contacts")
        return response.contacts.filter { $0.role == .player }
    }

    func messages(with userID: Int) async throws -> [DirectMessage] {
        let response: MessagesEnvelope = try await request("api/messages?with=\(userID)")
        return response.messages
    }

    func sendMessage(to userID: Int, body: String) async throws {
        let _: CreatedEnvelope = try await request(
            "api/messages",
            method: "POST",
            body: ["recipient_id": userID, "body": body]
        )
    }

    func threadMessages(contextType: String, contextID: Int) async throws -> [ThreadMessage] {
        var components = URLComponents()
        components.path = "/api/messages/thread"
        components.queryItems = [
            URLQueryItem(name: "context_type", value: contextType),
            URLQueryItem(name: "context_id", value: String(contextID))
        ]
        guard let relativePath = components.string?.dropFirst() else {
            throw APIError.invalidResponse
        }
        let response: ThreadMessagesEnvelope = try await request(String(relativePath))
        return response.messages
    }

    func sendThreadMessage(contextType: String, contextID: Int, contextTitle: String?, body: String, attachment: MessageAttachment? = nil) async throws {
        if let attachment {
            try await sendThreadMessageWithAttachment(contextType: contextType, contextID: contextID, contextTitle: contextTitle, body: body, attachment: attachment)
            return
        }
        let _: CreatedEnvelope = try await request(
            "api/messages/thread",
            method: "POST",
            body: [
                "context_type": contextType,
                "context_id": contextID,
                "context_title": contextTitle ?? "",
                "body": body
            ]
        )
    }

    func notifications(unreadOnly: Bool = false, playerID: Int? = nil) async throws -> [NotificationItem] {
        var path = "api/notifications?limit=50&unread_only=\(unreadOnly ? "true" : "false")"
        if let playerID { path += "&playerId=\(playerID)" }
        let response: NotificationsEnvelope = try await request(path)
        return response.notifications
    }

    func unreadNotificationCount() async throws -> Int {
        let response: CountEnvelope = try await request("api/notifications/unread-count")
        return response.count
    }

    func markNotificationRead(id: Int) async throws {
        let _: SuccessEnvelope = try await request("api/notifications/\(id)/read", method: "PUT")
    }

    func markAllNotificationsRead() async throws {
        let _: SuccessEnvelope = try await request("api/notifications/mark-all-read", method: "POST")
    }

    func sendDueNotifications() async throws {
        let _: SuccessEnvelope = try await request("api/notifications/due", method: "POST")
    }

    func registerAPNS(deviceToken: String, environment: String, bundleID: String) async throws {
        let _: SuccessEnvelope = try await request(
            "api/push/apns",
            method: "POST",
            body: [
                "device_token": deviceToken,
                "environment": environment,
                "bundle_id": bundleID
            ]
        )
    }

    func aiWorkout(playerName: String?, skillLevel: String, focusAreas: [String], duration: Int, autoSave: Bool) async throws -> AIWorkoutResult {
        let response: AIWorkoutEnvelope = try await request(
            "api/ai/workout",
            method: "POST",
            body: ["playerName": playerName ?? "", "skillLevel": skillLevel, "focusAreas": focusAreas, "duration": duration, "autoSave": autoSave]
        )
        return response.workout
    }

    func aiQuiz(topic: String, difficulty: String, questionCount: Int, autoSave: Bool) async throws -> AIQuizResult {
        let response: AIQuizEnvelope = try await request(
            "api/ai/quiz",
            method: "POST",
            body: ["topic": topic, "difficulty": difficulty, "questionCount": questionCount, "autoSave": autoSave]
        )
        return response.quiz
    }

    func aiProgress(playerID: Int) async throws -> ProgressReport {
        try await request("api/ai/progress?playerId=\(playerID)")
    }

    func aiFeedback(drillID: Int, duration: Int) async throws -> String {
        let response: AIFeedbackEnvelope = try await request("api/ai/feedback", method: "POST", body: ["drillId": drillID, "duration": duration])
        return response.feedback
    }

    func aiMoves(playerID: Int, skillLevel: String) async throws -> [AIMoveRecommendation] {
        try await request("api/ai/moves", method: "POST", body: ["playerId": playerID, "skillLevel": skillLevel])
    }

    func aiInspiration(playerName: String?) async throws -> String {
        let response: AIInspirationEnvelope = try await request("api/ai/inspiration", method: "POST", body: ["playerName": playerName ?? ""])
        return response.message
    }

    func setScheduleCompletion(id: Int, completed: Bool) async throws {
        let _: SuccessEnvelope = try await request("api/schedule/\(id)", method: "PUT", body: ["completed": completed])
    }

    func deleteAccount(password: String) async throws {
        let _: SuccessEnvelope = try await request(
            "api/account/delete",
            method: "DELETE",
            body: ["password": password, "confirmation": "DELETE"]
        )
    }

    func clearSession() {
        let storage = HTTPCookieStorage.shared
        storage.cookies?.forEach { cookie in
            if cookie.domain.contains(baseURL.host ?? "") {
                storage.deleteCookie(cookie)
            }
        }
    }

    func recordingVideoURL(id: Int) -> URL {
        baseURL.appending(path: "api/recordings/\(id)/video")
    }

    private func request<T: Decodable>(_ path: String) async throws -> T {
        try await performRequest(path, method: "GET", data: nil)
    }

    private func request<T: Decodable>(_ path: String, method: String) async throws -> T {
        try await performRequest(path, method: method, data: nil)
    }

    private func request<T: Decodable>(_ path: String, method: String, body: [String: Any]) async throws -> T {
        let data = try JSONSerialization.data(withJSONObject: body)
        return try await performRequest(path, method: method, data: data)
    }

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        encodableBody: [String: EncodableValue]
    ) async throws -> T {
        let data = try JSONEncoder().encode(encodableBody)
        return try await performRequest(path, method: method, data: data)
    }

    private func performRequest<T: Decodable>(_ path: String, method: String, data: Data?) async throws -> T {
        let pathAndQuery = path.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)
        components?.path = "/" + pathAndQuery[0].trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        components?.percentEncodedQuery = pathAndQuery.count == 2 ? String(pathAndQuery[1]) : nil
        guard !path.contains("://"),
              let url = components?.url,
              url.scheme == baseURL.scheme,
              url.host == baseURL.host else {
            throw APIError.invalidResponse
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = data
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if data != nil {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let (responseData, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.server(status: http.statusCode, message: ErrorEnvelope.decodeMessage(from: responseData))
        }
        return try decoder.decode(T.self, from: responseData)
    }

    private func sendThreadMessageWithAttachment(
        contextType: String,
        contextID: Int,
        contextTitle: String?,
        body: String,
        attachment: MessageAttachment
    ) async throws {
        let boundary = "Boundary-\(UUID().uuidString)"
        var request = URLRequest(url: baseURL.appending(path: "api/messages/thread"))
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var data = Data()
        data.appendMultipartField(name: "context_type", value: contextType, boundary: boundary)
        data.appendMultipartField(name: "context_id", value: "\(contextID)", boundary: boundary)
        data.appendMultipartField(name: "context_title", value: contextTitle ?? "", boundary: boundary)
        data.appendMultipartField(name: "body", value: body, boundary: boundary)
        data.appendMultipartField(name: "attachment_type", value: attachment.type, boundary: boundary)
        if let duration = attachment.durationSeconds {
            data.appendMultipartField(name: "attachment_duration_seconds", value: "\(duration)", boundary: boundary)
        }
        let file = try Data(contentsOf: attachment.fileURL)
        data.appendMultipartFile(
            name: "attachment",
            filename: sanitizedMultipartToken(attachment.fileURL.lastPathComponent),
            mimeType: attachment.mimeType,
            fileData: file,
            boundary: boundary
        )
        data.append("--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = data

        let (responseData, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.server(status: http.statusCode, message: ErrorEnvelope.decodeMessage(from: responseData))
        }
    }

    static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

enum EncodableValue: Encodable {
    case int(Int)
    case string(String)
    case bool(Bool)

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case let .int(value): try container.encode(value)
        case let .string(value): try container.encode(value)
        case let .bool(value): try container.encode(value)
        }
    }
}

enum APIError: LocalizedError, Equatable {
    case invalidResponse
    case server(status: Int, message: String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return String(localized: "error.invalidResponse")
        case let .server(_, message):
            return message
        }
    }
}

private struct UserEnvelope: Codable { let user: User }
private struct PlayersEnvelope: Codable { let players: [Player] }
private struct WorkoutsEnvelope: Codable { let workouts: [Workout] }
private struct WorkoutDetailEnvelope: Codable { let workout: Workout; let drills: [Drill] }
private struct MovesEnvelope: Codable { let moves: [MoveStudy] }
private struct QuizzesEnvelope: Codable { let quizzes: [Quiz] }
private struct ScheduleEnvelope: Codable { let schedule: [ScheduleItem] }
private struct RecordingsEnvelope: Codable { let recordings: [Recording] }
private struct ActivityEnvelope: Codable { let items: [ActivityItem] }
private struct ContactsEnvelope: Codable { let contacts: [MessageContact] }
private struct MessagesEnvelope: Codable { let messages: [DirectMessage] }
private struct ThreadMessagesEnvelope: Codable { let messages: [ThreadMessage] }
private struct NotificationsEnvelope: Codable { let notifications: [NotificationItem] }
private struct AIWorkoutEnvelope: Codable { let workout: AIWorkoutResult }
private struct AIQuizEnvelope: Codable { let quiz: AIQuizResult }
private struct AIFeedbackEnvelope: Codable { let feedback: String }
private struct AIInspirationEnvelope: Codable { let message: String }

private struct ErrorEnvelope: Codable {
    let error: String?

    static func decodeMessage(from data: Data) -> String {
        if let decoded = try? JSONDecoder().decode(ErrorEnvelope.self, from: data),
           let error = decoded.error,
           !error.isEmpty {
            return error
        }
        return String(localized: "error.server")
    }
}

private extension Data {
    mutating func appendMultipartField(name: String, value: String, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8)!)
        append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
        append("\(value)\r\n".data(using: .utf8)!)
    }

    mutating func appendMultipartFile(name: String, filename: String, mimeType: String, fileData: Data, boundary: String) {
        let safeName = sanitizedMultipartToken(name)
        let safeFilename = sanitizedMultipartToken(filename)
        append("--\(boundary)\r\n".data(using: .utf8)!)
        append("Content-Disposition: form-data; name=\"\(safeName)\"; filename=\"\(safeFilename)\"\r\n".data(using: .utf8)!)
        append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        append(fileData)
        append("\r\n".data(using: .utf8)!)
    }
}

private func sanitizedMultipartToken(_ value: String) -> String {
    let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "._-"))
    let scalars = value.unicodeScalars.map { allowed.contains($0) ? Character(String($0)) : "_" }
    return String(scalars).prefix(180).description
}
