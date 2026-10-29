import Foundation

/// Gradual recovery; reduce bandwidth, FPS and resolution when receiver reports congestion.
enum VideoQualityPolicy {
    static func nextBitrate(current: Int, loss: Double, rtt: Double) -> Int {
        guard loss.isFinite, rtt.isFinite else { return current }
        if loss > 0.05 || rtt > 0.4 { return max(200_000, Int(Double(current) * 0.7)) }
        if loss < 0.01 && rtt < 0.2 { return min(2_000_000, current + 100_000) }
        return current
    }
}
