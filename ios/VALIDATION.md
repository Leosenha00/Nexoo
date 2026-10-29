# Validação real — 29/10/2026

Código validado: commit `85bc8a31ea1fab5b01b7f284e0170dd07d2b7a77`, branch `ios-native-preparation`.

Execução: https://github.com/Leosenha00/Nexoo/actions/runs/40869182848

| Verificação | Resultado observado |
| --- | --- |
| Runner | `macos-15` |
| Ferramentas | Xcode 16.4 (16F6), XcodeGen 2.46.0, SDK iPhoneSimulator 18.5 |
| Geração Xcode | Sucesso |
| Build Debug simulador, `CODE_SIGNING_ALLOWED=NO` | `BUILD SUCCEEDED` (27s) |
| XCTest configuração | 3 testes, 0 falhas |
| XCUITest entrada SwiftUI / abrir e fechar folha web | 1 teste, 0 falhas |
| Resultado xcodebuild test | `TEST SUCCEEDED` |
| Job completo | Sucesso, 4 minutos |
| Assinatura / IPA / instalação física | Não executados; nenhum IPA produzido |

Artefatos disponíveis na execução:

- `ios-validation-85bc8a31ea1fab5b01b7f284e0170dd07d2b7a77`: toolchain.txt, build.log, test.log, Tests.xcresult.
- `Nexoo-simulator-85bc8a31ea1fab5b01b7f284e0170dd07d2b7a77`: `.app` para simulador, não para instalação no iPhone.

O GitHub ainda exibiu o nome antigo cadastrado do workflow (“Build iOS unsigned IPA”) nessa execução; os passos efetivamente executados são os novos passos de simulador, sem empacotamento IPA. Consulte YAML e logs, não o nome histórico. O serviço também avisou sobre migração de runtime Node das actions e disponibilidade de runners; não houve falha de build/teste.

## Verificação web no ambiente Linux

Node 24.19.0, npm 11.9.0. `npm ci` falhou com `ERESOLVE`: Vite 8.3.5 exige peer opcional esbuild `^0.27.0 || ^0.28.0`, enquanto o projeto declara `^0.25.0` e trava 0.25.12. A tentativa `npm ci --legacy-peer-deps` também falhou por divergências entre manifest e lock (incluindo esbuild 0.28.2 ausente). Portanto, build e testes web não foram executados nesta sessão; não são declarados aprovados. Manifest, lock, src, backend e Prisma permanecem sem alteração nesta entrega.

`git diff --check` passou. Não foi usado build Linux como evidência de compilação SwiftUI: a evidência iOS acima veio do runner macOS real.

## Limites

O teste de interface verifica abertura/fechamento da folha WKWebView sem exigir carregamento remoto ou login. Não valida o backend implantado, autenticação nativa, chamadas WebRTC, ReplayKit, mídia no WKWebView ou dispositivo físico. Esses itens continuam pendentes conforme o plano e `README.md` deste diretório.
