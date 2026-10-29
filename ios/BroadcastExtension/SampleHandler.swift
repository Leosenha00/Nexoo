import ReplayKit

/// ReplayKit delivers screen and audio sample buffers here.
/// TODO: implement authenticated WebRTC publishing to the Nexoo call.
/// Do not mark broadcasting as functional until the WebRTC transport,
/// authentication, signaling, and lifecycle are implemented and tested.
final class SampleHandler: RPBroadcastSampleHandler {
    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        // Transport initialization pending.
    }

    override func broadcastPaused() {}
    override func broadcastResumed() {}
    override func broadcastFinished() {}

    override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer,
                                      with sampleBufferType: RPSampleBufferType) {
        // Video/audio frames require encoding and WebRTC transmission.
    }
}
