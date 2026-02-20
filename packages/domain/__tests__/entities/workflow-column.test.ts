import { describe, it, expect } from "vitest";
import { WorkflowColumnSchema } from "../../src/entities/workflow-column.js";

const validColumn = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  project_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "To Do",
  position: 0,
  created_at: "2024-01-01T00:00:00Z",
};

describe("WorkflowColumnSchema", () => {
  it("accepts valid column", () => {
    expect(WorkflowColumnSchema.parse(validColumn)).toEqual(validColumn);
  });

  it("accepts position 0", () => {
    expect(
      WorkflowColumnSchema.parse({ ...validColumn, position: 0 }),
    ).toBeDefined();
  });

  it("rejects negative position", () => {
    expect(() =>
      WorkflowColumnSchema.parse({ ...validColumn, position: -1 }),
    ).toThrow();
  });

  it("rejects non-integer position", () => {
    expect(() =>
      WorkflowColumnSchema.parse({ ...validColumn, position: 1.5 }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      WorkflowColumnSchema.parse({ ...validColumn, name: "" }),
    ).toThrow();
  });
});
