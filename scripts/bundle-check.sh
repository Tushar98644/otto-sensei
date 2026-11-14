#!/usr/bin/env bash
# Compares each page's client JS with scripts/bundle-baseline.json; --update rewrites the baseline from this build.
set -euo pipefail
cd "$(dirname "$0")/.."

baseline=scripts/bundle-baseline.json
current=.next/diagnostics/bundle-routes.json

bunx next analyze --output --snapshot bundle-check
mkdir -p "$(dirname "$current")"
# A file, not a pipe: the export writes faster than jq reads, and a non-blocking pipe fails with EAGAIN.
graph="$(dirname "$current")/bundle-graph.jsonl"
bunx next analyze export --snapshot bundle-check > "$graph"
jq -n -f scripts/bundle-routes.jq < "$graph" > "$current"

if [ "${1:-}" = "--update" ]; then
  cp "$current" "$baseline"
  echo "Wrote $baseline."
  exit 0
fi
if [ ! -f "$baseline" ]; then
  echo "No $baseline yet: run scripts/bundle-check.sh --update and commit it." >&2
  exit 1
fi
jq -n -r --slurpfile base "$baseline" --slurpfile current "$current" \
  --argjson slack "${BUNDLE_SLACK_KB:-10}" --argjson total_slack "${BUNDLE_TOTAL_SLACK_KB:-50}" \
  -f scripts/bundle-check.jq
