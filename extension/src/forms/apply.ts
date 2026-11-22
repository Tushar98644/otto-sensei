import { oneLine } from "../page/dom";
import { pickOption, significantWords, type Want } from "./plan";
import type { Question } from "./scan";

// Runs in the page: values go in through the elements' own setters and real events, so React, Angular and plain forms all take them.

export type FieldResult = "filled" | "kept" | "missed";

const FILLED_ATTR = "data-otto-filled";
const OPTION_WAIT_MS = 2_500;
const STEP_MS = 80;

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export async function waitFor<T>(find: () => T | null, ms = OPTION_WAIT_MS): Promise<T | null> {
  const until = Date.now() + ms;
  for (;;) {
    const found = find();
    if (found) return found;
    if (Date.now() > until) return null;
    await sleep(STEP_MS);
  }
}

export function highlight(element: HTMLElement): void {
  element.setAttribute(FILLED_ATTR, "1");
  element.style.setProperty("background-color", "#f4f0ff", "important");
  element.style.setProperty("box-shadow", "0 0 0 2px #8b72f0", "important");
  element.style.setProperty("transition", "background-color 200ms ease-out");
}

// A value the page threw away (a box that only keeps picks from its list) isn't counted as filled.
export function kept(element: HTMLElement): boolean {
  const value = (element as HTMLInputElement).value;
  if (typeof value !== "string" || value.trim()) return true;
  element.removeAttribute(FILLED_ATTR);
  for (const property of ["background-color", "box-shadow", "transition"])
    element.style.removeProperty(property);
  return false;
}

function filledByOtto(element: Element): boolean {
  return element.getAttribute(FILLED_ATTR) === "1";
}

function visible(element: Element): boolean {
  const box = element.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

function fire(element: Element, type: string): void {
  element.dispatchEvent(new Event(type, { bubbles: true }));
}

// The isolated world's setter is the element's native one, so React's value tracker sees a change and fires onChange.
export function typeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  element.focus();
  element.value = value;
  element.dispatchEvent(
    new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }),
  );
  fire(element, "change");
}

function leave(element: HTMLElement): void {
  element.dispatchEvent(new FocusEvent("blur"));
  element.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
}

function wantText(want: Want): string {
  if (want.kind === "text") return want.value;
  if (want.kind === "choice") return want.values[0] ?? "";
  if (want.kind === "yes") return want.value ? "Yes" : "No";
  return "";
}

function fillText(element: HTMLInputElement | HTMLTextAreaElement, want: Want): FieldResult {
  const value = wantText(want);
  if (!value) return "missed";
  if (element.value.trim() && !filledByOtto(element)) return "kept";
  typeValue(element, value);
  leave(element);
  highlight(element);
  return "filled";
}

function fillSelect(element: HTMLSelectElement, want: Want): FieldResult {
  const options = Array.from(element.options);
  const real = options.filter((option) => option.value !== "" && !option.disabled);
  if (
    element.value &&
    real.some((option) => option.value === element.value) &&
    !filledByOtto(element)
  ) {
    return "kept";
  }
  const index = pickOption(
    real.map((option) => oneLine(option.textContent)),
    want,
  );
  const chosen = real[index];
  if (!chosen) return "missed";
  element.focus();
  element.value = chosen.value;
  fire(element, "input");
  fire(element, "change");
  leave(element);
  highlight(element);
  return "filled";
}

function optionText(element: Element, question: Question, index: number): string {
  return question.options[index] ?? oneLine(element.textContent);
}

function fillChoices(question: Question, want: Want): FieldResult {
  const inputs = question.nodes as unknown as HTMLInputElement[];
  if (question.kind === "radio" && inputs.some((input) => input.checked)) return "kept";
  const labels = inputs.map((input, index) => optionText(input, question, index));
  if (want.kind === "check") {
    const box = inputs[0];
    if (!box || box.checked === want.value) return box ? "kept" : "missed";
    box.click();
    return "filled";
  }
  const picks =
    question.kind === "checkbox" && want.kind === "choice"
      ? want.values.map((value) => pickOption(labels, { kind: "choice", values: [value] }))
      : [pickOption(labels, want)];
  const chosen = [...new Set(picks.filter((index) => index >= 0))];
  if (chosen.length === 0) return "missed";
  for (const index of chosen) {
    const input = inputs[index];
    if (input && !input.checked) input.click();
    const label = input?.closest("label") ?? input?.parentElement;
    if (label instanceof HTMLElement) highlight(label);
  }
  return "filled";
}

function fillYesNo(question: Question, want: Want): FieldResult {
  const buttons = question.nodes as unknown as HTMLButtonElement[];
  if (buttons.some((button) => button.getAttribute("aria-pressed") === "true")) return "kept";
  const labels = buttons.map((button, index) => optionText(button, question, index));
  const index = pickOption(labels, want);
  const button = buttons[index];
  if (!button) return "missed";
  button.click();
  highlight(button);
  return "filled";
}

function listedOptions(control: Element): HTMLElement[] {
  const owned = [control.getAttribute("aria-controls"), control.getAttribute("aria-owns")]
    .filter((id): id is string => Boolean(id))
    .map((id) => document.getElementById(id))
    .filter((node): node is HTMLElement => node !== null);
  const scopes = owned.length > 0 ? owned : [document.documentElement];
  const found = scopes.flatMap((scope) =>
    Array.from(
      scope.querySelectorAll<HTMLElement>(
        "[role='option'], [data-automation-id='promptOption'], .select__option, .dropdown-results > *",
      ),
    ),
  );
  return found.filter(visible);
}

// Waits for an option that answers: lists that search as you type fill in after a moment.
async function pickListed(control: Element, want: Want): Promise<boolean> {
  const option = await waitFor(() => {
    const options = listedOptions(control);
    return (
      options[
        pickOption(
          options.map((item) => oneLine(item.textContent)),
          want,
        )
      ] ?? null
    );
  });
  if (!option) return false;
  option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  option.click();
  await sleep(STEP_MS * 2);
  return true;
}

function closeList(control: HTMLElement): void {
  control.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
}

async function fillCombobox(input: HTMLInputElement, want: Want): Promise<FieldResult> {
  const container =
    input.closest(".select__container, [data-automation-id^='formField-']") ?? input.parentElement;
  const current = container?.querySelector(
    ".select__single-value, [data-automation-id='selectedItem']",
  );
  if (current && oneLine(current.textContent) && !filledByOtto(input)) return "kept";
  const values = want.kind === "choice" ? want.values : [wantText(want)];
  // Each wording typed whole, then by its first three words, for lists that spell a name their own way.
  const tries = values.slice(0, 3).flatMap((value) => {
    const words = value.split(/\s+/);
    const short = significantWords(value).length > 2 ? words.slice(0, 3).join(" ") : "";
    return short
      ? [
          [value, value],
          [short, value],
        ]
      : [[value, value]];
  });
  for (const [query, value] of tries) {
    if (!query || !value) continue;
    typeValue(input, want.kind === "yes" ? "" : query);
    // Greenhouse opens its lists on a key coming up, not on the input itself.
    const key = want.kind === "yes" ? "ArrowDown" : query.slice(-1);
    for (const type of ["keydown", "keyup"]) {
      input.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true }));
    }
    // One wording at a time, so "Other" is only taken when the school itself isn't listed.
    const picked = await pickListed(
      input,
      want.kind === "yes" ? want : { kind: "choice", values: [value] },
    );
    if (picked) {
      highlight(input);
      const box = input.closest<HTMLElement>(".select__control, .select-shell");
      if (box) highlight(box);
      return "filled";
    }
  }
  typeValue(input, "");
  closeList(input);
  leave(input);
  return "missed";
}

async function fillDropdown(button: HTMLButtonElement, want: Want): Promise<FieldResult> {
  const shown = oneLine(button.textContent);
  if (shown && !/^select\b|^choose\b/i.test(shown) && !filledByOtto(button)) return "kept";
  button.click();
  const picked = await pickListed(button, want);
  if (!picked) {
    closeList(button);
    return "missed";
  }
  highlight(button);
  return "filled";
}

export async function fillQuestion(question: Question, want: Want): Promise<FieldResult> {
  const element = question.nodes[0] as unknown as HTMLElement | undefined;
  if (!element || !element.isConnected) return "missed";
  switch (question.kind) {
    case "text":
    case "textarea":
      return fillText(element as HTMLInputElement, want);
    case "select":
      return fillSelect(element as HTMLSelectElement, want);
    case "radio":
    case "checkbox":
      return fillChoices(question, want);
    case "yesno":
      return fillYesNo(question, want);
    case "combobox":
      return fillCombobox(element as HTMLInputElement, want);
    case "dropdown":
      return fillDropdown(element as HTMLButtonElement, want);
    case "file":
      return "missed";
  }
}

// The PDF on a DataTransfer, then the events a person's own pick would send.
export function attachFile(input: HTMLInputElement, file: File): boolean {
  if (input.files && input.files.length > 0 && !filledByOtto(input)) return false;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
  fire(input, "input");
  fire(input, "change");
  input.setAttribute(FILLED_ATTR, "1");
  const zone = input.closest<HTMLElement>(
    ".file-upload, [class*='dropzone'], .application-field, [data-automation-id^='formField-'], label",
  );
  if (zone) highlight(zone);
  return input.files?.length === 1;
}

export function fileFromBase64(base64: string, name: string): File {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new File([bytes], name, { type: "application/pdf", lastModified: Date.now() });
}

export async function settle(ms = 300): Promise<void> {
  await sleep(ms);
}
