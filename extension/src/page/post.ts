import { EXTENSION_LIMITS } from "@/lib/extension/types";
import { canonicalJobUrl, jobSiteOf, type JobSite } from "@/lib/extension/urls";
import { findJsonLdJob } from "@/lib/jobs/jsonld";
import { all, blockText, oneLine, type Page, type PageNode } from "./dom";
import { SITE_READERS } from "./sites";

export type PostSource = "jsonld" | "page" | "readable" | "selection";

export type JobPost = {
  site: JobSite;
  url: string;
  title: string;
  company: string;
  location: string;
  text: string;
  source: PostSource;
};

export type PostFields = Partial<Pick<JobPost, "title" | "company" | "location" | "text">>;

export type SiteReader = {
  isJobPage: (url: URL) => boolean;
  read: (page: Page) => PostFields;
  // Single-page sites keep an old job's JSON-LD after moving on, so what the page shows wins there.
  pageFirst?: boolean;
};

export function readJsonLd(root: PageNode): PostFields | null {
  const blocks = all(root, 'script[type="application/ld+json"]').map(
    (node) => node.textContent ?? "",
  );
  const job = blocks.length > 0 ? findJsonLdJob(blocks) : null;
  if (!job) return null;
  return {
    title: job.title ?? "",
    company: job.company ?? "",
    location: job.location ?? "",
    text: job.text,
  };
}

const SKIP = new Set([
  "NAV",
  "HEADER",
  "FOOTER",
  "ASIDE",
  "FORM",
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "SVG",
]);
const BLOCKS = new Set(["P", "LI", "UL", "OL", "H2", "H3", "H4", "BLOCKQUOTE", "TABLE", "PRE"]);

// The element whose own paragraphs and lists hold the most text: usually the post itself.
export function largestBlock(root: PageNode): PageNode | null {
  let best: PageNode | null = null;
  let bestScore = 0;
  const visit = (node: PageNode, depth: number) => {
    if (depth > 40 || SKIP.has(node.tagName)) return;
    let score = 0;
    for (const child of Array.from(node.children)) {
      if (BLOCKS.has(child.tagName)) score += oneLine(child.textContent).length;
    }
    if (score > bestScore) {
      best = node;
      bestScore = score;
    }
    for (const child of Array.from(node.children)) visit(child, depth + 1);
  };
  visit(root, 0);
  return bestScore >= 200 ? best : null;
}

export function readReadable(root: PageNode): PostFields {
  const block = largestBlock(root);
  return {
    title: oneLine(root.querySelector("h1")?.textContent),
    text: block ? blockText(block) : "",
  };
}

const sameTitle = (a: string, b: string) =>
  a.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "") ===
  b.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

function pick(...values: (string | undefined)[]): string {
  return values.find((value) => value && value.trim())?.trim() ?? "";
}

function finish(
  site: JobSite,
  url: string,
  fields: PostFields,
  source: PostSource,
): JobPost | null {
  const text = (fields.text ?? "").trim().slice(0, EXTENSION_LIMITS.postChars);
  const title = oneLine(fields.title).slice(0, EXTENSION_LIMITS.titleChars);
  if (text.length < EXTENSION_LIMITS.minPostChars || !title) return null;
  return {
    site,
    url: canonicalJobUrl(url) ?? url,
    title,
    // Workday names the legal entity: "2100 NVIDIA USA".
    company: oneLine(fields.company)
      .replace(/^\d{2,}\s+(?=\p{L})/u, "")
      .slice(0, EXTENSION_LIMITS.companyChars),
    location: oneLine(fields.location).slice(0, EXTENSION_LIMITS.locationChars),
    text,
    source,
  };
}

// JSON-LD first, then the site's own selectors, then the page's largest block of text.
export function readPost(page: Page): JobPost | null {
  const url = new URL(page.url);
  const site = jobSiteOf(page.url);
  const reader = site === "other" ? null : SITE_READERS[site];
  if (reader && !reader.isJobPage(url)) return null;
  const ld = readJsonLd(page.root);
  const own = reader ? reader.read(page) : {};
  const stale = Boolean(ld?.title && own.title && !sameTitle(ld.title, own.title));
  const declared = stale ? null : ld;
  const [first, second] = reader?.pageFirst || !declared ? [own, declared ?? {}] : [declared, own];
  const merged: PostFields = {
    title: pick(first.title, second.title),
    company: pick(first.company, second.company),
    location: pick(first.location, second.location),
    text: pick(
      (first.text?.length ?? 0) >= EXTENSION_LIMITS.minPostChars ? first.text : undefined,
      second.text,
    ),
  };
  const source: PostSource =
    declared !== null && first === declared && declared.text ? "jsonld" : "page";
  const found = finish(site, page.url, merged, source);
  if (found || !reader) return found;
  const readable = readReadable(page.root);
  return finish(
    site,
    page.url,
    { ...merged, title: merged.title || readable.title, text: readable.text },
    "readable",
  );
}

// Any other page: only a JobPosting the page declares itself, or the text the person selects.
export function readDeclaredPost(page: Page): JobPost | null {
  const ld = readJsonLd(page.root);
  return ld ? finish(jobSiteOf(page.url), page.url, ld, "jsonld") : null;
}

export function postFromSelection(page: Page, selected: string): JobPost | null {
  const text = selected.trim();
  if (text.length < EXTENSION_LIMITS.minPostChars) return null;
  const firstLine = oneLine(text.split(/\n/).find((line) => line.trim()) ?? "");
  const title =
    oneLine(page.root.querySelector("h1")?.textContent) || firstLine.slice(0, 120) || page.title;
  return finish(jobSiteOf(page.url), page.url, { title, text }, "selection");
}
