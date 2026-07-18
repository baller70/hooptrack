import Foundation

final class HoopTrackAPI {
    private let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder

    init(
        baseURL: URL = URL(string: "https://hooptrack.194-146-12-139.sslip.io")!,
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

    func recordings() async throws -> [Recording] {
        let response: RecordingsEnvelope = try await request("api/recordings")
        return response.recordings
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

    func setScheduleCompletion(id: Int, completed: Bool) async throws {
        let _: SuccessEnvelope = try await request("api/schedule/\(id)", method: "PUT", body: ["completed": completed])
    }

    func clearSession() {
        let storage = HTTPCookieStorage.shared
        storage.cookies?.forEach { cookie in
            if cookie.domain.contains("hooptrack.194-146-12-139.sslip.io") {
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

    private func performRequest<T: Decodable>(_ path: String, method: String, data: Data?) async throws -> T {
        let url = path.hasPrefix("http") ? URL(string: path)! : baseURL.appending(path: path)
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

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
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
private struct ScheduleEnvelope: Codable { let schedule: [ScheduleItem] }
private struct RecordingsEnvelope: Codable { let recordings: [Recording] }
private struct ActivityEnvelope: Codable { let items: [ActivityItem] }
private struct ContactsEnvelope: Codable { let contacts: [MessageContact] }
private struct MessagesEnvelope: Codable { let messages: [DirectMessage] }

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
