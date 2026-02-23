import { describe, it, expect } from "vitest";
import {
  MembershipSchema,
  MembershipRoleSchema,
} from "../../src/entities/membership.js";

const validMembership = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  org_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  user_id: "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  role: "member" as const,
  created_at: "2024-01-01T00:00:00Z",
};

describe("MembershipRoleSchema", () => {
  it.each(["owner", "admin", "member", "limited"])("accepts role %s", (role) => {
    expect(MembershipRoleSchema.parse(role)).toBe(role);
  });

  it("rejects invalid role", () => {
    expect(() => MembershipRoleSchema.parse("superadmin")).toThrow();
  });
});

describe("MembershipSchema", () => {
  it("accepts valid membership", () => {
    expect(MembershipSchema.parse(validMembership)).toEqual(validMembership);
  });

  it("rejects invalid org_id", () => {
    expect(() =>
      MembershipSchema.parse({ ...validMembership, org_id: "bad" }),
    ).toThrow();
  });

  it("rejects missing role", () => {
    expect(() =>
      MembershipSchema.parse({ ...validMembership, role: undefined }),
    ).toThrow();
  });
});
