# Teamteamteam Release Runbook

This document is the canonical process for shipping new CLI releases and keeping Homebrew installs current.

## Overview

- Source repo: `SturdyGeo/teamteamteam`
- Tap repo: `SturdyGeo/homebrew-teamteamteam`
- Release workflow: `.github/workflows/release-cli.yml`
- Distribution: prebuilt macOS binaries published to GitHub Releases, installed via Homebrew tap formula.

## One-Time Setup

Set these in `SturdyGeo/teamteamteam` repository settings:

- Secret: `RELEASE_GITHUB_TOKEN`
- Secret: `HOMEBREW_TAP_GITHUB_TOKEN`
- Variable (optional): `HOMEBREW_TAP_REPOSITORY` (defaults to `<owner>/homebrew-teamteamteam`)

Both tokens must be able to read/write repo contents. The tap token must be able to push to the tap repository.

## Create a Release

1. Ensure `main` contains all desired changes and is pushed:

```sh
git checkout main
git pull
git push teamteamteam main
```

2. Create and push a new semver tag:

```sh
git tag vX.Y.Z
git push teamteamteam vX.Y.Z
```

3. Wait for GitHub Actions workflow `Release CLI` to finish green:
- Build `arm64` artifact
- Build `amd64` artifact
- Publish GitHub release
- Update Homebrew tap formula

4. Verify formula update in tap repo:
- `Formula/ttteam.rb` should show `version "X.Y.Z"`.

## Consumer Install / Upgrade

First install:

```sh
brew tap sturdygeo/teamteamteam
brew install sturdygeo/teamteamteam/ttteam
ttteam --version
```

Upgrade:

```sh
brew update
brew upgrade ttteam
ttteam --version
```

If command is not found after install:

```sh
eval "$(brew shellenv)"
hash -r
ttteam --version
```

## Troubleshooting

`brew upgrade ttteam` says latest installed but version is old:
- Tap formula is still on old version.
- Check latest tag workflow status and confirm `Update Homebrew tap formula` succeeded.

`No formula with the name "ttteam"` after tap:
- Release workflow likely failed before writing `Formula/ttteam.rb`.
- Open the failed workflow and fix first failing step.

`ttteam --version` does not match release tag:
- Release binary version is embedded via `TTTEAM_VERSION` in workflow.
- Confirm release was created from a tag and workflow used latest `main`.

## Notes

- Homebrew taps only add formulas. Users still need `brew install ...`.
- Tag names are the release source of truth (`vX.Y.Z`).
