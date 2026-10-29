# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && npm start"]
