# Compares $current with $base (bundle-routes.jq output) and fails when a route grows past its baseline plus the slack.
def pad($width): tostring | . + (" " * ($width - length));

INDEX($base[0][]; .route) as $was
| [$current[0][] | . as $now | $was[$now.route] as $then
    | $now + {
        base_initial: ($then.initial_kb // "-"),
        base_total: ($then.total_kb // "-"),
        over: ($then == null
          or $now.initial_kb > $then.initial_kb + $slack
          or $now.total_kb > $then.total_kb + $total_slack)
      }] as $rows
| ($rows | map(.route)) as $routes
| ("route" | pad(36)) + ("first load KB (baseline)" | pad(28)) + "all JS KB (baseline)",
  ($rows[]
    | (.route | pad(36))
      + ("\(.initial_kb) (\(.base_initial))" | pad(28))
      + "\(.total_kb) (\(.base_total))"
      + (if .over then "  over" else "" end)),
  ($was | keys[] | select(. as $route | $routes | index($route) | not) | "\(.) is gone from this build"),
  ([$rows[] | select(.over) | .route] as $over
    | if $over == [] then
        "Every route is within \($slack) KB of its first-load baseline and \($total_slack) KB of its total."
      else
        "Over budget or new: \($over | join(", ")). If that is intended, refresh scripts/bundle-baseline.json (HANDOFF.md section 3).",
        ("" | halt_error(1))
      end)
