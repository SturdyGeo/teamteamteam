# @candoo/cli

Command-line interface and TUI for Candoo. Built with Commander (CLI) and Ink (TUI).

## Installation

The CLI is part of the Candoo monorepo. After building (`bun run build`), run commands via:

```sh
doppler run -- bun run --filter @candoo/cli start -- <command>
```

Or use the standalone binary (see root README for `bun run build:cli`):

```sh
./dist/candoo <command>
```

## Configuration

Config is stored at `~/.config/candoo/`:

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

## Commands

### Authentication

```sh
candoo login <email>     # Send magic link, then enter OTP code
candoo logout            # Clear stored session
candoo whoami            # Show current user (email and ID)
candoo whoami --json     # Show current user as JSON
```

### Organizations

```sh
candoo org list                      # List your organizations
candoo org create <name>             # Create a new organization
candoo org use <name>                # Set default org for local context
candoo org delete <name>             # Delete an org (prompts for confirmation)
candoo org delete <name> --yes       # Delete without confirmation
candoo org invite <email>            # Invite a user (default: member role)
candoo org invite <email> --role admin  # Invite as admin
```

If you belong to only one org, it is auto-selected.

### Projects

```sh
candoo project list                       # List projects in current org
candoo project create <name> <prefix>     # Create project (prefix: e.g. PROJ)
candoo project use <prefix>               # Set default project for local context
candoo project delete <prefix>            # Delete project (prompts for confirmation)
candoo project delete <prefix> --yes      # Delete without confirmation
```

### Tickets

```sh
candoo ticket list                        # List tickets in current project
candoo ticket create <title>              # Create a new ticket
candoo ticket show <key>                  # Show ticket details + activity history
candoo ticket move <key> <column>         # Move ticket to a workflow column
candoo ticket assign <key> <email>        # Assign ticket to a member
candoo ticket close <key>                 # Close a ticket
candoo ticket reopen <key>               # Reopen a closed ticket (to first column)
candoo ticket reopen <key> --column <col> # Reopen to a specific column
```

#### Create Options

```sh
candoo ticket create "Fix login" -d "Detailed description" -a alice@co.com -t bug -t urgent
```

| Flag | Description |
|------|-------------|
| `-d, --description <text>` | Ticket description |
| `-a, --assignee <email>` | Assign to member by email |
| `-t, --tag <name>` | Add tag (repeatable) |

#### Filtering

```sh
candoo ticket list --status "In Progress"
candoo ticket list --assignee alice@co.com
candoo ticket list --tag bug
candoo ticket list --search "login issue"
```

### Tags

```sh
candoo ticket tag add <key> <tag>         # Add a tag to a ticket
candoo ticket tag remove <key> <tag>      # Remove a tag from a ticket
candoo tags                               # List all tags in current project
```

### TUI Board

```sh
candoo board                              # Launch interactive kanban board
```

#### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←/→` | Navigate between columns |
| `↑/↓` | Navigate between tickets |
| `Enter` | Expand ticket detail pane |
| `n` | Create new ticket |
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
candoo login alice@acme.com
candoo org create "Acme Corp"
candoo org use "Acme Corp"
candoo project create "Backend API" BACK
candoo project use BACK
candoo ticket create "Set up database" -t infra
candoo ticket create "Fix login bug" -d "Users get 500 on /login" -t bug
candoo ticket list --tag bug
candoo ticket move BACK-2 "In Progress"
candoo ticket assign BACK-2 bob@acme.com
candoo board
```
