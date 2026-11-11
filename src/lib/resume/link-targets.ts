import type { PdfLinkTarget } from "@/lib/parse/types";
import type { Resume } from "./schema";

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

function written(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/+$/, "");
}

const norm = (value: string) => written(value.trim()).toLowerCase();

function tokens(text: string): string[] {
  return text
    .split(/[\s|·•,]+/)
    .map((token) => norm(token.replace(/^[^\w]+|[^\w/]+$/g, "")))
    .filter(Boolean);
}

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

export function withLinkTargets(resume: Resume, links: readonly PdfLinkTarget[]): Resume {
  if (links.length === 0) return resume;
  const basicsLinks = resume.basics.links.map((link) => {
    const url = linkTarget(link.url.trim() || link.label, links);
    return url ? { ...link, url } : link;
  });
  const projects = resume.projects.map((project) => {
    const link = project.link.trim() ? linkTarget(project.link, links) : null;
    return link ? { ...project, link } : project;
  });
  return { ...resume, basics: { ...resume.basics, links: basicsLinks }, projects };
}
