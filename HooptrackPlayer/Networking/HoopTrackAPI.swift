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

    func register(name: String, email: String, password: String, ageConfirmed: Bool, termsAccepted: Bool) async throws -> User {
        let response: UserEnvelope = try await request(
            "api/auth/register",
            method: "POST",
            body: [
                "name": name,
                "email": email,
                "password": password,
                "role": "player",
                "age_confirmation": ageConfirmed,
                "terms_accepted": termsAccepted
            ]
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

    func workouts() async throws -> [Workout] {
        let response: WorkoutsEnvelope = try await request("api/workouts")
        return response.workouts
    }

    func workout(id: Int) async throws -> WorkoutDetail {
        try await request("api/workouts/\(id)")
    }

    func moves() async throws -> [MoveStudy] {
        let response: MovesEnvelope = try await request("api/moves")
        return response.moves
    }

    func schedule() async throws -> [ScheduleItem] {
        let response: ScheduleEnvelope = try await request("api/schedule")
        return response.schedule
    }

    func recordings() async throws -> [Recording] {
        let response: RecordingsEnvelope = try await request("api/recordings")
        return response.recordings
    }

    func freePlayDrill() async throws -> Drill {
        let response: DrillEnvelope = try await request("api/drills/free-play")
        return response.drill
    }

    func invites() async throws -> InviteEnvelope {
        try await request("api/player/invites")
    }

    func progress(period: String) async throws -> ProgressReport {
        try await request("api/progress/report?period=\(period)")
    }

    func contacts() async throws -> [MessageContact] {
        let response: ContactsEnvelope = try await request("api/users/contacts")
        return response.contacts.filter { $0.role == .trainer }
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
        let _: SuccessEnvelope = try await request(
            "api/schedule/\(id)",
            method: "PUT",
            body: ["completed": completed]
        )
    }

    func respondToInvite(id: Int, action: InviteAction) async throws {
        let _: InviteResponseEnvelope = try await request(
            "api/player/invites/\(id)/respond",
            method: "POST",
            body: ["action": action.rawValue]
        )
    }

    func createRecording(drillID: Int, blobKey: String, duration: Int, notes: String, reps: Int?) async throws -> Int {
        var payload: [String: EncodableValue] = [
            "drillId": .int(drillID),
            "blobKey": .string(blobKey),
            "duration": .int(duration),
            "notes": .string(notes)
        ]
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
            filename: fileURL.lastPathComponent,
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

    private func request<T: Decodable>(
        _ path: String,
        method: String,
        body: [String: Any]
    ) async throws -> T {
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

private struct UserEnvelope: Codable { let user: User }
private struct WorkoutsEnvelope: Codable { let workouts: [Workout] }
private struct MovesEnvelope: Codable { let moves: [MoveStudy] }
private struct ScheduleEnvelope: Codable { let schedule: [ScheduleItem] }
private struct RecordingsEnvelope: Codable { let recordings: [Recording] }
private struct DrillEnvelope: Codable { let drill: Drill }
private struct ContactsEnvelope: Codable { let contacts: [MessageContact] }
private struct MessagesEnvelope: Codable { let messages: [DirectMessage] }
private struct SuccessEnvelope: Codable { let success: Bool }
private struct CreatedEnvelope: Codable { let id: Int }
private struct InviteResponseEnvelope: Codable { let status: String }
private struct ErrorEnvelope: Codable {
    let error: String

    static func decodeMessage(from data: Data) -> String {
        (try? JSONDecoder().decode(ErrorEnvelope.self, from: data).error) ?? String(localized: "error.generic")
    }
}

private extension Data {
    mutating func appendMultipartField(name: String, value: String, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8)!)
        append("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
        append("\(value)\r\n".data(using: .utf8)!)
    }

    mutating func appendMultipartFile(name: String, filename: String, mimeType: String, fileData: Data, boundary: String) {
        append("--\(boundary)\r\n".data(using: .utf8)!)
        append("Content-Disposition: form-data; name=\"\(name)\"; filename=\"\(filename)\"\r\n".data(using: .utf8)!)
        append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        append(fileData)
        append("\r\n".data(using: .utf8)!)
    }
}
