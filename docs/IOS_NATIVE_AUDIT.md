# Auditoria iOS — contratos existentes

Base: branch `ios-native-preparation`, revisão inicial `8a345bd`. Não foi necessário alterar o backend ou os arquivos web nesta etapa.

| Área | Código existente | Reuso / atenção no cliente nativo |
| --- | --- | --- |
| HTTP | `server/app.ts`, `src/api.ts` | JSON em `/api`; produção exige HTTPS. Toda mutação exige cabeçalho `Origin` permitido, inclusive login nativo; URLSession deverá enviá-lo conforme `APP_URL`/origens permitidas. Não desativar essa proteção global. |
| Login | `POST /api/auth/login` | `{email,password}`; sucesso `{ok:true,token}` e `X-Session-Token`, além de cookie `session`. Falha de credenciais: 401. |
| Sessão | `session`, `userFor` | Token aleatório de 32 bytes, hash no PostgreSQL, validade 30 dias. REST aceita cookie ou `Authorization: Bearer`. Planejar Keychain no iOS; não copiar localStorage como armazenamento nativo. |
| Perfil/logout | `GET /api/me`, `POST /api/logout` | Logout revoga sessão e desconecta sockets. Reset de senha revoga sessões. |
| Persistência | `prisma/schema.prisma`, `server/app.ts` | Backend Express/Prisma/PostgreSQL continua sendo fonte de usuários, relações, mensagens e histórico. Não duplicar banco no app. |
| Sinalização | `io.use`, handlers `call:*`, `signal` | Socket.IO autenticado via `handshake.auth.token`, Bearer ou cookie. Não é WebSocket bruto. Origens são verificadas quando presentes. |
| Chamada | `call:start`, `call:answer`, `call:end`, `call:resume` | Exige amizade, destinatário online e sem chamada concorrente; ringing expira em 30s. `signal` só para participante de chamada ativa. |
| SDP/ICE | `signal`, `src/media.ts` | Payload `{id, description?:{type:offer\|answer,sdp}, candidate?, screen?}`. SDK nativo deve interoperar com negociação e reconexão do cliente atual; acknowledgements retornam resultado/erro. |
| TURN | `GET /api/ice` | Autenticado; STUN padrão; TURN condicional a `TURN_URL` e `TURN_SECRET`, credenciais HMAC temporárias (1h). Não embutir secret no app. STUN sozinho não garante conexão em todas as redes. |
| Captura | `src/media.ts`, `ios/BroadcastExtension/SampleHandler.swift` | APIs de mídia do navegador não são portáveis para Swift. ReplayKit esqueleto não publica mídia, backend não tem ingestão RTMP. Exige implementação WebRTC nativa e teste físico. |

Aproveitamento imediato: cliente web intacto e acessível na folha WKWebView; configuração de origem centralizada e validada; contratos acima orientam login/Socket.IO/WebRTC futuros. Não foi afirmada paridade de mídia do WKWebView nem conectividade do serviço remoto. A primeira entrega é a base SwiftUI compilável com teste de entrada e configuração, não uma implementação nativa de todas as funções.
