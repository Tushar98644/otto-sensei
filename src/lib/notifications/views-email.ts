import type { EmailMessage } from "./email";
import { escapeHtml, INK, MUTED } from "./follow-up";
import { letterEmail, type EmailLinks } from "./layout";
import type { NotificationKind } from "./types";

export type ViewLine = { kind: NotificationKind; title: string; body: string };

export type ViewsEmailInput = {
  to: string;
  // Newest first, as the bell shows them.
  lines: readonly ViewLine[];
  url: string;
  links: EmailLinks;
};

function subjectOf(lines: readonly ViewLine[]): string {
  const [only] = lines;
  if (lines.length === 1 && only) return only.title;
  return lines.every((line) => line.kind === "share_viewed")
    ? "People opened your resume links"
    : "People are looking at your resume";
}

export function viewsEmail(input: ViewsEmailInput): EmailMessage {
  const onlyPortfolio = input.lines.every((line) => line.kind === "portfolio_views");
  const text = input.lines.map((line) => `- ${line.title}\n  ${line.body}`).join("\n");
  const html = `<ul style="margin:0 0 16px;padding-left:20px">${input.lines
    .map(
      (line) =>
        `<li style="margin:0 0 12px"><span style="color:${INK};font-weight:600">${escapeHtml(line.title)}</span><br><span style="color:${MUTED};font-size:14px">${escapeHtml(line.body)}</span></li>`,
    )
    .join("")}</ul>`;
  return letterEmail({
    to: input.to,
    subject: subjectOf(input.lines),
    tag: "views",
    lead: ["Since my last note:"],
    middle: { text, html },
    after: [
      "Otto only counts views: never who opened a link or where they are. Your own visits, link previews and search engines don't count.",
    ],
    button: { label: onlyPortfolio ? "Open your portfolio" : "See your links", url: input.url },
    reason: "You get this because you turned on views emails. At most one a day.",
    links: input.links,
  });
}
