import { describe, it, expect, vi, beforeEach } from "vitest";
import { createQueryMethods } from "../src/queries.js";
import type { HttpClient } from "../src/http.js";

function mockHttp(): HttpClient {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  } as unknown as HttpClient;
}

describe("QueryMethods", () => {
  let http: ReturnType<typeof mockHttp>;

  beforeEach(() => {
    http = mockHttp();
  });

  it("getOrgs calls GET /orgs", async () => {
    const queries = createQueryMethods(http);
    await queries.getOrgs();
    expect(http.get).toHaveBeenCalledWith("/orgs");
  });

  it("getProjects calls GET /orgs/:orgId/projects", async () => {
    const queries = createQueryMethods(http);
    await queries.getProjects("org-1");
    expect(http.get).toHaveBeenCalledWith("/orgs/org-1/projects");
  });

  it("getColumns calls GET /projects/:projectId/columns", async () => {
    const queries = createQueryMethods(http);
    await queries.getColumns("proj-1");
    expect(http.get).toHaveBeenCalledWith("/projects/proj-1/columns");
  });

  it("getTickets calls GET /projects/:projectId/tickets", async () => {
    const queries = createQueryMethods(http);
    await queries.getTickets("proj-1");
    expect(http.get).toHaveBeenCalledWith("/projects/proj-1/tickets");
  });

  it("getTickets appends query params", async () => {
    const queries = createQueryMethods(http);
    await queries.getTickets("proj-1", {
      priority: "P0",
      assignee_id: "user-1",
    });
    const calledPath = (http.get as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain("/projects/proj-1/tickets?");
    expect(calledPath).toContain("priority=P0");
    expect(calledPath).toContain("assignee_id=user-1");
  });

  it("getTickets omits undefined params", async () => {
    const queries = createQueryMethods(http);
    await queries.getTickets("proj-1", { priority: "P1" });
    const calledPath = (http.get as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(calledPath).toContain("priority=P1");
    expect(calledPath).not.toContain("assignee_id");
    expect(calledPath).not.toContain("undefined");
  });

  it("getTicket calls GET /tickets/:ticketId", async () => {
    const queries = createQueryMethods(http);
    await queries.getTicket("ticket-1");
    expect(http.get).toHaveBeenCalledWith("/tickets/ticket-1");
  });

  it("getTags calls GET /projects/:projectId/tags", async () => {
    const queries = createQueryMethods(http);
    await queries.getTags("proj-1");
    expect(http.get).toHaveBeenCalledWith("/projects/proj-1/tags");
  });

  it("getActivity calls GET /tickets/:ticketId/activity", async () => {
    const queries = createQueryMethods(http);
    await queries.getActivity("ticket-1");
    expect(http.get).toHaveBeenCalledWith("/tickets/ticket-1/activity");
  });

  it("getMembers calls GET /orgs/:orgId/members", async () => {
    const queries = createQueryMethods(http);
    await queries.getMembers("org-1");
    expect(http.get).toHaveBeenCalledWith("/orgs/org-1/members");
  });
});
