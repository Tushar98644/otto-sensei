import type { ApplyAnswers, ApplyAnswersPatch, Pay } from "@/lib/extension/answers";
import type { FillProfile } from "@/lib/extension/types";
import { defaultPageSize } from "@/lib/pdf/page-size";
import type {
  AnswersReply,
  AppliedReply,
  ArmedReply,
  DraftReply,
  FileReply,
  FillReply,
  Pending,
  Request,
} from "../messages";
import type { JobPost } from "../page/post";
import {
  attachFile,
  fileFromBase64,
  fillQuestion,
  highlight,
  kept,
  settle,
  typeValue,
} from "./apply";
import { mountDraftButtons } from "./drafts";
import { confirmation, formRoot, PLATFORMS, type FormPlatform } from "./platforms";
import { planForm, wantForAnswer, type AskInput, type Planned, type Store } from "./plan";
import { scanQuestions, type Question } from "./scan";
import { addWorkdayPanels } from "./workday";

export type Ask = { key: string; label: string; input: AskInput; options: string[]; store: Store };

export type FillReport = {
  filled: number;
  kept: number;
  missed: string[];
  file: string | null;
  fileError: string | null;
  protectedCount: number;
  drafts: number;
  resumeTitle: string;
  tailored: boolean;
  steps: number;
};

export type Draft = {
  key: string;
  question: string;
  text: string;
  busy: boolean;
  error: string | null;
};

export type Toast =
  | { kind: "applied"; id: string; company: string; role: string; boardPath: string; busy: boolean }
  | { kind: "undone" }
  | { kind: "error"; message: string };

export type FillState = {
  phase: "idle" | "loading" | "done" | "error";
  error: string | null;
  report: FillReport | null;
  asks: Ask[];
  asking: boolean;
  draft: Draft | null;
  answers: { saved: ApplyAnswers; effective: ApplyAnswers } | null;
  answersError: string | null;
  answersBusy: boolean;
  toast: Toast | null;
};

export type FormContext = {
  platform: FormPlatform;
  send: <T>(request: Request) => Promise<T>;
  post: () => JobPost | null;
  resumeId: () => string | null;
  changed: () => void;
  // The card comes forward when a draft starts from a button in the page.
  reveal: () => void;
};

const WATCH_MS = 500;
const CONFIRM_FOR_MS = 15 * 60 * 1000;
const SUBMIT_RECENT_MS = 10 * 60 * 1000;
const PARSE_WAIT_MS = 1_200;
const TYPED_CHECK_MS = 400;
const PANEL_SETTLE_MS = 300;
const NO_POST =
  "Otto needs this job's post to draft an answer. Open the job's own page once, then come back to the form.";

const randomId = (bytes = 18) =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(bytes))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

function storeKey(store: Store): string {
  if (store.kind === "answer") return `answer:${store.field}`;
  if (store.kind === "rights") return `rights:${store.place}:${store.need}`;
  return `custom:${store.question.toLowerCase()}`;
}

function parseAmount(raw: string): number | null {
  const match = /^([\d.,\s]+)\s*(k|l|lpa|lac|lakhs?|cr|crores?|m|mn)?\b/i.exec(raw.trim());
  if (!match) return null;
  const base = Number(match[1]!.replace(/[,\s]/g, ""));
  if (!Number.isFinite(base)) return null;
  const unit = (match[2] ?? "").toLowerCase();
  const scale =
    unit === "k"
      ? 1e3
      : /^(?:l|lpa|lac|lakh)/.test(unit)
        ? 1e5
        : /^cr/.test(unit)
          ? 1e7
          : /^m/.test(unit)
            ? 1e6
            : 1;
  return Math.round(base * scale);
}

export function payFrom(fields: Record<string, string>, prefix: string): Pay | null {
  const amount = parseAmount(fields[`${prefix}.amount`] ?? "");
  if (amount === null) return null;
  const currency = /^[A-Z]{3}$/.test(fields[`${prefix}.currency`] ?? "")
    ? fields[`${prefix}.currency`]!
    : "USD";
  const period = fields[`${prefix}.period`];
  return { amount, currency, period: period === "month" || period === "hour" ? period : "year" };
}

export function createFormSession(ctx: FormContext) {
  const state: FillState = {
    phase: "idle",
    error: null,
    report: null,
    asks: [],
    asking: false,
    draft: null,
    answers: null,
    answersError: null,
    answersBusy: false,
    toast: null,
  };
  let fill: FillProfile | null = null;
  let questions = new Map<string, Question>();
  let draftable: Question[] = [];
  let pending: Pending | null = null;
  let submittedAt: number | null = null;
  let stepKey = "";
  let autoNext = false;
  let filling = false;
  let watchUntil = 0;
  let watchTimer = 0;
  const drafts = mountDraftButtons((key) => void startDraft(key));

  const root = () => document.documentElement;
  const form = () => formRoot(ctx.platform, root());

  function present(): boolean {
    return form() !== null;
  }

  function postContext() {
    const post = ctx.post();
    return post
      ? { title: post.title, company: post.company, location: post.location, text: post.text }
      : null;
  }

  function showDrafts() {
    drafts.show(
      draftable
        .filter(
          (question) => (question.nodes[0] as unknown as HTMLElement | undefined)?.isConnected,
        )
        .map((question) => ({
          key: question.key,
          field: question.nodes[0] as unknown as HTMLElement,
          busy: state.draft?.key === question.key && state.draft.busy,
        })),
    );
  }

  async function upload(planned: Planned[], report: FillReport): Promise<boolean> {
    const file = planned.find((item) => item.status === "fill" && item.want.kind === "file");
    if (!file || !fill) return false;
    const input = file.question.nodes[0] as unknown as HTMLInputElement;
    const reply = await ctx.send<FileReply>({
      type: "resume-file",
      id: fill.resume.id,
      size: defaultPageSize(navigator.language),
    });
    if (!reply.ok) {
      report.fileError = reply.message;
      return false;
    }
    const name = fill.resume.fileName || reply.name;
    if (!attachFile(input, fileFromBase64(reply.base64, name))) {
      report.kept += 1;
      return false;
    }
    report.file = name;
    return true;
  }

  function scan(): Question[] {
    const found = form();
    return found ? scanQuestions(ctx.platform, root(), found) : [];
  }

  async function fillOnce(report: FillReport): Promise<void> {
    if (!fill) return;
    const first = planForm(scan(), fill, postContext());
    // Some forms read the resume and fill fields from it; let them before Otto fills the rest.
    if (await upload(first, report)) await settle(PARSE_WAIT_MS);
    // Workday's lists start empty: a panel per job, school and link, added with each list's own Add.
    if (ctx.platform === "workday" && (await addWorkdayPanels(form, fill)) > 0)
      await settle(PANEL_SETTLE_MS);
    const found = scan();
    questions = new Map(found.map((question) => [question.key, question]));
    const planned = planForm(found, fill, postContext());
    // Only what this form (or this step of it) asks: a step left behind takes its questions with it.
    const asks = new Map<string, Ask>();
    const counted = new Set<string>();
    const typed: Question[] = [];
    for (const item of planned) {
      if (item.status === "protected") {
        // One question can be several controls (a list and its "other" box): count it once.
        if (!counted.has(item.question.label)) report.protectedCount += 1;
        counted.add(item.question.label);
      } else if (item.status === "draft") {
        if (!draftable.some((question) => question.key === item.question.key))
          draftable.push(item.question);
      } else if (item.status === "ask") {
        const key = storeKey(item.store);
        if (!asks.has(key)) {
          asks.set(key, {
            key,
            label: item.question.label,
            input: item.input,
            options: item.question.options,
            store: item.store,
          });
        }
      } else if (item.status === "fill" && item.want.kind !== "file") {
        const result = await fillQuestion(item.question, item.want);
        if (result === "filled") {
          report.filled += 1;
          if (item.question.kind === "text" || item.question.kind === "textarea")
            typed.push(item.question);
        } else if (result === "kept") report.kept += 1;
        else if (item.question.required) report.missed.push(item.question.label);
      }
    }
    await settle(TYPED_CHECK_MS);
    for (const question of typed) {
      if (kept(question.nodes[0] as unknown as HTMLElement)) continue;
      report.filled -= 1;
      if (question.required) report.missed.push(question.label);
    }
    state.asks = [...asks.values()];
    report.drafts = draftable.length;
    report.steps += 1;
  }

  function newReport(): FillReport {
    return {
      filled: 0,
      kept: 0,
      missed: [],
      file: null,
      fileError: null,
      protectedCount: 0,
      drafts: 0,
      resumeTitle: fill?.resume.title ?? "",
      tailored: fill?.resume.tailored ?? false,
      steps: 0,
    };
  }

  async function arm() {
    const post = ctx.post();
    if (!fill || !post) return;
    pending = {
      applicationId: pending?.url === post.url ? pending.applicationId : crypto.randomUUID(),
      platform: ctx.platform,
      url: post.url,
      title: post.title,
      company: post.company,
      resumeId: fill.resume.id,
      resumeTitle: fill.resume.title,
      tailored: fill.resume.tailored,
      filledAt: Date.now(),
      submittedAt: null,
    };
    await ctx.send({ type: "arm", pending });
  }

  async function run(): Promise<void> {
    if (filling) return;
    filling = true;
    state.phase = "loading";
    state.error = null;
    ctx.changed();
    try {
      const post = ctx.post();
      const reply = await ctx.send<FillReply>({
        type: "fill-data",
        resumeId: ctx.resumeId(),
        url: post?.url ?? location.href,
      });
      if (!reply.ok) {
        state.phase = "error";
        state.error = reply.message;
        return;
      }
      fill = reply.fill;
      draftable = [];
      state.asks = [];
      const report = newReport();
      await fillOnce(report);
      state.report = report;
      state.phase = "done";
      showDrafts();
      await arm();
      autoNext = ctx.platform === "workday";
      stepKey = currentStep();
      startWatching();
    } catch {
      state.phase = "error";
      state.error = "Otto couldn't fill this form. Reload the page and try again.";
    } finally {
      filling = false;
      ctx.changed();
    }
  }

  // Workday shows one step at a time: the next step is filled when it appears, never sent.
  function currentStep(): string {
    const active = document.querySelector("[data-automation-id='progressBarActiveStep']");
    const heading = form()?.querySelector("h2, h3");
    return `${active?.textContent ?? ""}|${heading?.textContent ?? ""}|${location.pathname}`;
  }

  async function nextStep() {
    if (!autoNext || filling || !fill || !present()) return;
    const step = currentStep();
    if (step === stepKey) return;
    stepKey = step;
    filling = true;
    try {
      await settle(400);
      const report = state.report ?? newReport();
      await fillOnce(report);
      state.report = { ...report };
      showDrafts();
      await arm();
    } finally {
      filling = false;
      ctx.changed();
    }
  }

  async function saveAsks(fields: Record<string, string>): Promise<void> {
    if (!fill || state.asking) return;
    const patch: ApplyAnswersPatch = {};
    const custom: { question: string; answer: string }[] = [];
    const rights: Record<string, { authorized: boolean | null; sponsorship: boolean | null }> = {};
    const answered: { ask: Ask; value: string }[] = [];
    for (const ask of state.asks) {
      const value =
        (ask.input === "pay" ? fields[`${ask.key}.amount`] : fields[ask.key])?.trim() ?? "";
      if (!value) continue;
      answered.push({ ask, value });
      const { store } = ask;
      if (store.kind === "custom") {
        const answer = ask.input === "yesno" ? (value === "yes" ? "Yes" : "No") : value;
        custom.push({ question: store.question, answer });
      } else if (store.kind === "rights") {
        const current = rights[store.place] ??
          fill.answers.workRights[store.place] ?? { authorized: null, sponsorship: null };
        rights[store.place] = { ...current, [store.need]: value === "yes" };
      } else if (store.field === "relocate") patch.relocate = value === "yes";
      else if (store.field === "currentPay" || store.field === "expectedPay") {
        const pay = ask.input === "pay" ? payFrom(fields, ask.key) : null;
        if (pay) patch[store.field] = pay;
        else custom.push({ question: ask.label, answer: value });
      } else patch[store.field] = value;
    }
    if (answered.length === 0) return;
    if (custom.length > 0) patch.custom = custom;
    if (Object.keys(rights).length > 0) patch.workRights = rights;
    // Which fields were waiting on which answer, so only those are filled now.
    const waiting = new Map<string, string>();
    for (const question of questions.values()) {
      const item = planForm([question], fill, postContext())[0];
      if (item?.status === "ask") waiting.set(question.key, storeKey(item.store));
    }
    state.asking = true;
    ctx.changed();
    try {
      const reply = await ctx.send<AnswersReply>({ type: "save-answers", patch });
      if (!reply.ok) {
        state.error = reply.message;
        return;
      }
      fill = { ...fill, answers: reply.answers, saved: reply.saved };
      state.answers = { saved: reply.saved, effective: reply.answers };
      const report = state.report ?? newReport();
      const byKey = new Map(answered.map((item) => [item.ask.key, item]));
      for (const question of questions.values()) {
        const answer = byKey.get(waiting.get(question.key) ?? "");
        if (!answer) continue;
        const item = planForm([question], fill, postContext())[0];
        const want =
          item?.status === "fill"
            ? item.want
            : wantForAnswer(question, answer.ask.store, answer.value);
        if (!want || want.kind === "file") continue;
        if ((await fillQuestion(question, want)) === "filled") report.filled += 1;
      }
      state.asks = state.asks.filter((ask) => !byKey.has(ask.key));
      state.report = { ...report };
    } finally {
      state.asking = false;
      ctx.changed();
    }
  }

  async function startDraft(key: string): Promise<void> {
    const question = draftable.find((item) => item.key === key) ?? questions.get(key);
    if (!question || !fill || state.draft?.busy) return;
    const post = ctx.post();
    state.draft = { key, question: question.label, text: "", busy: true, error: null };
    ctx.reveal();
    showDrafts();
    ctx.changed();
    if (!post || post.text.length < 80) {
      state.draft = { ...state.draft, busy: false, error: NO_POST };
      showDrafts();
      ctx.changed();
      return;
    }
    const reply = await ctx.send<DraftReply>({
      type: "draft",
      resumeId: fill.resume.id,
      job: { text: post.text.slice(0, 20_000), title: post.title, company: post.company },
      question: question.label.slice(0, 500),
      requestId: randomId(),
    });
    if (state.draft?.key !== key) return;
    state.draft = reply.ok
      ? { ...state.draft, text: reply.answer, busy: false }
      : { ...state.draft, busy: false, error: reply.message };
    showDrafts();
    ctx.changed();
  }

  function useDraft(text: string): void {
    const draft = state.draft;
    const question = draft
      ? (draftable.find((item) => item.key === draft.key) ?? questions.get(draft.key))
      : null;
    const field = question?.nodes[0] as unknown as
      HTMLInputElement | HTMLTextAreaElement | undefined;
    if (!draft || !field?.isConnected || !text.trim()) return;
    typeValue(field, text.trim());
    field.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    highlight(field);
    state.draft = null;
    if (state.report) state.report = { ...state.report, filled: state.report.filled + 1 };
    showDrafts();
    ctx.changed();
  }

  function cancelDraft(): void {
    state.draft = null;
    showDrafts();
    ctx.changed();
  }

  async function openAnswers(): Promise<void> {
    state.answersError = null;
    state.answersBusy = true;
    ctx.changed();
    const reply = await ctx.send<AnswersReply>({ type: "answers" });
    state.answersBusy = false;
    if (reply.ok) state.answers = { saved: reply.saved, effective: reply.answers };
    else state.answersError = reply.message;
    ctx.changed();
  }

  async function saveAnswers(patch: ApplyAnswersPatch): Promise<boolean> {
    state.answersBusy = true;
    state.answersError = null;
    ctx.changed();
    const reply = await ctx.send<AnswersReply>({ type: "save-answers", patch });
    state.answersBusy = false;
    if (reply.ok) {
      state.answers = { saved: reply.saved, effective: reply.answers };
      if (fill) fill = { ...fill, answers: reply.answers, saved: reply.saved };
    } else state.answersError = reply.message;
    ctx.changed();
    return reply.ok;
  }

  // Applied follows a real send: the person pressed Submit, then the page thanked them.
  function onClick(event: MouseEvent) {
    if (!pending) return;
    const target = event.target as Element | null;
    const button = target?.closest(PLATFORMS[ctx.platform].submit.join(", "));
    if (!button) return;
    if (ctx.platform === "workday" && !/submit/i.test(button.textContent ?? "")) return;
    submittedAt = Date.now();
    void ctx.send({ type: "submitting" });
    startWatching();
  }

  function check() {
    if (Date.now() > watchUntil) autoNext = false;
    if (!pending || Date.now() > watchUntil) return stopWatching();
    const sent = submittedAt ?? pending.submittedAt;
    const recent = sent !== null && Date.now() - sent < SUBMIT_RECENT_MS;
    if (!confirmation(ctx.platform, location.href, root(), recent)) return;
    stopWatching();
    void markApplied();
  }

  async function markApplied() {
    pending = null;
    autoNext = false;
    drafts.clear();
    // The form is sent: the card goes back to the job, with the note above it.
    Object.assign(state, { phase: "idle", report: null, asks: [], draft: null, error: null });
    const reply = await ctx.send<AppliedReply>({ type: "applied" });
    state.toast = reply.ok
      ? {
          kind: "applied",
          id: reply.id,
          company: reply.company,
          role: reply.role,
          boardPath: reply.boardPath,
          busy: false,
        }
      : reply.code === "not_found"
        ? null
        : { kind: "error", message: reply.message };
    ctx.changed();
  }

  async function undo(): Promise<void> {
    const toast = state.toast;
    if (toast?.kind !== "applied" || toast.busy) return;
    state.toast = { ...toast, busy: true };
    ctx.changed();
    const reply = await ctx.send<{ ok: boolean; message?: string }>({
      type: "undo-applied",
      id: toast.id,
    });
    state.toast = reply.ok
      ? { kind: "undone" }
      : { kind: "error", message: reply.message ?? "Otto couldn't undo that." };
    ctx.changed();
  }

  function closeToast() {
    state.toast = null;
    ctx.changed();
  }

  function startWatching() {
    watchUntil = Date.now() + CONFIRM_FOR_MS;
    if (!watchTimer)
      watchTimer = window.setInterval(() => {
        check();
        void nextStep();
      }, WATCH_MS);
  }

  function stopWatching() {
    if (!autoNext && watchTimer) {
      window.clearInterval(watchTimer);
      watchTimer = 0;
    }
  }

  // A page that loads already armed (Lever's and Greenhouse's thank-you pages) checks at once.
  async function resume() {
    const reply = await ctx.send<ArmedReply>({ type: "armed" });
    if (!reply?.pending || reply.pending.platform !== ctx.platform) return;
    pending = reply.pending;
    submittedAt = reply.pending.submittedAt;
    startWatching();
    check();
  }

  document.addEventListener("click", onClick, true);
  void resume();

  return {
    state,
    present,
    run,
    saveAsks,
    useDraft,
    cancelDraft,
    openAnswers,
    saveAnswers,
    undo,
    closeToast,
  };
}

export type FormSession = ReturnType<typeof createFormSession>;
