import type { ExtensionProfile, SavePostBody, SavePostResponse } from "@/lib/extension/types";

// Messages from the page scripts to the background worker, and what each gets back.
export type Request =
  | { type: "state" }
  | { type: "connect"; token: string; expiresAt: number }
  | { type: "save"; post: SavePostBody }
  | { type: "open"; path: string }
  | { type: "pick-resume"; id: string }
  | { type: "refresh" }
  | { type: "disconnect" }
  | { type: "otto-visit" };

export type State = {
  connected: boolean;
  profile: ExtensionProfile | null;
  resumeId: string | null;
};

export type Failure = { ok: false; code: string; message: string };

export type SaveReply = { ok: true; post: SavePostResponse["post"] } | Failure;
export type ConnectReply = { ok: true; email: string } | Failure;

// The background worker's message to a tab when the toolbar button is pressed.
export type TabMessage = { type: "toggle" };

export function isTabMessage(value: unknown): value is TabMessage {
  return (
    typeof value === "object" && value !== null && (value as { type?: unknown }).type === "toggle"
  );
}
