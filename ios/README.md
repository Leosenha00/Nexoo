# Nexoo iOS — início da implementação

Este diretório contém **código-fonte inicial**, não um aplicativo iOS completo e não um IPA instalável.

- `NexooApp.swift`: abre o Nexoo existente em WKWebView e mostra o seletor nativo de transmissão ReplayKit.
- `BroadcastExtension/SampleHandler.swift`: ponto de entrada da Broadcast Upload Extension. **Ainda não transmite quadros**.
- É necessário criar e configurar um projeto Xcode com os targets de app e Broadcast Upload Extension, ajustar os Bundle IDs, provisionamento e assinatura.
- A extensão precisa implementar transporte WebRTC com autenticação, autorização da chamada, sinalização e reconexão. O backend atual usa sinalização WebRTC via Socket.IO e não oferece ingestão RTMP.
- O seletor ReplayKit só será útil depois que a extensão for integrada e instalada no dispositivo.
- Compilar em CI macOS sem certificado pode validar o código, mas não gera automaticamente um IPA instalável no iPhone.
- Nunca armazene credenciais Apple ou certificados privados no repositório.

Próximo passo: gerar o projeto Xcode reproduzível e implementar o pipeline ReplayKit → WebRTC → participante da chamada, com testes em aparelho real.
