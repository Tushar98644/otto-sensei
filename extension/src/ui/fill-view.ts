import type { ApplyAnswers, Pay } from "@/lib/extension/answers";
import type { Ask, FillState, Toast } from "../forms/session";
import { pluralKey, t, wordsLang, type MessageKey } from "../i18n";
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
const PERIODS: [Pay["period"], MessageKey][] = [
  ["year", "perYear"],
  ["month", "perMonth"],
  ["hour", "perHour"],
];
const PLACE_NAMES: Record<string, MessageKey> = { EU: "rightsEu", US: "rightsUs", GB: "rightsGb" };

function placeName(key: string): string {
  const named = PLACE_NAMES[key];
  if (named) return t(named);
  try {
    return new Intl.DisplayNames([wordsLang()], { type: "region" }).of(key) ?? key;
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

const yesNo = (): [string, string][] => [
  ["", t("choose")],
  ["yes", t("yes")],
  ["no", t("no")],
];

const boolValue = (value: boolean | null | undefined) =>
  value === true ? "yes" : value === false ? "no" : "";

function payInputs(prefix: string, pay: Pay | null, label: string): string {
  const currency = pay?.currency ?? "INR";
  const list = CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES];
  const periods = PERIODS.map(([value, key]): [string, string] => [value, t(key)]);
  return `<div class="pay" role="group" aria-label="${esc(label)}">
    <input data-field="${esc(prefix)}.amount" inputmode="decimal" placeholder="${t("payHint")}" value="${pay ? esc(String(pay.amount)) : ""}" aria-label="${t("payAmount", esc(label))}">
    <select data-field="${esc(prefix)}.currency" aria-label="${t("payCurrency", esc(label))}">${options(
      list.map((code) => [code, code]),
      currency,
    )}</select>
    <select data-field="${esc(prefix)}.period" aria-label="${t("payPer", esc(label))}">${options(periods, pay?.period ?? "year")}</select>
  </div>`;
}

function askField(ask: Ask): string {
  const id = esc(ask.key);
  const label = `<span class="ask-label">${esc(ask.label)}</span>`;
  switch (ask.input) {
    case "yesno":
      return `<label class="ask">${label}<select data-field="${id}">${options(yesNo(), "")}</select></label>`;
    case "choice":
      return `<label class="ask">${label}<select data-field="${id}">${options(
        [["", t("choose")], ...ask.options.map((option): [string, string] => [option, option])],
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
      return `<label class="ask">${label}<input data-field="${id}" placeholder="${t("yourAnswer")}"></label>`;
  }
}

function asksBlock(state: FillState): string {
  if (state.asks.length === 0) return "";
  const count = state.asks.length;
  return `<section class="asks" data-form="asks" aria-label="${t("asksRegion")}">
    <p class="eyebrow">${t(pluralKey(count, "asksOne", "asksOther"), count)}</p>
    ${state.asks.map(askField).join("")}
    <div class="row"><button class="btn primary" data-action="save-asks"${state.asking ? ' aria-busy="true" disabled' : ""}>${t("saveAndFill")}</button></div>
    <p class="note">${t("savedToAccount")}</p>
  </section>`;
}

function draftBlock(state: FillState): string {
  const draft = state.draft;
  if (!draft) return "";
  const body = draft.busy
    ? `<p class="drafting" role="status"><span class="spinner"></span>${t("drafting")}</p>`
    : draft.error
      ? `<p class="note error" role="alert">${esc(draft.error)}</p>`
      : `<textarea data-field="draft" rows="8" aria-label="${t("draftAria")}">${esc(draft.text)}</textarea>`;
  const actions = draft.busy
    ? `<button class="btn secondary" data-action="cancel-draft">${t("cancel")}</button>`
    : draft.error
      ? `<button class="btn secondary" data-action="cancel-draft">${t("close")}</button>`
      : `<button class="btn primary" data-action="use-draft">${icon("check")}${t("useDraft")}</button><button class="btn secondary" data-action="cancel-draft">${t("discard")}</button>`;
  return `<section class="draft" data-form="draft" aria-label="${t("draftWithOtto")}">
    <p class="eyebrow">${t("draftWithOtto")}</p>
    <p class="draft-q">${esc(draft.question)}</p>
    ${body}
    <div class="actions">${actions}</div>
    ${draft.busy || draft.error ? "" : `<p class="note">${t("draftNote")}</p>`}
  </section>`;
}

function summary(state: FillState): string {
  const report = state.report;
  if (!report) return "";
  const lines: string[] = [];
  const filled = t(pluralKey(report.filled, "fieldsOne", "fieldsOther"), report.filled);
  const done = report.file
    ? t("filledAttached", filled, `<b>${esc(report.file)}</b>`)
    : t("filled", filled);
  lines.push(`<p class="done-line">${icon("circleCheck")}<span>${done}</span></p>`);
  if (report.file) {
    lines.push(
      `<p class="note">${report.tailored ? t("fromTailored") : t("fromResume", esc(report.resumeTitle))}</p>`,
    );
  }
  if (report.fileError) lines.push(`<p class="note error">${esc(report.fileError)}</p>`);
  if (report.protectedCount > 0) {
    const left = pluralKey(report.protectedCount, "protectedOne", "protectedOther");
    lines.push(`<p class="note">${icon("shield", 14)} ${t(left, report.protectedCount)}</p>`);
  }
  if (report.missed.length > 0) {
    const names = report.missed.slice(0, 3).map(esc).join(", ");
    const more = report.missed.length - 3;
    lines.push(
      `<p class="note">${more > 0 ? t("fillYourselfMore", names, more) : t("fillYourself", names)}</p>`,
    );
  }
  if (report.drafts > 0 && !state.draft) {
    const write = pluralKey(report.drafts, "draftsOne", "draftsOther");
    lines.push(`<p class="note">${t(write, report.drafts)}</p>`);
  }
  lines.push(`<p class="note strong">${t("checkSubmit")}</p>`);
  return `<div class="filled">${lines.join("")}</div>`;
}

export function fillBlock(panel: FormPanel): string {
  const { state } = panel;
  if (!panel.allowed) {
    return `<div class="fill"><button class="btn secondary wide" data-action="fill">${icon("textCursorInput")}${t("fillWithOtto")}<span class="pro">PRO</span></button></div>`;
  }
  if (state.phase === "idle" || state.phase === "loading") {
    const busy = state.phase === "loading" ? ' aria-busy="true" disabled' : "";
    return `<div class="fill"><button class="btn primary wide" data-action="fill"${busy}>${icon("textCursorInput")}${t("fillWithOtto")}</button>
      <p class="note">${t("fillIntro")}</p></div>`;
  }
  if (state.phase === "error") {
    return `<div class="fill"><p class="note error" role="alert">${esc(state.error ?? t("fillFailed"))}</p>
      <button class="btn secondary wide" data-action="fill">${t("tryAgain")}</button></div>`;
  }
  return `<div class="fill">
    ${draftBlock(state)}
    ${state.draft ? "" : summary(state)}
    ${state.draft ? "" : asksBlock(state)}
    ${state.error ? `<p class="note error" role="alert">${esc(state.error)}</p>` : ""}
    <div class="links"><button class="link-btn" data-action="answers">${t("yourSavedAnswers")}</button><button class="link-btn" data-action="fill">${t("fillAgain")}</button></div>
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
        <select data-field="rights.${esc(key)}.authorized" aria-label="${t("canWorkIn", esc(placeName(key)))}">${options(
          [
            ["", t("canWorkAsk")],
            ["yes", t("canWork")],
            ["no", t("cantYet")],
          ],
          boolValue(right?.authorized),
        )}</select>
        <select data-field="rights.${esc(key)}.sponsorship" aria-label="${t("visaIn", esc(placeName(key)))}">${options(
          [
            ["", t("visaAsk")],
            ["no", t("noVisa")],
            ["yes", t("needsVisa")],
          ],
          boolValue(right?.sponsorship),
        )}</select></div>`;
    })
    .join("");
}

export function answersBody(state: FillState): string {
  if (state.answersBusy && !state.answers) {
    return `<p class="drafting" role="status"><span class="spinner"></span>${t("readingAnswers")}</p>`;
  }
  if (!state.answers) {
    return `<p class="note error" role="alert">${esc(state.answersError ?? t("answersFailed"))}</p>`;
  }
  const { saved, effective } = state.answers;
  const text = (field: "noticePeriod" | "startDate" | "heardFrom", label: string, hint: string) =>
    `<label class="ask"><span class="ask-label">${label}</span><input data-field="${field}" value="${esc(saved[field])}" placeholder="${esc(hint)}"></label>`;
  const custom = saved.custom
    .map(
      (item, index) =>
        `<label class="ask"><span class="ask-label">${esc(item.question)}</span><input data-field="custom.${index}" value="${esc(item.answer)}" placeholder="${esc(t("forgetHint"))}"></label>`,
    )
    .join("");
  return `<div class="answers" data-form="answers">
    <p class="note">${t("answersIntro")}</p>
    ${text("noticePeriod", t("noticePeriod"), t("noticeHint"))}
    <div class="ask"><span class="ask-label">${t("currentPay")}</span>${payInputs("currentPay", saved.currentPay, t("currentPay"))}</div>
    <div class="ask"><span class="ask-label">${t("expectedPay")}</span>${payInputs("expectedPay", saved.expectedPay, t("expectedPay"))}</div>
    <div class="ask"><span class="ask-label">${t("whereYouCanWork")}</span>${rightsRows(effective, saved)}</div>
    <label class="ask"><span class="ask-label">${t("relocate")}</span><select data-field="relocate">${options(yesNo(), boolValue(saved.relocate))}</select></label>
    ${text("startDate", t("startDate"), t("startHint"))}
    ${text("heardFrom", t("heardFrom"), t("heardHint"))}
    ${custom ? `<p class="eyebrow">${t("otherQuestions")}</p>${custom}` : ""}
    ${state.answersError ? `<p class="note error" role="alert">${esc(state.answersError)}</p>` : ""}
    <div class="actions"><button class="btn primary" data-action="save-answers"${state.answersBusy ? ' aria-busy="true" disabled' : ""}>${t("saveAnswers")}</button><button class="btn secondary" data-action="close-answers">${t("back")}</button></div>
  </div>`;
}

export function toastHtml(toast: Toast | null): string {
  if (!toast) return "";
  if (toast.kind === "undone") {
    return `<div class="toast" role="status"><p>${t("removedFromApplications")}</p><button class="icon-btn" data-action="close-toast" aria-label="${t("close")}">${icon("x")}</button></div>`;
  }
  if (toast.kind === "error") {
    return `<div class="toast error" role="alert"><p>${esc(toast.message)}</p><button class="icon-btn" data-action="close-toast" aria-label="${t("close")}">${icon("x")}</button></div>`;
  }
  const what =
    toast.role && toast.company
      ? t("roleAtCompany", toast.role, toast.company)
      : toast.role || toast.company;
  return `<div class="toast" role="status">
    <span class="toast-icon">${icon("fileCheck")}</span>
    <div class="toast-text"><p><b>${t("addedToApplications")}</b></p>${what ? `<p class="note">${t("appliedToday", esc(what))}</p>` : ""}</div>
    <button class="btn secondary small" data-action="undo-applied"${toast.busy ? ' aria-busy="true" disabled' : ""}>${icon("undo", 14)}${t("undo")}</button>
    <button class="link-btn" data-action="open-applied">${t("open")}</button>
  </div>`;
}
