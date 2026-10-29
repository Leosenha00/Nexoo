import Foundation
import Security
import SwiftUI

protocol TokenStorage {
    func read() throws -> String?
    func write(_ token: String?) throws
}
struct KeychainTokenStorage: TokenStorage {
    private var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: (Bundle.main.bundleIdentifier ?? "Nexoo") + ".session",
         kSecAttrAccount as String: "session"]
    }
    func read() throws -> String? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(q as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else {
            throw APIError(status: Int(status), message: "Não foi possível acessar sua sessão protegida.")
        }
        return String(data: data, encoding: .utf8)
    }
    func write(_ token: String?) throws {
        guard let token else {
            let status = SecItemDelete(query as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else {
                throw APIError(status: Int(status), message: "Não foi possível remover a sessão.")
            }
            return
        }
        let attributes: [String: Any] = [kSecValueData as String: Data(token.utf8),
                                       kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly]
        var status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            status = SecItemAdd(query.merging(attributes) { _, new in new } as CFDictionary, nil)
        }
        guard status == errSecSuccess else {
            throw APIError(status: Int(status), message: "Não foi possível proteger sua sessão.")
        }
    }
}

@MainActor
final class SessionStore: ObservableObject {
    @Published var user: NexooUser?
    @Published var relations: [Relation] = []
    @Published var results: [NexooUser] = []
    @Published var error: String?
    @Published var busy = false
    let api: APIClient
    private let storage: TokenStorage
    init(api: APIClient, storage: TokenStorage = KeychainTokenStorage()) {
        self.api = api; self.storage = storage
    }
    func restore() async {
        await perform {
            self.api.token = try self.storage.read()
            guard self.api.token != nil else { return }
            do { self.user = try await self.api.request("me") }
            catch let error as APIError where error.status == 401 {
                try self.storage.write(nil); self.api.token = nil; self.user = nil
                throw error
            }
        }
    }
    func authenticate(email: String, password: String, name: String?, handle: String?) async {
        await perform {
            var body = ["email": email, "password": password]
            if let name, let handle {
                body["name"] = name; body["handle"] = handle.lowercased().replacingOccurrences(of: "@", with: "")
                body["avatar"] = "#142b4a"
            }
            let response: SessionResponse = try await self.api.request(name == nil ? "auth/login" : "auth/register", method: "POST", body: body)
            try self.storage.write(response.token)
            self.api.token = response.token
            self.user = try await self.api.request("me")
        }
    }
    func logout() async {
        await perform {
            try await self.api.mutate("logout")
            try self.storage.write(nil)
            self.api.token = nil; self.user = nil; self.relations = []; self.results = []
        }
    }
    func refresh() async { await perform { self.relations = try await self.api.request("relations") } }
    func search(_ text: String) async {
        await perform {
            var components = URLComponents(); components.queryItems = [URLQueryItem(name: "q", value: text)]
            self.results = try await self.api.request("users?" + (components.percentEncodedQuery ?? ""))
        }
    }
    func relation(_ id: String, method: String) async {
        await perform { try await self.api.mutate("relations/" + id, method: method) }
        await refresh()
    }
    func add(_ user: NexooUser) async {
        await perform { try await self.api.mutate("relations", body: ["toId": user.id]) }
        await refresh()
    }
    private func perform(_ work: () async throws -> Void) async {
        guard !busy else { return }
        busy = true; error = nil
        defer { busy = false }
        do { try await work() } catch { self.error = error.localizedDescription }
    }
}
