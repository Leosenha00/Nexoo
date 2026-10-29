import "dotenv/config";
import { createApp } from "./server/app.ts";
import path from "node:path";
import express from "express";

const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";

const server = await createApp({ isDev: !isProd });

if (!isProd) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  server.app.use(vite.middlewares);
} else {
  server.app.use(express.static(path.resolve("dist")));
  server.app.get("/{*path}", (_req, res) => {
    res.sendFile(path.resolve("dist/index.html"));
  });
}

server.http.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexo Server running at http://0.0.0.0:${PORT}`);
});

process.on("SIGTERM", async () => {
  await server.close();
  process.exit(0);
});
