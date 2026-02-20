import { createApp } from "./app.bundle.js";

const app = createApp("/api");

Deno.serve(app.fetch);
