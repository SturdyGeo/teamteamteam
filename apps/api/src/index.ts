import { app } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`Teamteamteam API listening on http://localhost:${port}`);
