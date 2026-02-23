# @teamteamteam/cli

Command-line interface and TUI for Teamteamteam. Built with Commander (CLI) and Ink (TUI).

## Installation

The CLI is part of the Teamteamteam monorepo. After building (`bun run build`), run commands via:

```sh
doppler run -- bun run apps/cli/src/index.ts -- <command>
```

Examples:

```sh
doppler run -- bun run apps/cli/src/index.ts --help
doppler run -- bun run apps/cli/src/index.ts whoami
```

For a one-line install that adds the `ttteam` terminal command:

```sh
bun run install:cli
```

By default this installs `ttteam` to `~/.local/bin/ttteam`. Override with `TTTEAM_INSTALL_DIR`:

```sh
TTTEAM_INSTALL_DIR=/usr/local/bin bun run install:cli
```

Remove it with:

```sh
bun run uninstall:cli
```

Or use the standalone binary directly (see root README for `bun run build:cli`):

```sh
./dist/ttteam <command>
```

By default, the CLI uses a built-in backend target so end users can run commands without Doppler or extra env setup.

## Configuration

Config is stored at `~/.config/teamteamteam/`:

| File | Purpose |
|------|---------|
| `config.json` | Default org and project selection |
| `session.json` | Auth session (access/refresh tokens) |

## Global Flags

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON instead of formatted text |
| `--org <name>` | Override the default org (name or UUID) |
| `--project <prefix>` | Override the default project (prefix or UUID) |
| `--custom-backend` | Use custom backend values from flags/env instead of the built-in default |
| `--api-url <url>` | Custom API URL (requires `--custom-backend`) |
| `--supabase-url <url>` | Custom Supabase URL (requires `--custom-backend`) |
| `--supabase-anon-key <key>` | Custom Supabase anon key (requires `--custom-backend`) |

### Custom Backend

Override backend values directly on the command line:

```sh
ttteam --custom-backend \
  --api-url https://<project-ref>.supabase.co/functions/v1/api \
  --supabase-url https://<project-ref>.supabase.co \
  --supabase-anon-key <anon-key> \
  whoami
```

Or pass `--custom-backend` and rely on env vars:

```sh
SUPABASE_URL=... SUPABASE_ANON_KEY=... TEAMTEAMTEAM_API_URL=... ttteam --custom-backend whoami
```

## Commands

### Authentication

```sh
ttteam login <email>     # Send magic link, then enter OTP code
ttteam logout            # Clear stored session
ttteam whoami            # Show current user (email and ID)
ttteam whoami --json     # Show current user as JSON
```

### Organizations

```sh
ttteam org list                      # List your organizations
ttteam org create <name>             # Create a new organization
ttteam org use <name>                # Set default org for local context
ttteam org delete <name>             # Delete an org (prompts for confirmation)
ttteam org delete <name> --yes       # Delete without confirmation
ttteam org invite <email>            # Invite a user (default: member role)
ttteam org invite <email> --role admin  # Invite as admin
```

If you belong to only one org, it is auto-selected.

### Projects

```sh
ttteam project list                       # List projects in current org
ttteam project create <name> <prefix>     # Create project (prefix: e.g. PROJ)
ttteam project use <prefix>               # Set default project for local context
ttteam project delete <prefix>            # Delete project (prompts for confirmation)
ttteam project delete <prefix> --yes      # Delete without confirmation
```

### Tickets

```sh
ttteam ticket list                        # List tickets in current project
ttteam ticket create <title>              # Create a new ticket
ttteam ticket show <key>                  # Show ticket details + activity history
ttteam ticket move <key> <column>         # Move ticket to a workflow column
ttteam ticket assign <key> <assignee>     # Assign by email, display name, or email username
ttteam ticket close <key>                 # Close a ticket
ttteam ticket reopen <key>               # Reopen a closed ticket (to first column)
ttteam ticket reopen <key> --column <col> # Reopen to a specific column
```

#### Create Options

```sh
ttteam ticket create "Fix login" -d "Detailed description" -a alice@co.com -t bug -t urgent
```

| Flag | Description |
|------|-------------|
| `-d, --description <text>` | Ticket description |
| `-a, --assignee <assignee>` | Assign by email, display name, or email username |
| `-t, --tag <name>` | Add tag (repeatable) |

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
ttteam ticket tag add <key> <tag>         # Add a tag to a ticket
ttteam ticket tag remove <key> <tag>      # Remove a tag from a ticket
ttteam tags                               # List all tags in current project
```

### TUI Board

```sh
ttteam board                              # Launch interactive kanban board
```

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←/→` | Navigate between columns |
| `↑/↓` | Navigate between tickets |
| `Enter` | Expand ticket detail pane |
| `n` | Create ticket (title + description) |
| `m` | Move ticket to column |
| `a` | Assign ticket |
| `c` | Close ticket |
| `o` | Reopen ticket |
| `/` | Open filter menu (assignee, tag, search) |
| `r` | Refresh board |
| `Esc` | Close detail/filter or clear filters |
| `?` | Show help overlay |
| `q` | Quit |

## Examples

```sh
# Full workflow
ttteam login alice@acme.com
ttteam org create "Acme Corp"
ttteam org use "Acme Corp"
ttteam project create "Backend API" BACK
ttteam project use BACK
ttteam ticket create "Set up database" -t infra
ttteam ticket create "Fix login bug" -d "Users get 500 on /login" -t bug
ttteam ticket list --tag bug
ttteam ticket move BACK-2 "In Progress"
ttteam ticket assign BACK-2 bob@acme.com
ttteam board
```
