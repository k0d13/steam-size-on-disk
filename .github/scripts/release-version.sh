#!/usr/bin/env bash
# Bump versions and refresh metadata for a stable release.
#
# changesets owns package.json + CHANGELOG.md. We mirror the new version
# into millennium.toml (Millennium's source of truth). Only runs when there are
# pending changesets — `changeset version` exits 1 otherwise.
set -euo pipefail

# --- Bump versions ----------------------------------------------------------

pnpm exec changeset version

# --- Mirror version into millennium.toml ------------------------------------

new_version=$(jq -r .version package.json)
sed -i "s/^version = \".*\"/version = \"${new_version}\"/" millennium.toml

# --- Refresh lockfile and format --------------------------------------------

pnpm install --lockfile-only
pnpm exec oxfmt package.json
