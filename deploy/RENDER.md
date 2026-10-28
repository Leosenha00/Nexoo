# Publicação no Render

O arquivo `render.yaml` declara um Web Service Docker e PostgreSQL, inicialmente em planos free, sujeitos à disponibilidade e às regras atuais do Render. Nenhum serviço foi provisionado por este arquivo sozinho.

A aplicação usa `RENDER_EXTERNAL_URL` automaticamente como origem HTTPS. Caso adicione domínio próprio, configure `APP_ORIGIN` com a URL HTTPS exata. O Dockerfile aplica migrations antes de iniciar; o Render termina TLS e encaminha WebSocket para o backend.

Importe um repositório Git contendo este projeto como Blueprint no Render. Revise os recursos antes de aplicar. Configure TURN_URL/TURN_SECRET para um servidor TURN externo, e SMTP_URL/MAIL_FROM para recuperação de conta. Não inclua esses segredos no Git. Não execute coturn no Web Service: ele precisa de portas UDP e relay que esse serviço não fornece.

Este blueprint inicial não deve ser tratado como operação durável: planos gratuitos podem suspender o processo, limitar horas e expirar o banco. Confirme os limites atuais no painel e migre para recursos persistentes antes de usar com dados importantes. Suspensão/restart encerra chamadas ativas. Não há garantia de conectividade entre redes distintas sem TURN.

Após provisionar, confirme migrations e healthcheck, cadastro/login, WebSocket e chamada entre duas redes; teste relay forçado no TURN. A publicação só estará confirmada após obter a URL e verificar a implantação no Render.
