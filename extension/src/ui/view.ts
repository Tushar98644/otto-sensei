import { RULE_LABELS, VERDICT_LABELS } from "@/lib/eligibility/types";
import type { ExtensionAccess } from "@/lib/extension/plan";
import type { ExtensionResume } from "@/lib/extension/types";
import { STATUS_LABELS } from "@/lib/match-check/copy";
import {
  importanceRank,
  missingLine,
  skillsLine,
  type BadgeMatch,
  type EligibilityTone,
} from "../match";
import type { JobPost } from "../page/post";
import { answersBody, fillBlock, type FormPanel } from "./fill-view";
import { icon } from "./icons";
import { ottoHead } from "./otto";

export type Mode = "mini" | "card" | "panel" | "answers";
export type Busy = "save" | "tailor" | "letter" | null;

export type MatchView = {
  kind: "match";
  post: JobPost;
  match: BadgeMatch;
  siteName: string;
  resumes: Pick<ExtensionResume, "id" | "title">[];
  resumeId: string | null;
  access: ExtensionAccess;
  saved: boolean;
  busy: Busy;
  error: string | null;
  // On an application form Otto can fill.
  form: FormPanel | null;
};

export type View =
  | { kind: "hidden" }
  | { kind: "connect"; siteName: string }
  | { kind: "loading"; siteName: string }
  | { kind: "no-resume"; siteName: string }
  | { kind: "select"; siteName: string; error: string | null }
  | MatchView;

const MAX_SEGMENTS = 14;
// Gaps first: what's missing is what to act on.
const ORDER = { missing: 0, listed: 1, shown: 2 } as const;

export function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function head(meta: string, mode: Mode): string {
  const toggle =
    mode === "panel"
      ? `<button class="icon-btn" data-action="less" aria-label="Show less">${icon("chevronDown")}</button>`
      : "";
  return `<div class="head">
    <span class="mark">${ottoHead(26)}</span>
    <p class="meta"><b>Otto</b> · ${meta}</p>
    ${toggle}
    <button class="icon-btn" data-action="minimize" aria-label="Tuck Otto away">${icon("minus")}</button>
  </div>`;
}

function meter(found: number, total: number): string {
  if (total === 0) return "";
  if (total > MAX_SEGMENTS) {
    return `<div class="meter bar" aria-hidden="true"><span data-width="${Math.round((found / total) * 100)}"></span></div>`;
  }
  const segments = Array.from(
    { length: total },
    (_, index) => `<i${index < found ? ' class="on"' : ""}></i>`,
  );
  return `<div class="meter" aria-hidden="true">${segments.join("")}</div>`;
}

const VERDICT_ICON: Record<EligibilityTone, Parameters<typeof icon>[0]> = {
  ok: "circleCheck",
  check: "alert",
  blocked: "circleX",
  none: "circleDashed",
};

function verdict(tone: EligibilityTone, text: string): string {
  return `<p class="verdict ${tone}">${icon(VERDICT_ICON[tone])}<span>${esc(text)}</span></p>`;
}

// Without the plan, the Pro mark takes the icon's place, so three buttons still fit.
function withPlan(included: boolean, glyph: Parameters<typeof icon>[0], label: string): string {
  return included ? `${icon(glyph)}${label}` : `${label}<span class="pro">PRO</span>`;
}

function actions(view: MatchView): string {
  const busy = (name: Busy) => (view.busy === name ? ' aria-busy="true"' : "");
  const any = view.busy !== null ? " disabled" : "";
  // On a form, Fill with Otto is the one primary button.
  const saveStyle = view.form?.allowed ? "secondary" : "primary";
  const save = view.saved
    ? `<button class="btn done" data-action="board" aria-label="Saved. Open your board">${icon("bookmarkCheck")}Saved</button>`
    : `<button class="btn ${saveStyle}" data-action="save"${busy("save")}${any}>${icon("bookmark")}Save</button>`;
  return `<div class="actions">
    ${save}
    <button class="btn secondary" data-action="tailor"${busy("tailor")}${any}>${withPlan(view.access.tailor, "wand", "Tailor")}</button>
    <button class="btn secondary" data-action="letter"${busy("letter")}${any}>${withPlan(view.access.letter, "pen", "Letter")}</button>
  </div>`;
}

function skillsBlock(view: MatchView): string {
  const { skills } = view.match;
  if (!skills) return "";
  const marked = missingLine(skills.missing)
    ? `<p class="missing">Missing: ${skills.missing
        .slice(0, 3)
        .map((term) => `<mark>${esc(term)}</mark>`)
        .join(
          ", ",
        )}${skills.missing.length > 3 ? ` and ${skills.missing.length - 3} more` : ""}</p>`
    : skills.total > 0
      ? `<p class="missing">Every skill the post names is in your resume.</p>`
      : "";
  const score =
    skills.total === 0
      ? `<p class="of">${esc(skillsLine(skills))}</p>`
      : `<div class="score"><span class="num">${skills.found}</span><span class="of">of <b>${skills.total}</b> ${skills.total === 1 ? "skill" : "skills"} found</span></div>`;
  return `<div>${score}${meter(skills.found, skills.total)}${marked}</div>`;
}

function where(post: JobPost): string {
  const line = [post.company, post.location].filter(Boolean).join(" · ");
  return line ? `<p class="where">${esc(line)}</p>` : "";
}

function details(view: MatchView): string {
  const { skills, eligibility } = view.match;
  const rows = [...(skills?.rows ?? [])]
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || importanceRank(a) - importanceRank(b))
    .map((row) => {
      const kind = row.status === "missing" ? "missing-row" : row.status;
      const glyph =
        row.status === "shown"
          ? "circleCheck"
          : row.status === "listed"
            ? "circleHalf"
            : "circleDashed";
      const tag =
        row.importance === "must" ? "must-have" : row.importance === "nice" ? "nice to have" : "";
      // A listed skill's line is the skills list itself, which says nothing new.
      const quote =
        row.where && row.status === "shown"
          ? `<p class="quote">${esc(row.where.place)}: “${esc(row.where.text)}”</p>`
          : "";
      return `<li class="${kind}">${icon(glyph)}<div><span class="term">${esc(row.term)}</span><span class="tag">${esc(
        [STATUS_LABELS[row.status], tag].filter(Boolean).join(" · "),
      )}</span>${quote}</div></li>`;
    })
    .join("");
  const findings = eligibility.findings
    .map(
      (finding) =>
        `<li><div><span class="pill ${finding.verdict}">${esc(VERDICT_LABELS[finding.verdict])}</span><span class="term">${esc(
          RULE_LABELS[finding.rule],
        )}</span><p class="quote">${esc(finding.note)}</p></div></li>`,
    )
    .join("");
  const picker =
    view.resumes.length > 1
      ? `<label class="field"><span class="eyebrow">Checked against</span><select data-action="resume">${view.resumes
          .map(
            (resume) =>
              `<option value="${esc(resume.id)}"${resume.id === view.resumeId ? " selected" : ""}>${esc(resume.title)}</option>`,
          )
          .join("")}</select></label>`
      : "";
  return `<div class="details">
    ${picker}
    ${rows ? `<section><p class="eyebrow">Skills the post names</p><ul class="rows">${rows}</ul></section>` : ""}
    ${findings ? `<section><p class="eyebrow">Can you take it</p><ul class="rows">${findings}</ul></section>` : ""}
    <div class="foot"><button class="link-btn" data-action="otto">Open Otto</button><button class="link-btn" data-action="disconnect">Disconnect</button></div>
  </div>`;
}

function matchCard(view: MatchView, mode: Mode): string {
  const open = mode === "panel";
  const resume = view.resumes.find((item) => item.id === view.resumeId);
  const meta = open && resume ? `checked against ${esc(resume.title)}` : esc(view.siteName);
  const more = open
    ? ""
    : `<button class="link-btn" data-action="more">See every skill and rule</button>`;
  const status = view.error
    ? `<p class="note error" role="alert">${esc(view.error)}</p>`
    : view.saved
      ? `<p class="saved-line">In To apply on your board. <button class="link-btn" data-action="board">Open it</button></p>`
      : "";
  return `<section class="card${open ? " open" : ""}" role="region" aria-label="Otto for Chrome">
    ${head(meta, mode)}
    <div class="body">
      <div><p class="role">${esc(view.post.title)}</p>${where(view.post)}</div>
      ${skillsBlock(view)}
      ${verdict(view.match.eligibility.tone, view.match.eligibility.text)}
      ${view.form ? fillBlock(view.form) : ""}
      ${actions(view)}
      ${status}
      ${more}
    </div>
    ${open ? details(view) : ""}
  </section>`;
}

function simpleCard(meta: string, message: string, buttons: string, extra = ""): string {
  return `<section class="card" role="region" aria-label="Otto for Chrome">
    ${head(meta, "card")}
    <div class="body"><p class="message">${message}</p>${extra}<div class="actions">${buttons}</div></div>
  </section>`;
}

export function miniTone(view: View): EligibilityTone {
  return view.kind === "match" ? view.match.eligibility.tone : "none";
}

function answersCard(view: MatchView, form: FormPanel): string {
  return `<section class="card open" role="region" aria-label="Otto for Chrome: your saved answers">
    ${head("your saved answers", "card")}
    <div class="details">${answersBody(form.state)}</div>
  </section>`;
}

export function render(view: View, mode: Mode): string {
  if (view.kind === "hidden") return "";
  if (mode === "answers" && view.kind === "match" && view.form) return answersCard(view, view.form);
  if (mode === "mini") {
    const label =
      view.kind === "match"
        ? `Otto: ${skillsLine(view.match.skills ?? { found: 0, total: 0 })}`
        : "Open Otto";
    return `<button class="mini" data-action="expand" aria-label="${esc(label)}">${ottoHead(34)}<span class="status ${miniTone(view)}"></span></button>`;
  }
  switch (view.kind) {
    case "connect":
      return simpleCard(
        esc(view.siteName),
        "Connect me to your account and I'll check every job post against your resume, right here.",
        `<button class="btn primary" data-action="connect">Connect Otto</button>`,
      );
    case "loading":
      return simpleCard(esc(view.siteName), "Reading your resume…", "");
    case "no-resume":
      return simpleCard(
        esc(view.siteName),
        "I need a resume to compare with. Add one in Otto, then come back to this post.",
        `<button class="btn primary" data-action="otto">Add a resume</button>`,
      );
    case "select":
      return simpleCard(
        esc(view.siteName),
        "I can't find the job post on this page. Select its text, then press Use selection.",
        `<button class="btn primary" data-action="use-selection">Use selection</button><button class="btn secondary" data-action="close">Not now</button>`,
        view.error ? `<p class="note error" role="alert">${esc(view.error)}</p>` : "",
      );
    case "match":
      return matchCard(view, mode);
  }
}
