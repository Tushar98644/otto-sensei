import { notInArray, sql } from "drizzle-orm";
import type { Db } from "@/db/client";
import { companyVisa } from "@/db/schema";
import { USER_AGENT } from "@/lib/jobs/fetch";
import { companyKey } from "./visa";
import { VISA_REGISTER_NAMES, type RegisterNames } from "./visa-matches";

// For the hand-checked names in visa-matches.ts only:
// - UK: Register of Licensed Sponsors (GOV.UK, Open Government Licence v3.0), via the content API.
// - US: USCIS H-1B Employer Data Hub yearly files; newer years are only in its dashboard.
// Run monthly, by the jobs cron or scripts/visa-registers.ts.

const UK_PAGE =
  "https://www.gov.uk/api/content/government/publications/register-of-licensed-sponsors-workers";
const USCIS_FILES = "https://www.uscis.gov/archive/h-1b-employer-data-hub-files";
const DAY_MS = 24 * 60 * 60 * 1_000;
export const VISA_REFRESH_AFTER_MS = 30 * DAY_MS;
const TIMEOUT_MS = 60_000;

async function download(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT },
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return res.text();
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length > 0) rows.push([...row, field]);
  const [header, ...body] = rows;
  if (!header) return [];
  const names = header.map((name) => name.replace(/^﻿/, "").trim());
  return body
    .filter((cells) => cells.some((cell) => cell.trim()))
    .map((cells) => Object.fromEntries(names.map((name, i) => [name, (cells[i] ?? "").trim()])));
}

export type UkRegister = Set<string>;
export type H1bYear = { year: number; approvals: Map<string, number> };

export function ukSkilledWorkers(csv: string): UkRegister {
  const names = new Set<string>();
  for (const row of parseCsv(csv)) {
    if (row["Route"] === "Skilled Worker" && row["Organisation Name"])
      names.add(row["Organisation Name"]);
  }
  return names;
}

/** Approved H-1B petitions (initial and continuing) per employer name, for one fiscal year. */
export function h1bApprovals(csv: string): H1bYear {
  const approvals = new Map<string, number>();
  let year = 0;
  for (const row of parseCsv(csv)) {
    const name = row["Employer"] ?? "";
    if (!name) continue;
    year = Math.max(year, Number(row["Fiscal Year"]) || 0);
    const count =
      Number((row["Initial Approval"] ?? "0").replace(/,/g, "")) +
      Number((row["Continuing Approval"] ?? "0").replace(/,/g, ""));
    if (count > 0) approvals.set(name, (approvals.get(name) ?? 0) + count);
  }
  return { year, approvals };
}

export type VisaRow = typeof companyVisa.$inferInsert;

export function visaRows(
  names: Readonly<Record<string, RegisterNames>>,
  uk: UkRegister,
  years: readonly H1bYear[],
  now: number,
): VisaRow[] {
  const newestFirst = [...years].sort((a, b) => b.year - a.year);
  const rows: VisaRow[] = [];
  for (const [company, listed] of Object.entries(names)) {
    const ukName = listed.uk?.find((name) => uk.has(name)) ?? null;
    let h1bYear: number | null = null;
    let h1bApprovals: number | null = null;
    let usName: string | null = null;
    for (const year of newestFirst) {
      const hits = (listed.us ?? []).filter((name) => (year.approvals.get(name) ?? 0) > 0);
      if (hits.length === 0) continue;
      h1bYear = year.year;
      h1bApprovals = hits.reduce((sum, name) => sum + (year.approvals.get(name) ?? 0), 0);
      usName = hits[0]!;
      break;
    }
    if (ukName === null && h1bYear === null) continue;
    rows.push({
      companyKey: companyKey(company),
      ukName,
      h1bYear,
      h1bApprovals,
      usName,
      checkedAt: now,
    });
  }
  return rows;
}

async function ukRegisterCsv(): Promise<string> {
  const page = JSON.parse(await download(UK_PAGE)) as {
    details?: { attachments?: { url?: string; content_type?: string }[] };
  };
  const file = page.details?.attachments?.find(
    (item) =>
      item.content_type === "text/csv" &&
      item.url?.startsWith("https://assets.publishing.service.gov.uk/"),
  );
  if (!file?.url) throw new Error("The UK register page lists no CSV file");
  return download(file.url);
}

async function h1bCsvs(count = 2): Promise<string[]> {
  const page = await download(USCIS_FILES);
  const files = [
    ...page.matchAll(/\/sites\/default\/files\/document\/data\/h1b_datahubexport-(\d{4})\.csv/g),
  ]
    .map((match) => ({ year: Number(match[1]), path: match[0] }))
    .sort((a, b) => b.year - a.year);
  const newest = [...new Map(files.map((file) => [file.year, file])).values()].slice(0, count);
  if (newest.length === 0) throw new Error("The USCIS page lists no H-1B files");
  return Promise.all(newest.map((file) => download(`https://www.uscis.gov${file.path}`)));
}

export type VisaRefresh = { companies: number; uk: number; us: number; h1bYear: number | null };

export async function refreshVisaRegisters(db: Db, now: number): Promise<VisaRefresh> {
  const [ukCsv, usCsvs] = await Promise.all([ukRegisterCsv(), h1bCsvs()]);
  const uk = ukSkilledWorkers(ukCsv);
  // A register that comes back nearly empty is a broken download, not 120,000 lost licences.
  if (uk.size < 10_000) throw new Error(`The UK register has only ${uk.size} Skilled Worker rows`);
  const years = usCsvs.map(h1bApprovals);
  const rows = visaRows(VISA_REGISTER_NAMES, uk, years, now);
  await db.transaction(async (tx) => {
    const keys = rows.map((row) => row.companyKey);
    await tx
      .delete(companyVisa)
      .where(keys.length > 0 ? notInArray(companyVisa.companyKey, keys) : sql`true`);
    for (const row of rows) {
      await tx
        .insert(companyVisa)
        .values(row)
        .onConflictDoUpdate({ target: companyVisa.companyKey, set: row });
    }
  });
  return {
    companies: rows.length,
    uk: rows.filter((row) => row.ukName).length,
    us: rows.filter((row) => row.h1bYear !== null).length,
    h1bYear: Math.max(0, ...years.map((year) => year.year)) || null,
  };
}

/** null when never refreshed (or before the migration). */
export async function visaCheckedAt(db: Db): Promise<number | null> {
  try {
    const [row] = await db
      .select({ at: sql<number | null>`max(${companyVisa.checkedAt})` })
      .from(companyVisa);
    return row?.at === null || row?.at === undefined ? null : Number(row.at);
  } catch {
    return null;
  }
}
