import { ROUTES } from "@/components/site/routes";
import { bulletInputId } from "@/components/studio/editor/focus";
import { STEP_LABELS, type StudioStep } from "@/lib/store/resume-store";

function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0;
}

function firstVisible(elements: Iterable<Element>): Element | null {
  for (const element of elements) if (isVisible(element)) return element;
  return null;
}

function textOf(element: Element): string {
  return (element.textContent ?? "").replace(/\s+/g, " ").trim();
}

function byText(selector: string, matches: (text: string) => boolean): Element | null {
  const all = document.querySelectorAll(selector);
  return firstVisible([...all].filter((element) => matches(textOf(element))));
}

function tagged(id: string): Element | null {
  return firstVisible(document.querySelectorAll(`[data-tour="${id}"]`));
}

function pageBlock(element: Element): Element {
  const page = document.querySelector("main")?.firstElementChild;
  if (!page?.contains(element) || page === element) return element;
  let node = element;
  while (node.parentElement && node.parentElement !== page) node = node.parentElement;
  return node;
}

export function readTextPanel(): Element | null {
  return tagged("studio-read-text") ?? readTextSection() ?? readTextTab();
}

function readTextSection(): Element | null {
  const heading = byText("main section h2", (text) => text === "What hiring software reads");
  const section = heading?.closest("section");
  return section && isVisible(section) ? section : null;
}

function readTextTab(): Element | null {
  return byText('main [role="tab"]', (text) => text === "What software reads");
}

export function fixStepShown(): boolean {
  const field = document.querySelector(`main [id^="${bulletInputId("")}"]`);
  return field !== null || stepBarTailor() !== null;
}

export function lineRow(lineIds: readonly string[]): Element | null {
  for (const id of lineIds) {
    const field = document.getElementById(bulletInputId(id));
    const row = field?.closest("li");
    if (field && row && isVisible(field)) return row;
  }
  return null;
}

export function fixWithOttoButton(row: Element): HTMLButtonElement | null {
  const buttons = [...row.querySelectorAll("button")];
  return buttons.find((button) => !button.disabled && textOf(button) === "Fix with Otto") ?? null;
}

function stepperButton(step: StudioStep): Element | null {
  const label = STEP_LABELS[step];
  return byText('nav[aria-label="Studio steps"] button', (text) => text.endsWith(label));
}

export function tailorControl(): Element | null {
  return tagged("studio-tailor") ?? stepBarTailor() ?? stepperButton("tailor");
}

function stepBarTailor(): Element | null {
  return byText("main button", (text) => text === "Next: Tailor to a job");
}

export function downloadControl(): Element | null {
  return (
    tagged("studio-download") ??
    byText("main button", (text) => text === "Skip to download") ??
    stepperButton("download")
  );
}

export function quickActions(): Element | null {
  const section = document.getElementById("actions-heading")?.closest("section") ?? null;
  return tagged("dashboard-actions") ?? (section && isVisible(section) ? section : null);
}

export function libraryLink(): Element | null {
  return (
    tagged("dashboard-library") ??
    firstVisible(
      document.querySelectorAll(`nav[aria-label="Dashboard"] a[href="${ROUTES.dashboardResumes}"]`),
    )
  );
}

export function winRatePanel(): Element | null {
  const tab = byText("main span", (text) => text === "Win rate");
  return tagged("dashboard-win-rate") ?? (tab ? pageBlock(tab) : null);
}

export function setupList(): Element | null {
  return tagged("dashboard-setup");
}

export function sectionLink(id: "jobs" | "applications" | "interview" | "portfolio"): Element | null {
  return tagged(`dashboard-${id}`);
}
