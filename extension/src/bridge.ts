import { EXTENSION_SOURCE, readPageMessage, type ExtensionMessage } from "@/lib/extension/bridge";
import { CONNECT_PATH } from "@/lib/extension/links";
import { chrome } from "./chrome";
import { OTTO_ORIGIN } from "./config";
import type { ConnectReply, State } from "./messages";

// Runs on Otto's own site only. It hands the connect page's token to the worker, and nothing else.
function reply(message: ExtensionMessage) {
  window.postMessage(message, OTTO_ORIGIN);
}

async function ready() {
  // Checked with the server first: a key disconnected from the Account page must not pass as connected.
  await chrome.runtime.sendMessage({ type: "refresh" });
  const state = (await chrome.runtime.sendMessage({ type: "state" })) as State;
  reply({
    source: EXTENSION_SOURCE,
    type: "ready",
    version: chrome.runtime.getManifest().version,
    email: state.connected ? (state.profile?.email ?? null) : null,
  });
}

async function connect(token: string, expiresAt: number) {
  const result = (await chrome.runtime.sendMessage({
    type: "connect",
    token,
    expiresAt,
  })) as ConnectReply;
  reply(
    result.ok
      ? { source: EXTENSION_SOURCE, type: "connected", email: result.email }
      : { source: EXTENSION_SOURCE, type: "failed", message: result.message },
  );
}

if (location.origin === OTTO_ORIGIN) {
  // Resumes change on Otto, so a visit here is the cue to refresh the badge's copy soon.
  void chrome.runtime.sendMessage({ type: "otto-visit" });
  window.addEventListener("message", (event) => {
    if (
      event.source !== window ||
      event.origin !== OTTO_ORIGIN ||
      location.pathname !== CONNECT_PATH
    )
      return;
    const message = readPageMessage(event.data);
    if (message?.type === "hello") void ready();
    else if (message?.type === "token") void connect(message.token, message.expiresAt);
  });
  if (location.pathname === CONNECT_PATH) void ready();
}
