import type { PdfLinkTarget } from "@/lib/parse/types";
import type { Resume } from "./schema";

// Client-safe and pure. A PDF often shows a cut-off link ("github.com/jane" for github.com/jane-doe,
// or just "GitHub") while the clickable target holds the full address. The reader keeps the text,
// so a read resume ended up with an address that leads nowhere. This swaps in the target only when
// the written link is drawn under that very link and both are on the same site. A short link the
// person chose on purpose (bit.ly/...) is another site, so it stays as written.

// A link written only as its site's name ("GitHub"), and the site that name means.
const SITE_NAMES: Record<string, string> = {
  github: "github.com",
  linkedin: "linkedin.com",
  gitlab: "gitlab.com",
  behance: "behance.net",
  dribbble: "dribbble.com",
};

function hostOf(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host.includes(".") ? host : null;
  } catch {
    return null;
  }
}

/** "https://www.linkedin.com/in/jane-doe/" -> "linkedin.com/in/jane-doe", as people write links. */
function written(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

const norm = (value: string) => written(value.trim()).toLowerCase();

// The words under a link, split where a resume separates items ("github.com/jane | linkedin...").
function tokens(text: string): string[] {
  return text
    .split(/[\s|·•,]+/)
    .map((token) => norm(token.replace(/^[^\w]+|[^\w/]+$/g, "")))
    .filter(Boolean);
}

/** The full address behind a written link, or null to keep it as written. */
export function linkTarget(shown: string, links: readonly PdfLinkTarget[]): string | null {
  const key = norm(shown);
  if (!key) return null;
  const host = hostOf(shown) ?? SITE_NAMES[key] ?? null;
  if (!host) return null;
  for (const link of links) {
    if (hostOf(link.url) !== host || !tokens(link.text).includes(key)) continue;
    const full = written(link.url);
    return full.toLowerCase() === key ? null : full;
  }
  return null;
}

/** The resume with its links swapped for the full addresses drawn under them, where that's certain. */
export function withLinkTargets(resume: Resume, links: readonly PdfLinkTarget[]): Resume {
  if (links.length === 0) return resume;
  const basicsLinks = resume.basics.links.map((link) => {
    // A link with no address may still be named on the page: "GitHub" under github.com/jane.
    const url = linkTarget(link.url.trim() || link.label, links);
    return url ? { ...link, url } : link;
  });
  const projects = resume.projects.map((project) => {
    const link = project.link.trim() ? linkTarget(project.link, links) : null;
    return link ? { ...project, link } : project;
  });
  return { ...resume, basics: { ...resume.basics, links: basicsLinks }, projects };
}
