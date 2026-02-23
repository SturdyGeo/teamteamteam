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
- Org detail page includes an invite-member form (email + member/admin/limited role) with OTP auto-provisioning for new emails
- Org and project list cards are fully clickable (no separate "Open" buttons)
- Route-level error boundaries + not-found handling
- Error and not-found surfaces now use the same dark mono visual theme as app pages
- URL-backed routing contracts for project board state
- Canonical query key strategy for org/project/ticket scopes
- Feature-level query hooks/modules with tuned cache policy
- Dev-only query/mutation error telemetry events
- Server-ordered board columns with richer ticket card metadata
- Shared loading/empty/error state cards across the board surface
- Rounded compact top navigation is center-aligned and content-width (middle-top only) with text/caret org-project selectors and profile actions
- Project selector labels in nav use project names only (no prefix code)
- Boss logo in nav is non-draggable and stays click-only for spin/home action
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
- Saving ticket title/description closes the modal; unchanged edits also close without error
- Pressing Enter in ticket title now submits "Save changes"
- Save/Close/Reopen actions are color-coded for clearer intent
- Primary action buttons now use a consistent bright amber treatment across auth, create, and save/add flows
- Color styling is tokenized through global CSS variables (`styles.css`) across routes/components
- Global token palette uses a black-first neutral base with restrained amber accents (bright amber reserved for high-intent actions)
- Card/dropdown borders are now de-emphasized with low-contrast framing
- "Amber CRT Ops" layer adds subtle scanline texture, warm ambient glow, and LED-style board column indicators
- Ticket cards use flat backgrounds (no per-card gradient fill)
- App shell/auth backgrounds now use a flat black surface (no gradient wash)
- Escape hotkey closes active modals (ticket modal + create org/project dialogs)
- Ticket modal activity feed is hidden by default behind a small underlined "Review activity" toggle below action buttons
- Assignee changes are optimistic (instant UI update with rollback on mutation failure)
- Ticket modal assignee uses a dropdown selector
- Card quick-assign assignee picker uses shadcn popover primitives for stable positioning/interaction
- Card quick-assign popovers remain searchable
- Ticket detail save expects latest API + migration rollout (`build:edge`, deploy function, `supabase db push`)
- Click assignee chip on a card to open a quick-assign dropdown with `Nobody`
- Interactive form controls/buttons in app routes are standardized on shared shadcn primitives (`Button`, `Input`, `Select`, `Textarea`, `Label`)

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
