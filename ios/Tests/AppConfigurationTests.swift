import XCTest
@testable import Nexoo

final class AppConfigurationTests: XCTestCase {
    func testAcceptsHTTPSBackend() {
        XCTAssertEqual(AppConfiguration.validatedServerURL("https://example.com")?.host, "example.com")
    }
    func testRejectsUnsafeOrMissingConfiguration() {
        for value in [nil, "", "http://example.com", "file:///etc/passwd", "https://user:password@example.com", "https://example.com?token=secret", "https://example.com#token"] as [String?] {
            XCTAssertNil(AppConfiguration.validatedServerURL(value), "Unexpected URL: \(value ?? "nil")")
        }
    }
    func testAppContainsResolvedConfiguration() {
        XCTAssertNotNil(AppConfiguration.serverURL())
    }
}
