import { all, firstBlock, firstScope, firstText, oneLine } from "../dom";
import type { SiteReader } from "../post";

// Signed-in LinkedIn can't be saved as a fixture, so each field tries the current names, then older ones.
const PANE = [
  ".jobs-search__job-details--container",
  ".jobs-search__job-details",
  ".job-view-layout",
  ".jobs-details",
  "main",
];
const TITLE = [
  ".job-details-jobs-unified-top-card__job-title h1",
  ".job-details-jobs-unified-top-card__job-title",
  ".jobs-unified-top-card__job-title",
  ".top-card-layout__title",
  ".topcard__title",
  "h1",
];
const COMPANY = [
  ".job-details-jobs-unified-top-card__company-name a",
  ".job-details-jobs-unified-top-card__company-name",
  ".jobs-unified-top-card__company-name a",
  ".jobs-unified-top-card__company-name",
  ".topcard__org-name-link",
  "a[data-tracking-control-name='public_jobs_topcard-org-name']",
];
const LOCATION = [
  ".job-details-jobs-unified-top-card__primary-description-container .tvm__text",
  ".job-details-jobs-unified-top-card__tertiary-description-container .tvm__text",
  ".job-details-jobs-unified-top-card__bullet",
  ".jobs-unified-top-card__bullet",
  ".topcard__flavor--bullet",
];
const WORKPLACE = [
  ".job-details-fit-level-preferences button",
  ".job-details-preferences-and-skills__pill",
  ".jobs-unified-top-card__workplace-type",
];
const TEXT = [
  "#job-details",
  ".jobs-description__content .jobs-box__html-content",
  ".jobs-description-content__text",
  ".jobs-description__container",
  ".show-more-less-html__markup",
  ".description__text",
];

function workplace(pane: Parameters<typeof all>[0]): string {
  for (const node of all(pane, WORKPLACE.join(", "))) {
    const word = /\b(Remote|Hybrid|On-site)\b/i.exec(oneLine(node.textContent))?.[1];
    if (word) return word;
  }
  return "";
}

export const linkedin: SiteReader = {
  isJobPage: (url) =>
    /^\/jobs\/view\/(?:[^/]*?-)?\d{6,}/.test(url.pathname) ||
    (url.pathname.startsWith("/jobs/") &&
      /^\d{6,}$/.test(url.searchParams.get("currentJobId") ?? "")),
  pageFirst: true,
  read: ({ root }) => {
    const pane = firstScope(root, PANE);
    // The first line reads "Bengaluru, Karnataka, India · 2 weeks ago · 100 applicants".
    const place = firstText(pane, LOCATION).split(" · ")[0] ?? "";
    const where = workplace(pane);
    return {
      title: firstText(pane, TITLE),
      company: firstText(pane, COMPANY),
      location: [where, place].filter(Boolean).join(" · "),
      text: firstBlock(pane, TEXT),
    };
  },
};
