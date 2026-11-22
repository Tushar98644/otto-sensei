import { all, attribute, blockText, firstText } from "../dom";
import type { SiteReader } from "../post";

export const workable: SiteReader = {
  isJobPage: (url) => /\/j\/[0-9A-F]{6,}/i.test(url.pathname),
  read: ({ root }) => ({
    title: firstText(root, ["[data-ui='job-title']", "h1"]),
    company: attribute(root, "header a img", "alt"),
    location: [
      firstText(root, ["[data-ui='job-workplace']"]),
      firstText(root, ["[data-ui='job-location']"]),
    ]
      .filter(Boolean)
      .join(" · "),
    text: all(
      root,
      "[data-ui='job-description'], [data-ui='job-requirements'], [data-ui='job-benefits']",
    )
      .map(blockText)
      .filter(Boolean)
      .join("\n\n"),
  }),
};
