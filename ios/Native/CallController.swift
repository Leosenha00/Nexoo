import Foundation
import AVFoundation
import Combine
import SocketIO
import WebRTC

/// Foreground calls only. PushKit/CallKit and broadcast publishing are separate milestones.
final class CallController: NSObject, ObservableObject {
    @Published var state = "Desconectado"
    @Published var callID: String?
    @Published var incoming: [String: Any]?
    @Published var remoteVideo: RTCVideoTrack?
    @Published var remoteScreen: RTCVideoTrack?
    @Published var error: String?
    @Published var videoBitrate = 1_200_000
    private var statsTimer: Timer?
    private let api: APIClient
    private var manager: SocketManager?
    private var socket: SocketIOClient? { manager?.defaultSocket }
    private static let sharedFactory: RTCPeerConnectionFactory = {
        RTCInitializeSSL()
        return RTCPeerConnectionFactory(encoderFactory: RTCDefaultVideoEncoderFactory(), decoderFactory: RTCDefaultVideoDecoderFactory())
    }()
    private let factory = CallController.sharedFactory
    private var peer: RTCPeerConnection?
    private var capturer: RTCCameraVideoCapturer?
    private var localAudio: RTCAudioTrack?
    private var pending: [RTCIceCandidate] = []
    private var userID = ""
    private var initiating = false
    private var video = false
    init(api: APIClient) { self.api = api; super.init() }

    func connect(userID: String) {
        guard manager == nil, let token = api.token else { return }
        self.userID = userID
        let manager = SocketManager(socketURL: api.baseURL, config: [.log(false), .compress, .forceWebsockets(true), .reconnects(true), .reconnectWait(2), .connectParams(["token": token]), .extraHeaders(["Authorization": "Bearer \(token)", "Origin": api.origin])])
        self.manager = manager
        let socket = manager.defaultSocket
        socket.on(clientEvent: .connect) { [weak self] _, _ in
            guard let self else { return }
            self.state = "Conectado"
            self.emit("call:resume", [:]) { _ in }
        }
        socket.on(clientEvent: .disconnect) { [weak self] _, _ in self?.state = "Reconectando sinalização…" }
        socket.on(clientEvent: .error) { [weak self] _, _ in self?.error = "Falha na sinalização. Verifique a rede e entre novamente se a sessão expirou." }
        socket.on("call:incoming") { [weak self] data, _ in
            self?.incoming = data.first as? [String: Any]
        }
        socket.on("call:accepted") { [weak self] data, _ in
            guard let self, let id = (data.first as? [String: Any])?["id"] as? String, id == self.callID else { return }
            self.offer()
        }
        socket.on("signal") { [weak self] data, _ in
            guard let signal = data.first as? [String: Any] else { return }
            self?.receive(signal)
        }
        socket.on("call:end") { [weak self] data, _ in
            guard let self, (data.first as? [String: Any])?["id"] as? String == self.callID else { return }
            self.close()
        }
        socket.on("call:reconnect") { [weak self] data, _ in
            guard let self, let value = data.first as? [String: Any], value["id"] as? String == self.callID else { return }
            if value["initiator"] as? String == self.userID { self.offer(restart: true) }
        }
        socket.connect()
    }
    func disconnect() {
        if let id = callID { emit("call:end", ["id": id]) { _ in } }
        close(); manager?.disconnect(); manager = nil; state = "Desconectado"
    }
    private func emit(_ event: String, _ data: [String: Any], completion: @escaping ([String: Any]) -> Void) {
        guard let socket, socket.status == .connected else {
            error = "Sinalização desconectada"
            if event == "call:start" { close() }
            return
        }
        socket.emitWithAck(event, data).timingOut(after: 10) { [weak self] values in
            guard let result = values.first as? [String: Any], result["ok"] as? Bool == true else {
                self?.error = (values.first as? [String: Any])?["error"] as? String ?? "Sem resposta do servidor"
                if event == "call:start" { self?.close() }
                return
            }
            completion(result["data"] as? [String: Any] ?? [:])
        }
    }
    func start(toID: String, video: Bool) {
        guard callID == nil else { return }
        error = nil; initiating = true; self.video = video
        Task { @MainActor in
            do {
                try await prepare(video: video)
                emit("call:start", ["toId": toID, "video": video]) { [weak self] result in
                    self?.callID = result["id"] as? String; self?.state = "Chamando…"
                }
            } catch { self.error = error.localizedDescription; close() }
        }
    }
    func answer(accept: Bool) {
        guard let incoming, let id = incoming["id"] as? String else { return }
        self.incoming = nil
        if !accept { emit("call:answer", ["id": id, "accept": false]) { _ in }; return }
        initiating = false; callID = id
        Task { @MainActor in
            do {
                try await prepare(video: incoming["video"] as? Bool ?? false)
                emit("call:answer", ["id": id, "accept": true]) { [weak self] _ in self?.state = "Conectando mídia…" }
            } catch {
                self.error = error.localizedDescription
                emit("call:answer", ["id": id, "accept": false]) { _ in }; close()
            }
        }
    }
    func end() {
        if let id = callID { emit("call:end", ["id": id]) { _ in } }
        close()
    }
    func mute(_ muted: Bool) { localAudio?.isEnabled = !muted }
    @MainActor private func prepare(video: Bool) async throws {
        guard await AVCaptureDevice.requestAccess(for: .audio) else { throw APIError(status: 0, message: "Permita o microfone nos Ajustes.") }
        if video {
            guard await AVCaptureDevice.requestAccess(for: .video) else { throw APIError(status: 0, message: "Permita a câmera nos Ajustes.") }
        }
        let ice: ICEConfiguration = try await api.request("ice")
        let configuration = RTCConfiguration()
        configuration.sdpSemantics = .unifiedPlan
        configuration.iceServers = ice.iceServers.map { RTCIceServer(urlStrings: $0.urls.values, username: $0.username ?? "", credential: $0.credential ?? "") }
        guard let pc = factory.peerConnection(with: configuration, constraints: RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil), delegate: self) else {
            throw APIError(status: 0, message: "WebRTC indisponível")
        }
        peer?.close(); peer = pc; pending = []
        let audio = AVAudioSession.sharedInstance()
        try audio.setCategory(.playAndRecord, mode: .videoChat, options: [.allowBluetooth, .defaultToSpeaker])
        try audio.setActive(true)
        localAudio = factory.audioTrack(withTrackId: "microphone")
        let config = RTCRtpTransceiverInit(); config.direction = .sendRecv; config.streamIds = ["nexoo"]
        if let localAudio { _ = pc.addTransceiver(with: localAudio, init: config) }
        if video {
            let source = factory.videoSource()
            let track = factory.videoTrack(with: source, trackId: "camera")
            _ = pc.addTransceiver(with: track, init: config)
            let capturer = RTCCameraVideoCapturer(delegate: source); self.capturer = capturer
            if let device = RTCCameraVideoCapturer.captureDevices().first(where: { $0.position == .front }),
               let format = RTCCameraVideoCapturer.supportedFormats(for: device).filter({ CMVideoFormatDescriptionGetDimensions($0.formatDescription).width <= 1280 }).last {
                let fps = min(30, Int(format.videoSupportedFrameRateRanges.map(\.maxFrameRate).max() ?? 30))
                try await capturer.startCapture(with: device, format: format, fps: fps)
            } else { throw APIError(status: 0, message: "Câmera não disponível neste dispositivo") }
        } else { _ = pc.addTransceiver(of: .video, init: config) }
        // Match web ordering: microphone, camera, screen video, screen audio.
        _ = pc.addTransceiver(of: .video, init: config)
        _ = pc.addTransceiver(of: .audio, init: config)
        statsTimer?.invalidate()
        statsTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in self?.adaptVideo() }
    }
    private func adaptVideo() {
        guard let pc = peer else { return }
        pc.statistics { [weak self] report in
            DispatchQueue.main.async {
                guard let self, self.peer === pc else { return }
                let reports = report.statistics.values.filter { $0.type == "remote-inbound-rtp" }
                guard !reports.isEmpty else { return }
                let loss = reports.compactMap { ($0.values["fractionLost"] as? NSNumber)?.doubleValue }.max() ?? 0
                let rtt = reports.compactMap { ($0.values["roundTripTime"] as? NSNumber)?.doubleValue }.max() ?? 0
                self.videoBitrate = VideoQualityPolicy.nextBitrate(current: self.videoBitrate, loss: loss, rtt: rtt)
                for sender in pc.senders where sender.track?.kind == "video" {
                    let parameters = sender.parameters
                    for encoding in parameters.encodings {
                        encoding.maxBitrateBps = NSNumber(value: self.videoBitrate)
                        encoding.maxFramerate = NSNumber(value: self.videoBitrate < 500_000 ? 15 : 30)
                        encoding.scaleResolutionDownBy = NSNumber(value: self.videoBitrate < 500_000 ? 2.0 : 1.0)
                    }
                    sender.parameters = parameters
                }
            }
        }
    }
    private func offer(restart: Bool = false) {
        guard let pc = peer, pc.signalingState == .stable else { return }
        let constraints = RTCMediaConstraints(mandatoryConstraints: restart ? ["IceRestart": "true"] : nil, optionalConstraints: nil)
        pc.offer(for: constraints) { [weak self] sdp, error in
            if let error { DispatchQueue.main.async { self?.error = error.localizedDescription }; return }
            if let sdp { self?.localDescription(sdp, for: pc) }
        }
    }
    private func localDescription(_ description: RTCSessionDescription, for pc: RTCPeerConnection) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.peer === pc, let id = self.callID else { return }
            pc.setLocalDescription(description) { [weak self] error in
                DispatchQueue.main.async {
                    guard let self, self.peer === pc, self.callID == id else { return }
                    if let error { self.error = error.localizedDescription; return }
                    self.emit("signal", ["id": id, "description": ["type": description.type == .offer ? "offer" : "answer", "sdp": description.sdp]]) { _ in }
                }
            }
        }
    }
    private func receive(_ signal: [String: Any]) {
        guard let pc = peer, signal["id"] as? String == callID else { return }
        if let value = signal["description"] as? [String: String], let sdp = value["sdp"] {
            let type: RTCSdpType = value["type"] == "offer" ? .offer : .answer
            if type == .offer && pc.signalingState != .stable { return } // No local renegotiation while an offer is pending.
            pc.setRemoteDescription(RTCSessionDescription(type: type, sdp: sdp)) { [weak self] error in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if let error { self.error = error.localizedDescription; return }
                    self.pending.forEach { pc.add($0, completionHandler: { _ in }) }; self.pending = []
                    if type == .offer {
                        pc.answer(for: RTCMediaConstraints(mandatoryConstraints: nil, optionalConstraints: nil)) { [weak self] answer, _ in
                            if let answer { self?.localDescription(answer, for: pc) }
                        }
                    }
                }
            }
        } else if let value = signal["candidate"] as? [String: Any], let sdp = value["candidate"] as? String {
            let candidate = RTCIceCandidate(sdp: sdp, sdpMLineIndex: (value["sdpMLineIndex"] as? Int32) ?? 0, sdpMid: value["sdpMid"] as? String)
            if pc.remoteDescription == nil { pending.append(candidate) } else { pc.add(candidate, completionHandler: { _ in }) }
        }
    }
    private func close() {
        statsTimer?.invalidate(); statsTimer = nil
        capturer?.stopCapture(); capturer = nil
        peer?.close(); peer = nil; localAudio = nil; pending = []
        remoteVideo = nil; remoteScreen = nil; callID = nil; incoming = nil; state = "Conectado"
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}

extension CallController: RTCPeerConnectionDelegate {
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange stateChanged: RTCSignalingState) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didAdd stream: RTCMediaStream) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove stream: RTCMediaStream) {}
    func peerConnectionShouldNegotiate(_ peerConnection: RTCPeerConnection) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceConnectionState) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.peer === peerConnection else { return }
            self.state = newState == .connected || newState == .completed ? "Chamada conectada" : "Conectando mídia…"
            if newState == .failed && self.initiating { self.offer(restart: true) }
        }
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didChange newState: RTCIceGatheringState) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didGenerate candidate: RTCIceCandidate) {
        DispatchQueue.main.async { [weak self] in
            guard let self, self.peer === peerConnection, let id = self.callID else { return }
            self.emit("signal", ["id": id, "candidate": ["candidate": candidate.sdp, "sdpMLineIndex": candidate.sdpMLineIndex, "sdpMid": candidate.sdpMid ?? ""]]) { _ in }
        }
    }
    func peerConnection(_ peerConnection: RTCPeerConnection, didRemove candidates: [RTCIceCandidate]) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didOpen dataChannel: RTCDataChannel) {}
    func peerConnection(_ peerConnection: RTCPeerConnection, didStartReceivingOn transceiver: RTCRtpTransceiver) {
        DispatchQueue.main.async { [weak self] in
            guard let self, let track = transceiver.receiver.track as? RTCVideoTrack else { return }
            if peerConnection.transceivers.firstIndex(of: transceiver) == 2 { self.remoteScreen = track } else { self.remoteVideo = track }
        }
    }
}
struct ICEConfiguration: Decodable { let iceServers: [ICEServer] }
struct ICEServer: Decodable {
    let urls: ICEURLs
    let username: String?
    let credential: String?
}
enum ICEURLs: Decodable {
    case one(String), many([String])
    init(from decoder: Decoder) throws {
        let value = try decoder.singleValueContainer()
        if let single = try? value.decode(String.self) { self = .one(single) }
        else { self = .many(try value.decode([String].self)) }
    }
    var values: [String] { switch self { case .one(let value): return [value]; case .many(let values): return values } }
}
