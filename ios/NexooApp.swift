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
    @StateObject private var session: SessionStore
    @StateObject private var call: CallController
    init() {
        let api = APIClient(baseURL: AppConfiguration.serverURL() ?? URL(string: "https://invalid.invalid")!)
        _session = StateObject(wrappedValue: SessionStore(api: api))
        _call = StateObject(wrappedValue: CallController(api: api))
    }
    private let serverURL = AppConfiguration.serverURL()

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .font(.system(size: 56)).foregroundStyle(Color(red: 0.08, green: 0.17, blue: 0.29))
                Text("Nexoo").font(.largeTitle.bold())
                Text("Conecte-se com quem importa.").font(.title3)
                Text("Sua conta, seus amigos e suas conexões. Use a conta nativa ou continue pelo Nexoo web.")
                    .multilineTextAlignment(.center).foregroundStyle(.secondary)
                if serverURL != nil {
                    NavigationLink("Entrar / Minha conta") { AccountView(session: session, call: call) }
                        .buttonStyle(.borderedProminent)
                        .accessibilityIdentifier("nativeAccount")
                    Button("Abrir Nexoo web") { showingWeb = true }
                        .buttonStyle(.borderedProminent)
                        .accessibilityIdentifier("openWeb")
                } else {
                    Text("Endereço do servidor inválido. Configure NEXOO_SERVER_URL com HTTPS.")
                }
                Text("Chamadas nativas em validação. Transmissão de tela ainda indisponível.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            .padding(24)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(red: 0.96, green: 0.97, blue: 0.98))
            .tint(Color(red: 0.08, green: 0.17, blue: 0.29))
            .task { await session.restore() }
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
