import { attribute, firstBlock, firstText } from "../dom";
import type { SiteReader } from "../post";

const TITLE = [".job__title h1", "h1.section-header", ".app-title", "#header h1", "h1"];
const LOCATION = [".job__location", "#header .location", ".location"];
const TEXT = [".job__description", "#content", ".job-post-content"];

// "Job Application for Product Designer at Acme" names the company the page doesn't print.
function companyFromTitle(title: string): string {
  return /\sat\s(.+)$/.exec(title)?.[1]?.trim() ?? "";
}

export const greenhouse: SiteReader = {
  isJobPage: (url) =>
    /^\/[^/]+\/jobs\/\d+/.test(url.pathname) || url.pathname.startsWith("/embed/job_app"),
  read: ({ root, title }) => ({
    title: firstText(root, TITLE),
    company:
      firstText(root, [".company-name"]) ||
      companyFromTitle(title) ||
      attribute(root, ".logo img, .image-container img", "alt").replace(/\s+logo$/i, ""),
    location: firstText(root, LOCATION),
    text: firstBlock(root, TEXT),
  }),
};
