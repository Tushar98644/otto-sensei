import type { ApplyAnswers, Pay } from "@/lib/extension/answers";
import type { Ask, FillState, Toast } from "../forms/session";
import { icon } from "./icons";

// Fill with Otto's part of the card: the button, what was filled, the questions Otto needs, drafts and saved answers.

export type FormPanel = { allowed: boolean; state: FillState };

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const pluralize = (count: number, one: string) => `${count} ${count === 1 ? one : `${one}s`}`;

const CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "SGD",
  "AED",
  "JPY",
  "CHF",
  "SEK",
  "NZD",
];
const PERIODS: [Pay["period"], string][] = [
  ["year", "a year"],
  ["month", "a month"],
  ["hour", "an hour"],
];
const PLACE_NAMES: Record<string, string> = { EU: "the EU", US: "the US", GB: "the UK" };
const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function placeName(key: string): string {
  try {
    return PLACE_NAMES[key] ?? regionNames.of(key) ?? key;
  } catch {
    return key;
  }
}

function options(values: [string, string][], selected: string): string {
  return values
    .map(
      ([value, label]) =>
        `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(label)}</option>`,
    )
    .join("");
}

const YES_NO: [string, string][] = [
  ["", "Choose"],
  ["yes", "Yes"],
  ["no", "No"],
];

const boolValue = (value: boolean | null | undefined) =>
  value === true ? "yes" : value === false ? "no" : "";

function payInputs(prefix: string, pay: Pay | null, label: string): string {
  const currency = pay?.currency ?? "INR";
  const list = CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES];
  return `<div class="pay" role="group" aria-label="${esc(label)}">
    <input data-field="${esc(prefix)}.amount" inputmode="decimal" placeholder="Like 18 LPA" value="${pay ? esc(String(pay.amount)) : ""}" aria-label="${esc(label)}: amount">
    <select data-field="${esc(prefix)}.currency" aria-label="${esc(label)}: currency">${options(
      list.map((code) => [code, code]),
      currency,
    )}</select>
    <select data-field="${esc(prefix)}.period" aria-label="${esc(label)}: per">${options(PERIODS, pay?.period ?? "year")}</select>
  </div>`;
}

function askField(ask: Ask): string {
  const id = esc(ask.key);
  const label = `<span class="ask-label">${esc(ask.label)}</span>`;
  switch (ask.input) {
    case "yesno":
      return `<label class="ask">${label}<select data-field="${id}">${options(YES_NO, "")}</select></label>`;
    case "choice":
      return `<label class="ask">${label}<select data-field="${id}">${options(
        [["", "Choose"], ...ask.options.map((option): [string, string] => [option, option])],
        "",
      )}</select></label>`;
    case "multi":
      return `<fieldset class="ask"><legend class="ask-label">${esc(ask.label)}</legend>${ask.options
        .map(
          (option) =>
            `<label class="check"><input type="checkbox" data-field="${id}" value="${esc(option)}"><span>${esc(option)}</span></label>`,
        )
        .join("")}</fieldset>`;
    case "pay":
      return `<div class="ask">${label}${payInputs(ask.key, null, ask.label)}</div>`;
    case "text":
      return `<label class="ask">${label}<input data-field="${id}" placeholder="Your answer"></label>`;
  }
}

function asksBlock(state: FillState): string {
  if (state.asks.length === 0) return "";
  const count = state.asks.length;
  return `<section class="asks" data-form="asks" aria-label="Answers Otto needs">
    <p class="eyebrow">Otto needs ${count === 1 ? "one answer" : `${count} answers`}</p>
    ${state.asks.map(askField).join("")}
    <div class="row"><button class="btn primary" data-action="save-asks"${state.asking ? ' aria-busy="true" disabled' : ""}>Save and fill</button></div>
    <p class="note">Saved to your account, so the next form doesn't ask.</p>
  </section>`;
}

function draftBlock(state: FillState): string {
  const draft = state.draft;
  if (!draft) return "";
  const body = draft.busy
    ? `<p class="drafting" role="status"><span class="spinner"></span>Otto is drafting from your resume and this post…</p>`
    : draft.error
      ? `<p class="note error" role="alert">${esc(draft.error)}</p>`
      : `<textarea data-field="draft" rows="8" aria-label="Otto's draft">${esc(draft.text)}</textarea>`;
  const actions = draft.busy
    ? `<button class="btn secondary" data-action="cancel-draft">Cancel</button>`
    : draft.error
      ? `<button class="btn secondary" data-action="cancel-draft">Close</button>`
      : `<button class="btn primary" data-action="use-draft">${icon("check")}Put it in the form</button><button class="btn secondary" data-action="cancel-draft">Discard</button>`;
  return `<section class="draft" data-form="draft" aria-label="Draft with Otto">
    <p class="eyebrow">Draft with Otto</p>
    <p class="draft-q">${esc(draft.question)}</p>
    ${body}
    <div class="actions">${actions}</div>
    ${draft.busy || draft.error ? "" : `<p class="note">Edit it here first. Nothing goes in until you press the button.</p>`}
  </section>`;
}

function summary(state: FillState): string {
  const report = state.report;
  if (!report) return "";
  const lines: string[] = [];
  const filled = pluralize(report.filled, "field");
  lines.push(
    `<p class="done-line">${icon("circleCheck")}<span>Filled ${filled}${report.file ? ` and attached <b>${esc(report.file)}</b>` : ""}.</span></p>`,
  );
  if (report.file) {
    lines.push(
      `<p class="note">${report.tailored ? "Your copy tailored for this job" : `From ${esc(report.resumeTitle)}`}.</p>`,
    );
  }
  if (report.fileError) lines.push(`<p class="note error">${esc(report.fileError)}</p>`);
  if (report.protectedCount > 0) {
    lines.push(
      `<p class="note">${icon("shield", 14)} Left for you: ${pluralize(report.protectedCount, "self-identification or consent question")}. Otto never answers those.</p>`,
    );
  }
  if (report.missed.length > 0) {
    const names = report.missed.slice(0, 3).map(esc).join(", ");
    lines.push(
      `<p class="note">Fill these yourself: ${names}${report.missed.length > 3 ? ` and ${report.missed.length - 3} more` : ""}.</p>`,
    );
  }
  if (report.drafts > 0 && !state.draft) {
    lines.push(
      `<p class="note">${pluralize(report.drafts, "question")} to write: press Draft with Otto beside ${report.drafts === 1 ? "it" : "each"}.</p>`,
    );
  }
  lines.push(
    `<p class="note strong">Check every answer, then press Submit yourself. Otto never sends a form.</p>`,
  );
  return `<div class="filled">${lines.join("")}</div>`;
}

export function fillBlock(panel: FormPanel): string {
  const { state } = panel;
  if (!panel.allowed) {
    return `<div class="fill"><button class="btn secondary wide" data-action="fill">${icon("textCursorInput")}Fill with Otto<span class="pro">PRO</span></button></div>`;
  }
  if (state.phase === "idle" || state.phase === "loading") {
    const busy = state.phase === "loading" ? ' aria-busy="true" disabled' : "";
    return `<div class="fill"><button class="btn primary wide" data-action="fill"${busy}>${icon("textCursorInput")}Fill with Otto</button>
      <p class="note">Otto fills this form from your resume and saved answers. You check it and press Submit.</p></div>`;
  }
  if (state.phase === "error") {
    return `<div class="fill"><p class="note error" role="alert">${esc(state.error ?? "Otto couldn't fill this form.")}</p>
      <button class="btn secondary wide" data-action="fill">Try again</button></div>`;
  }
  return `<div class="fill">
    ${draftBlock(state)}
    ${state.draft ? "" : summary(state)}
    ${state.draft ? "" : asksBlock(state)}
    ${state.error ? `<p class="note error" role="alert">${esc(state.error)}</p>` : ""}
    <div class="links"><button class="link-btn" data-action="answers">Your saved answers</button><button class="link-btn" data-action="fill">Fill again</button></div>
  </div>`;
}

function rightsRows(answers: ApplyAnswers, saved: ApplyAnswers): string {
  const keys = [
    ...new Set([
      "US",
      "GB",
      "EU",
      "CA",
      ...Object.keys(answers.workRights),
      ...Object.keys(saved.workRights),
    ]),
  ];
  return keys
    .map((key) => {
      const right = answers.workRights[key];
      return `<div class="rights-row"><span>${esc(placeName(key))}</span>
        <select data-field="rights.${esc(key)}.authorized" aria-label="Can work in ${esc(placeName(key))}">${options(
          [
            ["", "Can work?"],
            ["yes", "Can work"],
            ["no", "Can't yet"],
          ],
          boolValue(right?.authorized),
        )}</select>
        <select data-field="rights.${esc(key)}.sponsorship" aria-label="Needs a visa sponsored in ${esc(placeName(key))}">${options(
          [
            ["", "Visa?"],
            ["no", "No visa needed"],
            ["yes", "Needs a visa"],
          ],
          boolValue(right?.sponsorship),
        )}</select></div>`;
    })
    .join("");
}

export function answersBody(state: FillState): string {
  if (state.answersBusy && !state.answers) {
    return `<p class="drafting" role="status"><span class="spinner"></span>Reading your answers…</p>`;
  }
  if (!state.answers) {
    return `<p class="note error" role="alert">${esc(state.answersError ?? "Otto couldn't read your answers.")}</p>`;
  }
  const { saved, effective } = state.answers;
  const text = (field: "noticePeriod" | "startDate" | "heardFrom", label: string, hint: string) =>
    `<label class="ask"><span class="ask-label">${label}</span><input data-field="${field}" value="${esc(saved[field])}" placeholder="${esc(hint)}"></label>`;
  const custom = saved.custom
    .map(
      (item, index) =>
        `<label class="ask"><span class="ask-label">${esc(item.question)}</span><input data-field="custom.${index}" value="${esc(item.answer)}" placeholder="Leave empty to forget it"></label>`,
    )
    .join("");
  return `<div class="answers" data-form="answers">
    <p class="note">Otto puts these into forms that ask. They're saved to your account, so every browser has them.</p>
    ${text("noticePeriod", "Notice period", "Like 30 days, or Immediately")}
    <div class="ask"><span class="ask-label">Current pay</span>${payInputs("currentPay", saved.currentPay, "Current pay")}</div>
    <div class="ask"><span class="ask-label">Expected pay</span>${payInputs("expectedPay", saved.expectedPay, "Expected pay")}</div>
    <div class="ask"><span class="ask-label">Where you can work</span>${rightsRows(effective, saved)}</div>
    <label class="ask"><span class="ask-label">Willing to relocate</span><select data-field="relocate">${options(YES_NO, boolValue(saved.relocate))}</select></label>
    ${text("startDate", "Earliest start date", "Like 1 March 2027, or 30 days after an offer")}
    ${text("heardFrom", "How you heard about the job", "Company website")}
    ${custom ? `<p class="eyebrow">Other questions you answered</p>${custom}` : ""}
    ${state.answersError ? `<p class="note error" role="alert">${esc(state.answersError)}</p>` : ""}
    <div class="actions"><button class="btn primary" data-action="save-answers"${state.answersBusy ? ' aria-busy="true" disabled' : ""}>Save answers</button><button class="btn secondary" data-action="close-answers">Back</button></div>
  </div>`;
}

export function toastHtml(toast: Toast | null): string {
  if (!toast) return "";
  if (toast.kind === "undone") {
    return `<div class="toast" role="status"><p>Removed from Applications.</p><button class="icon-btn" data-action="close-toast" aria-label="Close">${icon("x")}</button></div>`;
  }
  if (toast.kind === "error") {
    return `<div class="toast error" role="alert"><p>${esc(toast.message)}</p><button class="icon-btn" data-action="close-toast" aria-label="Close">${icon("x")}</button></div>`;
  }
  const what = [toast.role, toast.company].filter(Boolean).join(" at ");
  return `<div class="toast" role="status">
    <span class="toast-icon">${icon("fileCheck")}</span>
    <div class="toast-text"><p><b>Added to Applications</b></p>${what ? `<p class="note">${esc(what)}, applied today.</p>` : ""}</div>
    <button class="btn secondary small" data-action="undo-applied"${toast.busy ? ' aria-busy="true" disabled' : ""}>${icon("undo", 14)}Undo</button>
    <button class="link-btn" data-action="open-applied">Open</button>
  </div>`;
}
