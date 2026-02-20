import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { DomainError, type DomainErrorCode } from "@candoo/domain";

const DOMAIN_ERROR_STATUS: Record<DomainErrorCode, ContentfulStatusCode> = {
  INVALID_INPUT: 400,
  COLUMN_NOT_FOUND: 404,
  TAG_NOT_FOUND: 404,
  TICKET_ALREADY_CLOSED: 409,
  TICKET_NOT_CLOSED: 409,
  SAME_COLUMN: 409,
  SAME_ASSIGNEE: 409,
  TAG_ALREADY_EXISTS: 409,
};

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof DomainError) {
    const status = DOMAIN_ERROR_STATUS[err.code] ?? 500;
    return c.json(
      { error: { code: err.code, message: err.message } },
      status,
    );
  }

  console.error("Unhandled error:", err);
  return c.json(
    { error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
    500,
  );
}
