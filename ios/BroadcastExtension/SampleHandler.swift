import ReplayKit

/// Fail explicitly until an authenticated extension-owned WebRTC publisher exists.
/// Merely consuming ReplayKit buffers would falsely suggest that sharing works.
final class SampleHandler: RPBroadcastSampleHandler {
    override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
        finishBroadcastWithError(NSError(domain: "Nexoo.Broadcast", code: 1, userInfo: [
            NSLocalizedDescriptionKey: "A transmissão Nexoo ainda não está disponível. Falta integrar a sessão e o transporte WebRTC da extensão."
        ]))
    }
}
