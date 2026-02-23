import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./middleware/auth.js";
import { errorHandler } from "./middleware/error-handler.js";
import { health } from "./routes/health.js";
import { orgs } from "./routes/orgs.js";
import { projects } from "./routes/projects.js";
import { columns } from "./routes/columns.js";
import { tickets } from "./routes/tickets.js";
import { tags } from "./routes/tags.js";
import { activity } from "./routes/activity.js";
import { members } from "./routes/members.js";

export function createApp(basePath = "/") {
  const app = new Hono().basePath(basePath);

  app.onError(errorHandler);

  app.use("/*", cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type"],
  }));

  // Public routes (no auth)
  app.route("/", health);

  // Auth-gated routes
  app.use("/*", authMiddleware);
  app.route("/", orgs);
  app.route("/", projects);
  app.route("/", columns);
  app.route("/", tickets);
  app.route("/", tags);
  app.route("/", activity);
  app.route("/", members);

  return app;
}

export const app = createApp();
