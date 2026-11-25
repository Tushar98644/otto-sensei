import { CONNECT_PATH } from "@/lib/extension/links";
import type { ApplyAnswersPatch } from "@/lib/extension/answers";
import type {
  ApplyAnswersResponse,
  ExtensionApplicationResponse,
  ExtensionProfileResponse,
  FillProfileResponse,
  SavePostBody,
  SavePostResponse,
} from "@/lib/extension/types";
import type { AnswerResult } from "@/lib/ai/types";
import { chrome, type MessageSender } from "./chrome";
import { OTTO_ORIGIN, OTTO_VISIT_TTL_MS, ottoUrl, PENDING_TTL_MS, PROFILE_TTL_MS } from "./config";
import { t } from "./i18n";
import type {
  AnswersReply,
  AppliedReply,
  ArmedReply,
  ConnectReply,
  DraftJob,
  DraftReply,
  Failure,
  FileReply,
  FillReply,
  Pending,
  Request,
  SaveReply,
  State,
} from "./messages";
import { clearAccount, readStored, writeStored } from "./storage";

type Called<T> = { ok: true; data: T } | Failure;

const OFFLINE: Failure = {
  ok: false,
  code: "network_error",
  message: t("offline"),
};
const SIGNED_OUT: Failure = {
  ok: false,
  code: "unauthorized",
  message: t("signedOut"),
};

// Every call carries the token and never cookies, so a page can't act with the person's session.
async function call<T>(path: string, init: RequestInit = {}): Promise<Called<T>> {
  const { token } = await readStored();
  if (!token) return SIGNED_OUT;
  let res: Response;
  try {
    res = await fetch(ottoUrl(path), {
      ...init,
      credentials: "omit",
      cache: "no-store",
      headers: { ...(init.headers as Record<string, string>), authorization: `Bearer ${token}` },
    });
  } catch {
    return OFFLINE;
  }
  const body = (await res.json().catch(() => null)) as
    ({ ok?: boolean; error?: { code?: string; message?: string } } & T) | null;
  if (res.status === 401) {
    await clearAccount();
    return SIGNED_OUT;
  }
  if (!res.ok || body?.ok !== true) {
    return {
      ok: false,
      code: body?.error?.code ?? "server_error",
      message: body?.error?.message ?? t("somethingWrong"),
    };
  }
  return { ok: true, data: body };
}

function base64(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let text = "";
  for (let i = 0; i < view.length; i += 0x8000) {
    text += String.fromCharCode(...view.subarray(i, i + 0x8000));
  }
  return btoa(text);
}

// The resume's PDF, as base64: messages to the page carry JSON only.
async function callFile(path: string): Promise<FileReply> {
  const { token } = await readStored();
  if (!token) return SIGNED_OUT;
  let res: Response;
  try {
    res = await fetch(ottoUrl(path), {
      credentials: "omit",
      cache: "no-store",
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return OFFLINE;
  }
  if (res.status === 401) {
    await clearAccount();
    return SIGNED_OUT;
  }
  if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("application/pdf")) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    return {
      ok: false,
      code: body?.error?.code ?? "server_error",
      message: body?.error?.message ?? t("pdfFailed"),
    };
  }
  const disposition = res.headers.get("content-disposition") ?? "";
  const name = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  return {
    ok: true,
    base64: base64(await res.arrayBuffer()),
    name: name ? decodeURIComponent(name) : "Resume.pdf",
  };
}

let refreshing: Promise<boolean> | null = null;

function refresh(force = false): Promise<boolean> {
  refreshing ??= (async () => {
    const stored = await readStored();
    if (!stored.token) return false;
    const known = force ? null : (stored.profile?.version ?? null);
    const query = known ? `?known=${encodeURIComponent(known)}` : "";
    const res = await call<ExtensionProfileResponse>(`/api/extension/profile${query}`);
    if (!res.ok) return false;
    if (res.data.unchanged) await writeStored({ profileAt: Date.now() });
    else await writeStored({ profile: res.data.profile, profileAt: Date.now() });
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// Answers from storage at once; stale match data is refreshed behind it.
async function state(): Promise<State> {
  const stored = await readStored();
  const connected = stored.token !== null;
  if (connected && (stored.profileAt === null || Date.now() - stored.profileAt > PROFILE_TTL_MS)) {
    void refresh();
  }
  return { connected, profile: stored.profile, resumeId: stored.resumeId };
}

function fromConnectPage(sender: MessageSender): boolean {
  const url = sender.url ?? "";
  return sender.origin === OTTO_ORIGIN && url.startsWith(`${OTTO_ORIGIN}${CONNECT_PATH}`);
}

async function connect(
  token: string,
  expiresAt: number,
  sender: MessageSender,
): Promise<ConnectReply> {
  if (!fromConnectPage(sender) || !token.startsWith("otto_ext_")) {
    return { ok: false, code: "forbidden", message: t("connectFromPage") };
  }
  await writeStored({
    token,
    tokenExpiresAt: expiresAt,
    profile: null,
    profileAt: null,
    resumeId: null,
  });
  await refresh(true);
  const { profile } = await readStored();
  if (!profile) {
    await clearAccount();
    return {
      ok: false,
      code: "server_error",
      message: t("accountUnreadable"),
    };
  }
  return { ok: true, email: profile.email };
}

async function save(post: SavePostBody): Promise<SaveReply> {
  const res = await call<SavePostResponse>("/api/extension/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(post),
  });
  if (!res.ok) return res;
  const { profile } = await readStored();
  if (profile) {
    const saved = [
      res.data.post,
      ...profile.saved.filter((item) => item.key !== res.data.post.key),
    ];
    await writeStored({
      profile: { ...profile, saved: saved.map(({ key, id, savedAt }) => ({ key, id, savedAt })) },
    });
  }
  return { ok: true, post: res.data.post };
}

function open(path: string, sender: MessageSender): void {
  // Only Otto's own pages: a path, never a full address from the page.
  if (!path.startsWith("/") || path.startsWith("//")) return;
  void chrome.tabs.create({
    url: ottoUrl(path),
    ...(sender.tab?.id ? { openerTabId: sender.tab.id } : {}),
  });
}

async function fillData(resumeId: string | null, url: string): Promise<FillReply> {
  const query = new URLSearchParams({ url });
  if (resumeId) query.set("resume", resumeId);
  const res = await call<FillProfileResponse>(`/api/extension/fill?${query.toString()}`);
  return res.ok ? { ok: true, fill: res.data.fill } : res;
}

async function answers(patch: ApplyAnswersPatch | null): Promise<AnswersReply> {
  const res = await call<ApplyAnswersResponse>(
    "/api/extension/answers",
    patch
      ? {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(patch),
        }
      : {},
  );
  return res.ok ? { ok: true, answers: res.data.answers, saved: res.data.saved } : res;
}

async function draft(
  resumeId: string,
  job: DraftJob,
  question: string,
  requestId: string,
): Promise<DraftReply> {
  const res = await call<{ result: AnswerResult }>("/api/extension/answer", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ resumeId, job, question, requestId }),
  });
  return res.ok ? { ok: true, answer: res.data.result.answer } : res;
}

const pendingKey = (tabId: number) => `pending:${tabId}`;

async function readPending(tabId: number | undefined): Promise<Pending | null> {
  if (tabId === undefined) return null;
  const key = pendingKey(tabId);
  const value = (await chrome.storage.session.get(key))[key] as Pending | undefined;
  if (!value) return null;
  if (Date.now() - value.filledAt > PENDING_TTL_MS) {
    await chrome.storage.session.remove(key);
    return null;
  }
  return value;
}

async function arm(pending: Pending, sender: MessageSender): Promise<void> {
  const tabId = sender.tab?.id;
  if (tabId === undefined) return;
  const existing = await readPending(tabId);
  // Filling the next step of the same form keeps its application id.
  const kept = existing && existing.url === pending.url ? existing : null;
  await chrome.storage.session.set({
    [pendingKey(tabId)]: kept ? { ...pending, applicationId: kept.applicationId } : pending,
  });
}

async function submitting(sender: MessageSender): Promise<void> {
  const tabId = sender.tab?.id;
  const pending = await readPending(tabId);
  if (!pending || tabId === undefined) return;
  await chrome.storage.session.set({
    [pendingKey(tabId)]: { ...pending, submittedAt: Date.now() },
  });
}

async function applied(sender: MessageSender): Promise<AppliedReply> {
  const tabId = sender.tab?.id;
  const pending = await readPending(tabId);
  if (!pending || tabId === undefined) {
    return {
      ok: false,
      code: "not_found",
      message: t("noFilledForm"),
    };
  }
  // Taken first, so a thank-you page drawn twice can't add the application twice.
  await chrome.storage.session.remove(pendingKey(tabId));
  const res = await call<ExtensionApplicationResponse>("/api/extension/applications", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: pending.applicationId,
      url: pending.url,
      title: pending.title,
      company: pending.company,
      resumeId: pending.resumeId,
    }),
  });
  if (!res.ok) return res;
  const { application, boardPath } = res.data;
  return {
    ok: true,
    id: application.id,
    company: application.company,
    role: application.role,
    boardPath,
  };
}

async function undoApplied(id: string): Promise<{ ok: true } | Failure> {
  const res = await call(`/api/extension/applications/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok ? { ok: true } : res;
}

async function disconnect(): Promise<{ ok: true }> {
  await call("/api/extension/session", { method: "DELETE" });
  await clearAccount();
  return { ok: true };
}

function isRequest(value: unknown): value is Request {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

async function handle(message: Request, sender: MessageSender): Promise<unknown> {
  switch (message.type) {
    case "state":
      return state();
    case "connect":
      return connect(message.token, message.expiresAt, sender);
    case "save":
      return save(message.post);
    case "open":
      open(message.path, sender);
      return { ok: true };
    case "pick-resume":
      await writeStored({ resumeId: message.id });
      return { ok: true };
    case "refresh":
      return { ok: await refresh(true) };
    case "disconnect":
      return disconnect();
    case "otto-visit": {
      const { profileAt } = await readStored();
      if (profileAt === null || Date.now() - profileAt > OTTO_VISIT_TTL_MS) void refresh();
      return { ok: true };
    }
    case "fill-data":
      return fillData(message.resumeId, message.url);
    case "resume-file":
      return callFile(
        `/api/extension/resume-file?${new URLSearchParams({ id: message.id, size: message.size }).toString()}`,
      );
    case "answers":
      return answers(null);
    case "save-answers":
      return answers(message.patch);
    case "draft":
      return draft(message.resumeId, message.job, message.question, message.requestId);
    case "arm":
      await arm(message.pending, sender);
      return { ok: true };
    case "submitting":
      await submitting(sender);
      return { ok: true };
    case "armed":
      return { ok: true, pending: await readPending(sender.tab?.id) } satisfies ArmedReply;
    case "applied":
      return applied(sender);
    case "undo-applied":
      return undoApplied(message.id);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isRequest(message)) return false;
  handle(message, sender).then(sendResponse, () => sendResponse(OFFLINE));
  return true;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(pendingKey(tabId));
});

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") void chrome.tabs.create({ url: ottoUrl(CONNECT_PATH) });
});

// On a job site the badge is already there; anywhere else the button brings Otto in for this tab only.
chrome.action.onClicked.addListener((tab) => {
  const tabId = tab.id;
  if (tabId === undefined) return;
  chrome.tabs.sendMessage(tabId, { type: "toggle" }).catch(async () => {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
      await chrome.tabs.sendMessage(tabId, { type: "toggle" });
    } catch {
      // Chrome's own pages and the Web Store don't take extensions.
    }
  });
});
