import { describe, it, expect } from "vitest";
import { ApiError } from "../src/errors.js";

describe("ApiError", () => {
  it("sets code, message, and statusCode", () => {
    const err = new ApiError("NOT_FOUND", "Ticket not found", 404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Ticket not found");
    expect(err.statusCode).toBe(404);
  });

  it("is an instance of Error", () => {
    const err = new ApiError("UNKNOWN", "something broke", 500);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });

  it("has name ApiError", () => {
    const err = new ApiError("BAD_REQUEST", "invalid input", 400);
    expect(err.name).toBe("ApiError");
  });
});
