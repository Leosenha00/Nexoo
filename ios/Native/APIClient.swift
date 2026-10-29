import Foundation

struct NexooUser: Codable, Identifiable, Equatable {
    let id: String
    let handle: String
    let name: String
    let avatar: String
    let status: String?
}
struct Relation: Decodable, Identifiable {
    let id: String
    let fromId: String
    let toId: String
    let state: String
    let user: NexooUser?
}
struct SessionResponse: Decodable { let token: String }
struct APIError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}

/// Injectable URLSession keeps transport tests isolated from production accounts.
final class APIClient {
    let baseURL: URL
    var origin: String {
        var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false)!
        components.path = ""; components.query = nil; components.fragment = nil
        return components.string!
    }
    let session: URLSession
    var token: String?
    init(baseURL: URL, session: URLSession? = nil) {
        self.baseURL = baseURL
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil // Native auth uses Bearer only.
        self.session = session ?? URLSession(configuration: configuration)
    }
    func request<T: Decodable>(_ path: String, method: String = "GET", body: [String: String]? = nil) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL.appendingPathComponent("api", isDirectory: true)) else {
            throw APIError(status: 0, message: "Endereço inválido")
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 25
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(origin, forHTTPHeaderField: "Origin")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let body { request.httpBody = try JSONEncoder().encode(body) }
        let (data, response) = try await session.data(for: request)
        guard let response = response as? HTTPURLResponse else {
            throw APIError(status: 0, message: "Resposta inválida")
        }
        guard (200..<300).contains(response.statusCode) else {
            let message = (try? JSONDecoder().decode([String: String].self, from: data)["error"]) ?? "Erro HTTP \(response.statusCode)"
            throw APIError(status: response.statusCode, message: message)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    func mutate(_ path: String, method: String = "POST", body: [String: String]? = nil) async throws {
        let _: EmptyResponse = try await request(path, method: method, body: body)
    }
}
struct EmptyResponse: Decodable {}
