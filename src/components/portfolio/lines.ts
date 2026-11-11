import { pluralize } from "@/lib/utils";

// What Otto says on the Portfolio screen. Kept here rather than in mascot/lines.ts while another
// feature edits that file; same voice rules (first person, at most 18 words), checked by
// lines.test.ts next to this file.

const count = new Intl.NumberFormat("en-US");

export const PORTFOLIO_LINES = {
  start: "Pick a resume and I'll turn it into a web page you can send anyone.",
  draft: "I filled this in from your resume. Nothing goes live until you publish.",
  live: (views: number) =>
    views > 0
      ? `Your page is live, with ${count.format(views)} ${views === 1 ? "view" : "views"} so far.`
      : "Your page is live. Send the link to someone and the views add up here.",
  behind: "Your resume changed since this copy. Update the page when you're ready.",
  noResume: "The resume behind this page isn't in this browser. The page keeps its own copy.",
  noResumes: "Add a resume first, then I can turn it into a page.",
  // Over the eight designs on Free: drawn from their own resume, or from Jordan's sample page.
  previews:
    "Every design below is your own resume. Open one full page to see it as visitors would.",
  previewsSample: "These show a sample page. Add a resume and I'll draw each design with yours.",
  // They have a resume, but the sample is on (it starts there when theirs is thin).
  previewsThin: "These show a sample page with every part filled in. Switch to yours any time.",
} as const;

/** "No views yet", "1 view", "1,284 views": the top bar's count for a live page. */
export function viewsLabel(views: number): string {
  if (views <= 0) return "No views yet";
  return `${count.format(views)} ${views === 1 ? "view" : "views"}`;
}

/** What the owner's last change is doing, beside the page's status. Every change saves at once. */
export function saveLabel(saving: boolean, live: boolean): string {
  if (saving) return "Saving…";
  return live ? "Saved to your live page" : "All changes saved";
}

/** Why Publish is off: a Free account keeps its page saved but offline. */
export const PUBLISH_NOTE =
  "Publishing comes with Pro, and we host the page for you. Until then only you can see it.";

/** The facts line for Otto's note: "3 projects · 2 jobs". */
export function portfolioFacts(counts: { projects: number; jobs: number; skills: number }): string {
  return [
    counts.projects > 0 ? pluralize(counts.projects, "project") : "",
    counts.jobs > 0 ? pluralize(counts.jobs, "job") : "",
    counts.skills > 0 ? pluralize(counts.skills, "skill") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
