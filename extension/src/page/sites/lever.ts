import { all, blockText, firstText } from "../dom";
import type { SiteReader } from "../post";

export const lever: SiteReader = {
  isJobPage: (url) => /^\/[^/]+\/[0-9a-f-]{36}\/?$/i.test(url.pathname),
  read: ({ root, title }) => ({
    title: firstText(root, [".posting-headline h2", ".posting-headline h1", "h2"]),
    // Lever's tab title reads "Acme - Product Designer".
    company: title.split(" - ")[0]?.trim() ?? "",
    location: firstText(root, [".posting-categories .location", ".location"]),
    text: all(root, ".section-wrapper .section.page-centered")
      .filter((node) => !(node.getAttribute("class") ?? "").includes("posting-header"))
      .map(blockText)
      .filter(Boolean)
      .join("\n\n"),
  }),
};
