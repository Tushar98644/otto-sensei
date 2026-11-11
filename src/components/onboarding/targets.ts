import { ROUTES } from "@/components/site/routes";
import { bulletInputId } from "@/components/studio/editor/focus";
import { STEP_LABELS, type StudioStep } from "@/lib/store/resume-store";

// Where each stop points. An element tagged data-tour="<id>" always wins; the lookups after it
// read today's markup (landmark labels, headings, button words), so the tours work without
// touching the screens they describe. When one of those screens changes its words, tag the
// element instead of updating the text here.

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

// The sidebar and the phone strip both carry the same targets; only one of them is on screen.
function tagged(id: string): Element | null {
  return firstVisible(document.querySelectorAll(`[data-tour="${id}"]`));
}

// The block of the page an element belongs to: the child of the page's top-level column. A label
// alone would light up a sliver; its whole card is what the stop is about.
function pageBlock(element: Element): Element {
  const page = document.querySelector("main")?.firstElementChild;
  if (!page?.contains(element) || page === element) return element;
  let node = element;
  while (node.parentElement && node.parentElement !== page) node = node.parentElement;
  return node;
}

// Studio

export function readTextPanel(): Element | null {
  return tagged("studio-read-text") ?? readTextSection() ?? readTextTab();
}

function readTextSection(): Element | null {
  const heading = byText("main section h2", (text) => text === "What hiring software reads");
  const section = heading?.closest("section");
  return section && isVisible(section) ? section : null;
}

// Phones show the extracted text behind a tab, and only the open tab's panel exists.
function readTextTab(): Element | null {
  return byText('main [role="tab"]', (text) => text === "What software reads");
}

// The editor is up: a line field exists, or at least its step bar (every section folded away).
export function fixStepShown(): boolean {
  const field = document.querySelector(`main [id^="${bulletInputId("")}"]`);
  return field !== null || stepBarTailor() !== null;
}

// The ruled row of the first of these lines that is on screen.
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

// The step bar under the editor sticks to the bottom of the screen, so it is in view wherever the
// tour has scrolled to; the stepper at the top is the fallback.
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

// Dashboard

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

// The first-login checklist on Home; gone once hidden or done, and then the stop is skipped.
export function setupList(): Element | null {
  return tagged("dashboard-setup");
}

// A section's link in the sidebar, or its tab on the phone strip. Sections only in "More" on a
// phone have no target there, so their stops are skipped.
export function sectionLink(id: "jobs" | "applications" | "interview" | "portfolio"): Element | null {
  return tagged(`dashboard-${id}`);
}
