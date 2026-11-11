import { newId, type Certification, type SkillGroup } from "../schema";
import { bulletText, findDateRanges, findDates } from "../sections";
import { LIMITS } from "./limits";
import { clip } from "./text";

const GROUP_LABEL = /^([^:\t]{1,40}):\s*(.+)$/;

export function parseSkills(lines: readonly string[]): SkillGroup[] {
  const groups: { label: string; items: string[] }[] = [];
  let flat: { label: string; items: string[] } | undefined;
  // A two-column table reads as one line per row: "Languages: Go, Rust<tab>Cloud: AWS, GCP".
  const cells = lines.flatMap((line) =>
    (bulletText(line) ?? line).split(/\t+(?=[^:\t,]{1,40}:\s)/),
  );
  for (const content of cells) {
    const labelled = GROUP_LABEL.exec(content);
    const label = labelled?.[1]?.trim() ?? "";
    if (labelled?.[2] && label.split(/\s+/).length <= 5 && !/\d|https?/i.test(label)) {
      groups.push({ label: /^skills$/i.test(label) ? "" : label, items: splitList(labelled[2]) });
      continue;
    }
    if (!flat) {
      flat = { label: "", items: [] };
      groups.push(flat);
    }
    flat.items.push(...splitList(content));
  }
  return groups
    .map((group) => skillGroup(group.label, group.items))
    .filter((group) => group.items.length > 0);
}

function skillGroup(label: string, items: readonly string[]): SkillGroup {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of items) {
    const value = clip(item, LIMITS.item);
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return {
    id: newId(),
    label: clip(label, LIMITS.label),
    items: unique.slice(0, LIMITS.skillItems),
  };
}

// Splits "Python, Go | AWS (EC2, S3); Docker" at separators outside brackets.
export function splitList(text: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  const flush = () => {
    const item = current
      .trim()
      .replace(/^(?:and|&)\s+/i, "")
      .replace(/[.;:]+$/, "")
      .trim();
    if (item) items.push(item);
    current = "";
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? "";
    if (char === "(" || char === "[") depth++;
    if ((char === ")" || char === "]") && depth > 0) depth--;
    const spacedSlash = char === "/" && text[i - 1] === " " && text[i + 1] === " ";
    if (depth === 0 && (/[,;|•·▪\t]/.test(char) || spacedSlash)) flush();
    else current += char;
  }
  flush();
  return items;
}

export function parseCertifications(lines: readonly string[]): Certification[] {
  const certifications: Certification[] = [];
  for (const line of lines) {
    const content = bulletText(line) ?? line;
    const previous = certifications.at(-1);
    if (previous && /^\p{Ll}/u.test(content)) {
      previous.name = clip(`${previous.name} ${content}`, LIMITS.text);
      continue;
    }
    const range = findDateRanges(content)[0];
    const date = range?.text ?? findDates(content)[0]?.text ?? "";
    const rest = (date ? content.split(date).join("\t") : content).replace(/\(\s*\)|\[\s*\]/g, "");
    const [name = "", ...issuer] = rest
      .split(/\t|\s*\|\s*|\s+[—–-]\s+|,\s+|\s+by\s+/i)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!name) continue;
    certifications.push({
      id: newId(),
      name: clip(name, LIMITS.text),
      issuer: clip(issuer.join(", "), LIMITS.text),
      date: clip(date, LIMITS.date),
    });
  }
  return certifications;
}
