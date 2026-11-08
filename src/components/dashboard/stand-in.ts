import {
  buildPdfModel,
  type PdfBullet,
  type PdfEntry,
  type PdfExtraSection,
  type PdfModel,
  type PdfSection,
} from "@/lib/pdf/model";
import { visibleResume } from "@/lib/resume/ops";
import { createSampleResume } from "@/lib/resume/sample";
import { extrasOf, type ExtraKind, type ExtraSection, type Resume } from "@/lib/resume/schema";

// Miniatures show the sample person, never the user's own details: thumbnails end up in
// screenshots and screen shares, and a page that small doesn't need to be read to be recognised.
// What carries over is the layout: the format (applied by the caller), which sections exist and
// in what order (extra sections included), how many entries each has, which entries have dates or
// a location, roles grouped under one company, and how many lines there are and roughly how long
// each one runs. Every word comes from the sample resume, or for extra sections (which the sample
// doesn't have) from the sample person's few extras below. Hidden items are never drawn.

type Pools = {
  model: PdfModel;
  jobs: PdfEntry[];
  schools: PdfEntry[];
  projects: PdfEntry[];
  certifications: PdfEntry[];
  skillLabels: string[];
  // Sample lines to cut stand-ins from, by kind of line.
  bulletLines: string[];
  summaryLines: string[];
  skillLines: string[];
};

type ExtraSample = { titles: string[]; orgs: string[]; dates: string[] };

const EXTRA_SAMPLES: Record<ExtraKind, ExtraSample> = {
  languages: {
    titles: ["Spanish", "French", "German", "Portuguese", "Japanese"],
    orgs: ["Fluent", "Professional", "Conversational"],
    dates: [],
  },
  awards: {
    titles: ["Analyst of the Year", "Data Viz Award", "Hackathon Winner"],
    orgs: ["Brightloop", "City Data Week"],
    dates: ["2023", "2021", "2019"],
  },
  volunteering: {
    titles: ["Mentor", "Volunteer Tutor"],
    orgs: ["Code Club", "City Library"],
    dates: ["2019 – 2022", "2017 – 2019"],
  },
  publications: {
    titles: ["Dashboards People Read", "Forms People Finish"],
    orgs: ["Analytics Weekly", "UX Collective"],
    dates: ["2022", "2020"],
  },
  custom: {
    titles: ["Data Guild", "Running Club"],
    orgs: ["Member", "Organizer"],
    dates: ["2020 – now", "2018 – now"],
  },
};

let pools: Pools | null = null;

function entriesOf(model: PdfModel, key: PdfSection["key"]): PdfEntry[] {
  const section = model.sections.find((item) => item.key === key);
  return section && "entries" in section ? section.entries : [];
}

function getPools(): Pools {
  if (pools) return pools;
  const model = buildPdfModel(createSampleResume(0));
  const jobs = entriesOf(model, "experience");
  const summary = model.sections.find((item) => item.key === "summary");
  const skills = model.sections.find((item) => item.key === "skills");
  const lines = (texts: string[]) => texts.map((text) => text.trim()).filter(Boolean);
  pools = {
    model,
    jobs,
    schools: entriesOf(model, "education"),
    projects: entriesOf(model, "projects"),
    certifications: entriesOf(model, "certifications"),
    skillLabels: skills && "lines" in skills ? skills.lines.map((line) => line.label) : [],
    bulletLines: lines(
      [...jobs, ...entriesOf(model, "projects")].flatMap((entry) =>
        entry.bullets.map((b) => b.text),
      ),
    ),
    summaryLines: lines(summary && "paragraphs" in summary ? summary.paragraphs : []),
    skillLines: lines(skills && "lines" in skills ? skills.lines.map((line) => line.items) : []),
  };
  return pools;
}

// About `length` characters of sample text: the line-th sample line, cut at a word, or followed by
// the next ones when it's too short. Whole sentences in order read as a real page, and the sample
// resume's own miniature comes out word for word. Capped, since a miniature shows one page.
export function standInText(lines: readonly string[], length: number, line: number): string {
  if (lines.length === 0 || length <= 0) return "";
  const target = Math.min(length, 600);
  const out: string[] = [];
  let size = 0;
  for (let i = 0; size < target && i < lines.length * 4; i++) {
    for (const word of lines[(line + i) % lines.length]!.split(/\s+/)) {
      if (size >= target && out.length > 0) break;
      out.push(word);
      size += word.length + 1;
    }
  }
  // A line cut after "teams," shouldn't end on the comma.
  return out.join(" ").replace(/[,;:]$/, "");
}

function pick<T>(list: readonly T[], index: number): T | undefined {
  return list.length > 0 ? list[index % list.length] : undefined;
}

// A sample entry's company: its company header when it's one of several roles there.
function orgOf(sample: PdfEntry | undefined): string {
  return sample?.company?.name || sample?.org || sample?.title || "Company";
}

// `firstLine` counts lines across the whole section, so the next job carries on with the next
// sample sentence instead of repeating the first. `company` is the sample company standing in
// for the real one, shared by every role of a run.
function standInEntry(
  real: PdfEntry,
  sample: PdfEntry | undefined,
  firstLine: number,
  lines: string[],
  company?: string,
): PdfEntry {
  const entry: PdfEntry = {
    id: real.id,
    title: real.title ? (sample?.title ?? "Role") : "",
    org: real.org ? orgOf(sample) : "",
    detail: real.detail ? (sample?.detail ?? { text: "Remote", href: null }) : null,
    dates: real.dates ? (sample?.dates ?? "2020 – 2023") : "",
    bullets: real.bullets.map((bullet, line): PdfBullet => ({
      id: bullet.id,
      text: standInText(lines, bullet.text.length, firstLine + line),
    })),
  };
  if (real.note) entry.note = standInText(lines, real.note.length, firstLine + real.bullets.length);
  if (real.company) {
    entry.company = {
      name: company ?? orgOf(sample),
      detail: real.company.detail ? (sample?.detail ?? { text: "Remote", href: null }) : null,
      first: real.company.first,
    };
  }
  return entry;
}

function standInEntries(
  entries: readonly PdfEntry[],
  samples: readonly PdfEntry[],
  p: Pools,
): PdfEntry[] {
  let line = 0;
  let company: string | undefined;
  return entries.map((entry, index) => {
    const sample = pick(samples, index);
    if (entry.company?.first) company = orgOf(sample);
    const standIn = standInEntry(
      entry,
      sample,
      line,
      p.bulletLines,
      entry.company ? company : undefined,
    );
    line += entry.bullets.length + (entry.note ? 1 : 0);
    return standIn;
  });
}

function standInSection(section: PdfSection, p: Pools): PdfSection {
  switch (section.key) {
    case "summary":
      return {
        ...section,
        paragraphs: section.paragraphs.map((text, index) =>
          standInText(p.summaryLines, text.length, index),
        ),
      };
    case "skills":
      return {
        ...section,
        lines: section.lines.map((line, index) => ({
          id: line.id,
          label: line.label ? (pick(p.skillLabels, index) ?? "Skills") : "",
          items: standInText(p.skillLines, line.items.length, index),
        })),
      };
    default: {
      const samples = {
        experience: p.jobs,
        education: p.schools,
        projects: p.projects,
        certifications: p.certifications,
      }[section.key];
      return { ...section, entries: standInEntries(section.entries, samples, p) };
    }
  }
}

function sampleEntry(kind: ExtraKind, index: number): PdfEntry {
  const words = EXTRA_SAMPLES[kind];
  return {
    id: `${kind}-${index}`,
    title: pick(words.titles, index) ?? "",
    org: pick(words.orgs, index) ?? "",
    detail: null,
    dates: pick(words.dates, index) ?? "2021",
    bullets: [],
  };
}

// A one-line list ("Spanish (Fluent), French (Basic)") keeps its length and which items had a
// level, read from the shown items of the section it came from.
function standInList(section: PdfExtraSection, source: ExtraSection | undefined): string {
  const items = (source?.items ?? []).filter((item) => item.title.trim() || item.subtitle.trim());
  const count = Math.max(1, items.length);
  return Array.from({ length: count }, (_, index) => {
    const sample = sampleEntry(section.kind, index);
    return items[index]?.subtitle.trim() ? `${sample.title} (${sample.org})` : sample.title;
  }).join(", ");
}

function standInExtra(
  section: PdfExtraSection,
  source: ExtraSection | undefined,
  p: Pools,
): PdfExtraSection {
  const samples = section.entries.map((_, index) => sampleEntry(section.kind, index));
  return {
    ...section,
    list: section.list === null ? null : standInList(section, source),
    entries: standInEntries(section.entries, samples, p),
  };
}

// The resume's page with the sample person written into its layout. `blank` is a page with nothing
// to draw yet (no name, no headline, no section with content), which gets a placeholder instead.
export function standInPage(resume: Resume): { model: PdfModel; blank: boolean } {
  // The PDF model leaves hidden items out too; going through the printed copy here keeps the
  // miniature honest even if that ever changes.
  const shown = visibleResume(resume);
  const real = buildPdfModel(shown);
  const extras = real.extras ?? [];
  const sources = new Map(extrasOf(shown).map((section) => [section.id, section]));
  const p = getPools();
  return {
    blank: !real.name && !real.headline && real.sections.length === 0 && extras.length === 0,
    model: {
      name: p.model.name,
      headline: p.model.headline,
      contact: p.model.contact,
      sections: real.sections.map((section) => standInSection(section, p)),
      extras: extras.map((section) => standInExtra(section, sources.get(section.id), p)),
      meta: p.model.meta,
      changedCharacters: [],
    },
  };
}
