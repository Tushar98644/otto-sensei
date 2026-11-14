# Reads `next analyze export` lines; writes each page route's compressed client JS in KB, first load and total.
reduce inputs as $r ({schema: null, first: {}, parts: {}};
  if $r.type == "meta" then .schema = $r.schema_version
  elif $r.type == "group" and $r.kind != "async" then
    .first[$r.route] += [$r.outputs[] | select(startswith("[client-fs]") and endswith(".js"))]
  elif $r.type == "part" and ($r.filename | startswith("[client-fs]") and endswith(".js")) then
    # Keyed by source: the export can list one module's part twice for the same file.
    .parts[$r.route][$r.filename][$r.source_path] = $r.compressed_size
  else . end)
| if .schema != 1 then error("next analyze export schema is \(.schema), scripts/bundle-routes.jq reads 1") else . end
| .first as $first
| .parts
| to_entries
| map(
    .key as $route
    | (.value | map_values([.[]] | add)) as $files
    | {
        route: $route,
        initial_kb: ((($first[$route] // []) | unique | map($files[.] // 0) | add // 0) / 1024 | floor),
        total_kb: (([$files[]] | add) / 1024 | floor)
      })
| if length == 0 then error("no client JS in the analyze export") else sort_by(.route) end
