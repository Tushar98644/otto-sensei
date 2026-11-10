import type { WorkRegion } from "@/lib/eligibility/profile";
import { foldCase } from "@/lib/tailor/tokens";

// Client-safe and pure. What public visa registers say about a company (company_visa, filled by
// scripts/visa-registers.ts), as facts a card can state. Never "will sponsor you": a licence or
// past petitions say the company can and did sponsor, not that it will for this job.

export type VisaFacts = {
  // On the UK Register of Licensed Sponsors for Skilled Worker.
  ukSponsor: boolean;
  // The latest US fiscal year with an approved H-1B petition (USCIS Employer Data Hub).
  h1bYear: number | null;
};

// Petitions older than this many fiscal years say little about hiring today. USCIS's newest
// downloadable year is FY2023 (2026-11-09; later years are only in its dashboard), so the line
// always names its year.
const H1B_RECENT_YEARS = 4;

// Legal endings that differ between a brand and its registered name: "Acme" is "ACME, INC.".
const LEGAL_SUFFIX =
  /\b(?:inc|incorporated|llc|l\.l\.c|ltd|limited|plc|corp|corporation|co|company|gmbh|ag|sa|sas|bv|b\.v|lp|llp|pbc|pty|uk)\b\.?/g;

/** A company name folded for lookups: "Monzo Bank Ltd." -> "monzo bank". Never fuzzy. */
export function companyKey(name: string): string {
  return foldCase(name)
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}\s.]/gu, " ")
    .replace(LEGAL_SUFFIX, " ")
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fiscalYearOf(now: number): number {
  const date = new Date(now);
  // The US fiscal year starts on 1 October.
  return date.getUTCFullYear() + (date.getUTCMonth() >= 9 ? 1 : 0);
}

function recentH1b(facts: VisaFacts, now: number): boolean {
  return facts.h1bYear !== null && fiscalYearOf(now) - facts.h1bYear <= H1B_RECENT_YEARS;
}

/** The lines a job card shows, e.g. "Listed as a UK visa sponsor". */
export function visaLines(facts: VisaFacts | null, now: number): string[] {
  if (!facts) return [];
  const lines: string[] = [];
  if (facts.ukSponsor) lines.push("Listed as a UK visa sponsor");
  if (facts.h1bYear !== null && recentH1b(facts, now))
    lines.push(`H-1B visa petitions approved in fiscal ${facts.h1bYear} (USCIS)`);
  return lines;
}

/** Regions where the registers show the company sponsoring workers, for the work-rights check. */
export function sponsorRegions(facts: VisaFacts | null, now: number): WorkRegion[] {
  if (!facts) return [];
  const regions: WorkRegion[] = [];
  if (facts.ukSponsor) regions.push("uk");
  if (recentH1b(facts, now)) regions.push("us");
  return regions;
}
