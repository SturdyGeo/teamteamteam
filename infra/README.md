# Infrastructure

## Doppler Setup

TeamTeamTeam uses [Doppler](https://www.doppler.com/) for secrets management.

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only, never in client code) |
| `SUPABASE_DB_PASSWORD` | Direct Postgres password (for migrations) |

### Local Setup

1. Install Doppler CLI: `brew install dopplerhq/cli/doppler`
2. Authenticate: `doppler login`
3. Select project: `doppler setup` (in repo root)
4. Run commands with secrets: `doppler run -- <command>`

### Running Scripts

All dev commands should be prefixed with `doppler run --`:

```bash
doppler run -- bun run typecheck
doppler run -- bun run lint
doppler run -- bun run build
doppler run -- bun run test
doppler run -- bun run knip
```

## Supabase Setup

### CLI Installation

```bash
brew install supabase/tap/supabase
```

### Linking to the Project

```bash
supabase login
supabase link --project-ref <PROJECT_REF>
```

### Database Commands

```bash
doppler run -- bun run db:push     # Push pending migrations to remote
doppler run -- bun run db:reset    # Drop + re-apply all migrations + seed (destructive!)
doppler run -- bun run db:status   # List migration status
doppler run -- bun run db:diff     # Diff local schema vs remote
```

### Migrations

Migration files live in `supabase/migrations/` with timestamp-prefixed filenames. To create a new migration:

```bash
supabase migration new <name>
```

Seed data is in `supabase/seed.sql` and runs automatically after `db:reset`.

### CI

GitHub Actions CI does not use Doppler yet (no secrets needed in Phase 1). Doppler integration will be added when Supabase secrets are required.
