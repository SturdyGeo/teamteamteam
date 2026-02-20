# Candoo

Terminal-first multi-user kanban platform (CLI/TUI) backed by Supabase + Postgres. Designed to evolve into a web app without rewriting core logic.

## Development Commands

All commands require Doppler prefix: `doppler run -- <command>`

```
bun run build        # Build
bun run test         # Run tests
bun run typecheck    # Type check
bun run lint         # Lint
bun run knip         # Dead code detection
bun run test:watch   # Watch mode tests
bun run test:coverage # Coverage
bun run clean        # Clean build artifacts
```

**Never auto-start dev servers** (`bun run dev`).

### Pre-completion Checklist

Run all of these and fix errors before finishing:
1. `doppler run -- bun run typecheck`
2. `doppler run -- bun run lint`
3. `doppler run -- bun run build`
4. `doppler run -- bun run test`
5. `doppler run -- bun run knip`

Test file pattern: `**/__tests__/**/*.test.ts`

## Tech Stack

- **Runtime:** Bun + TypeScript monorepo
- **CLI:** Commander + Chalk
- **TUI:** Ink (React for terminal)
- **Backend:** Supabase (Auth via magic link, Postgres, RLS)
- **Validation:** Zod
- **Package manager:** Bun (pnpm acceptable alternative)

## Architecture

Three-layer architecture. **Domain is the single source of truth.**

```
packages/domain/    → Pure logic. No HTTP, no Supabase, no Ink, no Commander, no FS, no env vars.
                      Contains: entities, commands, schemas, rules, state transitions, invariants.

apps/api/           → Application layer. Auth, persistence, queries, permissions. Orchestration only.
(or Edge Functions)

apps/cli/           → Client layer. Commander commands + TUI (Ink).
  commands/           Delegates to API client. Outputs formatted text or JSON.
  tui/                Purely derived UI. All state changes via commands.
packages/api-client/→ Shared API client used by CLI and TUI.
```

### Repository Structure
```
candoo/
├─ apps/
│  ├─ cli/          # CLI commands + TUI
│  └─ api/          # Optional thin server
├─ packages/
│  ├─ domain/       # Business rules (single source of truth)
│  └─ api-client/   # Shared client
├─ infra/
└─ dist/
```

### Command-Based Mutations

All mutations go through domain commands (e.g., `createTicket`, `moveTicket`, `assignTicket`). Commands validate inputs, enforce invariants, and return next state + activity events. Views never mutate state directly.

### Activity Log

Every mutation produces append-only activity events. UI derives history from these records.

## Critical Invariants

- **No domain logic duplication.** If two places need the same logic, move it to `packages/domain`. Each rule (key generation, state transitions, tag normalization, filtering, activity schema) exists in exactly one place.
- **No direct DB access from UI layer.** CLI and TUI must use the API client.
- **RLS is mandatory.** All data scoped by `org_id`. Never bypass org scope. Never embed service role keys.
- **Domain must not import CLI, TUI, or Supabase.**
- **Never hardcode workflow columns.** Columns are data, not enums.
- **Ticket keys must be deterministic.** Same input = same output. No hidden UI state affecting domain behavior.
- **Activity log is append-only.**
- **Update all relevant .md documentation files when making changes.**
- **Keep README.md updated.** When adding or changing user-facing features, CLI commands, TUI shortcuts, setup steps, or architecture, update the root README.md to reflect those changes.
- **Propose all plans before editing.**
