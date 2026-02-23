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
- Authenticated `/` redirect to first available project board route
- Unauthenticated `/` and `/login` use a dark mono no-nav auth shell
- OTP login modal mirrors the brand's executive-terminal visual style
- App-shell org/project context selectors persisted to localStorage
- Route-level error boundaries + not-found handling
- URL-backed routing contracts for project board state
- Canonical query key strategy for org/project/ticket scopes
- Feature-level query hooks/modules with tuned cache policy
- Dev-only query/mutation error telemetry events
- Server-ordered board columns with richer ticket card metadata
- Shared loading/empty/error state cards across the board surface
- Rounded capsule top navigation (org/project selectors + profile actions)
- Dark mono executive-terminal visual language across org/project board surfaces
- Boss logo jump-spin animation on click for authenticated sessions
- Custom nav dropdown menus for org/project switching + create actions
- Create organization/project dialogs from top-nav controls
- Board-first kanban layout with drag-and-drop ticket movement between columns
- Visual drop-target highlight while dragging cards across columns
- Per-column `+` actions open the shared ticket modal in create mode
- Single-click ticket modal for full view with assignment, status, tags, and close/reopen actions
- Click assignee chip on a card to open a quick-assign dropdown with `Nobody`

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
