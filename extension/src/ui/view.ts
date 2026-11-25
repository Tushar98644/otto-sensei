import type { EligibilityRule, EligibilityVerdict } from "@/lib/eligibility/types";
import type { ExtensionAccess } from "@/lib/extension/plan";
import type { ExtensionResume } from "@/lib/extension/types";
import type { MatchStatus } from "@/lib/match-check/check";
import { pluralKey, t, type MessageKey } from "../i18n";
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

// The app's labels for these, in the extension's own words (the English ones match the app's).
export const STATUS_WORDS: Record<MatchStatus, MessageKey> = {
  shown: "statusShown",
  listed: "statusListed",
  missing: "statusMissing",
};
export const VERDICT_WORDS: Record<EligibilityVerdict, MessageKey> = {
  ok: "verdictOk",
  check: "verdictCheck",
  blocked: "verdictBlocked",
};
export const RULE_WORDS: Record<EligibilityRule, MessageKey> = {
  location: "ruleLocation",
  authorization: "ruleAuthorization",
  sponsorship: "ruleSponsorship",
  time_zone: "ruleTimeZone",
  work_type: "ruleWorkType",
};

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
      ? `<button class="icon-btn" data-action="less" aria-label="${t("showLess")}">${icon("chevronDown")}</button>`
      : "";
  return `<div class="head">
    <span class="mark">${ottoHead(26)}</span>
    <p class="meta"><b>Otto</b> · ${meta}</p>
    ${toggle}
    <button class="icon-btn" data-action="minimize" aria-label="${t("tuckAway")}">${icon("minus")}</button>
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
    ? `<button class="btn done" data-action="board" aria-label="${t("savedOpenBoard")}">${icon("bookmarkCheck")}${t("saved")}</button>`
    : `<button class="btn ${saveStyle}" data-action="save"${busy("save")}${any}>${icon("bookmark")}${t("save")}</button>`;
  return `<div class="actions">
    ${save}
    <button class="btn secondary" data-action="tailor"${busy("tailor")}${any}>${withPlan(view.access.tailor, "wand", t("tailor"))}</button>
    <button class="btn secondary" data-action="letter"${busy("letter")}${any}>${withPlan(view.access.letter, "pen", t("letter"))}</button>
  </div>`;
}

function missingMarks(missing: readonly string[]): string {
  const terms = missing
    .slice(0, 3)
    .map((term) => `<mark>${esc(term)}</mark>`)
    .join(", ");
  return missing.length > 3 ? t("missingMore", terms, missing.length - 3) : t("missing", terms);
}

function skillsBlock(view: MatchView): string {
  const { skills } = view.match;
  if (!skills) return "";
  const marked = missingLine(skills.missing)
    ? `<p class="missing">${missingMarks(skills.missing)}</p>`
    : skills.total > 0
      ? `<p class="missing">${t("allSkillsFound")}</p>`
      : "";
  const of = t(pluralKey(skills.total, "skillsOfOne", "skillsOfOther"), `<b>${skills.total}</b>`);
  const score =
    skills.total === 0
      ? `<p class="of">${esc(skillsLine(skills))}</p>`
      : `<div class="score"><span class="num">${skills.found}</span><span class="of">${of}</span></div>`;
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
        row.importance === "must"
          ? t("mustHave")
          : row.importance === "nice"
            ? t("niceToHave")
            : "";
      // A listed skill's line is the skills list itself, which says nothing new.
      const quote =
        row.where && row.status === "shown"
          ? `<p class="quote">${t("quote", esc(row.where.place), esc(row.where.text))}</p>`
          : "";
      return `<li class="${kind}">${icon(glyph)}<div><span class="term">${esc(row.term)}</span><span class="tag">${esc(
        [t(STATUS_WORDS[row.status]), tag].filter(Boolean).join(" · "),
      )}</span>${quote}</div></li>`;
    })
    .join("");
  const findings = eligibility.findings
    .map(
      (finding) =>
        `<li><div><span class="pill ${finding.verdict}">${esc(t(VERDICT_WORDS[finding.verdict]))}</span><span class="term">${esc(
          t(RULE_WORDS[finding.rule]),
        )}</span><p class="quote">${esc(finding.note)}</p></div></li>`,
    )
    .join("");
  const picker =
    view.resumes.length > 1
      ? `<label class="field"><span class="eyebrow">${t("checkedAgainst")}</span><select data-action="resume">${view.resumes
          .map(
            (resume) =>
              `<option value="${esc(resume.id)}"${resume.id === view.resumeId ? " selected" : ""}>${esc(resume.title)}</option>`,
          )
          .join("")}</select></label>`
      : "";
  return `<div class="details">
    ${picker}
    ${rows ? `<section><p class="eyebrow">${t("skillsHeading")}</p><ul class="rows">${rows}</ul></section>` : ""}
    ${findings ? `<section><p class="eyebrow">${t("canYouTakeIt")}</p><ul class="rows">${findings}</ul></section>` : ""}
    <div class="foot"><button class="link-btn" data-action="otto">${t("openOtto")}</button><button class="link-btn" data-action="disconnect">${t("disconnect")}</button></div>
  </div>`;
}

function matchCard(view: MatchView, mode: Mode): string {
  const open = mode === "panel";
  const resume = view.resumes.find((item) => item.id === view.resumeId);
  const meta = open && resume ? t("checkedAgainstResume", esc(resume.title)) : esc(view.siteName);
  const more = open
    ? ""
    : `<button class="link-btn" data-action="more">${t("seeEverything")}</button>`;
  const status = view.error
    ? `<p class="note error" role="alert">${esc(view.error)}</p>`
    : view.saved
      ? `<p class="saved-line">${t("savedLine")} <button class="link-btn" data-action="board">${t("openIt")}</button></p>`
      : "";
  return `<section class="card${open ? " open" : ""}" role="region" aria-label="${t("extName")}">
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
  return `<section class="card" role="region" aria-label="${t("extName")}">
    ${head(meta, "card")}
    <div class="body"><p class="message">${message}</p>${extra}<div class="actions">${buttons}</div></div>
  </section>`;
}

export function miniTone(view: View): EligibilityTone {
  return view.kind === "match" ? view.match.eligibility.tone : "none";
}

function answersCard(view: MatchView, form: FormPanel): string {
  return `<section class="card open" role="region" aria-label="${t("savedAnswersRegion")}">
    ${head(t("savedAnswersMeta"), "card")}
    <div class="details">${answersBody(form.state)}</div>
  </section>`;
}

export function render(view: View, mode: Mode): string {
  if (view.kind === "hidden") return "";
  if (mode === "answers" && view.kind === "match" && view.form) return answersCard(view, view.form);
  if (mode === "mini") {
    const label =
      view.kind === "match"
        ? t("miniLabel", skillsLine(view.match.skills ?? { found: 0, total: 0 }))
        : t("openOtto");
    return `<button class="mini" data-action="expand" aria-label="${esc(label)}">${ottoHead(34)}<span class="status ${miniTone(view)}"></span></button>`;
  }
  switch (view.kind) {
    case "connect":
      return simpleCard(
        esc(view.siteName),
        t("connectMessage"),
        `<button class="btn primary" data-action="connect">${t("connectButton")}</button>`,
      );
    case "loading":
      return simpleCard(esc(view.siteName), t("readingResume"), "");
    case "no-resume":
      return simpleCard(
        esc(view.siteName),
        t("needResume"),
        `<button class="btn primary" data-action="otto">${t("addResume")}</button>`,
      );
    case "select":
      return simpleCard(
        esc(view.siteName),
        t("cantFindPost"),
        `<button class="btn primary" data-action="use-selection">${t("useSelection")}</button><button class="btn secondary" data-action="close">${t("notNow")}</button>`,
        view.error ? `<p class="note error" role="alert">${esc(view.error)}</p>` : "",
      );
    case "match":
      return matchCard(view, mode);
  }
}
