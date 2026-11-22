import { all, firstBlock, firstText, oneLine } from "../dom";
import type { SiteReader } from "../post";

export const workday: SiteReader = {
  isJobPage: (url) => /\/job\/[^/]+\/[^/]+/.test(url.pathname),
  read: ({ root }) => ({
    title: firstText(root, ["[data-automation-id='jobPostingHeader']", "h2", "h1"]),
    location: all(root, "[data-automation-id='locations'] dd")
      .map((node) => oneLine(node.textContent))
      .filter(Boolean)
      .join(" · "),
    text: firstBlock(root, ["[data-automation-id='jobPostingDescription']"]),
  }),
};
