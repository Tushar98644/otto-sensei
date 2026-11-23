#!/usr/bin/env bash
# Calls one of the site's /api/cron/* routes once, as the daily workflow's steps do (.github/workflows/daily.yml).
set -euo pipefail
route="$1"
if [ -z "${CRON_SECRET:-}" ] || [ -z "${OTTO_APP_URL:-}" ]; then
  echo "::notice::CRON_SECRET or OTTO_APP_URL not set yet; skipping $route."
  exit 0
fi
# A route stops its own work at 45 s and Vercel at 60 s, so 90 s covers a slow start.
curl -sS --fail-with-body --max-time 90 -H "Authorization: Bearer $CRON_SECRET" \
  "${OTTO_APP_URL%/}/api/cron/$route"
echo
