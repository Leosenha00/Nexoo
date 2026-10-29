# Instalar o Nexoo tendo somente um iPhone

Pesquisa em fontes oficiais em 29/10/2026. Não houve teste de instalação física, assinatura válida ou emissão de IPA nesta sessão. Não fornecer senha Apple, chave privada, certificados ou arquivos de pareamento em issues, chat, commits ou logs.

## Situação concreta

O runner macOS compila e testa sem precisar de um computador seu. Ele não cria uma identidade Apple de desenvolvimento, não tem acesso USB ao seu iPhone e não substitui o pareamento. O workflow assinado foi executado e recusou a ausência de `APPLE_CERTIFICATE_P12_BASE64` antes de arquivar/exportar. O artefato de simulador não serve para o iPhone, independentemente de mudar sua extensão.

| Opção | Somente iPhone? | Limite para o Nexoo |
| --- | --- | --- |
| Conta gratuita / Xcode Personal Team | Não neste cenário | Exige sessão no Xcode, provisionamento e aparelho disponível para instalação. Validade curta e limites de capabilities. |
| AltStore Classic | Não na instalação inicial usual | AltServer e pareamento com computador; não oferece um certificado gratuito pronto ao GitHub Actions. |
| SideStore | Não na configuração inicial oficial | Depois do bootstrap permite renovação no aparelho; precisa inicialmente de computador, pareamento, Apple Account, Wi-Fi e VPN local. |
| AltStore PAL no Brasil | Sim para instalar a loja/apps elegíveis | Só distribui apps notarizados. Nexoo ainda não está publicado, assinado, notarizado nem possui pacote de distribuição alternativa. A conta do publicador precisa do Apple Developer Program pago. |
| App Store / TestFlight | Sim para o usuário final | Desenvolvedor precisa conta/programa e distribuição Apple; Nexoo ainda não foi submetido. |
| PWA Nexoo | Sim, sem assinatura nativa | Safari > Compartilhar > Adicionar à Tela de Início, usando o serviço web disponível. Não oferece ReplayKit nem paridade de captura de outros apps. |

A documentação Apple atual inclui Brasil, Japão e UE na distribuição alternativa e exige elegibilidade regional; portanto seria incorreto dizer que PAL é indisponível no Brasil. Ela também exige notarização dos apps. [Apple: distribuição alternativa](https://support.apple.com/en-ie/117767).

A página genérica do AltStore lista iOS/iPadOS 18+ e conta/localização elegíveis, mas a documentação Apple específica de regiões cita **iOS 26.5+ para Brasil**. Para um iPhone brasileiro, considere o requisito regional da Apple e confirme compatibilidade no aparelho; a página genérica da loja não comprova que qualquer iPhone com iOS 18 possa instalar PAL no Brasil. [AltStore download](https://altstore.io/download), [Apple MarketplaceKit por região](https://developer.apple.com/documentation/marketplacekit/participating-in-alternative-distribution-for-specific-regions).

Publicar o Nexoo no PAL exigiria conta paga do publicador, submissão pelo App Store Connect, notarização, processamento da loja e hospedagem do pacote ADP. Um IPA gerado por desenvolvimento não é esse pacote. [AltStore: distribuir com PAL](https://faq.altstore.io/developers/distribute-with-altstore-pal).

A conta gratuita permite testes pessoais pelo Xcode. A Apple informa até 10 App IDs, até 3 dispositivos e até 3 apps por dispositivo, com expiração em 7 dias para os perfis pessoais. Não equivale a um serviço de assinatura grátis na nuvem. [Apple: conta e Personal Team](https://developer.apple.com/help/account/basics/about-your-developer-account).

AltStore Classic usa AltServer e conexão/pareamento com computador; SideStore mantém o requisito inicial de computador em sua documentação atual, embora a renovação posterior ocorra no iPhone com VPN local/Wi-Fi. [AltStore Classic](https://faq.altstore.io/altstore-classic/how-to-install-altstore-macos), [SideStore requisitos](https://docs.sidestore.io/docs/installation/prerequisites), [SideStore instalação](https://docs.sidestore.io/docs/installation/install).

## Menor mudança necessária

Para usar agora sem outro equipamento e sem pagar: usar o Nexoo web/PWA, com as limitações da plataforma. Não foi encontrada nas fontes oficiais consultadas uma rota comprovada que instale **este Nexoo nativo não publicado** usando exclusivamente iPhone + conta gratuita + GitHub Actions.

Para testes nativos com conta gratuita: conseguir acesso temporário a um **Mac com Xcode compatível com a versão do iOS do seu aparelho e conexão ao iPhone**, configurar Personal Team, bundle IDs únicos e perfis de app/extensão e executar no aparelho. O Xcode 16.4 usado no CI valida o SDK/simulador daquela execução; não comprova suporte de depuração a um iPhone com iOS mais novo. O projeto padrão não exige App Groups; habilitá-los no futuro depende da conta/capabilities. Alternativamente, um computador emprestado pode preparar SideStore, mas isso não elimina o bootstrap, limites de assinatura nem prova compatibilidade de toda extensão.

Para distribuição sem computador do usuário: alguém precisa providenciar uma conta de desenvolvedor e publicar/distribuir legitimamente por TestFlight/App Store ou marketplace elegível após os requisitos Apple. Isso muda a condição “gratuito para o desenvolvedor”. Serviços gratuitos de CI podem ter cotas; nenhum runner fornece a assinatura por si só.

Não utilizamos certificados empresariais compartilhados, perfis de terceiros, jailbreak, certificados falsos nem atalhos para contornar a verificação Apple.
