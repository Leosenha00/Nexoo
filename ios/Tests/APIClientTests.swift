import XCTest
@testable import Nexoo

final class StubProtocol: URLProtocol {
    static var handler: ((URLRequest) throws -> (Int, Data))?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        do {
            let (status, data) = try Self.handler!(request)
            client?.urlProtocol(self, didReceive: HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data); client?.urlProtocolDidFinishLoading(self)
        } catch { client?.urlProtocol(self, didFailWithError: error) }
    }
    override func stopLoading() {}
}
final class APIClientTests: XCTestCase {
    private func client() -> APIClient {
        let config = URLSessionConfiguration.ephemeral; config.protocolClasses = [StubProtocol.self]
        return APIClient(baseURL: URL(string: "https://example.com/")!, session: URLSession(configuration: config))
    }
    override func tearDown() { StubProtocol.handler = nil; super.tearDown() }
    func testNativeMutationUsesBearerAndAllowedOrigin() async throws {
        let api = client(); api.token = "test-token"
        StubProtocol.handler = { request in
            XCTAssertEqual(request.url?.path, "/api/relations")
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer test-token")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Origin"), "https://example.com")
            return (200, Data("{\"id\":\"relation\"}".utf8))
        }
        try await api.mutate("relations", body: ["toId": "friend"])
    }
    func testServerErrorIsNotTreatedAsSuccessfulLogin() async throws {
        let api = client()
        StubProtocol.handler = { _ in (401, Data("{\"error\":\"Credenciais inválidas\"}".utf8)) }
        do {
            let _: SessionResponse = try await api.request("auth/login", method: "POST", body: ["email": "x@y.com", "password": "wrong"])
            XCTFail("Expected failure")
        } catch let error as APIError { XCTAssertEqual(error.status, 401); XCTAssertEqual(error.message, "Credenciais inválidas") }
    }
    func testICEAcceptsSTUNStringAndTURNArray() throws {
        let json = #"{"iceServers":[{"urls":"stun:example.com"},{"urls":["turn:example.com"],"username":"u","credential":"p"}]}"#
        let ice = try JSONDecoder().decode(ICEConfiguration.self, from: Data(json.utf8))
        XCTAssertEqual(ice.iceServers[0].urls.values, ["stun:example.com"])
        XCTAssertEqual(ice.iceServers[1].credential, "p")
    }
}
