import { all, firstBlock, firstText, oneLine, type PageNode } from "../dom";
import type { SiteReader } from "../post";

// Naukri hashes its class names ("styles_jd-header-title__rZwM1"), so these match the stable part.
const TITLE = ["h1[class*='jd-header-title']", "[class*='jd-header-title']", "h1"];
const COMPANY = ["[class*='jd-header-comp-name'] a", "[class*='jd-header-comp-name']"];
const LOCATION = "[class*='jhc__location']";
const TEXT = ["[class*='dang-inner-html']", "[class*='job-desc']", "section[class*='JDC']"];
const SKILLS = "[class*='key-skill'] a, [class*='key-skill'] span[class*='chip']";

// Each city is its own link; without links the line reads "Location: Bengaluru".
function location(root: PageNode): string {
  const field = root.querySelector(LOCATION);
  if (!field) return "";
  const cities = all(field, "a")
    .map((node) => oneLine(node.textContent))
    .filter(Boolean);
  return cities.length > 0
    ? [...new Set(cities)].slice(0, 4).join(", ")
    : oneLine(field.textContent).replace(/^Location:\s*/i, "");
}

export const naukri: SiteReader = {
  isJobPage: (url) => /^\/job-listings-/.test(url.pathname),
  pageFirst: true,
  read: ({ root }) => {
    const skills = [
      ...new Set(
        all(root, SKILLS)
          .map((node) => oneLine(node.textContent))
          .filter(Boolean),
      ),
    ];
    const text = firstBlock(root, TEXT);
    return {
      title: firstText(root, TITLE),
      company: firstText(root, COMPANY),
      location: location(root),
      text:
        skills.length > 0 && text
          ? `${text}\n\nKey skills\n${skills.map((skill) => `- ${skill}`).join("\n")}`
          : text,
    };
  },
};
