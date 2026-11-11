// Every export (PDF, Word, send check, fit, share links) reads through this, so a hidden line never
// turns up in one and not the others.
export { visibleResume } from "@/lib/resume/ops";

/** Same text, case, accents and punctuation aside: "Acme, Inc." and "ACME Inc" match. */
export function companyKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
