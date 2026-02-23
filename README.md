# Teamteamteam

Terminal-first multi-user kanban platform for software teams. Provides CLI, TUI (terminal UI), and web SPA clients backed by Supabase authentication and Postgres persistence.

Designed to evolve into a full web application without rewriting core logic.

## Features

- **CLI commands** for managing orgs, projects, tickets, tags, and workflows
- **TUI board** (Ink-based kanban board rendered in the terminal)
- **Web dashboard SPA** (`apps/web`) with TanStack Router + Query and shadcn/ui components
- **Built-in backend defaults** in the CLI for zero-config consumer usage
- **Multi-user / multi-org** with Supabase magic link authentication
- **Row Level Security** for org-level data isolation
- **Command-based mutations** with full activity logging
- **Deterministic ticket keys** (e.g., `PROJ-1`)
- **Tags** with normalization (lowercase, trim, dedup)
- **Flexible workflows** — columns are data, not hardcoded enums
- **Client-side filtering** by status, assignee, tag, and text search

## Prerequisites

- [Bun](https://bun.sh/) (runtime and package manager)
- [Doppler](https://www.doppler.com/) (secrets management for local development and CI checks)
- [Supabase](https://supabase.com/) project (or local dev via `supabase init`)

## One-Line CLI Install

Install the terminal command in one line:

```sh
bun run install:cli
```

Then run:

```sh
ttteam --help
```

## Run CLI Locally (Without Install)

From the repo root, run the CLI entrypoint directly:

```sh
doppler run -- bun run apps/cli/src/index.ts --help
doppler run -- bun run apps/cli/src/index.ts whoami
```

This is the correct local dev invocation. `bun run ttteam` will fail unless you add a script named `ttteam` to `package.json`.

## Setup

1. **Clone the repository**

   ```sh
   git clone <repo-url>
   cd teamteamteam
   ```

2. **Install dependencies**

   ```sh
   bun install
   ```

3. **Configure secrets (developer workflow)**

   Copy the environment template and configure Doppler with your Supabase credentials:

   ```sh
   cp .env.example .env
   ```

   Development environment variables (managed via Doppler):

   | Variable           | Description                  |
   |--------------------|------------------------------|
   | `SUPABASE_URL`     | Your Supabase project URL    |
   | `SUPABASE_ANON_KEY`| Your Supabase anonymous key  |
   | `SUPABASE_SERVICE_ROLE_KEY` | Service role key (integration tests only) |
   | `TEAMTEAMTEAM_API_URL`   | API URL (Edge Function or local, e.g. `https://<ref>.supabase.co/functions/v1/api`) |
   | `DATABASE_URL`     | Direct Postgres URL (integration tests only, defaults to local Supabase) |
   | `VITE_SUPABASE_URL` | Supabase URL for web app (`apps/web`) |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon key for web app (`apps/web`) |
   | `VITE_TEAMTEAMTEAM_API_URL` | Edge Function API URL for web app (`apps/web`) |

   See [infra/README.md](infra/README.md) for detailed Doppler setup instructions.

4. **Build the project**

   ```sh
   doppler run -- bun run build
   ```

5. **Run the tests**

   ```sh
   doppler run -- bun run test
   ```

## Usage

`ttteam` now includes a built-in default backend target for consumer usage.
You only need Doppler when running local development scripts in this repository.

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON (works with every command) |
| `--org <name>` | Override the default org (name or UUID) |
| `--project <prefix>` | Override the default project (prefix or UUID) |
| `--custom-backend` | Use custom backend values from flags or env vars instead of built-in defaults |
| `--api-url <url>` | Custom API URL (requires `--custom-backend`) |
| `--supabase-url <url>` | Custom Supabase URL (requires `--custom-backend`) |
| `--supabase-anon-key <key>` | Custom Supabase anon key (requires `--custom-backend`) |

### Custom Backend Override

If you want to point the CLI at your own Supabase project and API:

```sh
ttteam --custom-backend \
  --api-url https://<project-ref>.supabase.co/functions/v1/api \
  --supabase-url https://<project-ref>.supabase.co \
  --supabase-anon-key <anon-key> \
  whoami
```

You can also pass only `--custom-backend` and provide values through env vars:

```sh
SUPABASE_URL=... SUPABASE_ANON_KEY=... TEAMTEAMTEAM_API_URL=... ttteam --custom-backend whoami
```

### Authentication

```sh
ttteam login <email>       # Send login code, then enter OTP
ttteam logout              # Clear stored session
ttteam whoami              # Display current user info
```

### Organizations

```sh
ttteam org list                # List your organizations
ttteam org create <name>       # Create a new organization
ttteam org use <name>          # Set default org for local context
ttteam org delete <name>       # Delete an org and all its data (--yes to skip prompt)
ttteam org invite <email>      # Invite a user by email (--role admin|member)
```

If you have only one org, it is auto-selected without needing `org use`.

### Projects

```sh
ttteam project list                    # List projects in current org
ttteam project create <name> <prefix>  # Create a new project (prefix e.g. PROJ)
ttteam project use <prefix>            # Set default project for local context
ttteam project delete <prefix>         # Delete a project and all its data (--yes to skip prompt)
```

### Tickets

```sh
ttteam ticket list             # List tickets (supports filter flags)
ttteam ticket create <title>   # Create a new ticket
ttteam ticket show <key>       # Show ticket details + activity history
ttteam ticket move <key> <column>      # Move ticket to a workflow column
ttteam ticket assign <key> <assignee>  # Assign by email, display name, or email username
ttteam ticket close <key>              # Close a ticket
ttteam ticket reopen <key>             # Reopen a closed ticket
```

#### Create Options

```sh
ttteam ticket create "Fix login" -d "Details..." -a alice@co.com -t bug
```

| Flag | Description |
|------|-------------|
| `-d, --description <text>` | Description |
| `-a, --assignee <assignee>` | Assignee (email, display name, or email username) |
| `-t, --tag <name>` | Tag (repeatable) |

#### Filtering

```sh
ttteam ticket list --status "In Progress"
ttteam ticket list --assignee alice@co.com
ttteam ticket list --assignee alice
ttteam ticket list --tag bug
ttteam ticket list --search "login issue"
```

### Tags

```sh
ttteam ticket tag add <key> <tag>      # Add a tag to a ticket
ttteam ticket tag remove <key> <tag>   # Remove a tag from a ticket
ttteam tags                            # List all tags in current project
```

### TUI Board

```sh
ttteam board          # Launch the interactive kanban board
```

**Keyboard shortcuts:**

| Key   | Action                      |
|-------|-----------------------------|
| `←/→` | Navigate between columns   |
| `↑/↓` | Navigate between tickets   |
| `Enter`| Expand ticket detail pane  |
| `n`   | Create ticket (title + description) |
| `m`   | Move ticket to column       |
| `a`   | Assign ticket               |
| `c`   | Close ticket                |
| `o`   | Reopen ticket               |
| `/`   | Open filter bar             |
| `r`   | Refresh board               |
| `Esc` | Close detail pane / clear filters |
| `?`   | Show help                   |

### Web App (SPA)

The web client lives in `apps/web` and uses:

- React + Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Supabase JS auth
- Shared `@teamteamteam/api-client`

Phase 2 auth/shell is implemented:

- Session hydration on app boot (in-memory auth state + Supabase localStorage persistence)
- Boot splash loader persists through auth hydration and initial route loading (avoids blank/empty gaps on refresh)
- Email OTP passcode verification on `/login` plus callback fallback for magic-link redirects
- Global app-shell org/project selectors that persist context in localStorage

Phase 3 routing is implemented:

- Route-level error boundaries and not-found pages
- Route-level error and not-found pages now share the app's dark mono themed styling
- URL-backed view contracts for project board routing and state

Phase 4 data layer is implemented:

- Canonical query key strategy for org/project/ticket scopes
- Feature query modules/hooks wrapping shared `@teamteamteam/api-client`
- Cache policy tuning (feature stale times, retry behavior, reconnect refetch)
- Web visual theming uses global CSS design tokens (no hardcoded route/component color literals)
- `/orgs/$orgId` now supports inviting members by email with `member`/`admin` role selection
- Org/project list cards are click-to-open across web org views (buttonless card navigation)
- Dev-only telemetry hooks for query/mutation error events
- Ticket detail modal now supports persisted inline editing for title + description
- Saving ticket detail edits now closes the modal; unchanged edits close without surfacing an error
- Ticket activity is collapsed by default behind a small underlined "Review activity" toggle below action buttons
- Assignee changes are optimistic (immediate UI update with rollback on failure)
- Ticket modal assignee uses a dropdown selector (quick-card assign remains searchable)
- Ticket detail save requires the latest Edge Function deployment and DB migrations (`build:edge`, `functions deploy api`, `supabase db push`)
- Ticket edit modal supports Enter-to-save (title input) with color-coded Save vs Close/Reopen actions
- Primary action buttons use a consistent green style across login/create/save/add web flows

Phase 5 board experience is implemented:

- Server-ordered workflow columns and richer ticket cards
- Board-first project experience focused on kanban flow
- Domain-based sorting behavior for project board views
- Standardized loading/empty/error states for board interactions

Web board UX refresh is implemented:

- Compact rounded top navigation capsule with org/project selectors and profile menu
- Custom org/project dropdown menus with inline "add" actions
- Create org/project dialogs launched directly from nav controls
- Board-first project view with horizontal kanban columns
- Drag-and-drop ticket moves across columns (backed by API mutation + refetch)
- Active drop target column highlights while dragging tickets
- Per-column `+` actions now open the shared ticket modal in create mode
- Single-click ticket modal with full detail view + quick edit actions
- Clickable assignee badge on cards opens quick-assign dropdown (includes Nobody)
- Updated visual theme to a dark mono "executive terminal" style across auth + app surfaces
- Signed-in logo click now triggers a fast twirl animation with a sharp snap-stop
- `/` now redirects authenticated users to the first available project board
- Unauthenticated `/` and `/login` now use a dark mono, no-nav auth shell
- OTP login modal styling now mirrors the brand's "executive terminal" look

Run a production build:

```sh
doppler run -- bun run web:build
```

Typecheck web only:

```sh
doppler run -- bun run web:typecheck
```

## API

The HTTP API is built with Hono. It exposes all domain operations, auth-gated via Supabase JWT tokens and org-scoped via RLS.

### Deployment (Supabase Edge Functions)

The API is deployed as a Supabase Edge Function. A build step bundles the Hono app into a single ESM file that runs on Deno:

```sh
# 1. Build the Edge Function bundle
doppler run -- bun run build:edge

# 2. Deploy to Supabase
doppler run -- supabase functions deploy api

# 3. Verify health endpoint
curl https://<project-ref>.supabase.co/functions/v1/api/health
```

Set `TEAMTEAMTEAM_API_URL` in Doppler to your deployed Edge Function URL (e.g. `https://<project-ref>.supabase.co/functions/v1/api`).

The Edge adapter normalizes both `/orgs/...` and `/api/orgs/...` runtime path shapes before requests hit Hono routes. If web requests start failing with browser CORS preflight errors, rebuild and redeploy the function so the latest adapter is live.

**Local Edge Function serving** (optional, requires Docker):

```sh
doppler run -- supabase functions serve
curl http://localhost:54321/functions/v1/api/health
```

### Local Development (Bun)

The primary local dev workflow uses Bun directly (no Docker required):

```sh
doppler run -- bun run --filter @teamteamteam/api dev
```

The Bun server runs on `http://localhost:3001` by default (configurable via `PORT` env var).

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check (no auth required) |
| `GET` | `/orgs` | List user's organizations |
| `POST` | `/orgs` | Create organization |
| `DELETE` | `/orgs/:orgId` | Delete organization (owner only) |
| `GET` | `/orgs/:orgId/projects` | List projects in org |
| `POST` | `/orgs/:orgId/projects` | Create project (+ default columns) |
| `DELETE` | `/orgs/:orgId/projects/:projectId` | Delete project (owner/admin) |
| `GET` | `/orgs/:orgId/members` | List org members |
| `POST` | `/orgs/:orgId/members` | Invite member by email |
| `GET` | `/projects/:projectId/columns` | List workflow columns |
| `GET` | `/projects/:projectId/tickets` | List tickets (with filters) |
| `GET` | `/projects/:projectId/tags` | List project tags |
| `POST` | `/projects/:projectId/tickets` | Create ticket |
| `GET` | `/tickets/:ticketId` | Get ticket details |
| `PATCH` | `/tickets/:ticketId/move` | Move ticket to column |
| `PATCH` | `/tickets/:ticketId/assign` | Assign/unassign ticket |
| `PATCH` | `/tickets/:ticketId/close` | Close ticket |
| `PATCH` | `/tickets/:ticketId/reopen` | Reopen ticket |
| `POST` | `/tickets/:ticketId/tags` | Add tag to ticket |
| `DELETE` | `/tickets/:ticketId/tags/:tag` | Remove tag from ticket |
| `GET` | `/tickets/:ticketId/activity` | Get ticket activity log |

### Query Filters

`GET /projects/:projectId/tickets` supports these query parameters:

| Param | Description |
|-------|-------------|
| `status_column_id` | Filter by workflow column UUID |
| `assignee_id` | Filter by assignee UUID (use `null` for unassigned) |
| `tag` | Filter by tag name (domain-level) |
| `search` | Text search in title and description (domain-level) |

### Authentication

All endpoints except `/health` require a valid Supabase JWT in the `Authorization: Bearer <token>` header. RLS policies enforce org-level isolation automatically.

## Development

### Commands

All development commands require the Doppler prefix:

```sh
doppler run -- bun run build          # Build all packages
doppler run -- bun run build:edge     # Build Edge Function bundle
doppler run -- bun run build:cli      # Build standalone macOS binary (dist/ttteam)
doppler run -- bun run release        # Build all + binary
doppler run -- bun run typecheck      # Type check
doppler run -- bun run lint           # Lint
doppler run -- bun run test           # Run unit tests
doppler run -- bun run test:integration # Run integration tests (requires Supabase local dev)
doppler run -- bun run test:watch     # Run tests in watch mode
doppler run -- bun run test:coverage  # Run tests with coverage
doppler run -- bun run knip           # Dead code detection
doppler run -- bun run clean          # Clean build artifacts
doppler run -- bun run web:build      # Build web SPA (apps/web)
doppler run -- bun run web:typecheck  # Typecheck web SPA (apps/web)
```

### Pre-commit Checklist

Run all five checks before submitting changes:

```sh
doppler run -- bun run typecheck
doppler run -- bun run lint
doppler run -- bun run build
doppler run -- bun run test
doppler run -- bun run knip
```

### Test Pattern

Unit tests are located at `**/__tests__/**/*.test.ts` within each workspace package.

### Integration Tests

Integration tests live in `tests/integration/` and run against a real Supabase local dev instance. They verify the full stack: HTTP request -> auth middleware -> Supabase client -> Postgres (with RLS) -> response.

**Prerequisites:**
- Docker running
- `supabase start` (runs migrations automatically)

**Running:**

```sh
doppler run -- bun run test:integration
```

Integration tests cover:
- Org/project/ticket CRUD through the real API
- RLS org isolation (users can only see their own org's data)
- Ticket lifecycle (create, move, assign, tag, close, reopen)
- Activity event append-only enforcement
- Member invitation and access control
- Tag normalization and deduplication

## Binary Distribution

Install the CLI in one command:

```sh
bun run install:cli
```

This builds the standalone binary and installs `ttteam` to `~/.local/bin/ttteam` by default.

Use a custom install location with `TTTEAM_INSTALL_DIR`:

```sh
TTTEAM_INSTALL_DIR=/usr/local/bin bun run install:cli
```

Uninstall:

```sh
bun run uninstall:cli
```

You can also build the standalone macOS binary without installing it:

```sh
doppler run -- bun run build:cli
```

This produces `dist/ttteam`. Run it directly:

```sh
./dist/ttteam --version   # 0.1.0
./dist/ttteam --help
./dist/ttteam login alice@acme.com
```

Or use the `release` script to build everything (TypeScript + binary):

```sh
doppler run -- bun run release
```

## Architecture

Three-layer architecture where **domain is the single source of truth**.

```
packages/domain/     → Pure business logic. No HTTP, no Supabase, no Ink, no Commander, no FS.
                       Entities, commands, schemas, rules, state transitions, invariants.

apps/api/            → Application layer. Auth, persistence, queries, permissions.
                       Orchestration only — no rendering.

apps/cli/            → Client layer. Commander CLI commands + TUI (Ink).
  commands/            Delegates to API client. Outputs formatted text or JSON.
  tui/                 Purely derived UI. All state changes via commands.

apps/web/            → Client layer. React SPA dashboard (no SSR).
  routes/              TanStack Router typed route tree + route loaders.
  features/            TanStack Query server-state hooks and selectors.
  components/ui/       shadcn/ui component primitives.
                       Uses shared API client; no direct DB access.

packages/api-client/ → Shared typed API client used by CLI, TUI, and Web.
                       Auth (magic link, token refresh), queries, mutations.
                       Session stored at ~/.config/teamteamteam/session.json.
```

### Repository Structure

```
teamteamteam/
├─ apps/
│  ├─ cli/              # CLI commands + TUI
│  ├─ api/              # HTTP API (Hono — runs on Bun or Supabase Edge Functions)
│  └─ web/              # React SPA (Vite + TanStack Router/Query + shadcn/ui)
├─ packages/
│  ├─ domain/           # Business rules (source of truth)
│  │  ├─ entities/      # Ticket, Project, Org, User, etc.
│  │  ├─ commands/      # createTicket, moveTicket, assignTicket, etc.
│  │  ├─ rules/         # Key generation, filtering, sorting, tags
│  │  ├─ errors/        # Typed domain errors
│  │  └─ types/         # Command result types
│  └─ api-client/       # Shared typed HTTP client (auth, queries, mutations)
├─ infra/               # Doppler config, deployment docs
├─ .github/workflows/   # CI pipeline
├─ CLAUDE.md            # AI assistant instructions
├─ AGENTS.md            # Agent guidelines
└─ ROADMAP.md           # Development roadmap
```

### Tech Stack

| Layer          | Technology                                  |
|----------------|---------------------------------------------|
| Runtime        | Bun + TypeScript                            |
| HTTP API       | Hono (Supabase Edge Functions / Bun)        |
| CLI            | Commander + Chalk                           |
| TUI            | Ink (React for terminal)                    |
| Web Frontend   | React + Vite + TanStack Router + TanStack Query + Tailwind + shadcn/ui |
| Backend        | Supabase (Auth via magic link, Postgres, RLS) |
| Validation     | Zod                                         |
| Testing        | Vitest                                      |
| Linting        | ESLint                                      |
| Dead Code      | Knip                                        |
| Secrets        | Doppler                                     |
| Package Manager| Bun (pnpm acceptable)                       |

## License

Private — not currently published.
