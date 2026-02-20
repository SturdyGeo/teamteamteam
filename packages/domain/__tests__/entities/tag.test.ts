import { describe, it, expect } from "vitest";
import { TagSchema } from "../../src/entities/tag.js";

const validTag = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  project_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "bug",
  created_at: "2024-01-01T00:00:00Z",
};

describe("TagSchema", () => {
  it("accepts valid tag", () => {
    expect(TagSchema.parse(validTag)).toEqual(validTag);
  });

  it("rejects empty name", () => {
    expect(() => TagSchema.parse({ ...validTag, name: "" })).toThrow();
  });

  it("rejects name over 50 chars", () => {
    expect(() =>
      TagSchema.parse({ ...validTag, name: "a".repeat(51) }),
    ).toThrow();
  });

  it("accepts name at 50 chars", () => {
    expect(
      TagSchema.parse({ ...validTag, name: "a".repeat(50) }),
    ).toBeDefined();
  });
});
