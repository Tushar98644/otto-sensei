import { CONNECT_PATH } from "@/lib/extension/links";
import type {
  ExtensionProfileResponse,
  SavePostBody,
  SavePostResponse,
} from "@/lib/extension/types";
import { chrome, type MessageSender } from "./chrome";
import { OTTO_ORIGIN, OTTO_VISIT_TTL_MS, ottoUrl, PROFILE_TTL_MS } from "./config";
import type { ConnectReply, Failure, Request, SaveReply, State } from "./messages";
import { clearAccount, readStored, writeStored } from "./storage";

type Called<T> = { ok: true; data: T } | Failure;

const OFFLINE: Failure = {
  ok: false,
  code: "network_error",
  message: "Otto can't reach his server. Check your connection and try again.",
};
const SIGNED_OUT: Failure = {
  ok: false,
  code: "unauthorized",
  message: "Otto isn't connected to your account any more. Connect him again.",
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
      message: body?.error?.message ?? "Something went wrong. Try again in a moment.",
    };
  }
  return { ok: true, data: body };
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
    return { ok: false, code: "forbidden", message: "Connect from Otto's own connect page." };
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
      message: "Otto couldn't read your account. Try again.",
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
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!isRequest(message)) return false;
  handle(message, sender).then(sendResponse, () => sendResponse(OFFLINE));
  return true;
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
