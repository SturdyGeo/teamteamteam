import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import type { CandooClient } from "@candoo/api-client";
import type { WorkflowColumn, Ticket } from "@candoo/domain";
import type { MemberWithUser } from "@candoo/api-client";
import { App } from "../../src/tui/App.js";

const columns: WorkflowColumn[] = [
  {
    id: "col-1",
    project_id: "proj-1",
    name: "To Do",
    position: 0,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "col-2",
    project_id: "proj-1",
    name: "Done",
    position: 1,
    created_at: "2025-01-01T00:00:00Z",
  },
];

const tickets: Ticket[] = [
  {
    id: "t-1",
    project_id: "proj-1",
    number: 1,
    title: "Test ticket",
    description: "",
    status_column_id: "col-1",
    assignee_id: "user-1",
    reporter_id: "user-1",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    closed_at: null,
  },
];

const members: MemberWithUser[] = [
  {
    id: "mem-1",
    org_id: "org-1",
    user_id: "user-1",
    role: "admin",
    created_at: "2025-01-01T00:00:00Z",
    user: { id: "user-1", email: "alice@test.com", display_name: "Alice" },
  },
];

function createMockClient(overrides: Partial<CandooClient> = {}): CandooClient {
  return {
    getColumns: vi.fn().mockResolvedValue(columns),
    getTickets: vi.fn().mockResolvedValue(tickets),
    getMembers: vi.fn().mockResolvedValue(members),
    ...overrides,
  } as unknown as CandooClient;
}

describe("App", () => {
  it("shows loading state initially", () => {
    const client = createMockClient();
    const { lastFrame } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );
    expect(lastFrame()).toContain("Loading");
  });

  it("renders board after data loads", async () => {
    const client = createMockClient();
    const { lastFrame } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    // Wait for async data fetch to complete
    await new Promise((r) => setTimeout(r, 50));

    const frame = lastFrame()!;
    expect(frame).toContain("To Do");
    expect(frame).toContain("Done");
    expect(frame).toContain("DEMO-1");
    expect(frame).toContain("Test ticket");
    expect(frame).toContain("Alice");
    expect(frame).toContain("Press q to quit");
  });

  it("shows error state on fetch failure", async () => {
    const client = createMockClient({
      getColumns: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const { lastFrame } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(lastFrame()).toContain("Error: Network error");
  });
});
