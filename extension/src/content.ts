import {
  DEFAULT_HEARD_FROM,
  type ApplyAnswers,
  type ApplyAnswersPatch,
} from "@/lib/extension/answers";
import {
  CONNECT_PATH,
  FILL_UPGRADE_PATH,
  letterPostPath,
  savedPostBoardPath,
  tailorPostPath,
} from "@/lib/extension/links";
import type { ExtensionProfile, ExtensionResume } from "@/lib/extension/types";
import { canonicalJobUrl, jobSiteOf, SITE_NAMES } from "@/lib/extension/urls";
import { chrome } from "./chrome";
import { formPlatformOf } from "./forms/platforms";
import { createFormSession, payFrom, type FormSession } from "./forms/session";
import { badgeMatch, type BadgeMatch } from "./match";
import { isTabMessage, type Request, type SaveReply, type State } from "./messages";
import type { Page } from "./page/dom";
import { postFromSelection, readDeclaredPost, readPost, type JobPost } from "./page/post";
import { chosenResume, readStored, writeStored } from "./storage";
import { mountUi, type UiAction } from "./ui/mount";
import type { Busy, Mode, View } from "./ui/view";

const RUNNING = "__ottoForChrome";
const SCAN_DEBOUNCE_MS = 400;
const SCAN_GAP_MS = 1_500;
const URL_POLL_MS = 800;
const SETTLE_MS = 500;
const MIN_SELECTION =
  "Select a few lines of the post, at least its requirements, then press Use selection.";

function send<T>(request: Request): Promise<T> {
  return chrome.runtime.sendMessage(request) as Promise<T>;
}

function base64url(bytes: ArrayBuffer): string {
  let text = "";
  for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The same key the server files a saved post under, so "Saved" shows with no round trip.
async function postKey(url: string): Promise<string | null> {
  if (!crypto.subtle) return null;
  return base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url)));
}

function currentPage(): Page {
  return { root: document.documentElement, url: location.href, title: document.title };
}

function deviceTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

const yesNo = (value: string | undefined): boolean | null =>
  value === "yes" ? true : value === "no" ? false : null;

// The saved-answers editor's fields, as one update; an emptied question is forgotten.
function answersPatch(fields: Record<string, string>, saved: ApplyAnswers): ApplyAnswersPatch {
  const workRights: ApplyAnswersPatch["workRights"] = {};
  for (const [name, value] of Object.entries(fields)) {
    const match = /^rights\.([A-Z]{2}|EU)\.(authorized|sponsorship)$/.exec(name);
    if (!match) continue;
    const key = match[1]!;
    workRights[key] = {
      authorized: null,
      sponsorship: null,
      ...workRights[key],
      [match[2]!]: yesNo(value),
    };
  }
  return {
    noticePeriod: fields.noticePeriod?.trim() ?? saved.noticePeriod,
    startDate: fields.startDate?.trim() ?? saved.startDate,
    heardFrom: fields.heardFrom?.trim() || DEFAULT_HEARD_FROM,
    relocate: yesNo(fields.relocate),
    currentPay: payFrom(fields, "currentPay"),
    expectedPay: payFrom(fields, "expectedPay"),
    workRights,
    custom: saved.custom.map((item, index) => ({
      question: item.question,
      answer: fields[`custom.${index}`] ?? item.answer,
    })),
  };
}

// Lever's and Ashby's forms and Workday's steps sit beside the post: read it from the job's own page.
async function postFromJobPage(): Promise<JobPost | null> {
  const canonical = canonicalJobUrl(location.href);
  if (!canonical) return null;
  const target = new URL(canonical);
  if (target.origin !== location.origin || target.href === location.href) return null;
  try {
    const res = await fetch(target.href, { credentials: "omit" });
    if (!res.ok) return null;
    const doc = new DOMParser().parseFromString(await res.text(), "text/html");
    return readPost({ root: doc.documentElement, url: target.href, title: doc.title });
  } catch {
    return null;
  }
}

function pageSettled(): Promise<void> {
  const loaded =
    document.readyState === "complete"
      ? Promise.resolve()
      : new Promise<void>((resolve) =>
          window.addEventListener("load", () => resolve(), { once: true }),
        );
  return loaded.then(() => new Promise((resolve) => window.setTimeout(resolve, SETTLE_MS)));
}

function start() {
  const framed = window !== window.top;
  const site = jobSiteOf(location.href);
  const onJobSite = site !== "other";
  const siteName = onJobSite ? SITE_NAMES[site] : location.hostname.replace(/^www\./, "");
  // LinkedIn's messaging bar sits in the bottom corner.
  const ui = mountUi(act, { framed, bottom: site === "linkedin" ? 64 : 20 });

  let mode: Mode = "card";
  let state: State | null = null;
  let post: JobPost | null = null;
  // The post a form belongs to when the form's page doesn't show it.
  let formPost: JobPost | null = null;
  let formPostFor = "";
  let formShown = false;
  const platform = formPlatformOf(location.href);
  const session: FormSession | null = platform
    ? createFormSession({
        platform,
        send,
        post: () => post,
        resumeId: () =>
          state?.profile ? (chosenResume(state.profile, state.resumeId)?.id ?? null) : null,
        changed: () => draw(),
        reveal: () => {
          if (mode === "mini" || mode === "answers") mode = "card";
        },
      })
    : null;
  let key: string | null = null;
  let summoned = false;
  let busy: Busy = null;
  let error: string | null = null;
  let selectError: string | null = null;
  let cached: { id: string; match: BadgeMatch } | null = null;
  let settled = false;
  let lastUrl = location.href;
  let lastScan = 0;
  let timer = 0;

  function matchFor(
    current: JobPost,
    profile: ExtensionProfile,
    resume: ExtensionResume,
  ): BadgeMatch {
    const id = `${current.url}|${current.title}|${current.text.length}|${resume.id}|${profile.version}`;
    if (cached?.id !== id) {
      const options = { now: Date.now(), deviceTimeZone: deviceTimeZone() };
      cached = { id, match: badgeMatch(current, resume.text, profile, options) };
    }
    return cached.match;
  }

  function view(): View {
    if (!post)
      return summoned ? { kind: "select", siteName, error: selectError } : { kind: "hidden" };
    if (!state) return { kind: "hidden" };
    if (!state.connected) return { kind: "connect", siteName };
    const profile = state.profile;
    if (!profile) return { kind: "loading", siteName };
    const resume = chosenResume(profile, state.resumeId);
    if (!resume) return { kind: "no-resume", siteName };
    return {
      kind: "match",
      post,
      match: matchFor(post, profile, resume),
      siteName,
      resumes: profile.resumes.map(({ id, title }) => ({ id, title })),
      resumeId: resume.id,
      access: profile.access,
      saved: savedRef() !== null,
      busy,
      error,
      form:
        session && (session.present() || session.state.phase !== "idle")
          ? { allowed: profile.access.fill, state: session.state }
          : null,
    };
  }

  function draw() {
    if (settled) ui.show(view(), mode, session?.state.toast ?? null);
  }

  function loadFormPost() {
    const canonical = canonicalJobUrl(location.href) ?? "";
    if (!session || post || formPostFor === canonical || !session.present()) return;
    formPostFor = canonical;
    void postFromJobPage().then((found) => {
      if (formPostFor !== canonical || !found) return;
      formPost = found;
      scan();
    });
  }

  function savedRef() {
    if (!key || !state?.profile) return null;
    return state.profile.saved.find((ref) => ref.key === key) ?? null;
  }

  function samePost(a: JobPost | null, b: JobPost | null): boolean {
    return a?.url === b?.url && a?.title === b?.title && a?.text.length === b?.text.length;
  }

  function adopt(next: JobPost | null) {
    if (samePost(post, next)) return;
    post = next;
    key = null;
    error = null;
    draw();
    if (next) {
      void postKey(next.url).then((value) => {
        if (post?.url !== next.url) return;
        key = value;
        draw();
      });
    }
  }

  function scan() {
    lastScan = Date.now();
    if (onJobSite) {
      // Workday's apply steps reuse the job's address but show a form, not the post.
      const applyStep = platform === "workday" && /\/apply(?:\/|$)/i.test(location.pathname);
      const own = applyStep ? null : readPost(currentPage());
      const canonical = canonicalJobUrl(location.href);
      const found = own ?? (formPost && formPost.url === canonical ? formPost : null);
      if (found || !summoned) adopt(found);
      else adopt(readDeclaredPost(currentPage()));
      if (!found) loadFormPost();
      // A form drawn after the post (Ashby's tab, Workday's next step) brings Fill with Otto in.
      const form = session?.present() ?? false;
      if (form !== formShown) {
        formShown = form;
        draw();
      }
    } else if (summoned && !post) {
      adopt(readDeclaredPost(currentPage()));
    }
  }

  // Single-page sites swap the post in place: look again a moment after the page settles.
  function schedule() {
    window.clearTimeout(timer);
    const wait = Math.max(SCAN_DEBOUNCE_MS, SCAN_GAP_MS - (Date.now() - lastScan));
    timer = window.setTimeout(scan, location.href === lastUrl ? wait : SCAN_DEBOUNCE_MS);
  }

  async function loadState() {
    state = await send<State>({ type: "state" });
    draw();
  }

  function open(path: string) {
    void send({ type: "open", path });
  }

  async function save(): Promise<string | null> {
    const existing = savedRef();
    if (existing) return existing.id;
    if (!post) return null;
    const { site: postSite, url, title, company, location: place, text } = post;
    const reply = await send<SaveReply>({
      type: "save",
      post: { site: postSite, url, title, company, location: place, text },
    });
    if (!reply.ok) {
      error = reply.message;
      return null;
    }
    key = reply.post.key;
    return reply.post.id;
  }

  async function run(kind: Exclude<Busy, null>, then?: (postId: string) => void) {
    if (busy) return;
    busy = kind;
    error = null;
    draw();
    const id = await save();
    busy = null;
    draw();
    if (id && then) then(id);
  }

  function act({ action, value, fields }: UiAction) {
    const resumeId = state?.profile
      ? (chosenResume(state.profile, state.resumeId)?.id ?? null)
      : null;
    switch (action) {
      case "connect":
        return open(CONNECT_PATH);
      case "minimize":
        mode = "mini";
        void writeStored({ collapsed: true });
        return draw();
      case "expand":
        mode = "card";
        void writeStored({ collapsed: false });
        return draw();
      case "more":
        mode = "panel";
        return draw();
      case "less":
        mode = "card";
        return draw();
      case "escape":
        if (mode === "panel" || mode === "answers") mode = "card";
        return draw();
      case "fill":
        if (!state?.profile?.access.fill) return open(FILL_UPGRADE_PATH);
        return void session?.run();
      case "save-asks":
        return void session?.saveAsks(fields ?? {});
      case "use-draft":
        return session?.useDraft(fields?.draft ?? "");
      case "cancel-draft":
        return session?.cancelDraft();
      case "answers":
        mode = "answers";
        draw();
        return void session?.openAnswers();
      case "close-answers":
        mode = "card";
        return draw();
      case "save-answers": {
        const saved = session?.state.answers?.saved;
        if (!session || !saved) return;
        return void session.saveAnswers(answersPatch(fields ?? {}, saved)).then((ok) => {
          if (!ok) return;
          mode = "card";
          draw();
        });
      }
      case "undo-applied":
        return void session?.undo();
      case "open-applied": {
        const toast = session?.state.toast;
        return toast?.kind === "applied" ? open(toast.boardPath) : undefined;
      }
      case "close-toast":
        return session?.closeToast();
      case "save":
        return void run("save");
      case "tailor":
        return void run("tailor", (id) => open(tailorPostPath(id, resumeId)));
      case "letter":
        return void run("letter", (id) => open(letterPostPath(id, resumeId)));
      case "board": {
        const ref = savedRef();
        return ref ? open(savedPostBoardPath(ref.id)) : undefined;
      }
      case "resume":
        if (value) void send({ type: "pick-resume", id: value });
        return;
      case "otto":
        return open(state?.profile?.resumes.length ? "/dashboard" : "/studio");
      case "disconnect":
        return void send({ type: "disconnect" });
      case "use-selection": {
        const chosen = postFromSelection(currentPage(), window.getSelection()?.toString() ?? "");
        selectError = chosen ? null : MIN_SELECTION;
        if (chosen) adopt(chosen);
        return draw();
      }
      case "close":
        summoned = false;
        post = null;
        return draw();
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!isTabMessage(message)) return false;
    if (framed && onJobSite && !post) return false;
    if (!post && !summoned) {
      summoned = true;
      mode = "card";
      scan();
    } else {
      mode = mode === "mini" ? "card" : "mini";
    }
    draw();
    sendResponse({ ok: true });
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if ("collapsed" in changes && Object.keys(changes).length === 1) return;
    void loadState();
  });

  void readStored().then((stored) => {
    if (stored.collapsed) mode = "mini";
    void loadState();
  });
  scan();
  // After the page's own scripts take over the document, so Otto isn't part of what they hydrate.
  void pageSettled().then(() => {
    settled = true;
    scan();
    draw();
  });

  if (onJobSite) {
    new MutationObserver(schedule).observe(document, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    window.setInterval(() => {
      if (location.href === lastUrl) return;
      lastUrl = location.href;
      schedule();
    }, URL_POLL_MS);
  }
}

const flags = window as unknown as Record<string, boolean>;
if (!flags[RUNNING]) {
  flags[RUNNING] = true;
  start();
}
