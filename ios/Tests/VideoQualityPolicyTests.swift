import XCTest
@testable import Nexoo
final class VideoQualityPolicyTests: XCTestCase {
    func testCongestionReducesBitrateAndKeepsMinimum() {
        XCTAssertEqual(VideoQualityPolicy.nextBitrate(current: 1_000_000, loss: 0.1, rtt: 0.1), 700_000)
        XCTAssertEqual(VideoQualityPolicy.nextBitrate(current: 200_000, loss: 0, rtt: 0.8), 200_000)
    }
    func testRecoveryIsGradualAndBounded() {
        XCTAssertEqual(VideoQualityPolicy.nextBitrate(current: 700_000, loss: 0, rtt: 0.1), 800_000)
        XCTAssertEqual(VideoQualityPolicy.nextBitrate(current: 2_000_000, loss: 0, rtt: 0.1), 2_000_000)
    }
    func testIntermediateNetworkDoesNotOscillate() {
        XCTAssertEqual(VideoQualityPolicy.nextBitrate(current: 700_000, loss: 0.02, rtt: 0.25), 700_000)
    }
}
