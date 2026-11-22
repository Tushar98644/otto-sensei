import { normalizeJobUrl } from "@/lib/applications/schema";
import type { HiringSystem } from "../types";
import { ATS_SYSTEMS, JOB_BOARDS, ownDomainName } from "./systems";
import { cleanCompany, cleanRole, normalizeText, titleCase, type Sender } from "./text";

export type JobFacts = { company: string; role: string; jobUrl: string };

type Key = "role" | "company";
type Found = Partial<Record<Key, string>>;
type Rule = { re: RegExp; keys: Key[] };

const NAME = '([A-Za-z0-9&][^\\n.,!?;:()"]{0,70}?)';
const ROLE = '([A-Za-z0-9][^\\n!?;:"]{1,100}?)';
// A name stops at punctuation, a line break or a joining word.
const END =
  "(?=\\s*(?:[.,!?;:]|\\(|\\s-\\s|\\n|$| and\\b| for\\b| has\\b| have\\b| is\\b| was\\b| team\\b| we\\b| on\\b| in (?:the|our)\\b| would\\b| as\\b))";

function rule(template: string, flags = "i"): Rule {
  const keys: Key[] = [];
  const source = template
    .replace(/\{(ROLE|NAME)\}/g, (_, key: string) => {
      keys.push(key === "ROLE" ? "role" : "company");
      return key === "ROLE" ? ROLE : NAME;
    })
    .replace(/\{END\}/g, END);
  return { re: new RegExp(source, flags), keys };
}

const STAGE =
  "(?:received|confirmation|confirmed|submitted|invitation|invite|request|update|status|acknowledg(?:e)?ment)";

const SUBJECT_RULES: readonly Rule[] = [
  rule("^(?:[^,]{1,40}, )?your application was (?:sent|viewed) (?:to|by) {NAME}{END}"),
  rule(
    "^(?:thank you|thanks)(?: so much)? for (?:applying|your application|your interest)(?: (?:to|for|at|with|in))? (?:the )?{ROLE} (?:(?:position|role|job|opening) )?at {NAME}$",
  ),
  rule(
    "^(?:thank you|thanks)(?: so much)? for (?:applying|your application|your interest|submitting your application)(?: (?:to|at|with|in))? {NAME}{END}",
  ),
  rule(
    "^(?:an )?(?:update|news|follow[- ]up) (?:on|about|regarding|to) your application (?:for (?:the )?{ROLE} )?(?:to|at|with|from) {NAME}{END}",
  ),
  rule("^(?:regarding|about) your application for (?:the )?{ROLE}$"),
  rule("^your application to {ROLE} at {NAME}$"),
  rule("^your application (?:for (?:the )?{ROLE} (?:position |role )?)?(?:to|at|with) {NAME}$"),
  rule("^your application for (?:the )?{ROLE}(?: position| role)?$"),
  rule(
    `^(?:application|interview|assessment) ${STAGE}(?::| -| for| \\|)\\s*(?:the )?{ROLE} (?:at|with) {NAME}$`,
  ),
  rule(
    `^(?:application|interview|assessment) ${STAGE}(?::| -| for| \\|)\\s*(?:the )?{ROLE}(?: (?:position|role))?$`,
  ),
  rule(
    "^(?:your )?(?:interview|assessment|offer)(?: (?:invitation|invite|request|confirmation|details|letter))? (?:with|from|at) {NAME}{END}",
  ),
  rule("^(?:walk-in )?interview (?:for|-) (?:the )?{ROLE} (?:-|at|with) {NAME}$"),
  rule("^applied(?: for| to)?:?\\s*{ROLE} (?:-|at) {NAME}$"),
  rule("^{NAME}\\s*[-|:]\\s*(?:application|interview|assessment|your application|thank you)\\b"),
  rule(`^[^-|:]{2,60}\\s[-|:]\\s*application ${STAGE}\\s*[-|:]\\s*{ROLE}(?:\\s*\\(.*\\))?$`),
  rule("^indeed application:\\s*{ROLE}$"),
  rule("^(?:updated )?invitation: .*(?:with|at|-|/) {NAME}\\s*@"),
  rule("^(?:confirmed|new event|scheduled|canceled|cancelled): {NAME} - "),
  rule("^invitation to {NAME}'s? (?:[a-z-]+ ){0,2}(?:assessment|test|challenge)"),
  rule("\\bapplication for (?:the )?(?:post of |position of )?{ROLE}$"),
  rule("^(?:offer letter|appointment letter|offer)\\s*[-|:]\\s*{ROLE}$"),
  rule("^congratulations\\s*[-|:!]+\\s*selected for (?:the )?(?:position of |role of )?{ROLE}$"),
];

const BODY_RULES: readonly Rule[] = [
  rule("\\b(?:position|role|post) of {ROLE} (?:at|with|in) {NAME}{END}"),
  rule("\\b(?:position|role|post) of {ROLE}(?=[.,!]|$)", "im"),
  rule(
    "\\b(?:received|submitted|reviewing) your application for (?:the )?{ROLE}(?=,? and\\b|\\.|,? (?:at|with|has|we)\\b|$)",
    "im",
  ),
  rule(
    "\\b(?:for|to|in|about|regarding) (?:the |our |a |an )?{ROLE} (?:position|role|job|opening|vacancy|post|opportunity)(?: (?:here )?(?:at|with|in) {NAME}{END})?",
  ),
  rule("\\bapplication for (?:the )?{ROLE} (?:at|with) {NAME}{END}"),
  rule("\\bapplied (?:for|to) (?:the )?{ROLE} (?:at|with) {NAME}{END}"),
  rule("\\binterview with you for (?:the )?{ROLE}(?=[.,]|$| position| role)", "im"),
  rule(
    "\\b(?:interest in|applying (?:to|at|with)|application (?:to|with)|interest in joining|interest in working (?:at|with)|apply to|applied to|applying for a (?:role|position|job) at|career opportunities at|opportunities at|greetings from) {NAME}{END}",
  ),
  rule("^{NAME} (?:has invited you|would like to (?:schedule|invite|talk|speak|meet))\\b", "im"),
  rule("\\bat {NAME} (?:for|as) (?:the |a |an )?{ROLE}(?: (?:position|role))?{END}"),
];

const LABELS: readonly [RegExp, Key][] = [
  [
    /^(?:job title|position(?: applied(?: for)?)?|role(?: applied(?: for)?)?|designation|job role|opening|vacancy|requisition title)\s*[:-]\s*(.+)$/im,
    "role",
  ],
  [/^(?:company(?: name)?|organi[sz]ation|employer)\s*[:-]\s*(.+)$/im, "company"],
];

// "taking the time to apply for the Data Analyst" keeps only what follows the last joining word.
function lastClause(role: string): string {
  const parts = role.split(
    /\b(?:for|to|in|about|regarding|apply|applying)\s+(?:the |our |a |an )?/i,
  );
  return parts.at(-1) ?? role;
}

function accept(key: Key, value: string | undefined): string {
  if (!value) return "";
  const clean = key === "company" ? cleanCompany(value) : cleanRole(lastClause(value));
  return /^[A-Z0-9&]/.test(clean) ? clean : "";
}

function collect(text: string, rules: readonly Rule[], found: Found = {}): Found {
  for (const { re, keys } of rules) {
    if (found.role && found.company) break;
    const match = re.exec(text);
    if (!match) continue;
    keys.forEach((key, index) => {
      const value = accept(key, match[index + 1]);
      if (value && !found[key]) found[key] = value;
    });
  }
  return found;
}

function byBody(body: string): Found {
  const found: Found = {};
  for (const [label, key] of LABELS) {
    const value = accept(key, label.exec(body)?.[1]);
    if (value) found[key] ??= value;
  }
  return collect(body.slice(0, 6_000), BODY_RULES, found);
}

// LinkedIn, Indeed and Naukri set the role and the company out on lines of their own.
function byBoardLayout(system: HiringSystem | null, body: string): Found {
  if (system !== "linkedin" && system !== "indeed") return {};
  const lines = normalizeText(body)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index]!;
    const previous = lines[index - 1]!;
    const placed = /^(.+?)\s+[·•|-]\s+.+$/.exec(line);
    if (!placed || /[·•|]/.test(previous)) continue;
    const company = accept("company", placed[1]);
    const role = accept("role", previous);
    if (company && role && !/\b(?:application|update|submitted|sent|viewed)\b/i.test(previous)) {
      return { company, role };
    }
  }
  return {};
}

// The name on an ATS sender is usually the company's: "Acme Talent <no-reply@greenhouse.io>".
function bySender(sender: Sender, system: HiringSystem | null): string {
  if (system && JOB_BOARDS.has(system)) return "";
  const fromName = cleanCompany(sender.name);
  if (fromName && !/\b(?:no-?reply|notification|mailer|alerts?|gmail)\b/i.test(fromName)) {
    return fromName;
  }
  if (system === "workday" || system === "icims" || system === "taleo") {
    const local = sender.address.split("@")[0] ?? "";
    if (
      /^[a-z][a-z0-9-]{1,30}$/.test(local) &&
      !/^(?:no-?reply|donotreply|do-not-reply|notifications?|talent|careers|jobs|recruiting)$/.test(
        local,
      )
    ) {
      return titleCase(local);
    }
  }
  if (system && ATS_SYSTEMS.has(system)) return "";
  const own = ownDomainName(sender);
  return own ? titleCase(own) : "";
}

const JOB_LINK =
  /https?:\/\/(?:(?:boards|job-boards)\.greenhouse\.io\/[^\s<>")\]]+|jobs\.lever\.co\/[^\s<>")\]]+|jobs\.ashbyhq\.com\/[^\s<>")\]]+|[a-z0-9-]+\.(?:wd\d+\.)?myworkdayjobs\.com\/[^\s<>")\]]+|jobs\.smartrecruiters\.com\/[^\s<>")\]]+|apply\.workable\.com\/[^\s<>")\]]+|(?:www\.)?linkedin\.com\/jobs\/view\/\d+|[a-z0-9-]+\.icims\.com\/jobs\/\d+[^\s<>")\]]*)/i;

const TRACKING = /^(?:utm_|gh_src|source|src|ref|trk|trackingid|refid|lipi|mid|gh_jid)/i;

export function jobLinkOf(body: string): string {
  const match = JOB_LINK.exec(body);
  if (!match) return "";
  try {
    const url = new URL(match[0].replace(/[.,;]+$/, ""));
    for (const key of [...url.searchParams.keys()])
      if (TRACKING.test(key)) url.searchParams.delete(key);
    return normalizeJobUrl(url.toString()) ?? "";
  } catch {
    return "";
  }
}

export function extractJob(input: {
  subject: string;
  body: string;
  sender: Sender;
  system: HiringSystem | null;
}): JobFacts {
  const { subject, body, sender, system } = input;
  const board = byBoardLayout(system, body);
  const fromSubject = collect(subject, SUBJECT_RULES);
  const fromBody = byBody(body);
  const company =
    board.company || fromSubject.company || fromBody.company || bySender(sender, system);
  const role = board.role || fromSubject.role || fromBody.role || "";
  return {
    company,
    role: role.toLowerCase() === company.toLowerCase() ? "" : role,
    jobUrl: jobLinkOf(body),
  };
}
