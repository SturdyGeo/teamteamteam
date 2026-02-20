import { describe, it, expect } from "vitest";
import { UserSchema } from "../../src/entities/user.js";

const validUser = {
  id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  email: "alice@example.com",
  display_name: "Alice",
  created_at: "2024-01-01T00:00:00Z",
};

describe("UserSchema", () => {
  it("accepts valid user", () => {
    expect(UserSchema.parse(validUser)).toEqual(validUser);
  });

  it("rejects invalid email", () => {
    expect(() =>
      UserSchema.parse({ ...validUser, email: "not-an-email" }),
    ).toThrow();
  });

  it("rejects empty display_name", () => {
    expect(() =>
      UserSchema.parse({ ...validUser, display_name: "" }),
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => UserSchema.parse({ id: validUser.id })).toThrow();
  });
});
