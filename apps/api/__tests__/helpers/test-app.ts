import { Hono } from "hono";
import { errorHandler } from "../../src/middleware/error-handler.js";

export interface TestUser {
  id: string;
  email: string;
}

export const DEFAULT_USER: TestUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "test@example.com",
};

/**
 * Creates a Hono test app with error handler, mock auth middleware, and a
 * route module mounted at root.  Bypasses real JWT validation.
 */
export function createTestApp(
  route: Hono,
  supabase: unknown,
  user: TestUser = DEFAULT_USER,
): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("/*", async (c, next) => {
    c.set("auth", { user, supabase });
    await next();
  });
  app.route("/", route);
  return app;
}
