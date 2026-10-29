# Verificação executada — 28/10/2026

| Verificação | Resultado observado |
|---|---|
| TypeScript + build Vite | Passou |
| Vitest, PostgreSQL real | 8 testes passaram |
| Playwright, Chromium headless | 3 testes passaram; `.last-run.json` registrou `passed`, sem testes falhos |
| Build Docker `nexo:local` | Imagem construída, inclusive após atualização das dependências |
| npm audit | 0 vulnerabilidades reportadas na execução |
| Inspeção visual mobile | Captura 390×844 inspecionada; sem transbordamento horizontal |

O teste principal do Playwright percorreu cadastro em duas sessões isoladas, persistência após reload, busca, amizade, chat persistente, chamada de vídeo aceita, conexão WebRTC, recebimento de frames, mute/unmute, câmera, getDisplayMedia, notificação de transmissão remota, Fullscreen API, parada do compartilhamento preservando a chamada, desconexão/reconexão de sinalização e encerramento/recusa. A segunda verificação cobriu layout mobile e erro de permissão negada por injeção controlada no teste. A terceira verificou e capturou o primeiro acesso.

Microfone e câmera usaram dispositivos sintéticos do Chromium. O navegador executou getDisplayMedia com seleção automática configurada por flags de teste. Isso testa a integração das APIs e o transporte WebRTC local, não a autorização manual, qualidade visual de uma tela física ou qualidade acústica real. Não houve dois dispositivos físicos nem duas redes externas. A simulação offline validou recuperação de sinalização; não demonstra recuperação de todas as falhas de rota/NAT da mídia.

Rodadas anteriores falharam: uma sofreu atualização do schema durante execução; outra revelou rejeição do polling Socket.IO de mesma origem sem cabeçalho Origin. O código foi corrigido para validar Sec-Fetch-Site nesse caso. A rodada final passou. As dependências com avisos no primeiro build foram atualizadas; o audit final não reportou vulnerabilidades.

Não executado: HTTPS público/ACME, SMTP real, TURN público/relay forçado, carga, Safari/Firefox, iOS/Android físicos, captura de áudio do sistema em cada plataforma, qualidade 4K/60 FPS ou testes de duração prolongada. O build da imagem não equivale ao teste completo do Compose em produção. Não foi feita publicação externa.

Capturas: `docs/screenshots/welcome.png` e `docs/screenshots/mobile.png`.

## Continuação iOS / regressão web — 29/10/2026

Ambiente Linux: Node 24.19.0/npm 11.9.0. Corrigido o peer esbuild para `^0.28.0`, compatível com Vite 8, e regenerado o lock. `npm ci`, `npm run build` e `npm run lint` passaram. PostgreSQL 17 temporário em container local, schema aplicado via `prisma db push`; `npx vitest run`: **1 arquivo, 8 testes aprovados**, cobrindo identidade/@, login/sessão, autorização/origem, amizades, mensagens, sinalização/reconexão e bloqueio. O banco temporário foi removido após os testes. Não foram usadas contas de produção.

Validação nativa macOS, resultados/falhas e limites em `ios/VALIDATION.md`. Esses testes de backend não comprovam mídia WebRTC nem transmissão ReplayKit em iPhone físico.
