export const DOMAIN_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  COLUMN_NOT_FOUND: "COLUMN_NOT_FOUND",
  TICKET_ALREADY_CLOSED: "TICKET_ALREADY_CLOSED",
  TICKET_NOT_CLOSED: "TICKET_NOT_CLOSED",
  TAG_ALREADY_EXISTS: "TAG_ALREADY_EXISTS",
  TAG_NOT_FOUND: "TAG_NOT_FOUND",
  SAME_COLUMN: "SAME_COLUMN",
  SAME_ASSIGNEE: "SAME_ASSIGNEE",
} as const;

export type DomainErrorCode =
  (typeof DOMAIN_ERROR_CODES)[keyof typeof DOMAIN_ERROR_CODES];

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(code: DomainErrorCode, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
