import type { Grade } from "@/lib/evals/graders";
import { DEFAULT_SECTION_ORDER, type ExtraKind, type Resume } from "@/lib/resume/schema";

// The reader's own output shape (ParsedResume in src/lib/ai/structure.ts), without ids.
export type ReadJob = {
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: readonly string[];
};
export type ReadSchool = {
  school: string;
  degree: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: readonly string[];
};
export type ReadProject = { name: string; link: string; bullets: readonly string[] };
type ReadSkillGroup = { label: string; items: readonly string[] };
export type ReadCertification = { name: string; issuer: string; date: string };
export type ReadExtraItem = {
  title: string;
  subtitle: string;
  date: string;
  detail: string;
  bullets: readonly string[];
};
export type ReadExtra = { kind: ExtraKind; title: string; items: readonly ReadExtraItem[] };
export type ReadResume = {
  basics: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    links: readonly { label: string; url: string }[];
  };
  summary: string;
  experience: readonly ReadJob[];
  education: readonly ReadSchool[];
  projects: readonly ReadProject[];
  skills: readonly ReadSkillGroup[];
  certifications: readonly ReadCertification[];
  extras: readonly ReadExtra[];
};

const SECTIONS = [
  "basics",
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "extras",
] as const;
type Section = (typeof SECTIONS)[number];

// A section passes when at least this share of its fields is right (precision) and found (recall).
const PASS_AT = 0.9;
const SIMILAR_AT = 0.9;
const CONTAINED_AT = 0.8;
const SHOWN = 3;
const SHOWN_CHARS = 60;

type Match = "exact" | "similar" | "contained";
type Fact = { key: string; value: string; shown: string; match: Match };
type Entry = { label: string; facts: Fact[] };

export type SectionScore = {
  section: Section;
  expected: number;
  actual: number;
  found: number;
  right: number;
  missing: string[];
  extra: string[];
};

const WORD = /[\p{L}\p{N}]+/gu;
const DROPPED_WORDS = new Set(["in", "of", "and", "the"]);
const GENERIC_SKILL_LABEL = /^(?:key |core |technical |other |professional )?skills?$/;

export function plain(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‐‑‒–—―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s.;,:]+$/, "");
}

const wordsOf = (text: string) => plain(text).match(WORD) ?? [];
const dateKey = (text: string) => plain(text).replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
const phoneKey = (text: string) => text.replace(/\D/g, "");
const urlKey = (text: string) =>
  plain(text)
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

export function dice(a: string, b: string): number {
  const left = wordsOf(a);
  const right = wordsOf(b);
  if (left.length + right.length === 0) return 1;
  const counts = new Map<string, number>();
  for (const word of left) counts.set(word, (counts.get(word) ?? 0) + 1);
  let common = 0;
  for (const word of right) {
    const count = counts.get(word) ?? 0;
    if (count > 0) {
      common += 1;
      counts.set(word, count - 1);
    }
  }
  return (2 * common) / (left.length + right.length);
}

function containedShare(text: string, pool: ReadonlySet<string>): number {
  const words = wordsOf(text);
  if (words.length === 0) return 1;
  return words.filter((word) => pool.has(word)).length / words.length;
}

function fact(key: string, value: string, match: Match = "exact", keyOf = plain): Fact[] {
  const normalized = match === "exact" ? keyOf(value) : plain(value);
  return normalized ? [{ key, value: normalized, shown: value.trim(), match }] : [];
}

// Degree and field are one fact, in any order, since "BSc Computer Science" splits more than one way.
const degreeKey = (degree: string, field: string) =>
  wordsOf(`${degree} ${field}`)
    .filter((word) => !DROPPED_WORDS.has(word))
    .sort()
    .join(" ");

// A lone date may be read as the start or the end, so it is compared without its side.
function dateFacts(start: string, end: string): Fact[] {
  if (start.trim() && end.trim()) {
    return [
      ...fact("startDate", start, "exact", dateKey),
      ...fact("endDate", end, "exact", dateKey),
    ];
  }
  return fact("date", start.trim() ? start : end, "exact", dateKey);
}

const bulletFacts = (bullets: readonly string[]) =>
  bullets.flatMap((bullet) => fact("bullet", bullet, "similar"));

function entriesOf(read: ReadResume, section: Section): Entry[] {
  switch (section) {
    case "basics": {
      const { basics } = read;
      return [
        {
          label: "basics",
          facts: [
            ...fact("name", basics.name),
            ...fact("headline", basics.headline),
            ...fact("email", basics.email),
            ...fact("phone", basics.phone, "exact", phoneKey),
            ...fact("location", basics.location),
            ...basics.links.flatMap((link) => fact("link", link.url, "exact", urlKey)),
          ],
        },
      ];
    }
    case "summary":
      return [{ label: "summary", facts: fact("summary", read.summary, "similar") }];
    case "experience":
      return read.experience.map((job) => ({
        label: job.company || job.title,
        facts: [
          ...fact("company", job.company),
          ...fact("title", job.title),
          ...fact("location", job.location),
          ...dateFacts(job.startDate, job.endDate),
          ...bulletFacts(job.bullets),
        ],
      }));
    case "education":
      return read.education.map((school) => ({
        label: school.school || school.degree,
        facts: [
          ...fact("school", school.school),
          ...fact("degree", degreeKey(school.degree, school.field)),
          ...fact("location", school.location),
          ...dateFacts(school.startDate, school.endDate),
          ...bulletFacts(school.bullets),
        ],
      }));
    case "projects":
      return read.projects.map((project) => ({
        label: project.name,
        facts: [
          ...fact("name", project.name),
          ...fact("link", project.link, "exact", urlKey),
          ...bulletFacts(project.bullets),
        ],
      }));
    case "skills":
      return [
        {
          label: "skills",
          facts: read.skills.flatMap((group) => [
            ...(GENERIC_SKILL_LABEL.test(plain(group.label)) ? [] : fact("label", group.label)),
            ...group.items.flatMap((item) => fact("item", item)),
          ]),
        },
      ];
    case "certifications":
      return read.certifications.map((cert) => ({
        label: cert.name,
        facts: [
          ...fact("name", cert.name),
          ...fact("issuer", cert.issuer),
          ...fact("date", cert.date, "exact", dateKey),
        ],
      }));
    case "extras":
      return read.extras.map((extra) => ({
        label: extra.title || extra.kind,
        facts: [
          ...fact("kind", extra.kind),
          ...fact("title", extra.title),
          ...extra.items.flatMap((item) =>
            fact(
              "item",
              [item.title, item.subtitle, item.date, item.detail, ...item.bullets].join(" "),
              "contained",
            ),
          ),
        ],
      }));
  }
}

type Compared = { found: number; right: number; missing: Fact[]; extra: Fact[] };

function sameFact(want: Fact, got: Fact): number {
  if (want.key !== got.key) return 0;
  if (want.match === "exact") return want.value === got.value ? 1 : 0;
  const similarity = dice(want.value, got.value);
  return similarity >= SIMILAR_AT ? similarity : 0;
}

function compareFacts(expected: readonly Fact[], actual: readonly Fact[]): Compared {
  const used = new Set<number>();
  const missing: Fact[] = [];
  let paired = 0;
  for (const want of expected.filter((item) => item.match !== "contained")) {
    let best = -1;
    let bestScore = 0;
    actual.forEach((got, index) => {
      const score = used.has(index) || got.match === "contained" ? 0 : sameFact(want, got);
      if (score > bestScore) {
        best = index;
        bestScore = score;
      }
    });
    if (best === -1) missing.push(want);
    else {
      used.add(best);
      paired += 1;
    }
  }
  const extra = actual.filter((got, index) => got.match !== "contained" && !used.has(index));

  // Items of an extra section can be split or joined differently, so each is checked against the other side's words.
  const poolOf = (facts: readonly Fact[]) =>
    new Set(
      facts.filter((item) => item.match === "contained").flatMap((item) => wordsOf(item.value)),
    );
  const wantPool = poolOf(expected);
  const gotPool = poolOf(actual);
  let found = paired;
  let right = paired;
  for (const want of expected.filter((item) => item.match === "contained")) {
    if (containedShare(want.value, gotPool) >= CONTAINED_AT) found += 1;
    else missing.push(want);
  }
  for (const got of actual.filter((item) => item.match === "contained")) {
    if (containedShare(got.value, wantPool) >= CONTAINED_AT) right += 1;
    else extra.push(got);
  }
  return { found, right, missing, extra };
}

function describe(section: Section, label: string, item: Fact): string {
  const where =
    section === "basics" || section === "summary" || section === "skills"
      ? section
      : `${section}[${label}]`;
  const text =
    item.shown.length > SHOWN_CHARS ? `${item.shown.slice(0, SHOWN_CHARS - 1)}…` : item.shown;
  return `${where}.${item.key} "${text}"`;
}

export function scoreSection(
  section: Section,
  expected: ReadResume,
  actual: ReadResume,
): SectionScore {
  const want = entriesOf(expected, section).filter((entry) => entry.facts.length > 0);
  const got = entriesOf(actual, section).filter((entry) => entry.facts.length > 0);
  const pairs = want.flatMap((left, i) =>
    got.map((right, j) => {
      const compared = compareFacts(left.facts, right.facts);
      return { i, j, compared, score: compared.found + compared.right };
    }),
  );
  pairs.sort((a, b) => b.score - a.score);
  const takenWant = new Set<number>();
  const takenGot = new Set<number>();
  const score: SectionScore = {
    section,
    expected: want.reduce((sum, entry) => sum + entry.facts.length, 0),
    actual: got.reduce((sum, entry) => sum + entry.facts.length, 0),
    found: 0,
    right: 0,
    missing: [],
    extra: [],
  };
  for (const pair of pairs) {
    if (pair.score === 0 || takenWant.has(pair.i) || takenGot.has(pair.j)) continue;
    takenWant.add(pair.i);
    takenGot.add(pair.j);
    score.found += pair.compared.found;
    score.right += pair.compared.right;
    score.missing.push(
      ...pair.compared.missing.map((item) => describe(section, want[pair.i]!.label, item)),
    );
    score.extra.push(
      ...pair.compared.extra.map((item) => describe(section, got[pair.j]!.label, item)),
    );
  }
  want.forEach((entry, i) => {
    if (!takenWant.has(i))
      score.missing.push(...entry.facts.map((item) => describe(section, entry.label, item)));
  });
  got.forEach((entry, j) => {
    if (!takenGot.has(j))
      score.extra.push(...entry.facts.map((item) => describe(section, entry.label, item)));
  });
  return score;
}

export function scoreRead(expected: ReadResume, actual: ReadResume): SectionScore[] {
  return SECTIONS.map((section) => scoreSection(section, expected, actual));
}

const share = (part: number, whole: number) => (whole === 0 ? 1 : part / whole);
const fixed = (value: number) => value.toFixed(2);

function listed(prefix: string, items: readonly string[]): string {
  if (items.length === 0) return "";
  const more = items.length > SHOWN ? ` (+${items.length - SHOWN} more)` : "";
  return `; ${prefix} ${items.slice(0, SHOWN).join(", ")}${more}`;
}

// One precision and one recall grade per section, each only when it has fields to count.
export function sectionGrades(score: SectionScore): Grade[] {
  const grades: Grade[] = [];
  if (score.actual > 0) {
    const precision = share(score.right, score.actual);
    grades.push({
      name: `${score.section}-precision`,
      pass: precision >= PASS_AT,
      detail: `${fixed(precision)}: ${score.right}/${score.actual} read fields match${listed("wrong or extra:", score.extra)}`,
    });
  }
  if (score.expected > 0) {
    const recall = share(score.found, score.expected);
    grades.push({
      name: `${score.section}-recall`,
      pass: recall >= PASS_AT,
      detail: `${fixed(recall)}: ${score.found}/${score.expected} expected fields read${listed("missing:", score.missing)}`,
    });
  }
  return grades;
}

export function overallGrade(scores: readonly SectionScore[]): Grade {
  const sum = (pick: (score: SectionScore) => number) =>
    scores.reduce((total, score) => total + pick(score), 0);
  const expected = sum((score) => score.expected);
  const actual = sum((score) => score.actual);
  const precision =
    actual === 0 && expected > 0
      ? 0
      : share(
          sum((score) => score.right),
          actual,
        );
  const recall = share(
    sum((score) => score.found),
    expected,
  );
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  return {
    name: "fields",
    pass: f1 >= PASS_AT,
    detail: `F1 ${fixed(f1)} (precision ${fixed(precision)}, recall ${fixed(recall)}) over ${expected} expected and ${actual} read fields`,
  };
}

export function readOf(resume: Resume): ReadResume {
  const lines = (bullets: readonly { text: string }[]) => bullets.map((bullet) => bullet.text);
  return {
    basics: {
      name: resume.basics.name,
      headline: resume.basics.headline,
      email: resume.basics.email,
      phone: resume.basics.phone,
      location: resume.basics.location,
      links: resume.basics.links.map(({ label, url }) => ({ label, url })),
    },
    summary: resume.summary,
    experience: resume.experience.map((job) => ({
      company: job.company,
      title: job.title,
      location: job.location,
      startDate: job.startDate,
      endDate: job.endDate,
      bullets: lines(job.bullets),
    })),
    education: resume.education.map((school) => ({
      school: school.school,
      degree: school.degree,
      field: school.field,
      location: school.location,
      startDate: school.startDate,
      endDate: school.endDate,
      bullets: lines(school.bullets),
    })),
    projects: resume.projects.map((project) => ({
      name: project.name,
      link: project.link,
      bullets: lines(project.bullets),
    })),
    skills: resume.skills.map((group) => ({ label: group.label, items: [...group.items] })),
    certifications: resume.certifications.map(({ name, issuer, date }) => ({ name, issuer, date })),
    extras: (resume.extras ?? []).map((extra) => ({
      kind: extra.kind,
      title: extra.title,
      items: extra.items.map((item) => ({
        title: item.title,
        subtitle: item.subtitle,
        date: item.date,
        detail: item.detail,
        bullets: lines(item.bullets),
      })),
    })),
  };
}

// The text the reader copied into the resume; link labels and section titles can be the app's own words.
export function copiedTexts(read: ReadResume): string[] {
  return [
    read.basics.name,
    read.basics.headline,
    read.basics.email,
    read.basics.phone,
    read.basics.location,
    ...read.basics.links.map((link) => link.url),
    read.summary,
    ...read.experience.flatMap((job) => [
      job.company,
      job.title,
      job.location,
      job.startDate,
      job.endDate,
      ...job.bullets,
    ]),
    ...read.education.flatMap((school) => [
      school.school,
      school.degree,
      school.field,
      school.location,
      school.startDate,
      school.endDate,
      ...school.bullets,
    ]),
    ...read.projects.flatMap((project) => [project.name, project.link, ...project.bullets]),
    ...read.skills.flatMap((group) => [group.label, ...group.items]),
    ...read.certifications.flatMap((cert) => [cert.name, cert.issuer, cert.date]),
    ...read.extras.flatMap((extra) =>
      extra.items.flatMap((item) => [
        item.title,
        item.subtitle,
        item.date,
        item.detail,
        ...item.bullets,
      ]),
    ),
  ].filter((text) => text.trim() !== "");
}

export function leftOutGrade(read: ReadResume, leftOut: readonly string[]): Grade {
  const texts = [...copiedTexts(read), ...read.extras.map((extra) => extra.title)].map(plain);
  const kept = leftOut.filter((phrase) => texts.some((text) => text.includes(plain(phrase))));
  return {
    name: "left-out",
    pass: kept.length === 0,
    detail:
      kept.length === 0
        ? `none of ${leftOut.length} lines to leave out was kept`
        : `kept ${kept.map((phrase) => `"${phrase}"`).join(", ")}`,
  };
}

export function resumeOf(read: ReadResume, now: number): Resume {
  let count = 0;
  const id = () => `golden-${++count}`;
  const bullets = (texts: readonly string[]) => texts.map((text) => ({ id: id(), text }));
  return {
    id: id(),
    version: 1,
    title: "Imported resume",
    basics: { ...read.basics, links: read.basics.links.map((link) => ({ id: id(), ...link })) },
    summary: read.summary,
    experience: read.experience.map((job) => ({ id: id(), ...job, bullets: bullets(job.bullets) })),
    education: read.education.map((school) => ({
      id: id(),
      ...school,
      bullets: bullets(school.bullets),
    })),
    projects: read.projects.map((project) => ({
      id: id(),
      ...project,
      bullets: bullets(project.bullets),
    })),
    skills: read.skills.map((group) => ({ id: id(), label: group.label, items: [...group.items] })),
    certifications: read.certifications.map((cert) => ({ id: id(), ...cert })),
    extras: read.extras.map((extra) => ({
      id: id(),
      kind: extra.kind,
      title: extra.title,
      items: extra.items.map((item) => ({ id: id(), ...item, bullets: bullets(item.bullets) })),
    })),
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    source: "import",
    tailor: null,
    createdAt: now,
    updatedAt: now,
  };
}
