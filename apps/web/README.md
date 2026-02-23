# @teamteamteam/web

React SPA for teamteamteam using:

- Vite
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- Supabase JS auth
- Shared `@teamteamteam/api-client`

Current implementation includes:

- Supabase email OTP passcode auth (`/login`) with `/auth/callback` fallback support
- AuthProvider-driven session lifecycle (memory + localStorage)
- Protected org/project routes
- App-shell org/project context selectors persisted to localStorage
- Route-level error boundaries + not-found handling
- URL-backed filtering/sorting/pagination contracts for org and project views
- Canonical query key strategy for org/project/ticket scopes
- Feature-level query hooks/modules with tuned cache policy
- Dev-only query/mutation error telemetry events
- Server-ordered board columns with richer ticket card metadata
- Shared loading/empty/error state cards across the board surface
- Rounded capsule top navigation (org/project selectors + profile actions)
- Custom nav dropdown menus for org/project switching + create actions
- Create organization/project dialogs from top-nav controls
- Board-first kanban layout with drag-and-drop ticket movement between columns

## Scripts

```sh
bun run --filter @teamteamteam/web dev
bun run --filter @teamteamteam/web build
bun run --filter @teamteamteam/web typecheck
```

## Required Environment Variables

```sh
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_TEAMTEAMTEAM_API_URL=
```

Use Doppler for local development in this repository.
