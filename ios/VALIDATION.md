# Validação da continuação iOS — 29/10/2026

Branch: `ios-native-preparation`. Código nativo final em `def8a56`; ajuste de CI com boot/timeout em `cd562a2`. Os commits posteriores de relatório não alteram código compilado.

## Execuções e correções reais

- `40871839965`: falhou em `CallController.swift` com `'async' call in an autoclosure that does not support concurrency` e `call can throw but is not marked with 'try'` / `expression is 'async' but is not marked with 'await'`. Corrigidos com condição separada para permissão e `try await` para captura da câmera.
- `40872178413`: YAML do fluxo assinado inválido por `Unrecognized named-value: 'runner'` no env do job. Corrigido usando `$RUNNER_TEMP` em step.
- `40872369902`: app/extensão compilaram, mas fixture JSON em teste fechava raw string antes da cor `#142b4a`: `'b' is not a valid digit in integer literal`. Corrigido o delimitador.
- [40872236064](https://github.com/Leosenha00/Nexoo/actions/runs/40872236064): build aprovado, 9 testes unitários + 2 UI + 6 Python aprovados.
- [40872709973](https://github.com/Leosenha00/Nexoo/actions/runs/40872709973): build aprovado, **12 testes unitários + 2 UI + 6 Python aprovados**, sem falhas. Inclui os testes adicionais de persistência/restauração/revogação de sessão.
- `40873290298` e `40873354346`: canceladas por terem sido substituídas por commit posterior, para reduzir consumo de CI.
- [40873425321](https://github.com/Leosenha00/Nexoo/actions/runs/40873425321): build aprovado em `82ad633`, bundles XCTest compilados; execução não chegou a anunciar início dos testes após vários minutos e foi cancelada para diagnóstico. Não há falha de compilação no log, mas isso não equivale a testes aprovados. Logs/projeto foram preservados como artefatos. Novo workflow faz boot explícito limitado a 180s, desabilita paralelismo e limita tempo de cada teste e do step.

- [40874683363](https://github.com/Leosenha00/Nexoo/actions/runs/40874683363): boot explícito concluiu, build passou, 12 unitários executados com 1 falha real: `XCTAssertEqual failed: Optional("//api/relations") != Optional("/api/relations")` para servidor com barra final. Os 2 UI passaram. Corrigida a construção da URL base em `def8a56`; o teste foi mantido. Também corrigido o reset do indicador de mute entre chamadas.

## Resultado final aprovado

[Execução 40875858350](https://github.com/Leosenha00/Nexoo/actions/runs/40875858350), commit `def8a5693c5b0787a33b9e427069296bc6b2e9e0`:

| Verificação | Resultado real |
| --- | --- |
| Toolchain | macOS 15, Xcode 16.4 (16F6), XcodeGen 2.46.0, SDK simulador 18.5 |
| App + extensão ReplayKit | `BUILD SUCCEEDED`, sem assinatura, simulador |
| XCTest | **12 testes, 0 falhas** |
| XCUITest | **2 testes, 0 falhas** |
| Validação Python de perfis | **6 testes aprovados** |
| xcodebuild test | `TEST SUCCEEDED` |
| Job | Sucesso (7m08s) |

Artefatos comprovados nesta execução:

- [Projeto Xcode gerado e Info.plist](https://github.com/Leosenha00/Nexoo/actions/runs/40875858350/artifacts/12898093686).
- [Logs e resultados XCTest (.xcresult)](https://github.com/Leosenha00/Nexoo/actions/runs/40875858350/artifacts/12898218291).
- [App de simulador](https://github.com/Leosenha00/Nexoo/actions/runs/40875858350/artifacts/12898163626), **não instalável no iPhone**.

A correção de URL com barra final foi validada pelo teste que falhara na execução anterior. `git diff --check` também passou. Não houve novo build para os commits posteriores que apenas finalizam documentação, exemplos de ambiente e regras de ignore.

## Assinatura e IPA

[Fluxo assinado executado](https://github.com/Leosenha00/Nexoo/actions/runs/40872237354), em macOS. Parou corretamente no preflight:

```text
Missing signing secret: APPLE_CERTIFICATE_P12_BASE64. No signed IPA can be produced.
```

Sem certificado/perfis/Team ID reais validados, archive/export/upload do IPA foram pulados. O Team ID do disparo de diagnóstico foi um marcador não configurado, não uma identidade Apple. A tentativa de listar nomes de secrets recebeu 403 da integração; a execução do job confirmou que os secrets esperados não foram fornecidos. Não houve assinatura Apple, exportação IPA ou instalação física comprovada. A lógica de rejeição de perfis tem 6 testes Python, mas não houve teste positivo com material Apple real.

O registro legado `ios-unsigned.yml` foi desativado (`disabled_manually`) no GitHub, e o arquivo foi substituído por `ios-build.yml` na branch; `main` não foi mesclada nem reescrita.

## Regressão web e backend

Node 24.19.0/npm 11.9.0. Após ajustar esbuild para `^0.28.0` e regenerar lock, passaram `npm ci`, `npm run build`, `npm run lint`. PostgreSQL 17 local temporário + schema Prisma: `npx vitest run` aprovou **8 testes de integração** de identidade/exclusividade de @, login/sessão/origem, amizades, mensagens, sinalização/reconexão e bloqueio. Container removido após os testes. Sem alteração de implementação de `src`, `public`, `server` ou Prisma.

Serviço configurado: `GET https://nexoo-fv9s.onrender.com/api/health` retornou **HTTP 200, `{"ok":true}`** nesta sessão. Isso não valida login real no aparelho, TURN ou transporte de mídia.

## Limites

Testes Swift HTTP usam transporte injetado para contratos, não contas fictícias expostas na aplicação. Testes UI verificam navegação nativa, formulários e abertura/fechamento do web. Não comprovam mídia WebRTC, ReplayKit, áudio de sistema/mic simultâneo, captura com outros apps abertos, CallKit/PushKit, identidade Apple ou instalação física. Essas pendências estão em `README.md` e `../docs/IOS_INSTALLATION.md`.

---

## Histórico da primeira entrega (preservado)

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
