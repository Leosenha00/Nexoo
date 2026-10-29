# Nexo

Aplicativo de chamadas privadas, chat e compartilhamento de tela. React + TypeScript + Vite, Express + Socket.IO, PostgreSQL + Prisma. Não há usuários fictícios, respostas simuladas ou identidade baseada em localStorage no aplicativo.

## Desenvolvimento

Requisitos: Node 22+, npm, PostgreSQL 17 (ou Docker).

```bash
cp .env.example .env
# Para desenvolvimento, mantenha DATABASE_URL e APP_ORIGIN do exemplo.
docker run -d --name nexo-db -e POSTGRES_USER=nexo -e POSTGRES_PASSWORD=nexo_dev -e POSTGRES_DB=nexo -p 127.0.0.1:5432:5432 postgres:17-alpine
npm ci
npm run db:generate
npm run db:push
npm run dev
```

Abra http://localhost:5173. Em dois perfis de navegador, crie contas, procure o @ da outra, envie/aceite a amizade e inicie uma chamada. Vite encaminha API e WebSocket para Express em :3000. `localhost` é um contexto seguro para APIs de mídia. Um IP de LAN por HTTP não é: utilize HTTPS para dispositivos remotos.

## Funcionalidades

- @ normalizado em minúsculas com índice único, validação e nomes reservados; senha bcrypt custo 12; sessões opacas persistentes, hash do token no banco, cookie HttpOnly/SameSite Strict/Secure em produção.
- E-mail/senha, logout, recuperação por token de uso único com expiração de 30 minutos via SMTP; troca de senha invalida sessões. Avatar por cor ou foto PNG/JPEG/WebP de até 280 KB; nome e status editáveis.
- Busca, solicitações, aceite/recusa, remoção, bloqueio/desbloqueio, presença, convite por link, copiar @, chamadas recentes.
- Chat persistente dos últimos 100 envios por conversa, digitação, horário, aviso de mensagem e painel durante chamada. Não há anexos nem paginação de histórico nesta versão.
- Chamada individual de voz/vídeo, atender/recusar, timeout, desligamento, microfone/câmera, seleção de dispositivos, teste de microfone e volume. Seleção de saída depende de `setSinkId`.
- WebRTC com quatro transceivers: voz, câmera, tela e áudio da tela. Encerrar a tela não remove a voz. `getDisplayMedia` solicita autorização do navegador e seu evento `ended` interrompe a transmissão. Áudio compartilhado depende do SO/navegador.
- Fullscreen API, ajustar/preencher, controles que somem após inatividade, chat opcional. Reprodução `playsInline` para mobile.
- Preferência negociada por VP9/AV1/VP8/H.264 e Opus; metas 720p30, 1080p30/60, 1440p60 e 4K30. O navegador pode negociar outro codec ou resolução.
- Estatísticas via `getStats`: RTT, jitter, perda, bitrate e atividade de voz. Adaptador conservador reduz bitrate, escala e FPS sob degradação; congestion control do navegador permanece ativo. Nitidez/movimento configuram contentHint/degradationPreference; automático favorece detalhe. Isso não equivale a um algoritmo de qualidade validado em todas as redes.
- Reconexão Socket.IO e ICE restart, grace period de 20s após desconexão; uma atualização completa da página encerra a mídia local e não restaura a chamada automaticamente.
- Manifesto PWA e página offline; nenhuma resposta autenticada é armazenada pelo service worker.

## Arquitetura e autorização

API `/api`: auth/register, auth/login, auth/recover, auth/reset, me, users, handles, relations, block, messages, calls e ice. Sinalização: call:start, call:answer, call:end, call:resume, signal. Todas as ações de mídia são iniciadas no cliente. Áudio/vídeo não passam pelo Express nem são gravados. O TURN pode retransmitir pacotes criptografados DTLS-SRTP; o servidor não descriptografa a mídia.

O Socket.IO autentica cookies e origem. O servidor confere amizade, bloqueio, ocupação e participantes antes de sinalizar; mensagens também exigem amizade. Limites por IP, autenticação, socket e intervalo de chamadas. Express exige a origem configurada para mutações e HTTPS em produção. Apenas o Caddy deve alcançar a porta 3000 em produção (trust proxy = 1). Não exponha diretamente o backend.

Chamadas ativas e presença ficam na memória do único processo; histórico e identidade ficam no PostgreSQL. Um restart marca chamadas incompletas como interrompidas. Não escale horizontalmente sem mover estado/locks para armazenamento compartilhado e adicionar o adapter Redis do Socket.IO. A fila de início de chamadas impede duas chamadas simultâneas ultrapassarem o indicador de ocupado neste processo.

## Publicação com Docker

1. Use um servidor Linux público, domínio e registros DNS A/AAAA corretos; restrinja o firewall e proteja o arquivo `.env`.
2. Configure `.env`: `DOMAIN`, `APP_ORIGIN=https://seu-dominio`, `POSTGRES_PASSWORD`, `TURN_SECRET`, `TURN_URL`, `TURN_REALM`, `TURN_PUBLIC_IP`, `SMTP_URL`, `MAIL_FROM`. Gere segredos independentes com `openssl rand -hex 32`. Senhas de banco na URL devem ser URL-safe.
3. Libere 80/TCP e 443/TCP (443/UDP opcional) para Caddy; 3478/TCP+UDP e 49160–49200/UDP para coturn. Em NAT, configure também o mapeamento IP externo/interno do coturn. O hostname TURN deve resolver para esse servidor, sem proxy HTTP/CDN.
4. Execute `docker compose up -d --build`. A aplicação executa `prisma migrate deploy` antes de iniciar. Caddy obtém e renova HTTPS automaticamente. O proxy suporta upgrade para WSS.
5. Verifique `docker compose logs app caddy turn` e faça uma chamada entre redes distintas. Force `iceTransportPolicy: 'relay'` numa instalação de teste para confirmar TURN; não foi validado contra Internet pública nesta entrega.

O Compose usa rede host para coturn, destinada a Linux. As portas do relay precisam corresponder ao firewall. TURN usa segredo compartilhado somente no servidor; `/api/ice` gera credenciais HMAC de uma hora por usuário. A configuração padrão oferece TURN por UDP/TCP, sem TLS; a mídia mantém sua criptografia WebRTC. Redes que só permitem 443 podem exigir um segundo IP/host para TURN TLS em 443, certificados e `turns:`. Configure isso antes de declarar suporte a redes corporativas restritas. Negue também ranges privados IPv6 conforme a política de rede do host.

Para builds no ambiente gerenciado com proxy CA:

```bash
docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t nexo:local .
```

O secret de CA é opcional em máquinas normais. Não desative validação TLS. O ambiente não tem domínio, SMTP ou credenciais TURN públicas configurados; não há URL pública entregue.

### Recuperação de conta

`SMTP_URL` aceita URL de transporte Nodemailer. Em desenvolvimento, use por exemplo Mailpit com SMTP local. Sem SMTP configurado, a resposta permanece neutra para evitar enumeração, mas nenhum e-mail será enviado. Configure e valide a entrega de e-mail antes de disponibilizar cadastro ao público. Não há verificação de e-mail, MFA ou passkeys nesta versão.

### Operação

Faça backups periódicos do volume PostgreSQL (`pg_dump`) e ensaie restauração. Proteja também os volumes Caddy e os segredos. Para atualizar: backup, revisão de migrations, `docker compose up -d --build`. Use uma janela de manutenção: chamadas em curso não sobrevivem ao restart. Expire registros Session/Reset vencidos periodicamente. Defina retenção de mensagens e processo de exportação/exclusão de conta antes de operar comercialmente.

## Testes

```bash
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

Os testes usam um banco PostgreSQL real configurado em DATABASE_URL. Use banco dedicado, pois o servidor de teste marca chamadas incompletas como interrompidas. Vitest cria contas temporárias e limpa seus dados; Playwright cria contas exclusivas para inspeção, que permanecem no banco de teste. Não execute em produção.

`tests/integration.test.ts`: identidade, unicidade, login, cookies, origem, busca/amizade, autorização, chat, digitação, fluxo de chamada, reconexão de sinalização, recusa e bloqueio.

`tests/e2e/app.spec.ts`: duas sessões Chromium, cadastro, persistência, amizade, chat, mídia, fullscreen, compartilhamento, reconexão, encerramento, recusa, layout de 390px e permissão negada. Microfone/câmera usam dispositivos sintéticos do Chromium; testes não comprovam qualidade acústica ou fidelidade de câmera física. A execução e limitações observadas são registradas em `TEST_RESULTS.md`.

## Limitações e validação de produção pendente

- Sem certificação de Safari/iOS, Firefox, Android real ou hardware físico. Detecta APIs indisponíveis; iOS normalmente não transmite tela. Fullscreen e áudio de sistema variam por plataforma.
- Qualidade 4K/60 FPS não é garantida; depende de captura, encoder, CPU/GPU e rede. Testar jitter, perda, thermal throttling e redes reais antes de lançar.
- A versão inicial tem um backend; não há push em segundo plano, chamadas com navegador fechado, gravação, grupos ou migração entre dispositivos.
- O indicador de voz depende de audioLevel disponível nos relatórios do navegador. O vídeo remoto pode congelar no último frame quando a câmera remota é desativada, pois o estado da câmera não é sinalizado separadamente.
- Atualização de dispositivo de câmera vale para a próxima ativação; microfone pode ser trocado durante a chamada. As metas de qualidade são aplicadas ao próximo compartilhamento.
- PWA com ícone SVG; alguns sistemas Apple exigem PNG/apple-touch-icon para melhor integração.
- Sem auditoria de segurança externa, testes de carga ou garantia de disponibilidade. Chat é protegido por TLS e autorização, mas armazenado em texto no banco; não se apresenta como chat ponta a ponta.
- Interface responsiva com CSS próprio (sem Tailwind), ícones Lucide. Fontes Google são opcionais; o fallback local funciona sem acesso externo.

## Cliente iOS nativo

A continuação incremental em SwiftUI, autenticação nativa, amizades e implementação inicial WebRTC está documentada em [ios/README.md](ios/README.md). O cliente web permanece disponível. Consulte [validação real macOS](ios/VALIDATION.md), [arquivos da entrega](docs/IOS_DELIVERY_FILES.md) e [instalação usando somente iPhone](docs/IOS_INSTALLATION.md). Compilação de simulador não gera aplicativo instalável no iPhone; publicação ReplayKit e testes físicos continuam pendentes.
