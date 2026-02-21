# TeamTeamTeam Roadmap

40 chunks across 8 phases. Each chunk is one focused session with a clear deliverable.

## Dependency Graph

```
Phase 1: Scaffolding [DONE]
    |
    +------------------+
    v                  v
Phase 2: Domain    Phase 3: Database
  [DONE]             [DONE]
    |                  |
    +------+-----------+
           v
       Phase 4: API [DONE]
           |
           v
       Phase 5: API Client [DONE]
           |
           +------------------+
           v                  v
       Phase 6: CLI [DONE]  Phase 7: TUI
           |                  |
           +------+-----------+
                  v
           Phase 8: Polish
```

## Scope Summary

| Phase | Chunks | Focus | Status |
|-------|--------|-------|--------|
| 1. Scaffolding | 4 | Monorepo, workspaces, toolchain, all `bun run` scripts passing | DONE |
| 2. Domain | 5 | Entities, schemas, rules, commands, filters — all pure, all tested | DONE |
| 3. Database | 6 | Supabase setup, migrations, RLS policies, seed data | DONE |
| 4. API | 6 | HTTP server, query endpoints, mutation endpoints, auth, org/project CRUD | DONE |
| 5. API Client | 3 | Typed client: auth, queries, mutations | DONE |
| 6. CLI | 6 | Commander commands: auth, org/project, ticket CRUD, mutations, tags, polish | DONE |
| 7. TUI | 5 | Ink board: layout, navigation, actions, filtering | DONE |
| 8. Polish | 5 | Integration tests, error audit, docs, binary, pre-release checklist | DONE |
| **Total** | **40** | | |

---

## Phase 1: Scaffolding [DONE]

Goal: Empty monorepo where every `bun run` script succeeds (even if tests are trivially empty).

- [x] **1.1 — Monorepo Init**: Root `package.json`, `tsconfig.json`, Bun workspaces config, `.gitignore`, directory skeleton.
- [x] **1.2 — Toolchain Config**: ESLint, TypeScript project references, `tsconfig` per package.
- [x] **1.3 — Test & Build Scripts**: Vitest config, `bun run test/build/clean`, Knip config, placeholder tests.
- [x] **1.4 — CI & Doppler Skeleton**: GitHub Actions workflow, Doppler documented, `.env.example`.

---

## Phase 2: Domain (pure logic, no I/O) [DONE]

Goal: All business rules implemented and tested in `packages/domain`. Zero external dependencies beyond Zod. 181 tests passing.

- [x] **2.1 — Entities & Schemas**: Zod schemas + TypeScript types for all 9 entities. `DomainError` class. `CommandResult<T>`.
- [x] **2.2 — Rules: Keys, Tags**: `generateTicketKey`, `parseTicketKey`, tag normalization, column ordering.
- [x] **2.3 — Commands: Create & Move**: `createTicket`, `moveTicket`, `closeTicket`, `reopenTicket`.
- [x] **2.4 — Commands: Assign, Tags**: `assignTicket`, `addTag`, `removeTag`.
- [x] **2.5 — Filtering & Sorting**: `filterTickets`, `matchesFilters`, `mergeFilters`, `sortTickets`.

---

## Phase 3: Database [DONE]

Goal: Supabase Postgres schema with RLS enforcing org isolation on every table.

- [x] **3.1 — Supabase CLI & Auth Config**: CLI installed, `supabase init`, linked to cloud project, Doppler env vars, magic link auth.
- [x] **3.2 — Core Tables Migration**: `orgs`, `users` (synced from auth.users), `memberships`, `projects`. Triggers, indexes, ENUM types.
- [x] **3.3 — Ticket & Workflow Tables**: `workflow_columns`, `tickets`, `tags`, `ticket_tags`. `next_ticket_number()` function with advisory lock.
- [x] **3.4 — Activity Log Table**: `activity_events` with append-only enforcement triggers (no UPDATE/DELETE).
- [x] **3.5 — RLS Policies**: `auth.user_org_ids()` helper, `project_org_id()` helper, RLS enabled on all 9 tables with org-scoped policies.
- [x] **3.6 — Seed Data & Dev Helpers**: 2 users, 1 org, 1 project (DEMO), 4 columns, 4 tags, 6 tickets, 12 activity events. `db:push`/`db:reset` scripts.

---

## Phase 4: API [DONE]

Goal: HTTP API (Hono on Bun) exposing all domain operations. Auth-gated, org-scoped. 197 tests passing.

- [x] **4.1 — Server Skeleton & Auth Middleware**: Hono app on Bun, health check endpoint, JWT auth middleware, error handler (DomainError → HTTP status mapping).
- [x] **4.2 — Org & Project Endpoints**: `GET /orgs`, `POST /orgs`, `GET /orgs/:id/projects`, `POST /orgs/:id/projects` with default workflow column creation.
- [x] **4.3 — Ticket Query Endpoints**: `GET /projects/:id/tickets` (with DB-level + domain-level filters), `GET /tickets/:id`, `GET /projects/:id/columns`.
- [x] **4.4 — Ticket Mutation Endpoints**: `POST /projects/:id/tickets`, `PATCH /tickets/:id/{move,assign,close,reopen}`. Domain command integration + activity event persistence.
- [x] **4.5 — Tag Endpoints**: `GET /projects/:id/tags`, `POST /tickets/:id/tags`, `DELETE /tickets/:id/tags/:tag`. Tag normalization via domain rules, upsert in tags table.
- [x] **4.6 — Activity & Membership Endpoints**: `GET /tickets/:id/activity`, `GET /orgs/:id/members`, `POST /orgs/:id/members` (invite by email).

---

## Phase 5: API Client [DONE]

Goal: Typed client in `packages/api-client` used by both CLI and TUI. Wraps all API endpoints. 59 tests passing.

- [x] **5.1 — Client Skeleton & Auth**: `ApiError` class, `FileSessionStore` (XDG-compliant, 0o600 perms), `HttpClient` fetch wrapper with auto-auth headers, `createAuthClient` wrapping Supabase auth (`sendMagicLink`, `verifyOtp`, `exchangeCodeForSession`, `getToken` with auto-refresh, `logout`).
- [x] **5.2 — Query Methods**: `getOrgs()`, `getProjects()`, `getColumns()`, `getTickets()` (with query param filtering), `getTicket()`, `getTags()`, `getActivity()`, `getMembers()`. All typed with domain entities + API-specific response types (`OrgWithRole`, `MemberWithUser`, `ActivityEventWithActor`).
- [x] **5.3 — Mutation Methods**: `createOrg()`, `createProject()`, `createTicket()`, `moveTicket()`, `assignTicket()`, `closeTicket()`, `reopenTicket()`, `addTag()`, `removeTag()` (URL-encoded), `inviteMember()`. `createTeamteamteamClient()` factory composes auth + queries + mutations.

---

## Phase 6: CLI [DONE]

Goal: Commander-based CLI with all commands. Formatted text output + `--json` flag. 62 new tests (402 total).

- [x] **6.1 — CLI Skeleton & Auth Commands**: Commander program, global `--json`/`--org`/`--project` flags, `client.ts` (lazy singleton), `config.ts` (XDG `~/.config/teamteamteam/config.json`), `output.ts` (table, JSON, error handler), `login`/`logout`/`whoami`.
- [x] **6.2 — Org & Project Commands**: `org list`, `org create`, `project list`, `project create`, `project use` (saves default to config). `resolve.ts` with `resolveProjectByPrefix`.
- [x] **6.3 — Ticket CRUD Commands**: `ticket list` (table with key, title, tags), `ticket create` (with `-d`/`-a`/`-t` flags), `ticket show` (detail view with columns, activity). `resolveTicket`, `resolveColumn`, `resolveMember` resolvers.
- [x] **6.4 — Ticket Mutation Commands**: `ticket move`, `ticket assign`, `ticket close`, `ticket reopen` (with `--column` flag, defaults to first column).
- [x] **6.5 — Tag & Filter Commands**: `ticket tag add`, `ticket tag remove`, `tags` (top-level). Filter flags on `ticket list`: `--status`, `--assignee`, `--tag`, `--search`.
- [x] **6.6 — CLI Polish**: Chalk colors (dim separators, green success, red errors). Error mapping (401→auth, 403→permission, 404→not found). `--json` on every command. Knip/lint/typecheck clean.

---

## Phase 7: TUI [DONE]

Goal: Ink-based kanban board rendered in terminal. Read-only board with keyboard-driven actions.

- [x] **7.1 — Board Layout**

Scope: Ink app entry point. Fetch columns + tickets via API client. Render columns side-by-side. Tickets show key, title, assignee.

Deliverable: `ttteam board` renders a static board from live data.

- [x] **7.2 — Navigation & Selection**

Scope: Arrow key navigation: left/right between columns, up/down between tickets. Highlight selected ticket. Ticket detail pane (press Enter to expand).

Deliverable: Can navigate the board and view ticket details.

- [x] **7.3 — Board Actions**

Scope: Keyboard shortcuts: `m` move (select target column), `a` assign, `c` close, `o` reopen, `n` new ticket. Each dispatches API client mutation, then refreshes board. Extracted `useBoardState` hook, `SelectList`, `TextInput`, `StatusBar` components.

Deliverable: All ticket mutations work from the board.

- [x] **7.4 — Filtering & Refresh**

Scope: `/` to open filter bar. Filter by assignee, tag, text. `r` to manual refresh. Display active filters. `Esc` to clear filters.

Deliverable: Filters apply client-side. Board updates on refresh.

- [x] **7.5 — TUI Polish**

Scope: Loading states, error toasts, empty states, responsive column widths, color theme (Chalk), help bar (`?` to show shortcuts).

Deliverable: TUI feels polished and usable.

---

## Supabase Edge Functions Migration [DONE]

The API has been migrated to support Supabase Edge Functions as a deployment target. A build step (`bun run build:edge`) bundles the Hono app into a single ESM file. A thin Deno adapter (`supabase/functions/api/index.ts`) serves it via `Deno.serve()`. All source code and tests remain in `apps/api/`. The Bun dev server still works for local development.

- [x] Runtime-agnostic env helper (`apps/api/src/lib/env.ts`)
- [x] `createApp(basePath?)` factory in `apps/api/src/app.ts`
- [x] `build:edge` script in root `package.json`
- [x] Edge Function entry point + Deno import map
- [x] Lazy `TEAMTEAMTEAM_API_URL` validation (auth commands work without it)
- [x] `supabase/config.toml` `[functions.api]` config

---

## Phase 8: Polish

Goal: Production-ready MVP. All tests pass, errors handled, docs complete.

- [x] **8.1 — Integration Tests**

Scope: End-to-end tests: API -> database round-trips, CLI -> API -> database flows. Test org isolation (user A can't see user B's org). Test full ticket lifecycle.

Deliverable: Integration test suite passes in CI.

- [x] **8.2 — Error Handling Audit**

Scope: Review every API endpoint, CLI command, and TUI action for: auth expiry, network errors, not-found, permission denied, validation errors. Consistent error types and user-facing messages.

Deliverable: No unhandled promise rejections. All error paths tested.

- [x] **8.3 — Documentation**

Scope: Root `README.md` (setup, usage, architecture). `apps/cli/README.md` (command reference). `apps/api/README.md` (endpoint reference). `packages/domain/README.md` (domain model overview). Update `CLAUDE.md` and `AGENTS.md` if anything changed.

Deliverable: A new contributor can set up and use the project from docs alone.

- [x] **8.4 — Binary & Distribution**

Scope: `bun build --compile` to produce standalone CLI binary. Test on macOS. Add `bun run release` script. Version in `package.json`.

Deliverable: Single binary runs without Bun installed.

- [x] **8.5 — Pre-Release Checklist**

Scope: Full pass of all 5 checks (`typecheck`, `lint`, `build`, `test`, `knip`). Verify no hardcoded secrets. Verify RLS works. Verify domain has no I/O imports. Tag `v0.1.0`.

Deliverable: All checks green. Tagged release on `main`.

---

## Parallelism Notes

- **Phase 2 + Phase 3** run in parallel after Phase 1 completes
- **Phase 6 + Phase 7** can run in parallel after Phase 5 completes (TUI and CLI are independent)
- Within Phase 4: chunk 4.1 must come first; 4.2-4.6 can be partially parallelized
- Within Phase 8: chunks 8.1-8.4 are parallel; 8.5 depends on all others
