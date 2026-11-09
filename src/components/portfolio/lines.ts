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
  // Over the eight designs on Free: drawn from their own resume, or from Jordan's without one.
  previews: "Every design below is your own resume. Projects, photos and links make them shine.",
  previewsSample: "These show a sample page. Add a resume and I'll draw each design with yours.",
} as const;

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
