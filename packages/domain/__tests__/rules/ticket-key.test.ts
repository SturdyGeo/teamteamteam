import { describe, it, expect } from "vitest";
import {
  generateTicketKey,
  parseTicketKey,
} from "../../src/rules/ticket-key.js";

describe("generateTicketKey", () => {
  it("generates key from prefix and number", () => {
    expect(generateTicketKey("PROJ", 1)).toBe("PROJ-1");
  });

  it("is deterministic", () => {
    expect(generateTicketKey("AB", 42)).toBe(generateTicketKey("AB", 42));
  });

  it("handles large numbers", () => {
    expect(generateTicketKey("X", 99999)).toBe("X-99999");
  });
});

describe("parseTicketKey", () => {
  it("parses valid key", () => {
    expect(parseTicketKey("PROJ-1")).toEqual({ prefix: "PROJ", number: 1 });
  });

  it("parses key with alphanumeric prefix", () => {
    expect(parseTicketKey("AB1-42")).toEqual({ prefix: "AB1", number: 42 });
  });

  it("returns null for invalid key", () => {
    expect(parseTicketKey("invalid")).toBeNull();
  });

  it("returns null for lowercase prefix", () => {
    expect(parseTicketKey("proj-1")).toBeNull();
  });

  it("returns null for missing number", () => {
    expect(parseTicketKey("PROJ-")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseTicketKey("")).toBeNull();
  });

  it("returns null for prefix starting with number", () => {
    expect(parseTicketKey("1AB-1")).toBeNull();
  });

  it("roundtrips with generateTicketKey", () => {
    const key = generateTicketKey("TEST", 7);
    expect(parseTicketKey(key)).toEqual({ prefix: "TEST", number: 7 });
  });
});
