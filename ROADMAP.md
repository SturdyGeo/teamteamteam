# TeamTeamTeam Web App Roadmap

32 chunks across 8 phases. Each chunk is one focused session with a concrete deliverable.

## Web Architecture Constraints (Locked)

- SPA dashboard app (no SSR required)
- Backend remains Supabase Edge Function API (Hono)
- Postgres + RLS remain the security boundary
- `packages/domain` stays the single source of truth for business rules
- `packages/api-client` is shared across CLI, TUI, and Web
- No duplicate domain logic in UI

## Dependency Graph

```
Phase 1: Web Foundation
    |
    v
Phase 2: Auth + App Shell
    |
    +------------------+
    v                  v
Phase 3: Routing    Phase 4: Data Layer
    |                  |
    +---------+--------+
              v
      Phase 5: Board + Tickets
              |
              v
      Phase 6: Mutations + Optimistic UX
              |
              v
      Phase 7: Activity + Collaboration
              |
              v
      Phase 8: Hardening + Release
```

## Scope Summary

| Phase | Chunks | Focus | Status |
|-------|--------|-------|--------|
| 1. Web Foundation | 4 | `apps/web` scaffold, Vite, Tailwind + shadcn/ui, Router, Query setup | DONE |
| 2. Auth + App Shell | 4 | Supabase auth flow, session hydration, org/project shell | DONE |
| 3. Routing | 4 | Typed nested routes for org/project navigation | DONE |
| 4. Data Layer | 4 | Query keys, loaders, API client integration, cache rules | DONE |
| 5. Board + Tickets | 5 | Ticket board, ticket detail, filters, project views | DONE |
| 6. Mutations + Optimistic UX | 5 | create/move/assign/close/reopen/tag with optimistic updates | TODO |
| 7. Activity + Collaboration | 3 | activity feed, members, invite flows | TODO |
| 8. Hardening + Release | 3 | testing, performance, docs, release checklist | TODO |
| **Total** | **32** | | |

---

## Phase 1: Web Foundation

Goal: Boot a production-grade SPA shell in `apps/web` with typed routing and query infrastructure.

- [x] **1.1 — Workspace Scaffold**: Create `apps/web` package with Bun scripts (`dev`, `build`, `test`, `typecheck`, `lint`) and monorepo wiring.
- [x] **1.2 — Vite + React + TypeScript**: Set up Vite build, TS config, env typing, path aliases.
- [x] **1.3 — Styling Baseline**: Install Tailwind CSS + shadcn/ui, base tokens, typography, layout primitives.
- [x] **1.4 — Router + Query Bootstrapping**: Initialize TanStack Router + TanStack Query providers and root layout.

---

## Phase 2: Auth + App Shell

Goal: Reuse Supabase auth and shared API client in web without backend changes.

- [x] **2.1 — Supabase Web Client**: Add `@supabase/supabase-js` setup (`src/lib/supabase.ts`) with env validation.
- [x] **2.2 — Session Lifecycle**: Implement login callback handling, session restore (memory + local storage), logout flow.
- [x] **2.3 — API Client Auth Bridge**: Inject access token from Supabase session into shared `packages/api-client`.
- [x] **2.4 — App Shell**: Build authenticated shell with org/project context selectors and protected-route guard.

---

## Phase 3: Routing

Goal: Establish typed, nested route model matching org/project hierarchy.

- [x] **3.1 — Route Tree**: Implement `/orgs`, `/orgs/$orgId`, `/orgs/$orgId/projects/$projectId` route structure.
- [x] **3.2 — Route Loaders**: Co-locate loaders for org list, project list, and project metadata.
- [x] **3.3 — Error Boundaries**: Add route-level error boundaries and not-found handling.
- [x] **3.4 — URL State Contracts**: Define typed search params for filters/sorting/pagination.

---

## Phase 4: Data Layer

Goal: Make TanStack Query the standard for all server state and mutation orchestration.

- [x] **4.1 — Query Key Strategy**: Define stable query keys per org/project/ticket scope.
- [x] **4.2 — Query Modules**: Build feature query hooks wrapping `packages/api-client` methods.
- [x] **4.3 — Cache Policy**: Configure stale times, refetch triggers, and invalidation rules by feature.
- [x] **4.4 — Devtools + Diagnostics**: Add TanStack Query devtools (dev only) and request/error telemetry hooks.

---

## Phase 5: Board + Tickets

Goal: Deliver the primary dashboard experience for ticket operations and project visibility.

- [x] **5.1 — Board Columns**: Render workflow columns in server-defined order (no hardcoded statuses).
- [x] **5.2 — Ticket Cards**: Show key metadata (priority, assignee, tags, updated time), sorted by domain rules.
- [x] **5.3 — Ticket Detail Panel**: Build detail drawer/modal for description, metadata, and actions.
- [x] **5.4 — Client Filters**: Implement assignee/tag/search/status filters with URL-backed state.
- [x] **5.5 — Empty/Loading/Error States**: Standardize states across board and ticket detail views.

---

## Phase 6: Mutations + Optimistic UX

Goal: Ship fast, safe interactions with optimistic updates and rollback.

- [ ] **6.1 — Create Ticket Flow**: Modal/form with zod validation and project-scoped defaults.
- [ ] **6.2 — Move/Assign/Priority**: Mutation hooks for core transitions with optimistic cache updates.
- [ ] **6.3 — Close/Reopen**: Status transitions via shared API client, rollback on conflict/error.
- [ ] **6.4 — Tag Add/Remove**: Tag management with normalization preserved by domain/API behavior.
- [ ] **6.5 — Mutation UX System**: Consistent pending states, inline errors, and toast notifications.

---

## Phase 7: Activity + Collaboration

Goal: Expose team context and auditability inside the web experience.

- [ ] **7.1 — Activity Timeline**: Ticket activity feed from append-only activity events.
- [ ] **7.2 — Member Surfaces**: Org member list and assignment selectors wired to membership APIs.
- [ ] **7.3 — Invite Workflow**: Member invite UI for org admins with clear permission/error handling.

---

## Phase 8: Hardening + Release

Goal: Production-ready web client with confidence in correctness and maintainability.

- [ ] **8.1 — Test Coverage**: Add unit + integration tests for routing, query modules, and key mutation flows.
- [ ] **8.2 — Performance + Reliability**: Audit bundle size, render performance, retry behavior, and offline/error handling.
- [ ] **8.3 — Docs + Release Checklist**: Update root docs (`README.md`, `AGENTS.md`) and run full quality gate:
  - `doppler run -- bun run typecheck`
  - `doppler run -- bun run lint`
  - `doppler run -- bun run build`
  - `doppler run -- bun run test`
  - `doppler run -- bun run knip`

---

## Parallelism Notes

- Phase 3 and Phase 4 can partially overlap after Phase 2.  
- In Phase 5, chunks 5.1 and 5.5 can run in parallel; 5.2 depends on 5.1.  
- In Phase 6, chunks 6.1 and 6.5 can run in parallel; 6.2-6.4 share mutation utility scaffolding.  
- Phase 8.3 depends on completion of all prior phases.

## Explicit Non-Goals (Web MVP)

- SSR/SEO-focused rendering
- New backend framework migration
- GraphQL/tRPC abstraction layer
- Realtime-first implementation (can be layered later via invalidation)
- Rewriting domain rules outside `packages/domain`
