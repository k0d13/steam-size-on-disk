#!/usr/bin/env bash
# Publish a stable release:
#   1. Copy the built .millennium/<name>.star to <name>-<version>.star
#   2. Push an empty release commit whose message is this version's changelog,
#      then tag it and create a GitHub release with the .star attached
#   3. Push an update branch to a fork of SteamClientHomeBrew/PluginDatabase
#      advancing this plugin's submodule pointer to the new release commit
#   4. Leave a commit comment with a prefilled "compare" link so the maintainer
#      can manually open the upstream PR (rather than us auto-spamming it)
#
# Each step is idempotent: re-running after a partial failure heals the missing
# pieces instead of creating duplicates.
#
# Required env:
#   GITHUB_TOKEN     — provided by Actions; used for this repo's release and
#                      for the commit comment on this repo
#   PLUGIN_DB_TOKEN  — PAT with Contents: write on the fork; used to push
#                            the update branch. The fork lives under the PAT
#                            owner's account.
set -euo pipefail

name=$(sed -n 's/^id = "\(.*\)"/\1/p' millennium.toml)
version=$(sed -n 's/^version = "\(.*\)"/\1/p' millennium.toml)
tag="v${version}"
asset="${name}-${version}.star"

cp ".millennium/${name}.star" "$asset"

# --- Release commit and tag -------------------------------------------------

# Check the remote, not just local — Actions checkouts are shallow and don't
# include tags by default, so a re-run after a previous push wouldn't see it.
# If the tag is already on the remote, a prior run already did everything
# below; bail out without recording a published tag so changesets/action does
# not report this run as a publish.
if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then
  echo "Tag ${tag} already on remote — nothing to publish."
  exit 0
fi

# Extract just this version's section from CHANGELOG.md (between `## X.Y.Z` and
# the next `## ` header) so neither the release notes nor the commit message
# below carry the entire history.
notes_file=$(mktemp)
if [ -f CHANGELOG.md ]; then
  awk -v ver="$version" '
    $0 == "## " ver { capture = 1; next }
    capture && /^## / { exit }
    capture { print }
  ' CHANGELOG.md > "$notes_file"
fi

# Millennium shows, as a plugin's update note, the commit message of whatever
# commit PluginDatabase's submodule pointer resolves to — left alone that's the
# changesets merge commit ("Update changelog and release"), which tells users
# nothing. So carry the changelog on a commit of its own: empty, so it has the
# exact tree we just built, subject naming the version and the body being the
# changelog Millennium renders as markdown.
message_file=$(mktemp)
{
  echo "${name} ${tag}"
  echo
  cat "$notes_file"
} > "$message_file"

# A re-run after a failure past this point starts from the merge commit again,
# so reuse the release commit already on main rather than stacking a second one.
git fetch origin main --depth=1
if [ "$(git log -1 --format=%s FETCH_HEAD)" = "${name} ${tag}" ]; then
  echo "Release commit for ${tag} already on main — reusing it."
  release_sha=$(git rev-parse FETCH_HEAD)
  git checkout --detach "$release_sha"
else
  git -c user.name="github-actions[bot]" \
      -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit --allow-empty -F "$message_file"
  # Pushed with GITHUB_TOKEN, so this doesn't retrigger the workflow.
  git push origin HEAD:main
  release_sha=$(git rev-parse HEAD)
fi

git tag -f "$tag"
git push origin "$tag"

# --- GitHub release ---------------------------------------------------------

if ! gh release view "$tag" >/dev/null 2>&1; then
  gh release create "$tag" "$asset" --title "$tag" --notes-file "$notes_file"
fi

# --- Plugin database update branch ------------------------------------------

upstream="SteamClientHomeBrew/PluginDatabase"
branch="update-${name}-${version}"
release_url="https://github.com/${GITHUB_REPOSITORY}/releases/tag/${tag}"

export GH_TOKEN="$PLUGIN_DB_TOKEN"

fork_owner=$(gh api user --jq .login)
fork="${fork_owner}/SteamClientHomeBrew_PluginDatabase"
# Only fork if it doesn't already exist — fine-grained PATs can't fork repos
# they don't own, so skip if the fork is already in place.
if ! gh repo view "$fork" >/dev/null 2>&1; then
  gh repo fork "$upstream" \
    --clone=false \
    --default-branch-only \
    --fork-name SteamClientHomeBrew_PluginDatabase >/dev/null
fi

# Build/update the branch on the fork.
workdir=$(mktemp -d)
gh repo clone "$fork" "$workdir" -- --depth=1
pushd "$workdir" >/dev/null

git remote add upstream "https://github.com/${upstream}.git" 2>/dev/null \
  || git remote set-url upstream "https://github.com/${upstream}.git"
git fetch upstream main --depth=1
git checkout -B "$branch" upstream/main

# Find the submodule path inside PluginDatabase. Prefer an explicit override
# via PLUGIN_DB_SUBMODULE_PATH (useful when this repo has been renamed since
# being added to PluginDatabase and the .gitmodules URL no longer matches).
# Otherwise look up by URL — GitHub redirects old URLs for fetch but our
# grep can't see through the rename.
if [ -n "${PLUGIN_DB_SUBMODULE_PATH:-}" ]; then
  submodule_path="$PLUGIN_DB_SUBMODULE_PATH"
else
  # `|| true` on grep/git-config so pipefail doesn't kill the script when
  # there's no match — we want to fall through to the helpful error below.
  submodule_key=$(
    { git config -f .gitmodules --get-regexp 'submodule\..*\.url' 2>/dev/null || true; } \
      | { grep -iE "[/:]${GITHUB_REPOSITORY}(\.git)?\$" || true; } \
      | head -n1 \
      | awk '{print $1}' \
      | sed 's/\.url$//'
  )
  if [ -z "$submodule_key" ]; then
    echo "Could not find a submodule in ${fork} pointing at ${GITHUB_REPOSITORY}." >&2
    echo "If this repo has been renamed since being added to PluginDatabase," >&2
    echo "set PLUGIN_DB_SUBMODULE_PATH to the submodule's path explicitly." >&2
    exit 1
  fi
  submodule_path=$(git config -f .gitmodules "${submodule_key}.path")
fi

git submodule update --init "$submodule_path"

# Pin the submodule to the exact commit we just tagged, rather than tracking
# the configured remote branch — otherwise a commit landing on main between
# `git tag` and now would advance the DB PR past the release.
git -C "$submodule_path" fetch origin "$release_sha" --depth=1
git -C "$submodule_path" checkout --detach "$release_sha"

# Guard against re-runs where the submodule is already at the target commit.
if git diff --quiet -- "$submodule_path"; then
  echo "Submodule ${submodule_path} already at latest, no commit needed."
else
  git -c user.name="github-actions[bot]" \
      -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
      commit -am "Update \`${name}\` to ${tag}"
fi

git push -f "https://x-access-token:${PLUGIN_DB_TOKEN}@github.com/${fork}.git" "$branch"

popd >/dev/null

# --- Notify via commit comment ---------------------------------------------

# Render the PR body from the template, then leave a commit comment on the
# release commit with a prefilled compare URL + the body to paste. The
# maintainer opens the upstream PR manually rather than us spamming it.

pr_body=$(mktemp)
sed \
  -e "s|REPLACE_WITH_PLUGIN_NAME|${name}|g" \
  -e "s|REPLACE_WITH_UPDATE_SUMMARY|See full release notes: ${release_url}|g" \
  .github/plugin-db-pr-template.md > "$pr_body"

pr_title="Update \`${name}\` to ${tag}"
encoded_title=$(jq -nr --arg s "$pr_title" '$s|@uri')
compare_url="https://github.com/${upstream}/compare/main...${fork_owner}:${branch}?quick_pull=1&title=${encoded_title}"

comment_body=$(cat <<EOF
## Plugin database update ready for ${tag}

Branch \`${branch}\` has been pushed to [\`${fork}\`](https://github.com/${fork}/tree/${branch}).

**[Open the PR against \`${upstream}\` →](${compare_url})**

Paste this as the PR body:

\`\`\`\`md
$(cat "$pr_body")
\`\`\`\`
EOF
)

# Use this repo's GITHUB_TOKEN (not the PAT, which has no access here) to
# leave the comment on this repo's release commit.
GH_TOKEN="$GITHUB_TOKEN" gh api \
  "repos/${GITHUB_REPOSITORY}/commits/${release_sha}/comments" \
  -f body="$comment_body" >/dev/null

# How changesets/action learns that something was published: one NDJSON event
# per released package, written to the file it points CHANGESETS_OUTPUT at. The
# v1 magic stdout line no longer does anything. `packageName` has to match the
# workspace package, which is package.json's name rather than millennium.toml's id.
if [ -n "${CHANGESETS_OUTPUT:-}" ]; then
  jq -nc --arg tag "$tag" --arg pkg "$(jq -r .name package.json)" \
    '{type: "git-tag", tag: $tag, packageName: $pkg}' >> "$CHANGESETS_OUTPUT"
fi

echo "Published ${name} ${tag}"
