import { describe, it, expect } from "vitest";
import { TicketSchema } from "../../src/entities/ticket.js";

const validTicket = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  project_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  number: 1,
  title: "Fix the bug",
  description: "Something is broken",
  status_column_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  assignee_id: "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  reporter_id: "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  tags: ["bug", "urgent"],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  closed_at: null,
};

describe("TicketSchema", () => {
  it("accepts valid ticket", () => {
    expect(TicketSchema.parse(validTicket)).toEqual(validTicket);
  });

  it("defaults description to empty string", () => {
    const withoutDesc = { ...validTicket };
    delete (withoutDesc as Record<string, unknown>).description;
    const result = TicketSchema.parse(withoutDesc);
    expect(result.description).toBe("");
  });

  it("defaults tags to empty array", () => {
    const withoutTags = { ...validTicket };
    delete (withoutTags as Record<string, unknown>).tags;
    const result = TicketSchema.parse(withoutTags);
    expect(result.tags).toEqual([]);
  });

  it("accepts null assignee_id", () => {
    const result = TicketSchema.parse({ ...validTicket, assignee_id: null });
    expect(result.assignee_id).toBeNull();
  });

  it("accepts null closed_at", () => {
    const result = TicketSchema.parse({ ...validTicket, closed_at: null });
    expect(result.closed_at).toBeNull();
  });

  it("accepts closed_at datetime", () => {
    const result = TicketSchema.parse({
      ...validTicket,
      closed_at: "2024-06-01T00:00:00Z",
    });
    expect(result.closed_at).toBe("2024-06-01T00:00:00Z");
  });

  it("rejects empty title", () => {
    expect(() =>
      TicketSchema.parse({ ...validTicket, title: "" }),
    ).toThrow();
  });

  it("rejects title over 200 chars", () => {
    expect(() =>
      TicketSchema.parse({ ...validTicket, title: "a".repeat(201) }),
    ).toThrow();
  });

  it("rejects description over 10000 chars", () => {
    expect(() =>
      TicketSchema.parse({ ...validTicket, description: "a".repeat(10001) }),
    ).toThrow();
  });

  it("rejects number less than 1", () => {
    expect(() =>
      TicketSchema.parse({ ...validTicket, number: 0 }),
    ).toThrow();
  });
});
