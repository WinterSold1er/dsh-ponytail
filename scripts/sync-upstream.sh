#!/usr/bin/env bash
# sync-upstream.sh — pull the ponytail skills from upstream
# DietrichGebert/ponytail and re-apply the DSH adaptations. Run from repo root.
#
#   bash scripts/sync-upstream.sh
#
# Manual follow-ups after a sync:
#   - npm run verify — the 6/6 provider smoke test must pass.
#   - Commit and bump the version if skill content changed.
set -euo pipefail

UPSTREAM_REPO=https://github.com/DietrichGebert/ponytail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

git clone --depth 1 "$UPSTREAM_REPO" "$TMP/upstream" >/dev/null 2>&1
echo "Upstream cloned at $(git -C "$TMP/upstream" rev-parse --short HEAD)"

for skill_dir in "$TMP/upstream/skills"/*/; do
  [ -d "$skill_dir" ] || continue
  name="$(basename "$skill_dir")"
  mkdir -p "$ROOT/skills/$name"
  find "$skill_dir" -type f ! -path '*/agents/*' ! -name 'openai.yaml' \
    -exec cp {} "$ROOT/skills/$name/" \;
  echo "synced $name"
done

# Skill files ship verbatim: the provider parses folded `description: >`
# frontmatter natively, so no adaptation step is needed.

echo ""
echo "Done. Follow-up: npm run verify"
