import { firstBlock, firstScope, firstText } from "../dom";
import type { SiteReader } from "../post";

const PANE = [
  "[data-testid='viewjob-main-content']",
  "#jobsearch-ViewjobPaneWrapper",
  ".jobsearch-ViewJobLayout",
  "#viewJobSSRRoot",
];
const TITLE = [
  "[data-testid='vj-job-title']",
  "[data-testid='jobsearch-JobInfoHeader-title']",
  ".jobsearch-JobInfoHeader-title",
  "h1",
];
const COMPANY = [
  "[data-testid='company-info-metadata'] a",
  "[data-testid='inlineHeader-companyName']",
  "[data-company-name]",
  ".jobsearch-CompanyInfoContainer a",
];
const LOCATION = [
  "[data-testid='job-location']",
  "[data-testid='inlineHeader-companyLocation']",
  "[data-testid='jobsearch-JobInfoHeader-companyLocation']",
  "#jobLocationText",
];
const TEXT = [
  "#jobDescriptionText",
  ".simple-job-description-html",
  "[data-testid='jobDescriptionText']",
];

export const indeed: SiteReader = {
  isJobPage: (url) =>
    url.pathname.startsWith("/viewjob") ||
    /^[a-f0-9]{8,32}$/i.test(url.searchParams.get("vjk") ?? url.searchParams.get("jk") ?? ""),
  pageFirst: true,
  read: ({ root }) => {
    const pane = firstScope(root, PANE);
    return {
      // "Software Engineer - job post" is how the title reads to screen readers on some pages.
      title: firstText(pane, TITLE).replace(/\s+-\s+job post$/i, ""),
      company: firstText(pane, COMPANY),
      location: firstText(pane, LOCATION),
      text: firstBlock(pane, TEXT),
    };
  },
};
