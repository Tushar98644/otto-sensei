import { attribute, firstBlock, firstText } from "../dom";
import type { SiteReader } from "../post";

// SmartRecruiters marks its posts up with schema.org microdata rather than JSON-LD.
export const smartrecruiters: SiteReader = {
  isJobPage: (url) => /^\/[^/]+\/\d{6,}/.test(url.pathname),
  read: ({ root }) => ({
    title: firstText(root, ["[itemprop='title']", "h1.job-title", "h1"]),
    company: attribute(root, "[itemprop='hiringOrganization'] [itemprop='name']", "content"),
    location:
      attribute(root, "spl-job-location", "formattedaddress") ||
      firstText(root, ["[itemprop='jobLocation']", ".job-details"]),
    text: firstBlock(root, ["[itemprop='description']", ".job-sections"]),
  }),
};
