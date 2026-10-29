import SwiftUI
import WebRTC

struct VideoSurface: UIViewRepresentable {
    let track: RTCVideoTrack
    func makeUIView(context: Context) -> RTCMTLVideoView {
        let view = RTCMTLVideoView(); view.videoContentMode = .scaleAspectFit
        track.add(view); context.coordinator.track = track
        return view
    }
    func updateUIView(_ view: RTCMTLVideoView, context: Context) {
        if context.coordinator.track !== track {
            context.coordinator.track?.remove(view); track.add(view); context.coordinator.track = track
        }
    }
    static func dismantleUIView(_ view: RTCMTLVideoView, coordinator: Coordinator) { coordinator.track?.remove(view) }
    func makeCoordinator() -> Coordinator { Coordinator() }
    final class Coordinator { var track: RTCVideoTrack? }
}
struct CallView: View {
    @ObservedObject var call: CallController
    @State private var muted = false
    @State private var fullscreen = false
    var body: some View {
        VStack(spacing: 16) {
            Text(call.state)
            if call.callID != nil { Text("Limite de vídeo: \(call.videoBitrate / 1000) kbps").font(.caption) }
            if let error = call.error { Text(error).foregroundStyle(.red) }
            if let incoming = call.incoming {
                Text("Chamada de \((incoming["user"] as? [String: Any])?["name"] as? String ?? "amigo")")
                HStack {
                    Button("Aceitar") { call.answer(accept: true) }
                    Button("Recusar", role: .destructive) { call.answer(accept: false) }
                }
            }
            if let track = call.remoteVideo { VideoSurface(track: track).frame(minHeight: 200) }
            if let track = call.remoteScreen {
                VideoSurface(track: track).frame(minHeight: 220)
                Button("Tela inteira") { fullscreen = true }
            }
            if call.callID != nil {
                Toggle("Microfone desligado", isOn: $muted).onChange(of: muted) { call.mute($0) }
                Button("Encerrar", role: .destructive) { call.end() }
            }
            Text("Chamadas nativas em validação. Recebimento apenas com o app aberto. Transmissão ReplayKit ainda indisponível.").font(.caption)
        }.padding().fullScreenCover(isPresented: $fullscreen) {
            ZStack(alignment: .topTrailing) {
                Color.black.ignoresSafeArea()
                if let track = call.remoteScreen { VideoSurface(track: track).ignoresSafeArea() }
                Button("Fechar") { fullscreen = false }.padding().buttonStyle(.borderedProminent)
            }
        }
    }
}
