import { firstBlock, firstText } from "../dom";
import type { SiteReader } from "../post";

export const ashby: SiteReader = {
  isJobPage: (url) => /^\/[^/]+\/[0-9a-f-]{36}(?:\/application)?\/?$/i.test(url.pathname),
  read: ({ root, title }) => ({
    title: firstText(root, ["h1[class*='title']", "h1"]),
    // Ashby's tab title reads "Product Designer @ Acme".
    company: title.split(" @ ").slice(1).join(" @ ").trim(),
    location: firstText(root, ["[class*='_location']", "[class*='location']"]),
    text: firstBlock(root, ["[class*='_descriptionText']", "[class*='description']"]),
  }),
};
