import { describe, it, expect } from "vitest";
import { OrgSchema } from "../../src/entities/org.js";

const validOrg = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "Acme Corp",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("OrgSchema", () => {
  it("accepts valid org", () => {
    expect(OrgSchema.parse(validOrg)).toEqual(validOrg);
  });

  it("rejects missing name", () => {
    expect(() => OrgSchema.parse({ ...validOrg, name: undefined })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => OrgSchema.parse({ ...validOrg, name: "" })).toThrow();
  });

  it("rejects invalid uuid", () => {
    expect(() => OrgSchema.parse({ ...validOrg, id: "not-a-uuid" })).toThrow();
  });

  it("rejects invalid datetime", () => {
    expect(() =>
      OrgSchema.parse({ ...validOrg, created_at: "not-a-date" }),
    ).toThrow();
  });
});
