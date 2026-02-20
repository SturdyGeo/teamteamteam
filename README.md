# Candoo

Terminal-first multi-user kanban platform for software teams. Provides a CLI and TUI (terminal UI) experience backed by Supabase authentication and Postgres persistence.

Designed to evolve into a full web application without rewriting core logic.

## Features

- **CLI commands** for managing orgs, projects, tickets, tags, and workflows
- **TUI board** (Ink-based kanban board rendered in the terminal)
- **Multi-user / multi-org** with Supabase magic link authentication
- **Row Level Security** for org-level data isolation
- **Command-based mutations** with full activity logging
- **Deterministic ticket keys** (e.g., `PROJ-1`)
- **Tags** with normalization (lowercase, trim, dedup)
- **Flexible workflows** — columns are data, not hardcoded enums
- **Client-side filtering** by status, assignee, tag, and text search

## Prerequisites

- [Bun](https://bun.sh/) (runtime and package manager)
- [Doppler](https://www.doppler.com/) (secrets management)
- [Supabase](https://supabase.com/) project (or local dev via `supabase init`)

## Setup

1. **Clone the repository**

   ```sh
   git clone <repo-url>
   cd candoo
   ```

2. **Install dependencies**

   ```sh
   bun install
   ```

3. **Configure secrets**

   Copy the environment template and configure Doppler with your Supabase credentials:

   ```sh
   cp .env.example .env
   ```

   Required environment variables (managed via Doppler):

   | Variable           | Description                  |
   |--------------------|------------------------------|
   | `SUPABASE_URL`     | Your Supabase project URL    |
   | `SUPABASE_ANON_KEY`| Your Supabase anonymous key  |
   | `CANDOO_API_URL`   | API URL (Edge Function or local, e.g. `https://<ref>.supabase.co/functions/v1/api`) |

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

> **Note:** All commands require the Doppler prefix: `doppler run -- <command>`

### Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON (works with every command) |
| `--org <name>` | Override the default org (name or UUID) |
| `--project <prefix>` | Override the default project (prefix or UUID) |

### Authentication

```sh
candoo login <email>       # Send login code, then enter OTP
candoo logout              # Clear stored session
candoo whoami              # Display current user info
```

### Organizations

```sh
candoo org list                # List your organizations
candoo org create <name>       # Create a new organization
candoo org use <name>          # Set default org for local context
candoo org delete <name>       # Delete an org and all its data (--yes to skip prompt)
```

If you have only one org, it is auto-selected without needing `org use`.

### Projects

```sh
candoo project list                    # List projects in current org
candoo project create <name> <prefix>  # Create a new project (prefix e.g. PROJ)
candoo project use <prefix>            # Set default project for local context
candoo project delete <prefix>         # Delete a project and all its data (--yes to skip prompt)
```

### Tickets

```sh
candoo ticket list             # List tickets (supports filter flags)
candoo ticket create <title>   # Create a new ticket
candoo ticket show <key>       # Show ticket details + activity history
candoo ticket move <key> <column>      # Move ticket to a workflow column
candoo ticket assign <key> <email>     # Assign ticket to a member by email
candoo ticket close <key>              # Close a ticket
candoo ticket reopen <key>             # Reopen a closed ticket
```

#### Create Options

```sh
candoo ticket create "Fix login" -d "Details..." -a alice@co.com -t bug
```

| Flag | Description |
|------|-------------|
| `-d, --description <text>` | Description |
| `-a, --assignee <email>` | Assignee email |
| `-t, --tag <name>` | Tag (repeatable) |

#### Filtering

```sh
candoo ticket list --status "In Progress"
candoo ticket list --assignee alice@co.com
candoo ticket list --tag bug
candoo ticket list --search "login issue"
```

### Tags

```sh
candoo ticket tag add <key> <tag>      # Add a tag to a ticket
candoo ticket tag remove <key> <tag>   # Remove a tag from a ticket
candoo tags                            # List all tags in current project
```

### TUI Board

```sh
candoo board          # Launch the interactive kanban board
```

**Keyboard shortcuts:**

| Key   | Action                      |
|-------|-----------------------------|
| `←/→` | Navigate between columns   |
| `↑/↓` | Navigate between tickets   |
| `Enter`| Expand ticket detail pane  |
| `n`   | Create new ticket           |
| `m`   | Move ticket to column       |
| `a`   | Assign ticket               |
| `c`   | Close ticket                |
| `o`   | Reopen ticket               |
| `/`   | Open filter bar             |
| `r`   | Refresh board               |
| `Esc` | Clear filters               |
| `?`   | Show help                   |

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

Set `CANDOO_API_URL` in Doppler to your deployed Edge Function URL (e.g. `https://<project-ref>.supabase.co/functions/v1/api`).

**Local Edge Function serving** (optional, requires Docker):

```sh
doppler run -- supabase functions serve
curl http://localhost:54321/functions/v1/api/health
```

### Local Development (Bun)

The primary local dev workflow uses Bun directly (no Docker required):

```sh
doppler run -- bun run --filter @candoo/api dev
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
doppler run -- bun run typecheck      # Type check
doppler run -- bun run lint           # Lint
doppler run -- bun run test           # Run tests
doppler run -- bun run test:watch     # Run tests in watch mode
doppler run -- bun run test:coverage  # Run tests with coverage
doppler run -- bun run knip           # Dead code detection
doppler run -- bun run clean          # Clean build artifacts
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

Tests are located at `**/__tests__/**/*.test.ts`.

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

packages/api-client/ → Shared typed API client used by both CLI and TUI.
                       Auth (magic link, token refresh), queries, mutations.
                       Session stored at ~/.config/candoo/session.json.
```

### Repository Structure

```
candoo/
├─ apps/
│  ├─ cli/              # CLI commands + TUI
│  └─ api/              # HTTP API (Hono — runs on Bun or Supabase Edge Functions)
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
| Backend        | Supabase (Auth via magic link, Postgres, RLS) |
| Validation     | Zod                                         |
| Testing        | Vitest                                      |
| Linting        | ESLint                                      |
| Dead Code      | Knip                                        |
| Secrets        | Doppler                                     |
| Package Manager| Bun (pnpm acceptable)                       |

## License

Private — not currently published.
