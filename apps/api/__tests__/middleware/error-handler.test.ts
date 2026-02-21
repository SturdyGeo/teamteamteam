import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { DomainError, DOMAIN_ERROR_CODES } from "@teamteamteam/domain";
import { errorHandler } from "../../src/middleware/error-handler.js";

function createTestApp(error: Error): Hono {
  const app = new Hono();
  app.onError(errorHandler);
  app.get("/test", () => {
    throw error;
  });
  return app;
}

async function fetchJson(app: Hono, path: string) {
  const res = await app.request(path);
  const body = await res.json();
  return { status: res.status, body };
}

describe("errorHandler", () => {
  it("maps INVALID_INPUT to 400", async () => {
    const app = createTestApp(
      new DomainError(DOMAIN_ERROR_CODES.INVALID_INPUT, "Bad input"),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(400);
    expect(body.error.code).toBe("INVALID_INPUT");
    expect(body.error.message).toBe("Bad input");
  });

  it("maps COLUMN_NOT_FOUND to 404", async () => {
    const app = createTestApp(
      new DomainError(DOMAIN_ERROR_CODES.COLUMN_NOT_FOUND, "Not found"),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(404);
    expect(body.error.code).toBe("COLUMN_NOT_FOUND");
  });

  it("maps TAG_NOT_FOUND to 404", async () => {
    const app = createTestApp(
      new DomainError(DOMAIN_ERROR_CODES.TAG_NOT_FOUND, "Not found"),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(404);
    expect(body.error.code).toBe("TAG_NOT_FOUND");
  });

  it("maps TICKET_ALREADY_CLOSED to 409", async () => {
    const app = createTestApp(
      new DomainError(
        DOMAIN_ERROR_CODES.TICKET_ALREADY_CLOSED,
        "Already closed",
      ),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(409);
    expect(body.error.code).toBe("TICKET_ALREADY_CLOSED");
  });

  it("maps TICKET_NOT_CLOSED to 409", async () => {
    const app = createTestApp(
      new DomainError(DOMAIN_ERROR_CODES.TICKET_NOT_CLOSED, "Not closed"),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(409);
    expect(body.error.code).toBe("TICKET_NOT_CLOSED");
  });

  it("maps SAME_COLUMN to 409", async () => {
    const app = createTestApp(
      new DomainError(DOMAIN_ERROR_CODES.SAME_COLUMN, "Same column"),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(409);
    expect(body.error.code).toBe("SAME_COLUMN");
  });

  it("maps SAME_ASSIGNEE to 409", async () => {
    const app = createTestApp(
      new DomainError(DOMAIN_ERROR_CODES.SAME_ASSIGNEE, "Same assignee"),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(409);
    expect(body.error.code).toBe("SAME_ASSIGNEE");
  });

  it("maps TAG_ALREADY_EXISTS to 409", async () => {
    const app = createTestApp(
      new DomainError(DOMAIN_ERROR_CODES.TAG_ALREADY_EXISTS, "Exists"),
    );
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(409);
    expect(body.error.code).toBe("TAG_ALREADY_EXISTS");
  });

  it("maps unknown errors to 500", async () => {
    const app = createTestApp(new Error("Something broke"));
    const { status, body } = await fetchJson(app, "/test");
    expect(status).toBe(500);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal server error");
  });
});
