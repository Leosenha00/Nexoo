# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN --mount=type=secret,id=proxy_ca NODE_EXTRA_CA_CERTS=/run/secrets/proxy_ca npm ci --strict-ssl=true
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
