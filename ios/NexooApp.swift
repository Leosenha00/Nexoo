import SwiftUI
import WebKit
import ReplayKit

@main
struct NexooApp: App {
    var body: some Scene {
        WindowGroup {
            NexooHome()
        }
    }
}

struct NexooHome: View {
    var body: some View {
        VStack(spacing: 0) {
            NexooWebView()
            BroadcastControl()
                .frame(height: 58)
        }
    }
}

struct NexooWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView()
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: URL(string: "https://nexoo-fv9s.onrender.com")!))
        return view
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct BroadcastControl: UIViewRepresentable {
    func makeUIView(context: Context) -> RPSystemBroadcastPickerView {
        let picker = RPSystemBroadcastPickerView()
        picker.preferredExtension = "com.nexoo.ios.broadcast"
        picker.showsMicrophoneButton = true
        return picker
    }
    func updateUIView(_ uiView: RPSystemBroadcastPickerView, context: Context) {}
}
