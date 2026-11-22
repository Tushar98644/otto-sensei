import type { InterviewPrep } from "@/lib/insights/prep";
import type { EmailMessage } from "@/lib/notifications/email";
import { clip, escapeHtml, INK, MUTED, NAME_CHARS } from "@/lib/notifications/follow-up";
import { letterEmail, type EmailLinks } from "@/lib/notifications/layout";

// The interview-morning email: today's interviews with the prep's key points, then "How did it go?" for yesterday's. It never spends AI.

export const BRIEF_LISTED = { stories: 3, questions: 3, asks: 3, interviews: 3 } as const;

export type BriefItem = {
  company: string;
  role: string;
  // "2:30 PM", or null for a day with no time.
  time: string | null;
  prep: InterviewPrep | null;
  // The prep page; with no pack, a link that starts one (null on a plan without prep).
  prepUrl: string;
  makeUrl: string | null;
};

export type AskItem = {
  company: string;
  role: string;
  // "yesterday" or "on Monday".
  when: string;
  // "Mon, Nov 30": the follow-up reminder Otto set.
  followUpDay: string | null;
  // The application's page, where the bell asks; the thank-you writer is null on a plan without it.
  answerUrl: string;
  thankYouUrl: string | null;
};

export type BriefEmailInput = {
  to: string;
  briefs: readonly BriefItem[];
  asks: readonly AskItem[];
  interviewsUrl: string;
  links: EmailLinks;
};

type Block = { text: string[]; html: string };

const name = (company: string) => clip(company, NAME_CHARS);

function withCompany(company: string, lead: string, fallback: string): string {
  return name(company) ? `${lead} ${name(company)}` : fallback;
}

function list(title: string, items: readonly string[]): Block {
  if (items.length === 0) return { text: [], html: "" };
  return {
    text: [title, ...items.map((item) => `- ${item}`), ""],
    html: `<p style="margin:0 0 6px;color:${INK};font-weight:600">${escapeHtml(title)}</p>
<ul style="margin:0 0 16px;padding-left:20px">${items.map((item) => `<li style="margin:0 0 6px">${escapeHtml(item)}</li>`).join("")}</ul>`,
  };
}

function link(label: string, url: string): Block {
  return {
    text: [`${label}: ${url}`, ""],
    html: `<p style="margin:0 0 20px;font-size:14px"><a href="${escapeHtml(url)}" style="color:${INK};font-weight:600">${escapeHtml(label)}</a></p>`,
  };
}

function paragraph(text: string, muted = false): Block {
  return {
    text: [text, ""],
    html: `<p style="margin:0 0 16px${muted ? `;color:${MUTED};font-size:14px` : ""}">${escapeHtml(text)}</p>`,
  };
}

export function briefLead(item: Pick<BriefItem, "company" | "role" | "time">): string {
  const who = withCompany(item.company, "Your interview with", "Your interview");
  const role = clip(item.role, NAME_CHARS);
  return `${who} is today${item.time ? ` at ${item.time}` : ""}${role ? `, for the ${role} role` : ""}.`;
}

const plain = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// A title that only repeats the start of its line is dropped, so the line reads once.
export function storyLine(story: Pick<InterviewPrep["stories"][number], "title" | "line">): string {
  const title = story.title.trim();
  const line = story.line.trim();
  if (!title || plain(line).startsWith(plain(title))) return clip(line || title, 160);
  return line ? clip(`${title}: ${line}`, 160) : title;
}

const routine = (round: string) => Number(round === "opening" || round === "closing");

// The questions most worth a last look: the opener and the wrap-up everyone gets go last.
function likelyQuestions(prep: InterviewPrep): string[] {
  return [...prep.questions]
    .sort((a, b) => routine(a.round) - routine(b.round))
    .map((question) => question.question.trim())
    .filter(Boolean)
    .slice(0, BRIEF_LISTED.questions);
}

function briefBlocks(item: BriefItem, single: boolean): Block[] {
  const blocks = [paragraph(briefLead(item))];
  const prep = item.prep;
  if (prep) {
    blocks.push(
      list(
        "Your strongest stories",
        prep.stories.slice(0, BRIEF_LISTED.stories).map(storyLine).filter(Boolean),
      ),
      list("Likely questions", likelyQuestions(prep)),
      list(
        "Questions to ask them",
        prep.asks
          .slice(0, BRIEF_LISTED.asks)
          .map((ask) => ask.trim())
          .filter(Boolean),
      ),
    );
    if (!single) blocks.push(link("Open your prep", item.prepUrl));
    return blocks;
  }
  if (item.makeUrl) {
    blocks.push(
      paragraph(
        "There's no prep pack for it yet. One click makes one: likely questions, stories from your own resume lines, and questions to ask.",
      ),
    );
    if (!single) blocks.push(link("Make my prep pack", item.makeUrl));
  } else {
    blocks.push(
      paragraph("Read the job post once more and pick two stories from your resume to tell."),
    );
  }
  return blocks;
}

function askBlocks(item: AskItem): Block[] {
  const who = withCompany(item.company, "How did your interview with", "How did your interview");
  const actions = [
    ...(item.thankYouUrl ? [{ label: "Write a thank-you", url: item.thankYouUrl }] : []),
    { label: "Tell Otto how it went", url: item.answerUrl },
  ];
  const after = item.followUpDay
    ? `I'll remind you to follow up on ${item.followUpDay} unless you hear back.`
    : "";
  return [
    paragraph(`${who} go ${item.when}?${after ? ` ${after}` : ""}`),
    {
      text: [...actions.map((action) => `${action.label}: ${action.url}`), ""],
      html: `<p style="margin:0 0 20px;font-size:14px">${actions
        .map(
          (action) =>
            `<a href="${escapeHtml(action.url)}" style="color:${INK};font-weight:600">${escapeHtml(action.label)}</a>`,
        )
        .join(` <span style="color:${MUTED}">·</span> `)}</p>`,
    },
  ];
}

function subjectOf(input: BriefEmailInput): string {
  const [first] = input.briefs;
  if (first && input.briefs.length === 1) {
    const who = withCompany(first.company, "your interview with", "your interview");
    return clip(`Today: ${who}${first.time ? ` at ${first.time}` : ""}`, 200);
  }
  if (input.briefs.length > 1) return `Today: ${input.briefs.length} interviews`;
  const [ask] = input.asks;
  return ask && input.asks.length === 1
    ? clip(withCompany(ask.company, "How did it go with", "How did your interview go") + "?", 200)
    : "How did your interviews go?";
}

function buttonOf(input: BriefEmailInput): { label: string; url: string } {
  const [first] = input.briefs;
  if (first && input.briefs.length === 1) {
    if (first.prep) return { label: "Open your prep", url: first.prepUrl };
    if (first.makeUrl) return { label: "Make my prep pack", url: first.makeUrl };
  }
  return { label: "Open your interviews", url: input.interviewsUrl };
}

export function briefEmail(input: BriefEmailInput): EmailMessage {
  const briefs = input.briefs.slice(0, BRIEF_LISTED.interviews);
  const single = briefs.length === 1;
  const blocks = [
    ...briefs.flatMap((item) => briefBlocks(item, single)),
    ...(briefs.length > 0 ? [paragraph("Good luck today.")] : []),
    ...(briefs.length > 0 && input.asks.length > 0 ? [paragraph("And from before:", true)] : []),
    ...input.asks.flatMap(askBlocks),
  ];
  return letterEmail({
    to: input.to,
    subject: subjectOf(input),
    tag: "interview_brief",
    lead: [briefs.length > 0 ? "Good morning." : "Good morning. A quick one about your interview."],
    middle: {
      text: blocks
        .flatMap((block) => block.text)
        .join("\n")
        .trimEnd(),
      html: blocks.map((block) => block.html).join("\n"),
    },
    button: buttonOf(input),
    reason:
      "You get this because you turned on interview morning briefs. Only on interview days and the morning after.",
    links: input.links,
  });
}
