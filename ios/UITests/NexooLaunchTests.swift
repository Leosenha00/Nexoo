import XCTest

final class NexooLaunchTests: XCTestCase {
    func testNativeEntryAndWebPresentation() {
        let app = XCUIApplication()
        app.launch()
        let open = app.buttons["openWeb"]
        XCTAssertTrue(open.waitForExistence(timeout: 10))
        open.tap()
        let close = app.buttons["Fechar"]
        XCTAssertTrue(close.waitForExistence(timeout: 5))
        close.tap()
        XCTAssertTrue(open.waitForExistence(timeout: 5))
    }
}
