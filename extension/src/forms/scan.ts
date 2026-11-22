import { all, oneLine, type PageNode } from "../page/dom";
import { PLATFORMS, type FormPlatform } from "./platforms";

export type ControlKind =
  | "text"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "file"
  // Type to filter, then pick (Greenhouse's react-select, Workday's prompts).
  | "combobox"
  // Ashby's Yes and No buttons.
  | "yesno"
  // A button that opens a list (Workday).
  | "dropdown";

export type Question = {
  key: string;
  kind: ControlKind;
  label: string;
  // The control's name, id and automation id, for hints the label doesn't give.
  hints: string;
  inputType: string;
  autocomplete: string;
  required: boolean;
  options: string[];
  // Ancestor ids and classes, to tell a self-identification section from the rest.
  section: string;
  // The nth entry of a repeated block (work history, education), from ids like "school--1".
  index: number;
  nodes: PageNode[];
};

const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "search", "password"]);
const MAX_QUESTIONS = 150;

function attr(node: PageNode, name: string): string {
  return node.getAttribute(name) ?? "";
}

function byId(root: PageNode, id: string): PageNode | null {
  return id ? root.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`) : null;
}

// Label text without the "*" or "✱" of a required field.
export function cleanLabel(text: string): string {
  return oneLine(text)
    .replace(/\s*[*✱]+\s*$/u, "")
    .replace(/\s*\((?:required|optional)\)\s*$/i, "")
    .trim();
}

function ancestors(node: PageNode, depth = 12): PageNode[] {
  const out: PageNode[] = [];
  for (let up = node.parentElement; up && out.length < depth; up = up.parentElement) out.push(up);
  return out;
}

function container(platform: FormPlatform, node: PageNode): PageNode | null {
  return ancestors(node).find((up) => PLATFORMS[platform].isContainer(up)) ?? null;
}

// The question's own label element in its container; for a group of options, its legend comes first.
function labelNode(platform: FormPlatform, box: PageNode | null, grouped = false): PageNode | null {
  if (!box) return null;
  const selectors = grouped ? ["legend", ...PLATFORMS[platform].label] : PLATFORMS[platform].label;
  for (const selector of selectors) {
    for (const found of all(box, selector)) {
      // A label tied to one option ("Yes") names the option, not the question.
      const target = found.getAttribute("for");
      if (grouped && found.tagName === "LABEL" && target && box.querySelector(`[id="${target}"]`))
        continue;
      if (cleanLabel(found.textContent ?? "")) return found;
    }
  }
  return null;
}

function containerLabel(platform: FormPlatform, box: PageNode | null, grouped = false): string {
  return cleanLabel(labelNode(platform, box, grouped)?.textContent ?? "");
}

function ownLabel(root: PageNode, node: PageNode): string {
  const labelledBy = attr(node, "aria-labelledby")
    .split(/\s+/)
    .map((id) => cleanLabel(byId(root, id)?.textContent ?? ""))
    .filter(Boolean)
    .join(" ");
  if (labelledBy) return labelledBy;
  const id = attr(node, "id");
  const forLabel = id ? root.querySelector(`label[for="${id.replace(/"/g, '\\"')}"]`) : null;
  const text = cleanLabel(forLabel?.textContent ?? "");
  if (text) return text;
  return cleanLabel(attr(node, "aria-label"));
}

function optionLabel(root: PageNode, node: PageNode): string {
  const own = ownLabel(root, node);
  if (own) return own;
  const wrap = ancestors(node, 3).find((up) => up.tagName === "LABEL");
  return cleanLabel(wrap?.textContent ?? "") || attr(node, "value");
}

function sectionOf(node: PageNode): string {
  return ancestors(node, 20)
    .map((up) => `${attr(up, "id")} ${attr(up, "class")} ${attr(up, "data-automation-id")}`)
    .join(" ")
    .toLowerCase();
}

function isRequired(node: PageNode, label: PageNode | null): boolean {
  const raw = oneLine(label?.textContent);
  return (
    node.getAttribute("required") !== null ||
    attr(node, "aria-required") === "true" ||
    /[*✱]\s*$/u.test(raw) ||
    /\(required\)/i.test(raw) ||
    /(?:^|[\s_])_?required/i.test(label?.getAttribute("class") ?? "")
  );
}

// Greenhouse counts repeated blocks from 0 ("school--0"), Workday from 1 ("workExperience-1").
function indexOf(hints: string, section: string): number {
  const workday = /(?:workexperience|education)-(\d+)/i.exec(`${hints} ${section}`);
  if (workday) return Math.max(0, Number(workday[1]) - 1);
  const match = /--(\d+)\b|\[(\d+)\]/.exec(hints);
  return match ? Number(match[1] ?? match[2]) : 0;
}

function kindOf(node: PageNode): ControlKind | null {
  const tag = node.tagName;
  if (tag === "TEXTAREA") return "textarea";
  if (tag === "SELECT") return "select";
  if (tag === "BUTTON") {
    if (attr(node, "data-option")) return "yesno";
    return attr(node, "aria-haspopup") === "listbox" ? "dropdown" : null;
  }
  if (tag !== "INPUT") return null;
  const type = attr(node, "type").toLowerCase() || "text";
  if (SKIP_TYPES.has(type)) return null;
  if (type === "radio") return "radio";
  if (type === "checkbox") return "checkbox";
  if (type === "file") return "file";
  // Lever's location box only keeps a place picked from its own suggestions.
  if (
    attr(node, "role") === "combobox" ||
    attr(node, "data-automation-id") === "searchBox" ||
    /(?:^|\s)location-input(?:\s|$)/.test(attr(node, "class"))
  ) {
    return "combobox";
  }
  return "text";
}

// Controls a person never answers: react-select's hidden "required" twins, captchas, phone-country search boxes.
function ignored(node: PageNode): boolean {
  const hints = `${attr(node, "id")} ${attr(node, "name")} ${attr(node, "class")}`.toLowerCase();
  if (/recaptcha|captcha|honeypot|iti__search/.test(hints)) return true;
  if (attr(node, "aria-hidden") === "true" && attr(node, "tabindex") === "-1") {
    return kindOf(node) !== "file" && kindOf(node) !== "checkbox";
  }
  return false;
}

export function scanQuestions(platform: FormPlatform, root: PageNode, form: PageNode): Question[] {
  const controls = all(
    form,
    "input, textarea, select, button[data-option], button[aria-haspopup='listbox']",
  );
  const questions: Question[] = [];
  const groups = new Map<string, Question>();
  for (const node of controls) {
    if (questions.length >= MAX_QUESTIONS) break;
    const kind = kindOf(node);
    if (!kind || ignored(node)) continue;
    const box = container(platform, node);
    // Ashby keeps a hidden checkbox behind its Yes and No buttons.
    if (kind === "checkbox" && box?.querySelector("button[data-option]")) continue;
    const name = attr(node, "name");
    const automation = attr(node, "data-automation-id");
    const hints = [name, attr(node, "id"), automation, box ? attr(box, "data-automation-id") : ""]
      .filter(Boolean)
      .join(" ");
    const grouped = kind === "radio" || kind === "checkbox" || kind === "yesno";
    if (grouped) {
      const groupKey = `${kind}:${name || containerLabel(platform, box, true) || attr(node, "id")}`;
      const existing = groups.get(groupKey);
      const option =
        kind === "yesno" ? cleanLabel(node.textContent ?? "") : optionLabel(root, node);
      if (existing) {
        existing.nodes.push(node);
        existing.options.push(option);
        if (node.getAttribute("required") !== null) existing.required = true;
        continue;
      }
      const questionLabel = labelNode(platform, box, true);
      const question: Question = {
        key: groupKey,
        kind,
        label: cleanLabel(questionLabel?.textContent ?? "") || option,
        hints,
        inputType: kind,
        autocomplete: "",
        required: isRequired(node, questionLabel),
        options: [option],
        section: sectionOf(node),
        index: indexOf(hints, sectionOf(node)),
        nodes: [node],
      };
      groups.set(groupKey, question);
      questions.push(question);
      continue;
    }
    const raw =
      ownLabel(root, node) ||
      containerLabel(platform, box) ||
      cleanLabel(attr(node, "placeholder")) ||
      name;
    const own = attr(node, "id")
      ? root.querySelector(`label[for="${attr(node, "id").replace(/"/g, '\\"')}"]`)
      : null;
    const options =
      kind === "select"
        ? all(node, "option")
            .map((option) => oneLine(option.textContent))
            .filter(
              (text) => text && !/^(?:select|choose|please select)\b/i.test(text) && text !== "--",
            )
        : [];
    questions.push({
      key: `${kind}:${hints || raw}`,
      kind,
      label: raw,
      hints,
      inputType: attr(node, "type").toLowerCase(),
      autocomplete: attr(node, "autocomplete").toLowerCase(),
      required: isRequired(node, own ?? labelNode(platform, box)),
      options,
      section: sectionOf(node),
      index: indexOf(hints, sectionOf(node)),
      nodes: [node],
    });
  }
  return questions;
}
