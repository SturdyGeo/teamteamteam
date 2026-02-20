import { describe, it, expect } from "vitest";
import { ProjectSchema } from "../../src/entities/project.js";

const validProject = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  org_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: "My Project",
  prefix: "PROJ",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

describe("ProjectSchema", () => {
  it("accepts valid project", () => {
    expect(ProjectSchema.parse(validProject)).toEqual(validProject);
  });

  it("accepts single-char prefix", () => {
    expect(
      ProjectSchema.parse({ ...validProject, prefix: "A" }),
    ).toBeDefined();
  });

  it("accepts 10-char prefix", () => {
    expect(
      ProjectSchema.parse({ ...validProject, prefix: "ABCDEFGHIJ" }),
    ).toBeDefined();
  });

  it("accepts alphanumeric prefix starting with letter", () => {
    expect(
      ProjectSchema.parse({ ...validProject, prefix: "AB1" }),
    ).toBeDefined();
  });

  it("rejects lowercase prefix", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, prefix: "proj" }),
    ).toThrow();
  });

  it("rejects prefix starting with number", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, prefix: "1AB" }),
    ).toThrow();
  });

  it("rejects prefix longer than 10 chars", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, prefix: "ABCDEFGHIJK" }),
    ).toThrow();
  });

  it("rejects empty prefix", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, prefix: "" }),
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      ProjectSchema.parse({ ...validProject, name: "" }),
    ).toThrow();
  });
});
