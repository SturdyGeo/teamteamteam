import { describe, it, expect } from "vitest";
import {
  normalizeTag,
  normalizeTags,
  hasTag,
  addTagToList,
  removeTagFromList,
} from "../../src/rules/tags.js";

describe("normalizeTag", () => {
  it("lowercases tag", () => {
    expect(normalizeTag("BUG")).toBe("bug");
  });

  it("trims whitespace", () => {
    expect(normalizeTag("  bug  ")).toBe("bug");
  });

  it("is deterministic", () => {
    expect(normalizeTag("Bug")).toBe(normalizeTag("Bug"));
  });
});

describe("normalizeTags", () => {
  it("normalizes all tags", () => {
    expect(normalizeTags(["BUG", "Feature"])).toEqual(["bug", "feature"]);
  });

  it("removes duplicates after normalization", () => {
    expect(normalizeTags(["bug", "BUG", "Bug"])).toEqual(["bug"]);
  });

  it("removes empty strings after trimming", () => {
    expect(normalizeTags(["bug", "  ", ""])).toEqual(["bug"]);
  });

  it("returns empty array for empty input", () => {
    expect(normalizeTags([])).toEqual([]);
  });
});

describe("hasTag", () => {
  it("finds tag case-insensitively", () => {
    expect(hasTag(["bug", "feature"], "BUG")).toBe(true);
  });

  it("returns false when tag not present", () => {
    expect(hasTag(["bug"], "feature")).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasTag([], "bug")).toBe(false);
  });
});

describe("addTagToList", () => {
  it("adds new tag", () => {
    expect(addTagToList(["bug"], "feature")).toEqual(["bug", "feature"]);
  });

  it("normalizes added tag", () => {
    expect(addTagToList([], "BUG")).toEqual(["bug"]);
  });

  it("does not duplicate existing tag", () => {
    expect(addTagToList(["bug"], "BUG")).toEqual(["bug"]);
  });

  it("returns new array", () => {
    const original = ["bug"];
    const result = addTagToList(original, "feature");
    expect(result).not.toBe(original);
  });
});

describe("removeTagFromList", () => {
  it("removes tag case-insensitively", () => {
    expect(removeTagFromList(["bug", "feature"], "BUG")).toEqual(["feature"]);
  });

  it("returns same content if tag not present", () => {
    expect(removeTagFromList(["bug"], "feature")).toEqual(["bug"]);
  });

  it("returns empty array when removing last tag", () => {
    expect(removeTagFromList(["bug"], "bug")).toEqual([]);
  });

  it("returns new array", () => {
    const original = ["bug"];
    const result = removeTagFromList(original, "bug");
    expect(result).not.toBe(original);
  });
});
