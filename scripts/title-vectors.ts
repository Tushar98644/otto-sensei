// Title vectors on a local database: OTTO_PGLITE_DIR=<copy> bun scripts/title-vectors.ts <step>
//   occupations OUT.json   the names scripts/title-vectors.py fit reads (occupations and sample titles)
//   fill MODEL_DIR         embeds every waiting title with scripts/title-vectors.py, then rebuilds the index
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { sql } from "drizzle-orm";
import rawData from "@/lib/job-feed/occupations/data.json";
import type { OccupationData } from "@/lib/job-feed/occupations/data-types";
import { CUSTOM_OCCUPATIONS, TECH_NAMES } from "@/lib/job-feed/occupations/tech";
import type { TitleVectorRow } from "@/lib/job-feed/title-vectors";

if (!process.env.OTTO_PGLITE_DIR?.trim()) {
  console.error("Set OTTO_PGLITE_DIR to a copy of the database; this never opens .pglite/.");
  process.exit(1);
}

const data = rawData as OccupationData;
const OTHERS = 12;
const SAMPLE = 20_000;
const BATCH = 5_000;

async function openDb() {
  const { openLocalDb } = await import("@/db/local");
  return openLocalDb();
}

// Each occupation's own names, then Otto's names for it and its shortest aliases.
async function occupations(out: string) {
  const entries: Record<string, { names: string[]; others: string[] }> = {};
  data.codes.forEach((code, i) => {
    const aliases = data.aliases[i]!.split("|").filter(Boolean);
    entries[code] = {
      names: [...new Set([data.names[i]!, data.titles[i]!])],
      others: [...aliases].sort((a, b) => a.length - b.length).slice(0, OTHERS),
    };
  });
  for (const custom of CUSTOM_OCCUPATIONS)
    entries[custom.code] = { names: [custom.name], others: [] };
  for (const [name, code] of TECH_NAMES) {
    const entry = entries[code];
    if (entry && !entry.names.includes(name)) entry.others.unshift(name);
  }
  for (const entry of Object.values(entries)) entry.others = entry.others.slice(0, OTHERS * 2);
  const db = await openDb();
  const { rowsOf } = await import("@/lib/job-feed/records");
  const { titleVectorKey } = await import("@/lib/job-feed/title-vectors");
  const titles = rowsOf<{ title: string }>(
    await db.execute(
      sql`select t.text as title from titles t where exists (select 1 from listings l where l.title = t.id) order by md5(t.text) limit ${SAMPLE}`,
    ),
  );
  const sample = [...new Set(titles.map((row) => titleVectorKey(row.title)))];
  writeFileSync(out, JSON.stringify({ occupations: entries, sample }));
  console.log(`Wrote ${Object.keys(entries).length} occupations and ${sample.length} titles`);
}

async function fill(modelDir: string) {
  const db = await openDb();
  const { rebuildMatchIndex } = await import("@/lib/job-feed/match-index");
  const { saveTitleVectors, waitingTitles } = await import("@/lib/job-feed/title-vectors");
  const now = Date.now();
  // A rebuild first notes every open job's title, so the waiting list is complete.
  await rebuildMatchIndex(db, now);
  const dir = mkdtempSync(path.join(tmpdir(), "title-vectors-"));
  let total = 0;
  for (;;) {
    const keys = await waitingTitles(db, BATCH);
    if (keys.length === 0) break;
    const input = path.join(dir, "in.json");
    const output = path.join(dir, "out.json");
    writeFileSync(input, JSON.stringify({ keys }));
    const python = process.env.PYTHON ?? "python3";
    const run = spawnSync(
      python,
      ["-I", "scripts/title-vectors.py", "embed", modelDir, input, output],
      { stdio: ["ignore", "inherit", "inherit"] },
    );
    if (run.status !== 0) throw new Error(`title-vectors.py exited with ${run.status}`);
    const { vectors } = JSON.parse(readFileSync(output, "utf8")) as { vectors: TitleVectorRow[] };
    total += await saveTitleVectors(db, vectors);
    console.log(`${total} titles embedded`);
  }
  const started = Date.now();
  const indexed = await rebuildMatchIndex(db, Date.now());
  console.log(`Rebuilt the index: ${indexed} openings in ${Date.now() - started} ms`);
}

const [step, arg] = process.argv.slice(2);
const steps: Record<string, (arg: string) => Promise<void>> = { occupations, fill };
const run = step && arg ? steps[step] : undefined;
if (!run) {
  console.error("Say which step: occupations OUT.json or fill MODEL_DIR.");
  process.exit(1);
}
run(arg!)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
