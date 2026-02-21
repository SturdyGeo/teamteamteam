import { describe, it, expect, vi } from "vitest";
import { render } from "ink-testing-library";
import type { TeamteamteamClient } from "@teamteamteam/api-client";
import type { WorkflowColumn, Ticket } from "@teamteamteam/domain";
import type { MemberWithUser } from "@teamteamteam/api-client";
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
    name: "In Progress",
    position: 1,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "col-3",
    project_id: "proj-1",
    name: "Done",
    position: 2,
    created_at: "2025-01-01T00:00:00Z",
  },
];

const tickets: Ticket[] = [
  {
    id: "t-1",
    project_id: "proj-1",
    number: 1,
    title: "First ticket",
    description: "First description",
    status_column_id: "col-1",
    assignee_id: "user-1",
    reporter_id: "user-1",
    tags: ["bug"],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    closed_at: null,
  },
  {
    id: "t-2",
    project_id: "proj-1",
    number: 2,
    title: "Second ticket",
    description: "Second description",
    status_column_id: "col-1",
    assignee_id: null,
    reporter_id: "user-1",
    tags: [],
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    closed_at: null,
  },
  {
    id: "t-3",
    project_id: "proj-1",
    number: 3,
    title: "Third ticket",
    description: "",
    status_column_id: "col-2",
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

function createMockClient(overrides: Partial<TeamteamteamClient> = {}): TeamteamteamClient {
  return {
    getColumns: vi.fn().mockResolvedValue(columns),
    getTickets: vi.fn().mockResolvedValue(tickets),
    getMembers: vi.fn().mockResolvedValue(members),
    moveTicket: vi.fn().mockResolvedValue(tickets[0]),
    assignTicket: vi.fn().mockResolvedValue(tickets[0]),
    closeTicket: vi.fn().mockResolvedValue(tickets[0]),
    reopenTicket: vi.fn().mockResolvedValue(tickets[0]),
    createTicket: vi.fn().mockResolvedValue(tickets[0]),
    ...overrides,
  } as unknown as TeamteamteamClient;
}

const wait = (ms = 50) => new Promise((r) => setTimeout(r, ms));

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

    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("To Do");
    expect(frame).toContain("In Progress");
    expect(frame).toContain("Done");
    expect(frame).toContain("DEMO-1");
    expect(frame).toContain("First ticket");
    expect(frame).toContain("Alice");
    expect(frame).toContain("m: move");
    expect(frame).toContain("a: assign");
    expect(frame).toContain("c: close");
    expect(frame).toContain("o: reopen");
    expect(frame).toContain("n: new");
  });

  it("shows error state on fetch failure", async () => {
    const client = createMockClient({
      getColumns: vi.fn().mockRejectedValue(new Error("Network error")),
    });
    const { lastFrame } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    expect(lastFrame()).toContain("Error: Network error");
  });

  it("navigates right to next column", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Move right to "In Progress"
    stdin.write("\x1B[C");
    await wait();

    const frame = lastFrame()!;
    // The third ticket (in In Progress) should now be selected (has border)
    expect(frame).toContain("DEMO-3");
  });

  it("navigates down to next ticket", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Move down to second ticket
    stdin.write("\x1B[B");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("DEMO-2");
    expect(frame).toContain("Second ticket");
  });

  it("does not wrap left at first column", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Try to move left at first column
    stdin.write("\x1B[D");
    await wait();

    const frame = lastFrame()!;
    // Should still show first column content with selected ticket
    expect(frame).toContain("DEMO-1");
  });

  it("does not wrap right at last column", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Move right twice to reach "Done" (last column)
    stdin.write("\x1B[C");
    await wait();
    stdin.write("\x1B[C");
    await wait();

    // Try to move right again — should be no-op
    stdin.write("\x1B[C");
    await wait();

    const frame = lastFrame()!;
    // Still on Done column — no error
    expect(frame).toContain("Done");
  });

  it("clamps ticket index when moving to shorter column", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Move down to ticket index 1 in "To Do" (2 tickets)
    stdin.write("\x1B[B");
    await wait();

    // Move right to "In Progress" (1 ticket) — index should clamp to 0
    stdin.write("\x1B[C");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("DEMO-3");
  });

  it("opens detail pane on Enter", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Press Enter to open detail
    stdin.write("\r");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("First description");
    expect(frame).toContain("esc: close");
  });

  it("closes detail pane on Escape", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Open detail
    stdin.write("\r");
    await wait();
    expect(lastFrame()).toContain("First description");

    // Close with Escape
    stdin.write("\x1B");
    await wait();

    const frame = lastFrame()!;
    expect(frame).not.toContain("First description");
    expect(frame).toContain("m: move");
  });

  it("Enter is no-op on empty column", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Move right twice to "Done" (empty column)
    stdin.write("\x1B[C");
    await wait();
    stdin.write("\x1B[C");
    await wait();

    // Press Enter — should not open detail
    stdin.write("\r");
    await wait();

    const frame = lastFrame()!;
    expect(frame).not.toContain("esc: close");
    expect(frame).toContain("m: move");
  });

  it("footer text changes between board and detail mode", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Board mode footer
    expect(lastFrame()).toContain("m: move");

    // Open detail
    stdin.write("\r");
    await wait();

    // Detail mode footer
    expect(lastFrame()).toContain("esc: close | arrows: navigate | q: quit");
  });

  // --- Action mode tests ---

  it("m key shows move selection list", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("m");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("Move to");
    // Should show other columns (not current "To Do")
    expect(frame).toContain("In Progress");
    expect(frame).toContain("Done");
    expect(frame).toContain("up/down: select | enter: confirm | esc: cancel");
  });

  it("Escape cancels action mode", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Enter move mode
    stdin.write("m");
    await wait();
    expect(lastFrame()).toContain("Move to");

    // Cancel with Escape
    stdin.write("\x1B");
    await wait();

    const frame = lastFrame()!;
    expect(frame).not.toContain("Move to");
    expect(frame).toContain("m: move");
  });

  it("a key shows assign selection list", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("a");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("Assign to");
    expect(frame).toContain("Unassign");
    expect(frame).toContain("Alice");
  });

  it("o key shows reopen selection list", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("o");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("Reopen in");
    expect(frame).toContain("To Do");
    expect(frame).toContain("In Progress");
    expect(frame).toContain("Done");
  });

  it("c key calls closeTicket and shows success", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("c");
    await wait(100);

    expect(client.closeTicket).toHaveBeenCalledWith("t-1");
    const frame = lastFrame()!;
    expect(frame).toContain("\u2713");
    expect(frame).toContain("Ticket closed");
  });

  it("n key shows text input for new ticket", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("n");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("New Ticket");
    expect(frame).toContain("type title | enter: create | esc: cancel");
  });

  it("typing in create mode appends characters", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("n");
    await wait();

    stdin.write("H");
    await wait();
    stdin.write("i");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("Hi_");
  });

  it("Enter in create mode calls createTicket", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Enter create mode
    stdin.write("n");
    await wait();

    // Type a title
    stdin.write("N");
    await wait();
    stdin.write("e");
    await wait();
    stdin.write("w");
    await wait();

    // Submit
    stdin.write("\r");
    await wait(100);

    expect(client.createTicket).toHaveBeenCalledWith("proj-1", { title: "New" });
    const frame = lastFrame()!;
    expect(frame).toContain("\u2713");
    expect(frame).toContain("Ticket created");
  });

  it("action keys are no-ops on empty column", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Navigate to empty "Done" column
    stdin.write("\x1B[C");
    await wait();
    stdin.write("\x1B[C");
    await wait();

    // m should not open action mode (no ticket selected)
    stdin.write("m");
    await wait();

    const frame = lastFrame()!;
    expect(frame).not.toContain("Move to");
  });

  it("action keys are no-ops in detail mode", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Open detail
    stdin.write("\r");
    await wait();
    expect(lastFrame()).toContain("First description");

    // Action keys should be ignored
    stdin.write("m");
    await wait();
    expect(lastFrame()).not.toContain("Move to");

    stdin.write("c");
    await wait();
    expect(client.closeTicket).not.toHaveBeenCalled();
  });

  it("move confirm calls moveTicket and refreshes", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Enter move mode
    stdin.write("m");
    await wait();

    // Confirm first option (In Progress)
    stdin.write("\r");
    await wait(100);

    expect(client.moveTicket).toHaveBeenCalledWith("t-1", { to_column_id: "col-2" });
    const frame = lastFrame()!;
    expect(frame).toContain("\u2713");
    expect(frame).toContain("Ticket moved");
  });

  it("n key works regardless of ticket selection", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Navigate to empty "Done" column
    stdin.write("\x1B[C");
    await wait();
    stdin.write("\x1B[C");
    await wait();

    // n should still work
    stdin.write("n");
    await wait();

    expect(lastFrame()).toContain("New Ticket");
  });

  // --- Filter tests ---

  it("/ opens filter menu with Assignee/Tag/Search options", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("/");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("Filter by");
    expect(frame).toContain("Assignee");
    expect(frame).toContain("Tag");
    expect(frame).toContain("Search");
  });

  it("Esc cancels filter menu", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("/");
    await wait();
    expect(lastFrame()).toContain("Filter by");

    stdin.write("\x1B");
    await wait();

    const frame = lastFrame()!;
    expect(frame).not.toContain("Filter by");
  });

  it("filter by assignee flow shows only assigned tickets", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Open filter menu
    stdin.write("/");
    await wait();

    // Select "Assignee" (first option)
    stdin.write("\r");
    await wait();

    const assigneeFrame = lastFrame()!;
    expect(assigneeFrame).toContain("Filter by Assignee");
    expect(assigneeFrame).toContain("Any");
    expect(assigneeFrame).toContain("Alice");

    // Move down to "Alice" (past "Any")
    stdin.write("\x1B[B");
    await wait();

    // Confirm
    stdin.write("\r");
    await wait();

    const frame = lastFrame()!;
    // Should show tickets assigned to Alice (t-1 and t-3), not unassigned t-2
    expect(frame).toContain("First ticket");
    expect(frame).not.toContain("Second ticket");
    expect(frame).toContain("assignee=Alice");
  });

  it("filter by search flow shows only matching tickets", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Open filter menu
    stdin.write("/");
    await wait();

    // Navigate to "Search" (down twice)
    stdin.write("\x1B[B");
    await wait();
    stdin.write("\x1B[B");
    await wait();

    // Select "Search"
    stdin.write("\r");
    await wait();

    const searchFrame = lastFrame()!;
    expect(searchFrame).toContain("Search");
    expect(searchFrame).toContain("type to search");

    // Type "First"
    stdin.write("F");
    await wait();
    stdin.write("i");
    await wait();
    stdin.write("r");
    await wait();
    stdin.write("s");
    await wait();
    stdin.write("t");
    await wait();

    // Submit
    stdin.write("\r");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("First ticket");
    expect(frame).not.toContain("Second ticket");
    expect(frame).not.toContain("Third ticket");
  });

  it("Esc clears active filters", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Set a filter: assignee = Alice
    stdin.write("/");
    await wait();
    stdin.write("\r"); // Assignee
    await wait();
    stdin.write("\x1B[B"); // Down to Alice
    await wait();
    stdin.write("\r"); // Confirm
    await wait();

    expect(lastFrame()).toContain("assignee=Alice");

    // Esc to clear filters
    stdin.write("\x1B");
    await wait();

    const frame = lastFrame()!;
    expect(frame).not.toContain("assignee=Alice");
    expect(frame).toContain("Filters cleared");
    // All tickets should be visible again
    expect(frame).toContain("Second ticket");
  });

  it("r refreshes board and shows status message", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("r");
    await wait(100);

    const frame = lastFrame()!;
    expect(frame).toContain("Board refreshed");
    // Data should still be refetched
    expect(client.getTickets).toHaveBeenCalledTimes(2);
  });

  it("filters persist across r refresh", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Set filter: assignee = Alice
    stdin.write("/");
    await wait();
    stdin.write("\r"); // Assignee
    await wait();
    stdin.write("\x1B[B"); // Down to Alice
    await wait();
    stdin.write("\r"); // Confirm
    await wait();

    expect(lastFrame()).toContain("assignee=Alice");
    expect(lastFrame()).not.toContain("Second ticket");

    // Refresh
    stdin.write("r");
    await wait(100);

    const frame = lastFrame()!;
    // Filter should still be active
    expect(frame).toContain("assignee=Alice");
    expect(frame).not.toContain("Second ticket");
  });

  it("/ and r are no-ops in detail mode", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // Open detail
    stdin.write("\r");
    await wait();
    expect(lastFrame()).toContain("First description");

    // / should not open filter menu
    stdin.write("/");
    await wait();
    expect(lastFrame()).not.toContain("Filter by");

    // r should not refresh (getTickets called only once on initial load)
    const callCountBefore = (client.getTickets as ReturnType<typeof vi.fn>).mock.calls.length;
    stdin.write("r");
    await wait(100);
    const callCountAfter = (client.getTickets as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(callCountAfter).toBe(callCountBefore);
  });

  it("filter bar displays active filter text", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // No filter bar initially
    expect(lastFrame()).not.toContain("Filters:");

    // Set tag filter via tag menu: / → down → Enter (Tag) → down → Enter (bug)
    stdin.write("/");
    await wait();
    stdin.write("\x1B[B"); // down to Tag
    await wait();
    stdin.write("\r"); // Select Tag
    await wait();

    const tagFrame = lastFrame()!;
    expect(tagFrame).toContain("Filter by Tag");
    expect(tagFrame).toContain("Any");
    expect(tagFrame).toContain("bug");

    stdin.write("\x1B[B"); // down to bug
    await wait();
    stdin.write("\r"); // Confirm
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("tag=bug");
    expect(frame).toContain("esc to clear");
  });

  it("footer shows esc: clear filters when filters active", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    // No "esc: clear filters" without filters
    expect(lastFrame()).not.toContain("esc: clear filters");

    // Set filter
    stdin.write("/");
    await wait();
    stdin.write("\r"); // Assignee
    await wait();
    stdin.write("\x1B[B"); // Down to Alice
    await wait();
    stdin.write("\r"); // Confirm
    await wait();

    expect(lastFrame()).toContain("esc: clear filters");
  });

  it("footer shows /: filter and r: refresh", async () => {
    const client = createMockClient();
    const { lastFrame } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("/: filter");
    expect(frame).toContain("r: refresh");
  });

  it("shows error status on mutation failure", async () => {
    const client = createMockClient({
      closeTicket: vi.fn().mockRejectedValue(new Error("Server error")),
    });
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("c");
    await wait(100);

    const frame = lastFrame()!;
    expect(frame).toContain("\u2717");
    expect(frame).toContain("Server error");
  });

  // --- Help overlay tests ---

  it("? shows help overlay with shortcuts", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("?");
    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("Keyboard Shortcuts");
    expect(frame).toContain("Navigate between columns");
    expect(frame).toContain("Press Esc to close");
  });

  it("Esc closes help overlay", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("?");
    await wait();
    expect(lastFrame()).toContain("Keyboard Shortcuts");

    stdin.write("\x1B");
    await wait();

    const frame = lastFrame()!;
    expect(frame).not.toContain("Keyboard Shortcuts");
    expect(frame).toContain("m: move");
  });

  it("keys are blocked while help is showing", async () => {
    const client = createMockClient();
    const { lastFrame, stdin } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    stdin.write("?");
    await wait();
    expect(lastFrame()).toContain("Keyboard Shortcuts");

    // m should not open move mode
    stdin.write("m");
    await wait();
    expect(lastFrame()).not.toContain("Move to");
    expect(lastFrame()).toContain("Keyboard Shortcuts");
  });

  it("shows empty board message when no columns exist", async () => {
    const client = createMockClient({
      getColumns: vi.fn().mockResolvedValue([]),
    });
    const { lastFrame } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    const frame = lastFrame()!;
    expect(frame).toContain("No columns configured");
    expect(frame).toContain("q: quit");
  });

  it("footer shows ?: help hint", async () => {
    const client = createMockClient();
    const { lastFrame } = render(
      <App client={client} projectId="proj-1" orgId="org-1" prefix="DEMO" />,
    );

    await wait();

    expect(lastFrame()).toContain("?: help");
  });
});
