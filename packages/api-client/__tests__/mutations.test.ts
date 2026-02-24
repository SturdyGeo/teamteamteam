import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMutationMethods } from "../src/mutations.js";
import type { HttpClient } from "../src/http.js";

function mockHttp(): HttpClient {
  return {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  } as unknown as HttpClient;
}

describe("MutationMethods", () => {
  let http: ReturnType<typeof mockHttp>;

  beforeEach(() => {
    http = mockHttp();
  });

  it("createOrg calls POST /orgs", async () => {
    const mutations = createMutationMethods(http);
    await mutations.createOrg({ name: "Acme" });
    expect(http.post).toHaveBeenCalledWith("/orgs", { name: "Acme" });
  });

  it("createProject calls POST /orgs/:orgId/projects", async () => {
    const mutations = createMutationMethods(http);
    await mutations.createProject("org-1", { name: "Web", prefix: "WEB" });
    expect(http.post).toHaveBeenCalledWith("/orgs/org-1/projects", {
      name: "Web",
      prefix: "WEB",
    });
  });

  it("createTicket calls POST /projects/:projectId/tickets", async () => {
    const mutations = createMutationMethods(http);
    const input = { title: "Bug fix" };
    await mutations.createTicket("proj-1", input);
    expect(http.post).toHaveBeenCalledWith(
      "/projects/proj-1/tickets",
      input,
    );
  });

  it("moveTicket calls PATCH /tickets/:id/move", async () => {
    const mutations = createMutationMethods(http);
    await mutations.moveTicket("t-1", { to_column_id: "col-2" });
    expect(http.patch).toHaveBeenCalledWith("/tickets/t-1/move", {
      to_column_id: "col-2",
    });
  });

  it("updateTicket calls PATCH /tickets/:id", async () => {
    const mutations = createMutationMethods(http);
    await mutations.updateTicket("t-1", {
      title: "Updated title",
      description: "Updated description",
    });
    expect(http.patch).toHaveBeenCalledWith("/tickets/t-1", {
      title: "Updated title",
      description: "Updated description",
    });
  });

  it("assignTicket calls PATCH /tickets/:id/assign", async () => {
    const mutations = createMutationMethods(http);
    await mutations.assignTicket("t-1", { assignee_id: "user-2" });
    expect(http.patch).toHaveBeenCalledWith("/tickets/t-1/assign", {
      assignee_id: "user-2",
    });
  });

  it("closeTicket calls PATCH /tickets/:id/close", async () => {
    const mutations = createMutationMethods(http);
    await mutations.closeTicket("t-1");
    expect(http.patch).toHaveBeenCalledWith("/tickets/t-1/close");
  });

  it("reopenTicket calls PATCH /tickets/:id/reopen", async () => {
    const mutations = createMutationMethods(http);
    await mutations.reopenTicket("t-1", { to_column_id: "col-1" });
    expect(http.patch).toHaveBeenCalledWith("/tickets/t-1/reopen", {
      to_column_id: "col-1",
    });
  });

  it("deleteTicket calls DELETE /tickets/:id", async () => {
    const mutations = createMutationMethods(http);
    await mutations.deleteTicket("t-1");
    expect(http.delete).toHaveBeenCalledWith("/tickets/t-1");
  });

  it("addTag calls POST /tickets/:id/tags", async () => {
    const mutations = createMutationMethods(http);
    await mutations.addTag("t-1", { tag: "bug" });
    expect(http.post).toHaveBeenCalledWith("/tickets/t-1/tags", {
      tag: "bug",
    });
  });

  it("removeTag calls DELETE with URL-encoded tag", async () => {
    const mutations = createMutationMethods(http);
    await mutations.removeTag("t-1", "bug fix");
    expect(http.delete).toHaveBeenCalledWith(
      "/tickets/t-1/tags/bug%20fix",
    );
  });

  it("removeTag encodes special characters", async () => {
    const mutations = createMutationMethods(http);
    await mutations.removeTag("t-1", "a/b&c");
    expect(http.delete).toHaveBeenCalledWith(
      "/tickets/t-1/tags/a%2Fb%26c",
    );
  });

  it("inviteMember calls POST /orgs/:orgId/members", async () => {
    const mutations = createMutationMethods(http);
    await mutations.inviteMember("org-1", {
      email: "new@example.com",
      role: "member",
    });
    expect(http.post).toHaveBeenCalledWith("/orgs/org-1/members", {
      email: "new@example.com",
      role: "member",
    });
  });

  it("updateMemberRole calls PATCH /orgs/:orgId/members/:memberId", async () => {
    const mutations = createMutationMethods(http);
    await mutations.updateMemberRole("org-1", "mem-1", {
      role: "admin",
    });
    expect(http.patch).toHaveBeenCalledWith("/orgs/org-1/members/mem-1", {
      role: "admin",
    });
  });
});
