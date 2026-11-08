// What gets sent: the resume minus everything the person hid (sections, entries, lines, skill
// groups, extra sections and their items). The PDF, the Word file, the send check, "fit to one
// page" and share links all read through this, so a hidden line never turns up in one of them and
// not the others. One implementation, shared with the editor's own text views.
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
