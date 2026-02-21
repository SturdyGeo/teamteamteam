import { describe, it, expect, beforeAll } from "vitest";
import { createApp } from "../../../../apps/api/src/app.js";
import { createAdminClient, createTestUser, type TestUser } from "../../helpers/setup.js";
import { truncateAllTables } from "../../helpers/cleanup.js";
import { authRequest, createOrg } from "../../helpers/fixtures.js";

const app = createApp();

describe("Members (integration)", () => {
  let owner: TestUser;
  let invitee: TestUser;
  let orgId: string;

  beforeAll(async () => {
    await truncateAllTables();
    const admin = createAdminClient();
    owner = await createTestUser(admin, "owner-members@test.local");
    invitee = await createTestUser(admin, "invitee-members@test.local");
    const org = await createOrg(app, owner, "Members Test Org");
    orgId = org.id as string;
  });

  it("org creator is the owner", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgId}/members`,
      owner.accessToken,
    );
    expect(res.status).toBe(200);

    const members = (await res.json()) as Record<string, unknown>[];
    expect(members).toHaveLength(1);
    expect(members[0].user_id).toBe(owner.id);
    expect(members[0].role).toBe("owner");
  });

  it("owner can invite another user", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgId}/members`,
      owner.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ email: invitee.email }),
      },
    );
    expect(res.status).toBe(201);

    const membership = (await res.json()) as Record<string, unknown>;
    expect(membership.user_id).toBe(invitee.id);
    expect(membership.role).toBe("member");
  });

  it("lists members with user details", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgId}/members`,
      owner.accessToken,
    );
    expect(res.status).toBe(200);

    const members = (await res.json()) as Record<string, unknown>[];
    expect(members).toHaveLength(2);

    for (const member of members) {
      const user = member.user as Record<string, unknown>;
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
    }
  });

  it("duplicate invite returns 409", async () => {
    const res = await authRequest(
      app,
      `/orgs/${orgId}/members`,
      owner.accessToken,
      {
        method: "POST",
        body: JSON.stringify({ email: invitee.email }),
      },
    );
    expect(res.status).toBe(409);

    const body = (await res.json()) as Record<string, unknown>;
    expect(body.error).toBeDefined();
  });

  it("invited user can now see the org", async () => {
    const res = await authRequest(app, "/orgs", invitee.accessToken);
    const orgs = (await res.json()) as Record<string, unknown>[];

    const found = orgs.find((o) => o.id === orgId);
    expect(found).toBeDefined();
  });
});
