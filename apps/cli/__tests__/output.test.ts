import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  printJson,
  printTable,
  printSuccess,
  printError,
  handleError,
  withErrorHandler,
} from "../src/output.js";
import { ApiError } from "@candoo/api-client";

describe("output", () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("printJson", () => {
    it("outputs formatted JSON", () => {
      printJson({ key: "value" });
      expect(logSpy).toHaveBeenCalledWith(
        JSON.stringify({ key: "value" }, null, 2),
      );
    });
  });

  describe("printTable", () => {
    it("prints header, separator, and rows", () => {
      const rows = [{ name: "Alice", age: "30" }];
      printTable(rows, [
        { header: "Name", value: (r) => r.name },
        { header: "Age", value: (r) => r.age },
      ]);
      expect(logSpy).toHaveBeenCalledTimes(3);
    });

    it("prints 'No results.' for empty rows", () => {
      printTable([], [{ header: "Name", value: () => "" }]);
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain("No results.");
    });
  });

  describe("printSuccess", () => {
    it("prints green checkmark message", () => {
      printSuccess("Done");
      expect(logSpy).toHaveBeenCalledTimes(1);
      expect(logSpy.mock.calls[0][0]).toContain("Done");
    });
  });

  describe("printError", () => {
    it("prints error to stderr", () => {
      printError("Bad thing");
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain("Bad thing");
    });
  });

  describe("handleError", () => {
    it("maps 401 to auth message", () => {
      handleError(new ApiError("AUTH_ERROR", "Unauthorized", 401));
      expect(errorSpy.mock.calls[0][0]).toContain("Not authenticated");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("maps 403 to permission denied", () => {
      handleError(new ApiError("FORBIDDEN", "Forbidden", 403));
      expect(errorSpy.mock.calls[0][0]).toContain("Permission denied");
    });

    it("maps 404 to not found", () => {
      handleError(new ApiError("NOT_FOUND", "missing resource", 404));
      expect(errorSpy.mock.calls[0][0]).toContain("Not found");
    });

    it("handles generic errors", () => {
      handleError(new Error("something broke"));
      expect(errorSpy.mock.calls[0][0]).toContain("something broke");
    });
  });

  describe("withErrorHandler", () => {
    it("calls the wrapped function", async () => {
      const fn = vi.fn().mockResolvedValue(undefined);
      const wrapped = withErrorHandler(fn);
      await wrapped("arg1", "arg2");
      expect(fn).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("catches errors and calls handleError", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      const wrapped = withErrorHandler(fn);
      await wrapped();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
