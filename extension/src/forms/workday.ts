import type { FillProfile } from "@/lib/extension/types";
import { all, oneLine, type PageNode } from "../page/dom";
import { waitFor } from "./apply";
import { websiteLinks } from "./plan";

// Workday's My Experience lists start empty and grow one panel per press of the list's own Add.

export type PanelKind = "work" | "education" | "websites";
export type PanelList = { kind: PanelKind; panels: number; add: PageNode | null };

const MAX_PANELS = 10;
const PANEL_WAIT_MS = 3_000;

const LISTS: { kind: PanelKind; section: RegExp; title: RegExp; panel: RegExp }[] = [
  {
    kind: "work",
    section: /^workExperienceSection$/i,
    title: /^work experience$/i,
    panel: /^workExperience-(\d+)(?:--|$)/i,
  },
  {
    kind: "education",
    section: /^educationSection$/i,
    title: /^education$/i,
    panel: /^education-(\d+)(?:--|$)/i,
  },
  {
    kind: "websites",
    section: /^websites?Section$/i,
    title: /^websites?$/i,
    panel: /^webAddress-(\d+)(?:--|$)/i,
  },
];

const PANEL_ATTRS = ["id", "data-automation-id", "data-fkit-id"];
const ADD = /^add(?: another)?\b/i;
// Only a list's own Add is ever pressed: never Next, Save and Continue, Submit or Delete.
const NOT_ADD = /next|continue|submit|save|delete|remove|navigation/i;

function sectionOf(form: PageNode, rule: (typeof LISTS)[number]): PageNode | null {
  for (const node of all(form, "[data-automation-id]")) {
    if (rule.section.test(node.getAttribute("data-automation-id") ?? "")) return node;
  }
  // Newer markup names each list's group by its heading.
  for (const node of all(form, "[role='group'][aria-labelledby]")) {
    const id = (node.getAttribute("aria-labelledby") ?? "").split(/\s+/)[0] ?? "";
    const heading = id ? form.querySelector(`[id="${id.replace(/"/g, '\\"')}"]`) : null;
    if (rule.title.test(oneLine(heading?.textContent))) return node;
  }
  return null;
}

function panelsIn(section: PageNode, panel: RegExp): number {
  const seen = new Set<string>();
  for (const node of all(section, PANEL_ATTRS.map((name) => `[${name}]`).join(", "))) {
    for (const name of PANEL_ATTRS) {
      const match = panel.exec(node.getAttribute(name) ?? "");
      if (match) seen.add(match[1]!);
    }
  }
  return seen.size;
}

function isAdd(button: PageNode): boolean {
  const text = oneLine(button.textContent);
  const label = button.getAttribute("aria-label") ?? "";
  const automation = button.getAttribute("data-automation-id") ?? "";
  if (button.getAttribute("type") === "submit" || button.getAttribute("disabled") !== null)
    return false;
  if (button.getAttribute("aria-disabled") === "true") return false;
  if (NOT_ADD.test(`${text} ${label} ${automation}`)) return false;
  return ADD.test(text) || ADD.test(label) || /^add(?:[- ]?another|-button)?$/i.test(automation);
}

export function workdayLists(form: PageNode): PanelList[] {
  return LISTS.flatMap((rule) => {
    const section = sectionOf(form, rule);
    if (!section) return [];
    const add = all(section, "button").filter(isAdd).at(-1) ?? null;
    return [{ kind: rule.kind, panels: panelsIn(section, rule.panel), add }];
  });
}

export function panelsWanted(fill: FillProfile): Record<PanelKind, number> {
  return {
    work: fill.work.length,
    education: fill.education.length,
    websites: websiteLinks(fill.contact).length,
  };
}

// Presses a list's Add until it holds one panel per entry, waiting for each new panel before the next press.
export async function addPanels(
  lists: () => PanelList[],
  wanted: Record<PanelKind, number>,
  press: (button: PageNode) => void,
  shown: (ready: () => boolean) => Promise<boolean>,
): Promise<number> {
  let added = 0;
  for (const { kind } of LISTS) {
    const cap = Math.min(wanted[kind], MAX_PANELS);
    for (let presses = 0; presses < cap; presses++) {
      const list = lists().find((item) => item.kind === kind);
      if (!list?.add || list.panels >= cap) break;
      const before = list.panels;
      press(list.add);
      const grew = await shown(
        () => (lists().find((item) => item.kind === kind)?.panels ?? 0) > before,
      );
      if (!grew) break;
      added += 1;
    }
  }
  return added;
}

export function addWorkdayPanels(form: () => PageNode | null, fill: FillProfile): Promise<number> {
  return addPanels(
    () => {
      const found = form();
      return found ? workdayLists(found) : [];
    },
    panelsWanted(fill),
    (button) => (button as unknown as HTMLElement).click(),
    async (ready) => (await waitFor(() => (ready() ? true : null), PANEL_WAIT_MS)) ?? false,
  );
}
