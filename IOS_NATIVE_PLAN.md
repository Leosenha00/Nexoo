# Nexoo — preparação iOS nativo

Objetivo: reaproveitar o Nexoo web e desenvolver cliente iOS SwiftUI com WebRTC e ReplayKit Broadcast Upload Extension, sem simular funcionalidades.

## Primeira entrega verificável
1. Auditar autenticação, backend e sinalização WebRTC existentes.
2. Criar projeto Xcode SwiftUI mínimo, com bundle ID configurável e tela de entrada Nexoo.
3. Criar workflow GitHub Actions em macOS para build de simulador SEM assinatura; guardar logs e artefatos.
4. Adicionar testes de build e documentar erros reais.
5. Depois implementar login real, chamadas WebRTC e extensão ReplayKit com App Group configurável.
6. Só gerar IPA para dispositivo quando houver certificado e provisioning profile válidos.

## Limitações
- Runner macOS compila, mas não fornece assinatura Apple.
- Apple ID gratuito não cria automaticamente perfil exportável no CI.
- Testes de transmissão fora do app exigem iPhone físico.
- Não armazenar credenciais Apple no repositório.
- Não afirmar que existe IPA instalável até comprovar assinatura e instalação.
- Backend/TURN pode gerar custos mesmo com ferramentas open source.

## Próxima ação do Codex
Inspecionar a árvore do repositório e implementar a primeira entrega em commits pequenos, sem substituir a aplicação web existente.

## Continuação implementada em 29/10/2026

- Cliente SwiftUI continuado com conta nativa (cadastro/login/Keychain), busca e amizades via backend existente.
- Implementação inicial WebRTC nativa foreground/Socket.IO, renderização remota, política de bitrate/FPS/escala e tentativa de reconexão; ainda exige validação de mídia entre aparelhos.
- Extensão ReplayKit passou a integrar o target e build, mas encerra explicitamente com erro até existir publicação autenticada real. App Group opcional preparado sem habilitar capabilities não provisionadas por padrão.
- `ios-build.yml` gera projeto, compila app/extensão, testa e guarda diagnóstico/artefatos.
- `ios-ipa.yml` valida material de assinatura, arquiva/exporta somente com identidade/perfis correspondentes e verifica app/extensão exportados. Bloqueado pela ausência de certificado/perfis.
- Investigação atual de instalação somente com iPhone em `docs/IOS_INSTALLATION.md`, incluindo PAL no Brasil, requisitos e obstáculos concretos.
- Ainda pendentes: publicação ReplayKit com áudio de sistema/mic, funcionamento com app suspenso, CallKit/PushKit/backend, testes físicos, assinatura e instalação. Não declarar essas funcionalidades entregues por existir scaffold ou build.
