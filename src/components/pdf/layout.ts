import type { PdfLink } from "@/lib/pdf/links";
import type { PdfEntry, PdfModel } from "@/lib/pdf/model";
import type { EntryField, EntryKind, EntryRow, PdfStyle, TemplateTheme } from "./theme";

// Pure and react-pdf free: the PDF, miniature, web page and Word file all agree word for word.

// Pieces meet on a space or after punctuation, never mid-word, so react-pdf never hyphenates there.
export type Run = { text: string; style?: PdfStyle; link?: PdfLink };

export type PlannedRow = {
  key: string;
  box: PdfStyle;
  text: PdfStyle;
  lead: Run[];
  side: Run | null;
  // 1 for a first row (and a company line), 2 for the rows under it.
  position: 1 | 2;
};

type EntrySection = "experience" | "projects" | "education" | "certifications";

export const SECTION_KINDS: Record<EntrySection, EntryKind> = {
  experience: "job",
  education: "school",
  projects: "item",
  certifications: "item",
};

type FieldValue = { text: string; link?: PdfLink };
type Values = Partial<Record<EntryField, FieldValue | null>>;

const YEAR = /\b(?:19|20)\d{2}\b/g;

// "Mar 2019 – Feb 2022" → "2019 – 2022". "Present" stays; a one-year range prints its year once.
export function yearsOnly(dates: string): string {
  const parts = dates.split(" – ").map((part) => {
    const years = part.match(YEAR);
    return years ? years[years.length - 1]! : part;
  });
  if (parts.length === 2 && parts[0] === parts[1]) return parts[0]!;
  return parts.join(" – ");
}

// Suffixes stay with the last name ("King Jr."); particles join it ("van Beethoven").
const SUFFIX = /^(?:jr|sr|ii|iii|iv|v|phd|ph\.d|md|m\.d|mba|cpa|esq)\.?,?$/i;
const PARTICLES = new Set([
  "al",
  "bin",
  "binti",
  "da",
  "das",
  "de",
  "del",
  "della",
  "der",
  "den",
  "di",
  "do",
  "dos",
  "du",
  "el",
  "ibn",
  "la",
  "le",
  "st.",
  "ten",
  "ter",
  "van",
  "von",
]);

// A guess: one word, a comma ("Park, Byungjin") or a script without spaces gives no first part.
// `${first} ${last}` is always the name exactly as written.
export function splitName(name: string): { first: string; last: string } {
  const words = name.split(" ");
  if (words.length < 2 || name.includes(",")) return { first: "", last: name };
  let start = words.length - 1;
  while (start > 0 && SUFFIX.test(words[start]!)) start--;
  while (start > 1 && PARTICLES.has(words[start - 1]!.toLowerCase())) start--;
  if (start <= 0) return { first: "", last: name };
  return { first: words.slice(0, start).join(" "), last: words.slice(start).join(" ") };
}

/** The name line: the name (two-tone with `nameSplit`), then " | Headline" with `headlineInline`. */
export function nameRuns(model: Pick<PdfModel, "name" | "headline">, theme: TemplateTheme): Run[] {
  const { styles } = theme;
  const runs: Run[] = [];
  if (!model.name) return runs;
  if (theme.nameSplit) {
    const { first, last } = splitName(model.name);
    if (first) runs.push({ text: `${first} ` });
    runs.push({ text: last, style: styles.nameLast });
  } else {
    runs.push({ text: model.name });
  }
  if (theme.headlineInline && model.headline) {
    runs.push({ text: ` | ${model.headline}`, style: styles.headlineInline });
  }
  return runs;
}

export function headlineLine(model: Pick<PdfModel, "name" | "headline">, theme: TemplateTheme) {
  return model.headline && !(theme.headlineInline && model.name) ? model.headline : "";
}

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

/** A heading's runs: its first `headingAccent` letters in the accent, the rest as is. */
export function headingRuns(title: string, theme: TemplateTheme): Run[] {
  const count = theme.headingAccent;
  if (count <= 0) return [{ text: title }];
  const letters = graphemes(title);
  const head = letters.slice(0, count).join("");
  const rest = letters.slice(count).join("");
  const accent: Run = { text: head, style: theme.styles.sectionTitleAccent };
  return rest ? [accent, { text: rest }] : [accent];
}

export function contactLines(model: Pick<PdfModel, "contact" | "basics">, theme: TemplateTheme) {
  const basics = model.basics;
  if (!basics) return model.contact;
  return theme.contactLines
    .map((line) =>
      line.flatMap((field): PdfLink[] => {
        if (field === "links") return basics.links;
        const item = basics[field];
        return item ? [item] : [];
      }),
    )
    .filter((line) => line.length > 0);
}

function value(text: string | undefined): FieldValue | null {
  return text ? { text } : null;
}

function linkValue(link: PdfLink | null | undefined): FieldValue | null {
  if (!link?.text) return null;
  return link.href ? { text: link.text, link } : { text: link.text };
}

function datesOf(dates: string | undefined, theme: TemplateTheme): FieldValue | null {
  if (!dates) return null;
  return value(theme.dates === "years" ? yearsOnly(dates) : dates);
}

function rowStyles(theme: TemplateTheme, position: 1 | 2) {
  const s = theme.styles;
  return position === 1
    ? { box: s.row1, text: s.row1Text, first: s.row1First, rest: s.row1Rest, side: s.row1Side }
    : { box: s.row2, text: s.row2Text, first: s.row2First, rest: s.row2Rest, side: s.row2Side };
}

function buildRow(
  spec: EntryRow,
  values: Values,
  position: 1 | 2,
  theme: TemplateTheme,
  key: string,
): PlannedRow | null {
  const styles = rowStyles(theme, position);
  const fields = spec.lead.filter((field) => values[field]?.text);
  const lead: Run[] = [];
  fields.forEach((field, index) => {
    const item = values[field]!;
    if (index > 0) {
      // ", " puts the comma on the field in front; the space (and any mark after it) leads.
      const separator = theme.separators[field] ?? ", ";
      const [, mark = "", gap = ""] = /^(\S*)([\s\S]*)$/.exec(separator) ?? [];
      if (mark) lead[lead.length - 1]!.text += mark;
      if (gap) lead.push({ text: gap });
    }
    lead.push({
      text: item.text,
      style: index === 0 ? styles.first : styles.rest,
      link: item.link,
    });
  });
  const sideValue = spec.side ? values[spec.side] : null;
  const side: Run | null = sideValue?.text
    ? { text: sideValue.text, style: styles.side, link: sideValue.link }
    : null;
  if (lead.length === 0 && !side) return null;
  return { key, box: styles.box, text: styles.text, lead, side, position };
}

const present = (row: PlannedRow | null): row is PlannedRow => row !== null;

// The format's rows, or one line when a row would start with nothing (a school with no degree, a
// project with no company): the rows' leading fields first, then the rest, dates on the right.
function foldedRows(
  specs: readonly EntryRow[],
  values: Values,
  theme: TemplateTheme,
  id: string,
): PlannedRow[] {
  const leads = specs.map((spec) => spec.lead[0]);
  const folds = specs.length > 1 && leads.some((field) => !field || !values[field]?.text);
  if (!folds) {
    return specs
      .map((spec, index) => buildRow(spec, values, index === 0 ? 1 : 2, theme, `${id}-${index}`))
      .filter(present);
  }
  const every = specs.flatMap((spec) => [...spec.lead, ...(spec.side ? [spec.side] : [])]);
  const order = [...leads, ...every].filter(
    (field, index, list): field is EntryField =>
      field !== undefined && field !== "dates" && list.indexOf(field) === index,
  );
  return [buildRow({ lead: order, side: "dates" }, values, 1, theme, `${id}-0`)].filter(present);
}

/** The heading rows of one entry: its company line when it starts a run of roles, and its own. */
export function entryRows(entry: PdfEntry, kind: EntryKind, theme: TemplateTheme): PlannedRow[] {
  const values: Values = {
    title: value(entry.title),
    org: value(entry.org),
    detail: linkValue(entry.detail),
    dates: datesOf(entry.dates, theme),
    tech: value(entry.tech),
  };
  const company = entry.company;
  if (!company) return foldedRows(theme.rows[kind], values, theme, entry.id);
  const role = () => buildRow(theme.roleRow, values, 2, theme, `${entry.id}-role`);
  if (theme.companyRow) {
    const head = company.first
      ? buildRow(
          theme.companyRow,
          {
            org: value(company.name),
            detail: linkValue(company.detail),
            dates: datesOf(company.dates, theme),
          },
          1,
          theme,
          `${entry.id}-company`,
        )
      : null;
    return [head, role()].filter(present);
  }
  if (!company.first) return [role()].filter(present);
  return foldedRows(
    theme.rows.job,
    { ...values, org: value(company.name), detail: linkValue(company.detail ?? entry.detail) },
    theme,
    entry.id,
  );
}

export type BulletMark =
  { kind: "glyph"; glyph: string } | { kind: "shape"; shape: "square" | "circle" };

export function bulletMark(theme: TemplateTheme): BulletMark {
  const { bullet } = theme;
  return theme.drawBullet && bullet.shape
    ? { kind: "shape", shape: bullet.shape }
    : { kind: "glyph", glyph: bullet.glyph };
}

/** Every string of the model, to check the fonts can draw it. */
export function modelText(model: PdfModel): string {
  const parts: string[] = [model.name, model.headline];
  for (const line of model.contact) for (const item of line) parts.push(item.text);
  const entries = (list: readonly PdfEntry[]) => {
    for (const entry of list) {
      parts.push(entry.title, entry.org, entry.dates, entry.detail?.text ?? "");
      parts.push(entry.tech ?? "", entry.note ?? "", entry.company?.name ?? "");
      parts.push(entry.company?.detail?.text ?? "", entry.company?.dates ?? "");
      for (const bullet of entry.bullets) parts.push(bullet.text);
    }
  };
  for (const section of model.sections) {
    parts.push(section.title);
    if (section.key === "summary") parts.push(...section.paragraphs);
    else if (section.key === "skills") {
      for (const line of section.lines) parts.push(line.label, line.items);
    } else entries(section.entries);
  }
  for (const section of model.extras ?? []) {
    parts.push(section.title, section.list ?? "");
    entries(section.entries);
  }
  return parts.join("\n");
}

export function themeText(theme: TemplateTheme): string {
  const glyph = theme.drawBullet ? "" : theme.bullet.glyph;
  return [theme.contactSeparator, glyph, ...Object.values(theme.separators)].join("");
}
