import { describe, it, expect } from "vitest";
import {
  sortColumns,
  findColumn,
  getInitialColumn,
} from "../../src/rules/columns.js";
import type { WorkflowColumn } from "../../src/entities/workflow-column.js";

const makeColumn = (
  overrides: Partial<WorkflowColumn> & { id: string; position: number },
): WorkflowColumn => ({
  project_id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
  name: `Column ${overrides.position}`,
  created_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const todo = makeColumn({
  id: "a0000000-0000-0000-0000-000000000001",
  position: 0,
  name: "To Do",
});
const inProgress = makeColumn({
  id: "a0000000-0000-0000-0000-000000000002",
  position: 1,
  name: "In Progress",
});
const done = makeColumn({
  id: "a0000000-0000-0000-0000-000000000003",
  position: 2,
  name: "Done",
});

describe("sortColumns", () => {
  it("sorts by position ascending", () => {
    expect(sortColumns([done, todo, inProgress])).toEqual([
      todo,
      inProgress,
      done,
    ]);
  });

  it("returns new array", () => {
    const original = [done, todo];
    const result = sortColumns(original);
    expect(result).not.toBe(original);
  });

  it("handles empty array", () => {
    expect(sortColumns([])).toEqual([]);
  });
});

describe("findColumn", () => {
  it("finds column by id", () => {
    expect(findColumn([todo, inProgress, done], inProgress.id)).toEqual(
      inProgress,
    );
  });

  it("returns undefined for unknown id", () => {
    expect(
      findColumn([todo], "a0000000-0000-0000-0000-000000000099"),
    ).toBeUndefined();
  });
});

describe("getInitialColumn", () => {
  it("returns column with lowest position", () => {
    expect(getInitialColumn([done, inProgress, todo])).toEqual(todo);
  });

  it("works with single column", () => {
    expect(getInitialColumn([done])).toEqual(done);
  });
});
