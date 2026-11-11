import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import JSZip from "jszip";
import { TECH_NAMES } from "@/lib/job-feed/occupations/tech";
import { GENERIC_WORDS, titleKey } from "@/lib/job-feed/occupations/title";
import type { OccupationData } from "@/lib/job-feed/occupations/data-types";

const OUT = path.join(process.cwd(), "src/lib/job-feed/occupations/data.json");

function flag(name: string): string {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function tsv(file: string): string[][] {
  const [, ...rows] = readFileSync(file, "utf8").split(/\r?\n/);
  return rows.filter(Boolean).map((row) => row.split("\t"));
}

type EscoFile = {
  version: string;
  occupations: Record<string, { code: string; label: string; alt: string[] }>;
};

type EscoPage = {
  _embedded?: {
    results?: {
      uri: string;
      code?: string;
      preferredLabel?: { en?: string };
      alternativeLabel?: { en?: string[] };
    }[];
  };
};

async function escoPage(page: number): Promise<EscoPage> {
  const url = `https://ec.europa.eu/esco/api/search?type=occupation&language=en&limit=100&offset=${page}&full=true&selectedVersion=v1.2.1`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url).catch(() => null);
    if (res?.ok) return (await res.json()) as EscoPage;
    await new Promise((resolve) => setTimeout(resolve, 3_000 * (attempt + 1)));
  }
  throw new Error(`ESCO page ${page} didn't load`);
}

async function fetchEsco(out: string) {
  const rows: EscoFile["occupations"] = {};
  for (let page = 0; ; page++) {
    const results = (await escoPage(page))._embedded?.results ?? [];
    for (const item of results) {
      rows[item.uri] = {
        code: item.code ?? "",
        label: item.preferredLabel?.en ?? "",
        alt: item.alternativeLabel?.en ?? [],
      };
    }
    console.log(`page ${page}: ${results.length}, ${Object.keys(rows).length} in all`);
    if (results.length < 100) break;
  }
  writeFileSync(out, JSON.stringify({ version: "v1.2.1", occupations: rows }));
}

async function xlsxRows(file: string): Promise<string[][]> {
  const zip = await JSZip.loadAsync(readFileSync(file));
  const unescape = (text: string) =>
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
  const sharedXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((si) =>
    unescape([...si[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join("")),
  );
  const sheet = (await zip.file("xl/worksheets/sheet1.xml")?.async("string")) ?? "";
  const rows: string[][] = [];
  for (const row of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cell of row[1]!.matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const column = [...cell[1]!].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const value = /<v>([\s\S]*?)<\/v>/.exec(cell[3] ?? "")?.[1];
      const inline = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cell[3] ?? "")?.[1];
      cells[column] = / t="s"/.test(cell[2]!)
        ? (shared[Number(value)] ?? "")
        : unescape(value ?? inline ?? "");
    }
    rows.push(Array.from(cells, (cell) => cell ?? ""));
  }
  return rows;
}

const NAMES: Record<string, string> = {
  "11-1021.00": "General or Operations Manager",
  "13-1111.00": "Management Analyst or Consultant",
  "15-1252.00": "Software Developer",
  "29-1141.00": "Registered Nurse",
  "31-1131.00": "Nursing Assistant",
  "31-1122.00": "Personal Care Aide",
  "31-1121.00": "Home Health Aide",
  "35-2014.00": "Restaurant Cook",
  "35-3023.00": "Fast Food or Counter Worker",
  "35-3031.00": "Waiter or Waitress",
  "35-9021.00": "Dishwasher",
  "41-1011.00": "Retail Supervisor or Store Manager",
  "41-2011.00": "Cashier",
  "41-2031.00": "Retail Sales Associate",
  "41-3091.00": "Sales Representative (services)",
  "41-4011.00": "Sales Representative (technical products)",
  "41-4012.00": "Sales Representative (wholesale)",
  "43-4051.00": "Customer Service Representative",
  "43-6014.00": "Administrative Assistant",
  "43-9061.00": "Office Clerk",
  "47-2061.00": "Construction Laborer",
  "49-9071.00": "Maintenance and Repair Worker",
  "51-9199.00": "Production Worker",
  "53-3032.00": "Truck Driver (heavy goods)",
  "53-3033.00": "Delivery Driver (light truck)",
  "53-7062.00": "Warehouse Worker or Material Mover",
  "53-7064.00": "Packer or Packager",
  "53-7065.00": "Stocker or Order Picker",
  "25-2021.00": "Primary (Elementary) School Teacher",
  "25-2022.00": "Middle School Teacher",
  "25-2031.00": "Secondary (High) School Teacher",
  "25-9042.00": "Teaching Assistant",
};

function singularWord(word: string): string {
  if (/medics$/.test(word)) return word.slice(0, -1);
  if (!/[a-z]s$/.test(word) || /(?:ss|us|is|ics|Sales|Arts|Goods|Services|News)$/.test(word))
    return word;
  if (/wives$/.test(word)) return `${word.slice(0, -3)}fe`;
  if (/sses$/.test(word)) return word.slice(0, -2);
  if (/(?:ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (/ies$/.test(word)) return `${word.slice(0, -3)}y`;
  if (/persons$/.test(word)) return word.slice(0, -1);
  return word.slice(0, -1);
}

function plainName(title: string): string {
  const [first = title, ...rest] = title.split(", ");
  let main = first;
  let suffix = "";
  const restText = rest.join(", ");
  if (/^Except\b/.test(restText)) suffix = "";
  else if (/^All Other\b/.test(restText)) suffix = " (other)";
  else if (restText && /[a-z]s$/.test(restText) && !/^(?:Except|All Other)/.test(restText)) {
    main = [main, ...rest].join(", ");
  } else if (restText) suffix = ` (${restText.toLowerCase()})`;
  const of = main.indexOf(" of ");
  const tail = of === -1 ? "" : main.slice(of);
  if (of !== -1) main = main.slice(0, of);
  const words = main.split(" ");
  const out = words.map((word, i) => {
    const next = words[i + 1];
    const head = next === undefined || next === "and" || next === "or" || word.endsWith(",");
    if (!head) return word;
    const bare = word.replace(/,$/, "");
    return singularWord(bare) + (word.endsWith(",") ? "," : "");
  });
  return `${out
    .join(" ")
    .replace(/, and /g, " or ")
    .replace(/ and /g, " or ")}${tail}${suffix}`;
}

type Candidate = { occ: number; priority: number };

const MAX_NAME_CHARS = 60;

const SHORT_KEYS = new Set(
  "rn lpn lvn cna np crna emt slp ota pta hha hca rgn rmn ceo cfo coo cto cmo cio cpa dds dmd cdl".split(
    " ",
  ),
);

async function build() {
  const dir = flag("--onet");
  const occupations = tsv(path.join(dir, "Occupation Data.txt"));
  const codes = occupations.map((row) => row[0]!);
  const index = new Map(codes.map((code, i) => [code, i]));
  const titles = occupations.map((row) => row[1]!);

  const zones = codes.map(() => 0);
  for (const [code, zone] of tsv(path.join(dir, "Job Zones.txt"))) {
    const i = index.get(code!);
    if (i !== undefined) zones[i] = Number(zone);
  }
  const close: number[][] = codes.map(() => []);
  const related: number[][] = codes.map(() => []);
  for (const [code, other, tier] of tsv(path.join(dir, "Related Occupations.txt"))) {
    const from = index.get(code!);
    const to = index.get(other!);
    if (from === undefined || to === undefined) continue;
    if (tier === "Primary-Short") close[from]!.push(to);
    else if (tier === "Primary-Long") related[from]!.push(to);
  }

  const keys = new Map<string, Candidate[]>();
  const add = (label: string, occ: number, priority: number) => {
    const pieces = [
      label.replace(/\s*\([^)]*\)\s*/g, " "),
      ...[...label.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]!),
    ];
    for (const piece of pieces) {
      const key = titleKey(piece);
      if (!key || key.length > 60 || key.split(" ").length > 7) continue;
      if (
        !key.includes(" ") &&
        (GENERIC_WORDS.has(key) || (key.length <= 3 && !SHORT_KEYS.has(key)))
      )
        continue;
      const list = keys.get(key) ?? [];
      const known = list.find((item) => item.occ === occ);
      if (known) known.priority = Math.max(known.priority, priority);
      else list.push({ occ, priority });
      keys.set(key, list);
    }
  };
  titles.forEach((title, occ) => {
    add(title, occ, 4);
    add(plainName(title), occ, 4);
  });
  const reported = new Map<number, string>();
  for (const [code, title] of tsv(path.join(dir, "Sample of Reported Titles.txt"))) {
    const occ = index.get(code!);
    if (occ === undefined) continue;
    add(title!, occ, 3);
    const plain = title!.replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const known = reported.get(occ);
    if (plain.includes(" ") && (!known || plain.length < known.length)) reported.set(occ, plain);
  }
  for (const [code, title, short] of tsv(path.join(dir, "Job Titles.txt"))) {
    const occ = index.get(code!);
    if (occ === undefined) continue;
    add(title!, occ, 2);
    if (short && short !== "n/a") add(short, occ, 2);
  }

  const esco: EscoFile = process.argv.includes("--esco")
    ? (JSON.parse(readFileSync(flag("--esco"), "utf8")) as EscoFile)
    : { version: "", occupations: {} };
  const crosswalk = new Map<string, number[]>();
  const sheet = process.argv.includes("--crosswalk") ? await xlsxRows(flag("--crosswalk")) : [];
  for (const [escoCode, , onetCode] of sheet.slice(3)) {
    const occ = index.get(onetCode ?? "");
    if (!escoCode || occ === undefined) continue;
    crosswalk.set(escoCode, [...(crosswalk.get(escoCode) ?? []), occ]);
  }
  let escoLabels = 0;
  for (const item of Object.values(esco.occupations)) {
    for (const occ of crosswalk.get(item.code) ?? []) {
      for (const label of [item.label, ...item.alt]) {
        add(label, occ, 1);
        escoLabels += 1;
      }
    }
  }

  const keySets: string[][][] = codes.map(() => []);
  for (const [key, list] of keys) for (const { occ } of list) keySets[occ]!.push(key.split(" "));
  const centrality = (occ: number, words: readonly string[]) =>
    keySets[occ]!.filter((set) => words.every((word) => set.includes(word))).length;
  const major = (occ: number) => codes[occ]!.slice(0, 2);
  const titleOverlap = (occ: number, words: readonly string[]) => {
    const own = new Set(titleKey(titles[occ]!).split(" "));
    return words.filter((word) => own.has(word)).length / (own.size + words.length);
  };

  const isParentOf = (parent: number, child: number) =>
    codes[parent]!.endsWith(".00") &&
    parent !== child &&
    codes[parent]!.slice(0, 7) === codes[child]!.slice(0, 7);

  const aliases: string[][] = codes.map(() => []);
  let ambiguous = 0;
  let dropped = 0;
  for (const [key, list] of keys) {
    const top = Math.max(...list.map((item) => item.priority));
    const best = [
      ...new Map(
        list
          .filter((item) => item.priority === top)
          .map((item) =>
            item.priority === 4
              ? item
              : (list.find((other) => isParentOf(other.occ, item.occ)) ?? item),
          )
          .map((item) => [item.occ, item]),
      ).values(),
    ];
    if (best.length === 1) {
      aliases[best[0]!.occ]!.push(key);
      continue;
    }
    ambiguous += 1;
    const words = key.split(" ");
    const scored = best
      .map(({ occ }) => ({
        occ,
        central: centrality(occ, words),
        overlap: titleOverlap(occ, words),
        detailed: codes[occ]!.endsWith(".00") ? 1 : 0,
      }))
      .sort(
        (a, b) =>
          Number(isParentOf(b.occ, a.occ)) - Number(isParentOf(a.occ, b.occ)) ||
          b.central - a.central ||
          b.overlap - a.overlap ||
          b.detailed - a.detailed ||
          a.occ - b.occ,
      );
    const winner = scored[0]!;
    const majors = new Map<string, number>();
    for (const item of scored) majors.set(major(item.occ), (majors.get(major(item.occ)) ?? 0) + 1);
    const share = (majors.get(major(winner.occ)) ?? 0) / scored.length;
    const relatedTo = (a: number, b: number) =>
      close[a]!.includes(b) ||
      close[b]!.includes(a) ||
      related[a]!.includes(b) ||
      related[b]!.includes(a);
    const rival = scored.find(
      (item) => major(item.occ) !== major(winner.occ) && !relatedTo(item.occ, winner.occ),
    );
    if (majors.size === 1 || share >= 0.6 || !rival || winner.central >= 2 * rival.central) {
      aliases[winner.occ]!.push(key);
    } else {
      dropped += 1;
    }
  }

  const owner = new Map<string, string>();
  aliases.forEach((list, occ) => {
    for (const key of list) owner.set(key, codes[occ]!);
  });
  const ours = new Map(TECH_NAMES.map(([name, code]) => [titleKey(name), code]));
  const lookup = (key: string) => ours.get(key) ?? owner.get(key);
  let redundant = 0;
  for (const key of [...owner.keys()].sort((a, b) => a.split(" ").length - b.split(" ").length)) {
    if (ours.has(key)) {
      owner.delete(key);
      redundant += 1;
      continue;
    }
    const words = key.split(" ");
    for (let start = 1; start < words.length; start++) {
      const shorter = lookup(words.slice(start).join(" "));
      if (shorter === undefined) continue;
      if (shorter === owner.get(key)) {
        owner.delete(key);
        redundant += 1;
      }
      break;
    }
  }
  const kept: string[][] = codes.map(() => []);
  for (const [key, code] of owner) kept[index.get(code)!]!.push(key);

  const data: OccupationData = {
    source:
      "O*NET 31.0 Database (USDOL/ETA, CC BY 4.0) and ESCO v1.2.1 (European Commission), joined by the O*NET Center's ESCO crosswalk; titles reduced to lookup keys by Otto",
    codes,
    titles,
    names: codes.map((code, i) => {
      const plain = NAMES[code] ?? plainName(titles[i]!);
      if (plain.length <= MAX_NAME_CHARS) return plain;
      const short = reported.get(i) ?? plain.replace(/\s*\([^)]*\)$/, "");
      return short.length <= MAX_NAME_CHARS
        ? short
        : short.slice(0, short.lastIndexOf(" ", MAX_NAME_CHARS)).replace(/[,\s]+$/, "");
    }),
    zones,
    close,
    related,
    aliases: kept.map((list) => [...new Set(list)].sort().join("|")),
  };
  const json = JSON.stringify(data);
  writeFileSync(OUT, `${json}\n`);
  console.log({
    occupations: codes.length,
    keys: keys.size,
    escoLabels,
    ambiguous,
    droppedAsAmbiguous: dropped,
    droppedAsRedundant: redundant,
    keptKeys: owner.size,
    bytes: json.length,
    gzipBytes: gzipSync(json).length,
    out: OUT,
  });
}

const step = process.argv[2];
(step === "fetch-esco" ? fetchEsco(process.argv[3] ?? "esco-occupations.json") : build())
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
