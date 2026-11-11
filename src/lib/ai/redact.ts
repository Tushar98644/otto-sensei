import type { Resume } from "@/lib/resume/schema";

export type PlaceholderKind = "NAME" | "EMAIL" | "PHONE" | "LINK";

export type KnownDetails = {
  name?: string;
  emails?: readonly string[];
  phones?: readonly string[];
  links?: readonly string[];
};

export type RestoreOptions = {
  dropUnknown?: boolean;
};

export type Redactor = {
  redact: (text: string) => string;
  redactField: (kind: PlaceholderKind, value: string) => string;
  restore: (text: string, options?: RestoreOptions) => string;
  restoreDeep: <T>(value: T, options?: RestoreOptions) => T;
  hidden: (kind: PlaceholderKind) => string[];
};

const NAME_TOKEN = "[NAME]";
const TOKEN = /\[\s*(NAME|EMAIL|PHONE|LINK)(?:[\s_-]*(\d{1,3}))?\s*\]/gi;

// Bounded quantifiers (RFC 5321 lengths) so a 40k-character token can't backtrack for long.
const EMAIL = /[A-Z0-9._%+-]{1,64}@[A-Z0-9-]{1,63}(?:\.[A-Z0-9-]{1,63}){0,8}\.[A-Z]{2,24}(?![A-Z0-9-])/gi;

const URL_CHARS = String.raw`[^\s|,;<>"'()[\]{}]`;
const SCHEME_URL = new RegExp(String.raw`(?:https?:\/\/|www\.)${URL_CHARS}{1,500}`, "giu");
const TLDS =
  "com|org|net|edu|gov|io|dev|me|co|ai|app|xyz|site|page|tech|info|blog|design|studio|codes|" +
  "cloud|online|website|space|pro|biz|us|uk|ca|au|de|fr|nl|es|it|in|eu|ch|se|no|dk|fi|ie|nz|sg|" +
  "jp|br|mx|ly|gg|sh|to|tv|fm|cc|so|im|ws";
const LABEL = String.raw`[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?`;
const HOST = String.raw`(?<![\p{L}\p{N}.@/_-])(?:${LABEL}\.){1,5}(?:${TLDS})`;
const BARE_URL = new RegExp(String.raw`${HOST}\/${URL_CHARS}{0,500}`, "giu");
const BARE_HOST = new RegExp(String.raw`${HOST}(?![\p{L}\p{N}/@-])`, "giu");
const NOT_HOSTS = new Set(["asp.net", "vb.net", "ado.net", "socket.io"]);
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

const PHONE_CANDIDATE = /(?<![\p{L}\p{N}+_])\+?\(?\d[\d ().-]{5,22}\d(?![\p{L}\p{N}])/gu;
const PHONE_LABEL = /(?:phone|tel|telephone|mobile|mob|cell|whatsapp|call)\.?\s*[:#-]?\s*$/i;
const YEAR = /^(?:19|20)\d{2}$/;
const GROUPED_AMOUNT = /^\d{1,3}(?:[ .]\d{3})+$/;

const PERSON_NAME_WORD = /^[\p{Lu}][\p{L}'’.-]*$/u;
const NOT_NAME_WORDS = new Set(
  (
    "resume résumé curriculum vitae cv profile summary contact experience education skills " +
    "engineer developer designer manager analyst consultant scientist specialist director " +
    "officer assistant associate architect administrator coordinator executive intern senior " +
    "junior lead head principal staff software data product sales marketing marketer " +
    "frontend backend full-stack fullstack devops technician nurse teacher accountant writer"
  ).split(" "),
);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function digitCount(text: string): number {
  return text.replace(/\D/g, "").length;
}

function isPhone(candidate: string, before: string): boolean {
  const digits = digitCount(candidate);
  if (digits < 7 || digits > 15 || /\s{2,}/.test(candidate)) return false;
  const bare = candidate.replace(/[()]/g, " ").trim();
  const parts = bare.split(/[\s./-]+/).filter(Boolean);
  const isDates =
    parts.some((part) => YEAR.test(part)) &&
    parts.every((part) => YEAR.test(part) || part.length <= 2);
  if (isDates) return false;
  if (GROUPED_AMOUNT.test(bare)) return false;
  return (
    candidate.startsWith("+") ||
    /^\(\d{1,4}\)/.test(candidate) ||
    digits >= 10 ||
    PHONE_LABEL.test(before)
  );
}

function namePattern(name: string): RegExp | null {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const body = parts.map(escapeRegExp).join(String.raw`\s+`);
  return new RegExp(String.raw`(?<![\p{L}\p{N}])${body}(?![\p{L}\p{N}])`, "giu");
}

function nameParts(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((part) => part.length >= 3);
}

export function looksLikePersonName(value: string): boolean {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  return words.every(
    (word) =>
      PERSON_NAME_WORD.test(word) && !NOT_NAME_WORDS.has(word.toLowerCase().replace(/[.,]$/, "")),
  );
}

function validFor(kind: PlaceholderKind, value: string): boolean {
  switch (kind) {
    case "NAME":
      return /\p{L}/u.test(value) && value.length <= 200;
    case "EMAIL":
      return value.includes("@") && !/\s/.test(value);
    case "PHONE":
      return digitCount(value) >= 7;
    case "LINK":
      return value.length >= 4 && /[./]/.test(value) && !/\s/.test(value);
  }
}

function mapStrings(value: unknown, change: (text: string) => string): unknown {
  if (typeof value === "string") return change(value);
  if (Array.isArray(value)) return value.map((item: unknown) => mapStrings(item, change));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, mapStrings(item, change)]),
    );
  }
  return value;
}

export function createRedactor(known: KnownDetails = {}): Redactor {
  const tokenByValue = new Map<string, string>();
  const valueByToken = new Map<string, string>();
  const counts = { EMAIL: 0, PHONE: 0, LINK: 0 };
  const sent: string[] = [];

  function tokenFor(kind: PlaceholderKind, value: string): string {
    const key = `${kind}\u0000${value}`;
    const existing = tokenByValue.get(key);
    if (existing) return existing;
    let token = NAME_TOKEN;
    if (kind !== "NAME") {
      counts[kind] += 1;
      token = `[${kind}_${counts[kind]}]`;
    }
    tokenByValue.set(key, token);
    valueByToken.set(token, value);
    return token;
  }

  function emit(token: string): string {
    if (!sent.includes(token)) sent.push(token);
    return token;
  }

  const name = known.name?.trim() ?? "";
  const hasName = name !== "" && validFor("NAME", name);
  if (hasName) tokenFor("NAME", name);
  const byName = hasName ? namePattern(name) : null;
  const parts = hasName ? nameParts(name) : [];

  const literals = (
    [
      ...(known.emails ?? []).map((value) => ["EMAIL", value] as const),
      ...(known.phones ?? []).map((value) => ["PHONE", value] as const),
      ...(known.links ?? []).map((value) => ["LINK", value] as const),
    ] satisfies (readonly [PlaceholderKind, string])[]
  )
    .map(([kind, value]) => [kind, value.trim()] as const)
    .filter(([kind, value]) => validFor(kind, value))
    .sort((a, b) => b[1].length - a[1].length)
    .map(([kind, value]) => ({
      token: tokenFor(kind, value),
      pattern: new RegExp(escapeRegExp(value), kind === "EMAIL" ? "gi" : "g"),
    }));

  function link(match: string): string {
    const trailing = TRAILING_PUNCTUATION.exec(match)?.[0] ?? "";
    const url = match.slice(0, match.length - trailing.length);
    return `${emit(tokenFor("LINK", url))}${trailing}`;
  }

  function bareLink(match: string): string {
    const host = match.split("/")[0] ?? match;
    if (NOT_HOSTS.has(host.toLowerCase()) || host === host.toUpperCase()) return match;
    return link(match);
  }

  function redact(text: string): string {
    let out = text;
    for (const literal of literals) out = out.replace(literal.pattern, () => emit(literal.token));
    out = out.replace(EMAIL, (match) => emit(tokenFor("EMAIL", match)));
    out = out.replace(SCHEME_URL, link);
    out = out.replace(BARE_URL, bareLink);
    if (parts.length > 0) {
      out = out.replace(BARE_HOST, (match) => {
        const labels = match.toLowerCase().split(".").slice(0, -1).join(".");
        return parts.some((part) => labels.includes(part)) ? bareLink(match) : match;
      });
    }
    out = out.replace(PHONE_CANDIDATE, (match: string, offset: number, whole: string) =>
      isPhone(match, whole.slice(Math.max(0, offset - 16), offset))
        ? emit(tokenFor("PHONE", match))
        : match,
    );
    if (byName) out = out.replace(byName, () => emit(NAME_TOKEN));
    return out;
  }

  function redactField(kind: PlaceholderKind, value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (!validFor(kind, trimmed)) return redact(value);
    return emit(tokenFor(kind, trimmed));
  }

  function restore(text: string, options: RestoreOptions = {}): string {
    return text.replace(TOKEN, (match: string, kind: string, number: string | undefined) => {
      const upper = kind.toUpperCase();
      const token = upper === "NAME" ? NAME_TOKEN : `[${upper}_${number ?? "1"}]`;
      return valueByToken.get(token) ?? (options.dropUnknown ? "" : match);
    });
  }

  return {
    redact,
    redactField,
    restore,
    restoreDeep: <T>(value: T, options: RestoreOptions = {}): T =>
      mapStrings(value, (text) => restore(text, options)) as T,
    hidden: (kind) =>
      sent
        .filter((token) => (kind === "NAME" ? token === NAME_TOKEN : token.startsWith(`[${kind}_`)))
        .map((token) => valueByToken.get(token) ?? ""),
  };
}

export function redactorFor(resume: Resume): Redactor {
  const { basics } = resume;
  return createRedactor({
    name: basics.name,
    emails: [basics.email],
    phones: [basics.phone],
    links: [...basics.links.map((link) => link.url), ...resume.projects.map((project) => project.link)],
  });
}

export function redactResume(resume: Resume, redactor: Redactor): Resume {
  const text = redactor.redact;
  const { basics } = resume;
  return {
    ...resume,
    title: text(resume.title),
    basics: {
      name: redactor.redactField("NAME", basics.name),
      headline: text(basics.headline),
      email: redactor.redactField("EMAIL", basics.email),
      phone: redactor.redactField("PHONE", basics.phone),
      location: text(basics.location),
      links: basics.links.map((entry) => ({
        ...entry,
        label: text(entry.label),
        url: redactor.redactField("LINK", entry.url),
      })),
    },
    summary: text(resume.summary),
    experience: resume.experience.map((job) => ({
      ...job,
      company: text(job.company),
      title: text(job.title),
      location: text(job.location),
      bullets: job.bullets.map((bullet) => ({ ...bullet, text: text(bullet.text) })),
    })),
    education: resume.education.map((school) => ({
      ...school,
      school: text(school.school),
      degree: text(school.degree),
      field: text(school.field),
      location: text(school.location),
      bullets: school.bullets.map((bullet) => ({ ...bullet, text: text(bullet.text) })),
    })),
    projects: resume.projects.map((project) => ({
      ...project,
      name: text(project.name),
      link: redactor.redactField("LINK", project.link),
      bullets: project.bullets.map((bullet) => ({ ...bullet, text: text(bullet.text) })),
    })),
    skills: resume.skills.map((group) => ({
      ...group,
      label: text(group.label),
      items: group.items.map(text),
    })),
    certifications: resume.certifications.map((cert) => ({
      ...cert,
      name: text(cert.name),
      issuer: text(cert.issuer),
    })),
    extras: resume.extras?.map((section) => ({
      ...section,
      title: text(section.title),
      items: section.items.map((item) => ({
        ...item,
        title: text(item.title),
        subtitle: text(item.subtitle),
        detail: text(item.detail),
        bullets: item.bullets.map((bullet) => ({ ...bullet, text: text(bullet.text) })),
      })),
    })),
  };
}
