import { createApp } from "./app.bundle.js";

const app = createApp();

Deno.serve((request) => {
  const url = new URL(request.url);

  // Supabase can present the function-internal path as either `/orgs/...`
  // or `/api/orgs/...` depending on runtime/proxy shape. Normalize both.
  if (url.pathname === "/api") {
    url.pathname = "/";
  } else if (url.pathname.startsWith("/api/")) {
    url.pathname = url.pathname.slice("/api".length);
  }

  const normalizedRequest = new Request(url.toString(), request);
  return app.fetch(normalizedRequest);
});
