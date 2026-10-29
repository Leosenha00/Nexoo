# Nexoo iOS — cliente nativo incremental

Não é um reinício: o SwiftUI, projeto XcodeGen, backend Express/Prisma/PostgreSQL, cliente React e contratos anteriores foram preservados. A branch é `ios-native-preparation`.

## Código implementado

- Tela SwiftUI branco/cinza-claro/azul-marinho, ícone e catálogo de assets; web permanece acessível em WKWebView.
- Cadastro (`name`, `handle`, `email`, `password`, `avatar`) e login nas APIs reais. Exclusividade do @ é garantida pelo backend/banco.
- Bearer token protegido no Keychain (ThisDeviceOnly); restauração em `/api/me`, remoção de sessão revogada e logout remoto. Senha não é persistida.
- Busca pelo @, convite, listagem, aceite e remoção de amizades via REST. Atualização manual/pull-to-refresh.
- Implementação inicial de chamadas nativas em primeiro plano: Socket.IO autenticado, WebRTC M156, permissões de câmera/microfone, ICE/TURN do backend, SDP/ICE, ordem de transceivers compatível com o web, recebimento/aceite/recusa/encerramento e mute.
- Renderização de vídeo/tela remotos e visualização em tela inteira. Estatísticas WebRTC ajustam limite de bitrate, FPS e escala de resolução; política isolada com testes.
- Reconexão de sinalização Socket.IO e tentativa de ICE restart pelo iniciador. Não há garantia de recuperação de toda interrupção.

A sessão nativa e a sessão do WKWebView são independentes; acessar o web pode exigir novo login. Não houve migração silenciosa de credenciais entre os dois clientes.

Esses recursos de chamadas foram implementados, mas **não foram validados com mídia entre dispositivos físicos**. Compilação e testes de contrato não comprovam áudio/vídeo, áudio simultâneo ou interoperabilidade em uma chamada real. Disponibilidade do backend/TURN e permissões do aparelho são dependências externas.

## Pendente e explicitamente indisponível

- Publicação ReplayKit e compartilhamento enquanto outros apps estão abertos: extensão incluída/compilada, mas `SampleHandler` encerra com erro claro enquanto falta transporte WebRTC autenticado próprio, ciclo de vida e passagem segura da sessão. Não há botão que finja transmitir.
- Captura/mixagem de áudio do sistema e microfone na extensão, autorização de sessão compartilhada, lifecycle com app suspenso e limites de memória da extensão.
- CallKit/PushKit/APNs e recebimento com app suspenso/encerrado: requerem integração backend e capabilities/provisionamento. Não foi habilitado background mode como substituto dessa implementação.
- Validação física de chamadas, renegociação simultânea, mudanças de rede, dispositivos de áudio, tela cheia e qualidade sob carga. Interface de chamadas não é declarada pronta para produção.
- Instalação em iPhone e assinatura Apple; o IPA sem assinatura para assinador externo tem fluxo próprio; veja [instalação sem computador](../docs/IOS_INSTALLATION.md).

## Projeto reproduzível

Requer Xcode 16.4, XcodeGen >= 2.44.1 e simulador iPhone. Pacotes SPM diretos fixados: `stasel/WebRTC` 156.0.0 e `socketio/socket.io-client-swift` 16.1.1. O primeiro é distribuição binária de WebRTC, não serviço de mídia hospedado.

```sh
brew install xcodegen
xcodegen generate --spec ios/project.yml
xcodebuild -project ios/Nexoo.xcodeproj -scheme Nexoo -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/Nexoo.xcodeproj -scheme Nexoo -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO test
```

Use um simulador disponível em `xcrun simctl list devices available`. O CI seleciona um automaticamente, guarda `.xcodeproj` gerado, `Info.plist`, logs, `.xcresult` e `.app` de simulador. Para reconstruir, use os fontes e `project.yml`; o projeto gerado sozinho não inclui os fontes. Os arquivos gerados não são editados manualmente nem tratados como aplicativo instalável.

Configurações de build: `NEXOO_BUNDLE_ID` (padrão `com.nexoo.ios`), `NEXOO_SERVER_URL` (HTTPS, padrão do serviço existente), `DEVELOPMENT_TEAM` (somente assinatura). A extensão usa `$(NEXOO_BUNDLE_ID).broadcast`. REST envia `Origin` da URL do backend para respeitar a proteção existente.

Entitlements padrão são mínimos, sem grupos compartilhados ou credenciais. `project-with-app-groups.yml` é uma configuração **opcional de preparação**, com `NEXOO_APP_GROUP` configurável; requer perfis/capabilities compatíveis e não implementa transporte nem compartilhamento de sessão. Não está habilitada pelo workflow padrão e não foi validada com assinatura.

## Workflows

- `.github/workflows/ios-unsigned-device.yml`: compila Release para iPhone físico **sem assinatura**, valida arm64/plataforma iOS e estrutura, remove assinaturas preexistentes e empacota `Nexoo-resign-required.ipa` para **assinatura posterior por ferramenta externa**. Não é o app de simulador e não está pronto para instalação direta. Não muda o estado pendente de ReplayKit. Veja `VALIDATION.md` para o resultado observado.

- `.github/workflows/ios-build.yml`: macOS 15/Xcode 16.4, geração, dependências SPM, build de app + extensão sem assinatura, XCTest/XCUITest, testes da validação de perfis, diagnóstico e artefatos.
- `.github/workflows/ios-ipa.yml`: dispatch manual na branch; recusa material de assinatura ausente/inválido; archive/export **com assinatura**, sem `CODE_SIGNING_ALLOWED=NO`. Métodos de dispositivo `debugging` ou `release-testing`, conforme perfis.

Secrets do repositório necessários ao segundo workflow (nunca em arquivos/commits):
`APPLE_CERTIFICATE_P12_BASE64`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_APP_PROFILE_BASE64`, `APPLE_BROADCAST_PROFILE_BASE64`.

Informe bundle ID e Team ID reais nos inputs. Os dois perfis devem ter IDs explícitos, equipe/certificado correspondentes, validade e cobertura dos mesmos dispositivos. Certificado com chave privada é importado em keychain temporário e validado como identidade de assinatura. Após exportar, scripts verificam assinatura criptográfica, IDs/equipe e perfis embutidos de app e extensão; somente então permitem upload. Material privado é removido em `always()`. Mesmo uma exportação aprovada precisaria de instalação física para comprovar instalação no seu iPhone.

Resultados e falhas corrigidas: [VALIDATION.md](VALIDATION.md). Contratos existentes: [auditoria](../docs/IOS_NATIVE_AUDIT.md).
