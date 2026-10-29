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
