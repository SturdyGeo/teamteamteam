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
- Boot splash shown from initial HTML until auth + initial route loading settle
- Protected org/project routes
- Authenticated `/` redirect to first available project board route
- Unauthenticated `/` and `/login` use a dark mono no-nav auth shell
- OTP login modal mirrors the brand's executive-terminal visual style
- App-shell org/project context selectors persisted to localStorage
- Org detail page includes an invite-member form (email + member/admin role)
- Route-level error boundaries + not-found handling
- Error and not-found surfaces now use the same dark mono visual theme as app pages
- URL-backed routing contracts for project board state
- Canonical query key strategy for org/project/ticket scopes
- Feature-level query hooks/modules with tuned cache policy
- Dev-only query/mutation error telemetry events
- Server-ordered board columns with richer ticket card metadata
- Shared loading/empty/error state cards across the board surface
- Rounded capsule top navigation (org/project selectors + profile actions)
- Dark mono executive-terminal visual language across org/project board surfaces
- Boss logo fast twirl + snap-stop animation on click for authenticated sessions
- Custom nav dropdown menus for org/project switching + create actions
- Create organization/project dialogs from top-nav controls
- Board-first kanban layout with drag-and-drop ticket movement between columns
- Drag-and-drop uses optimistic board state without snap-back while awaiting server confirmation
- Visual drop-target highlight while dragging cards across columns
- Per-column `+` actions open the shared ticket modal in create mode
- Single-click ticket modal for full view with assignment, status, tags, and close/reopen actions
- Ticket modal title + description are editable text inputs with persisted save
- Pressing Enter in ticket title now submits "Save changes"
- Save/Close/Reopen actions are color-coded for clearer intent
- Primary action buttons now use a consistent green treatment across auth, create, and save/add flows
- Color styling is tokenized through global CSS variables (`styles.css`) across routes/components
- Ticket modal activity feed is hidden by default behind a "Review activity" drawer toggle
- Assignee changes are optimistic (instant UI update with rollback on mutation failure)
- Ticket modal assignee uses a dropdown selector
- Card quick-assign popovers remain searchable
- Ticket detail save expects latest API + migration rollout (`build:edge`, deploy function, `supabase db push`)
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
