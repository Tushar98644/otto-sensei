"use client";

import { toast } from "@/components/ui/toast";
import { undoToast, type UndoHandle } from "@/components/ui/undo-toast";
import type { Messages } from "@/i18n/messages";
import EN_SHARE_LINKS from "@/i18n/messages/en/share-links";
import { api, isApiError } from "@/lib/api/client";
import type { Resume } from "@/lib/resume/schema";
import { sharePath, type SharedLink } from "@/lib/share/types";
import { DEFAULT_SHARE_OPTIONS } from "./share-options";
import { dropShare, ensureShares, putShare } from "./share-store";

// Re-sharing cancels a pending turn-off, so its held DELETE can't hit the new link.
const pendingTurnOffs = new Map<string, UndoHandle>();

export type ShareActionWords = Messages["shareLinks"]["actions"];

function messageOf(error: unknown, t: ShareActionWords): string {
  if (isApiError(error) || error instanceof Error) return error.message;
  return t.fallback;
}

export function absolute(link: SharedLink): string {
  return new URL(sharePath(link.slug), window.location.origin).href;
}

// Safari only allows clipboard writes during the click, so start before the URL arrives.
export async function copyWhenReady(url: Promise<string>): Promise<boolean> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (!clipboard) return false;
  if (typeof ClipboardItem !== "undefined" && typeof clipboard.write === "function") {
    try {
      const blob = url.then((text) => new Blob([text], { type: "text/plain" }));
      void blob.catch(() => undefined);
      await clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return true;
    } catch {}
  }
  try {
    await clipboard.writeText(await url);
    return true;
  } catch {
    return false;
  }
}

export async function shareAndCopy(
  resume: Resume,
  owner: string,
  onSettings: () => void,
  t: ShareActionWords = EN_SHARE_LINKS.actions,
): Promise<SharedLink | null> {
  pendingTurnOffs.get(resume.id)?.undo();
  const made = (async () => {
    // A live link's settings must be known before saving over it.
    const links = await ensureShares(owner).catch(() => {
      throw new Error(t.checkFailed);
    });
    const existing = links.find((item) => item.resumeId === resume.id);
    const options = existing
      ? { showContact: existing.showContact, allowIndexing: existing.allowIndexing }
      : DEFAULT_SHARE_OPTIONS;
    const { link } = await api.share({ resume, ...options });
    putShare(link);
    return link;
  })();
  const copied = await copyWhenReady(made.then(absolute));
  try {
    const link = await made;
    toast({
      title: copied ? t.copied : t.ready,
      description: copied ? t.onClipboard : t.fromSettings,
      variant: "success",
      action: { label: t.settings, onAction: onSettings },
    });
    if (!copied) onSettings();
    return link;
  } catch (error) {
    toast({ title: t.makeFailed, description: messageOf(error, t), variant: "error" });
    return null;
  }
}

export function turnOffWithUndo(
  link: SharedLink,
  t: ShareActionWords = EN_SHARE_LINKS.actions,
): void {
  dropShare(link.id);
  const handle = undoToast({
    title: t.turnedOff,
    description: t.turnedOffNote,
    undoLabel: t.undo,
    onUndo: () => {
      pendingTurnOffs.delete(link.resumeId);
      putShare(link);
    },
    onCommit: (options) => {
      pendingTurnOffs.delete(link.resumeId);
      api.revokeShare(link.id, options).catch((error: unknown) => {
        putShare(link);
        toast({ title: t.turnOffFailed, description: messageOf(error, t), variant: "error" });
      });
    },
  });
  pendingTurnOffs.set(link.resumeId, handle);
}
