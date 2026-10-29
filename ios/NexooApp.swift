import SwiftUI
import WebKit

@main
struct NexooApp: App {
    var body: some Scene {
        WindowGroup { NexooHome() }
    }
}

struct NexooHome: View {
    @State private var showingWeb = false
    private let serverURL = AppConfiguration.serverURL()

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 56)).foregroundStyle(.purple)
                Text("Nexoo").font(.largeTitle.bold())
                Text("Conecte-se com quem importa.").font(.title3)
                Text("O cliente nativo está em desenvolvimento. Acesse sua conta e as funcionalidades existentes pelo Nexoo web.")
                    .multilineTextAlignment(.center).foregroundStyle(.secondary)
                if serverURL != nil {
                    Button("Abrir Nexoo web") { showingWeb = true }
                        .buttonStyle(.borderedProminent)
                        .accessibilityIdentifier("openWeb")
                } else {
                    Text("Endereço do servidor inválido. Configure NEXOO_SERVER_URL com HTTPS.")
                }
                Text("Chamadas nativas e transmissão de tela ainda não estão disponíveis.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            .padding(24)
            .navigationTitle("Nexoo")
            .sheet(isPresented: $showingWeb) {
                if let url = serverURL {
                    NavigationStack {
                        NexooWebView(url: url).ignoresSafeArea(edges: .bottom)
                            .navigationTitle("Nexoo web")
                            .navigationBarTitleDisplayMode(.inline)
                            .toolbar {
                                ToolbarItem(placement: .confirmationAction) {
                                    Button("Fechar") { showingWeb = false }
                                }
                            }
                    }
                }
            }
        }
    }
}

/// Reuses the existing React client and backend during the native migration.
struct NexooWebView: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.allowsBackForwardNavigationGestures = true
        view.load(URLRequest(url: url))
        return view
    }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
