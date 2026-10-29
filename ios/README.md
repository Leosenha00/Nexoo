# Nexoo iOS — primeira entrega

Entrada SwiftUI nativa para iPhone (iOS 16+) e acesso ao cliente React existente via WKWebView. O web e o backend permanecem intactos. Não há login SwiftUI, transporte WebRTC nativo nem transmissão ReplayKit funcionais nesta etapa. A navegação web não comprova compatibilidade de chamadas/captura no WKWebView; isso exige testes físicos.

## Gerar e validar no Mac

Requer Xcode com SDK iOS, simulador iPhone instalado e XcodeGen >= 2.44.1 (`brew install xcodegen`).

```sh
xcodegen generate --spec ios/project.yml
xcodebuild -project ios/Nexoo.xcodeproj -scheme Nexoo -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ios/Nexoo.xcodeproj -scheme Nexoo -destination 'platform=iOS Simulator,name=iPhone 16' -derivedDataPath ios/DerivedData CODE_SIGNING_ALLOWED=NO test
```

Escolha um nome disponível em `xcrun simctl list devices available`. O CI escolhe um iPhone disponível automaticamente. `project.yml` é a fonte do projeto; XcodeGen gera o `.xcodeproj` e Info.plist localmente. A extensão em `BroadcastExtension/` é um esqueleto preservado, fora dos targets desta primeira etapa: ainda descarta os quadros e não deve aparecer como transmissão utilizável.

Configurações de build (também editáveis em `project.yml`):

- `NEXOO_BUNDLE_ID`: padrão `com.nexoo.ios`; use um identificador único para seu Personal Team.
- `NEXOO_SERVER_URL`: padrão `https://nexoo-fv9s.onrender.com`; exige HTTPS e não aceita credenciais/query/fragmento. O build não valida disponibilidade desse serviço.
- `DEVELOPMENT_TEAM`: seu Team ID, somente no ambiente local de assinatura.

O workflow `.github/workflows/ios-unsigned.yml` compila para simulador sem assinatura, executa XCTest e teste de interface (abrir/fechar web sem depender de login/rede), guarda logs, `.xcresult` e `.app` de simulador. Falhas de build/teste falham o job. O `.app` de simulador não é instalável no iPhone. Não produzimos IPA.

## Instalação gratuita no seu iPhone: o que falta

É necessário um Mac com Xcode, Apple ID com Personal Team, iPhone conectado/pareado e versão do iOS suportada pelo Xcode. Abra `ios/Nexoo.xcodeproj`, adicione sua conta em Xcode > Settings > Accounts, selecione um bundle ID único e seu Personal Team em Signing & Capabilities com gerenciamento automático. Ative Developer Mode no iPhone quando solicitado, selecione o aparelho como destino e execute Run. Xcode deverá criar certificado Apple Development e perfil de provisionamento válidos para esse aparelho; aceite a confiança no desenvolvedor no iPhone se solicitado.

O provisionamento gratuito costuma expirar em 7 dias, exigindo nova execução pelo Xcode, e tem limites de apps/dispositivos/capabilities. Não equivale a distribuição App Store/TestFlight. O runner hospedado macOS não dispõe automaticamente da identidade/perfil do Personal Team. Para CI assinado seriam necessários certificado com chave privada, perfil válido e compatível com bundle ID, entitlements e dispositivo, armazenados como secrets e com método de distribuição suportado. Nada disso foi fornecido ou validado nesta entrega.

ReplayKit real exigirá SDK WebRTC, transporte de áudio/vídeo, autorização de chamada e ciclo de vida; App Group e entitlements compatíveis com a conta/provisionamento escolhido precisam ser verificados antes de prometer suporte com conta gratuita. Captura fora do app só pode ser validada em iPhone físico. Não existe IPA instalável comprovado, assinatura Apple validada ou instalação física comprovada.

Veja [auditoria dos contratos](../docs/IOS_NATIVE_AUDIT.md) e [resultados reais](VALIDATION.md).
