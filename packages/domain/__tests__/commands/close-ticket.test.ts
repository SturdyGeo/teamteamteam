import { describe, it, expect } from "vitest";
import { closeTicket } from "../../src/commands/close-ticket.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../../src/errors/domain-error.js";
import type { Ticket } from "../../src/entities/ticket.js";

const openTicket: Ticket = {
  id: "a0000000-0000-0000-0000-000000000001",
  project_id: "b0000000-0000-0000-0000-000000000001",
  number: 1,
  title: "Fix the bug",
  description: "",
  status_column_id: "c0000000-0000-0000-0000-000000000001",
  priority: "P1",
  assignee_id: null,
  reporter_id: "d0000000-0000-0000-0000-000000000001",
  tags: [],
  created_at: "2024-06-01T12:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
  closed_at: null,
};

const input = {
  actor_id: "d0000000-0000-0000-0000-000000000001",
  now: "2024-06-02T12:00:00Z",
};

describe("closeTicket", () => {
  it("sets closed_at", () => {
    const result = closeTicket(openTicket, input);
    expect(result.data.closed_at).toBe(input.now);
  });

  it("updates updated_at", () => {
    const result = closeTicket(openTicket, input);
    expect(result.data.updated_at).toBe(input.now);
  });

  it("produces ticket_closed event", () => {
    const result = closeTicket(openTicket, input);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("ticket_closed");
    expect(result.events[0].ticket_id).toBe(openTicket.id);
    expect(result.events[0].actor_id).toBe(input.actor_id);
  });

  it("throws TICKET_ALREADY_CLOSED for closed ticket", () => {
    const closedTicket = { ...openTicket, closed_at: "2024-06-01T18:00:00Z" };
    expect(() => closeTicket(closedTicket, input)).toThrow(DomainError);
    try {
      closeTicket(closedTicket, input);
    } catch (e) {
      expect((e as DomainError).code).toBe(
        DOMAIN_ERROR_CODES.TICKET_ALREADY_CLOSED,
      );
    }
  });

  it("returns new object", () => {
    const result = closeTicket(openTicket, input);
    expect(result.data).not.toBe(openTicket);
  });
});
