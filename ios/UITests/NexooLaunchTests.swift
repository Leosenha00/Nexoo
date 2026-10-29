import XCTest

final class NexooLaunchTests: XCTestCase {
    func testNativeLoginAndRegistrationForms() {
        let app = XCUIApplication(); app.launch()
        app.buttons["nativeAccount"].tap()
        XCTAssertTrue(app.textFields["email"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.secureTextFields["password"].exists)
        app.buttons["Criar conta"].tap()
        XCTAssertTrue(app.textFields["@ exclusivo"].exists)
    }
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
