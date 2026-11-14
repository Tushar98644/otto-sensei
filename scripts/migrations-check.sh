#!/usr/bin/env bash
# Runs squawk on each migration added since the commit in $1 (HEAD^ when it is missing or unknown).
set -euo pipefail
cd "$(dirname "$0")/.."

base="${1:-}"
git cat-file -e "$base^{commit}" 2>/dev/null || base=HEAD^
files=$(git diff --name-only --diff-filter=A "$base" HEAD -- 'supabase/migrations/*.sql')
if [ -z "$files" ]; then
  echo "No new migrations."
  exit 0
fi

status=0
for file in $files; do
  flag=""
  # The runner applies a file whose first line is "-- no-transaction" outside a transaction.
  if [[ "$(head -n 1 "$file")" =~ ^--[[:space:]]*no-transaction ]]; then flag="--no-assume-in-transaction"; fi
  bunx squawk-cli@2.72.0 $flag "$file" || status=1
done
exit "$status"
