import XCTest
@testable import Nexoo

final class MemoryTokens: TokenStorage {
    var token: String?
    func read() throws -> String? { token }
    func write(_ token: String?) throws { self.token = token }
}
final class SessionStoreTests: XCTestCase {
    private let user = #"{"id":"user-1","handle":"nexoo","name":"Nexoo","avatar":"#142b4a","status":"online"}"#
    @MainActor private func setupStore(_ storage: MemoryTokens) -> SessionStore {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [StubProtocol.self]
        return SessionStore(api: APIClient(baseURL: URL(string: "https://example.com")!, session: URLSession(configuration: config)), storage: storage)
    }
    override func tearDown() { StubProtocol.handler = nil; super.tearDown() }
    @MainActor func testRestoresStoredSession() async {
        let tokens = MemoryTokens(); tokens.token = "existing-session"
        let store = setupStore(tokens)
        StubProtocol.handler = { [user] request in
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer existing-session")
            return (200, Data(user.utf8))
        }
        await store.restore()
        XCTAssertEqual(store.user?.handle, "nexoo")
    }
    @MainActor func testRevokedSessionIsRemoved() async {
        let tokens = MemoryTokens(); tokens.token = "revoked-session"
        let store = setupStore(tokens)
        StubProtocol.handler = { _ in (401, Data(#"{"error":"Entre na sua conta"}"#.utf8)) }
        await store.restore()
        XCTAssertNil(tokens.token); XCTAssertNil(store.api.token); XCTAssertNil(store.user)
    }
    @MainActor func testLoginPersistsOnlyTokenAndFetchesCurrentUser() async {
        let tokens = MemoryTokens(); let store = setupStore(tokens)
        StubProtocol.handler = { [user] request in
            if request.url?.path == "/api/auth/login" { return (200, Data(#"{"ok":true,"token":"new-session"}"#.utf8)) }
            XCTAssertEqual(request.url?.path, "/api/me")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer new-session")
            return (200, Data(user.utf8))
        }
        await store.authenticate(email: "user@example.com", password: "password-for-test", name: nil, handle: nil)
        XCTAssertEqual(tokens.token, "new-session"); XCTAssertEqual(store.user?.id, "user-1"); XCTAssertNil(store.error)
    }
}
