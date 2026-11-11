import { newId, type Project } from "../schema";
import { bulletText, findLinks, isLinkText } from "../sections";
import { LIMITS } from "./limits";
import { clip, continues, finishBullets, isTitleLike, segmentsOf, stripDates } from "./text";

// "demo/github", "github/Apex", "Details": where a PDF had a link, read as text.
const LINK_WORDS =
  /^(?:demo|live|code|source|github|gitlab|website|site|link|links|details|repo|app|video|slides)(?:\s*\/\s*[\w.-]+)?$/i;
const isLinkWord = (segment: string) => LINK_WORDS.test(segment) || isLinkText(segment);

type ProjectDraft = { name: string; link: string; bullets: string[]; dated: boolean; body: number };

export function parseProjects(lines: readonly string[]): Project[] {
  const drafts: ProjectDraft[] = [];
  const open = (): ProjectDraft => {
    const draft: ProjectDraft = { name: "", link: "", bullets: [], dated: false, body: 0 };
    drafts.push(draft);
    return draft;
  };
  let current: ProjectDraft | undefined;
  for (const line of lines) {
    const bullet = bulletText(line);
    const last = current?.bullets.at(-1);
    const link = findLinks(line)[0]?.url ?? "";
    const withoutLink = link ? line.split(link).join("\t").trim() : line;
    const undated = stripDates(withoutLink);
    // "Typeface Finder - A tool that names any font." names the project and describes it at once.
    const named = /^([^:—–]{2,60}?)(?:\s+[—–-]\s+|:\s+)(.+)$/.exec(undated);
    const namePart = named?.[1] ?? withoutLink;
    const dated = undated !== withoutLink.trim();
    // "Name – tagline" opens the next project even when the last one has no bullets yet.
    const dashed = /^[^:—–]{2,60}?\s+[—–-]\s/.test(undated);
    const startsProject =
      isTitleLike(namePart) && (!current || current.body > 0 || !current.name || dashed);
    // The line under a project's name, before its bullets: "Go | Postgres | AWS<tab>demo/github".
    const segments = segmentsOf(undated);
    const details =
      current !== undefined &&
      current.name !== "" &&
      current.body === 0 &&
      !named &&
      !(dated && current.dated) &&
      isTitleLike(line) &&
      segments.length >= 2 &&
      segments.every((segment) => segment.split(/\s+/).length <= 5);
    if (bullet !== null) {
      current ??= open();
      current.bullets.push(bullet);
      current.body += 1;
    } else if (link && current && !segmentsOf(withoutLink).length) {
      current.link ||= link;
    } else if (current && segments.length > 0 && segments.every(isLinkWord)) {
      current.link ||= link;
    } else if (details && current) {
      const words = segments.filter((segment) => !isLinkWord(segment));
      if (words.length) current.bullets.push(words.join(" · "));
      current.link ||= link;
      current.dated ||= dated;
    } else if (current && last !== undefined && continues(last, line)) {
      current.bullets[current.bullets.length - 1] = `${last} ${line}`;
    } else if (startsProject) {
      // Reuse an empty draft so a stray line can't leave a nameless project behind.
      if (!current || current.name || current.bullets.length > 0) current = open();
      current.name = segmentsOf(namePart).join(" · ");
      current.link ||= link;
      current.dated = dated;
      if (named?.[2]) current.bullets.push(named[2].trim());
    } else {
      current ??= open();
      current.bullets.push(line);
      current.body += 1;
      current.link ||= findLinks(line)[0]?.url ?? "";
    }
  }
  return drafts
    .filter((draft) => draft.name || draft.bullets.length > 0)
    .map((draft) => ({
      id: newId(),
      name: clip(draft.name, LIMITS.text),
      link: clip(draft.link, LIMITS.url),
      bullets: finishBullets(draft.bullets, LIMITS.projectBullets),
    }));
}
