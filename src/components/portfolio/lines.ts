import { pluralize } from "@/lib/utils";

const count = new Intl.NumberFormat("en-US");

export const PORTFOLIO_ABOUT =
  "A portfolio site made from your resume, hosted for you at your own link.";

export const PORTFOLIO_LINES = {
  pick: "Pick a design and I'll fill it in from your resume. Open one to see it with yours.",
  pickThin: "These show a sample with every part filled in. Pick one and I'll fill it from yours.",
  draft: "I filled this in from your resume. Nothing goes live until you publish.",
  live: (views: number) =>
    views > 0
      ? `Your page is live, with ${count.format(views)} ${views === 1 ? "view" : "views"} so far.`
      : "Your page is live. Send the link to someone and the views add up here.",
  behind: "Your resume changed since this copy. Update the page when you're ready.",
  noResume: "The resume behind this page isn't in this browser. The page keeps its own copy.",
  noResumes: "Add a resume first, then I can turn it into a page.",
  previews:
    "Every design below is your own resume. Open one full page to see it as visitors would.",
  previewsSample: "These show a sample page. Add a resume and I'll draw each design with yours.",
  previewsThin: "These show a sample page with every part filled in. Switch to yours any time.",
} as const;

export function resumeLinkLine(link: { href: string | null; shared: boolean }): string {
  if (link.href) return "Your page links to your shared resume, so visitors can read it in full.";
  if (link.shared)
    return "Your shared resume shows contact details this page hides, so the page leaves the link out.";
  return "Share this resume and your page links to it, so visitors can read it in full.";
}

export function viewsLabel(views: number): string {
  if (views <= 0) return "No views yet";
  return `${count.format(views)} ${views === 1 ? "view" : "views"}`;
}

export function saveLabel(saving: boolean, live: boolean): string {
  if (saving) return "Saving…";
  return live ? "Saved to your live page" : "All changes saved";
}

export const PUBLISH_NOTE =
  "Publishing comes with Pro, and we host the page for you. Until then only you can see it.";

export function portfolioFacts(counts: { projects: number; jobs: number; skills: number }): string {
  return [
    counts.projects > 0 ? pluralize(counts.projects, "project") : "",
    counts.jobs > 0 ? pluralize(counts.jobs, "job") : "",
    counts.skills > 0 ? pluralize(counts.skills, "skill") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
