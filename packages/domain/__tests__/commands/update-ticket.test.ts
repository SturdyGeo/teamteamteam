import { describe, it, expect } from "vitest";
import { updateTicket } from "../../src/commands/update-ticket.js";
import { DomainError, DOMAIN_ERROR_CODES } from "../../src/errors/domain-error.js";
import type { Ticket } from "../../src/entities/ticket.js";

const ticket: Ticket = {
  id: "a0000000-0000-0000-0000-000000000001",
  project_id: "b0000000-0000-0000-0000-000000000001",
  number: 1,
  title: "Initial title",
  description: "Initial description",
  status_column_id: "c0000000-0000-0000-0000-000000000001",
  priority: "P1",
  assignee_id: null,
  reporter_id: "d0000000-0000-0000-0000-000000000001",
  tags: [],
  created_at: "2024-06-01T12:00:00Z",
  updated_at: "2024-06-01T12:00:00Z",
  closed_at: null,
};

describe("updateTicket", () => {
  it("updates title and description", () => {
    const result = updateTicket(ticket, {
      title: "Updated title",
      description: "Updated description",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });

    expect(result.data.title).toBe("Updated title");
    expect(result.data.description).toBe("Updated description");
    expect(result.data.updated_at).toBe("2024-06-02T12:00:00Z");
    expect(result.events).toHaveLength(1);
    expect(result.events[0].event_type).toBe("ticket_updated");
  });

  it("trims title", () => {
    const result = updateTicket(ticket, {
      title: "  Updated title  ",
      description: "Initial description",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });

    expect(result.data.title).toBe("Updated title");
  });

  it("throws INVALID_INPUT for empty title", () => {
    expect(() =>
      updateTicket(ticket, {
        title: "   ",
        description: "Updated description",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      }),
    ).toThrow(DomainError);

    try {
      updateTicket(ticket, {
        title: "   ",
        description: "Updated description",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      });
    } catch (error) {
      expect((error as DomainError).code).toBe(DOMAIN_ERROR_CODES.INVALID_INPUT);
    }
  });

  it("throws INVALID_INPUT when details are unchanged", () => {
    expect(() =>
      updateTicket(ticket, {
        title: "Initial title",
        description: "Initial description",
        actor_id: "d0000000-0000-0000-0000-000000000001",
        now: "2024-06-02T12:00:00Z",
      }),
    ).toThrow(DomainError);
  });

  it("emits title and description change metadata", () => {
    const result = updateTicket(ticket, {
      title: "Updated title",
      description: "Updated description",
      actor_id: "d0000000-0000-0000-0000-000000000001",
      now: "2024-06-02T12:00:00Z",
    });

    if (result.events[0].event_type === "ticket_updated") {
      expect(result.events[0].payload.from_title).toBe("Initial title");
      expect(result.events[0].payload.to_title).toBe("Updated title");
      expect(result.events[0].payload.description_changed).toBe(true);
    }
  });
});
