import { describe, it, expect } from "vitest";
import { enrichTicketWithTags } from "../../src/lib/tickets.js";

describe("enrichTicketWithTags", () => {
  const baseTicket = {
    id: "00000000-0000-0000-0000-000000000001",
    project_id: "00000000-0000-0000-0000-000000000010",
    number: 1,
    title: "Test ticket",
    description: "",
    status_column_id: "00000000-0000-0000-0000-000000000100",
    assignee_id: null,
    reporter_id: "00000000-0000-0000-0000-000000001000",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    closed_at: null,
  };

  it("transforms nested ticket_tags into flat tags array", () => {
    const raw = {
      ...baseTicket,
      ticket_tags: [
        { tags: { name: "bug" } },
        { tags: { name: "feature" } },
      ],
    };

    const result = enrichTicketWithTags(raw);
    expect(result.tags).toEqual(["bug", "feature"]);
    expect(result).not.toHaveProperty("ticket_tags");
  });

  it("handles empty ticket_tags", () => {
    const raw = { ...baseTicket, ticket_tags: [] };
    const result = enrichTicketWithTags(raw);
    expect(result.tags).toEqual([]);
  });

  it("handles missing ticket_tags", () => {
    const raw = { ...baseTicket };
    const result = enrichTicketWithTags(raw);
    expect(result.tags).toEqual([]);
  });
});
