"use client";

import { toast } from "@/components/ui/toast";
import { undoToast, type UndoHandle } from "@/components/ui/undo-toast";
import { api, isApiError } from "@/lib/api/client";
import type { Resume } from "@/lib/resume/schema";
import { sharePath, type SharedLink } from "@/lib/share/types";
import { DEFAULT_SHARE_OPTIONS } from "./share-options";
import { dropShare, ensureShares, putShare } from "./share-store";

// Re-sharing cancels a pending turn-off, so its held DELETE can't hit the new link.
const pendingTurnOffs = new Map<string, UndoHandle>();

function messageOf(error: unknown): string {
  if (isApiError(error) || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
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
): Promise<SharedLink | null> {
  pendingTurnOffs.get(resume.id)?.undo();
  const made = (async () => {
    // A live link's settings must be known before saving over it.
    const links = await ensureShares(owner).catch(() => {
      throw new Error("Couldn't check the links you already made. Check your connection, then try again.");
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
      title: copied ? "Copied" : "Link ready",
      description: copied
        ? "Your share link is on the clipboard. Anyone with it can read this resume."
        : "Copy it from the link settings.",
      variant: "success",
      action: { label: "Settings", onAction: onSettings },
    });
    if (!copied) onSettings();
    return link;
  } catch (error) {
    toast({ title: "Couldn't make the link", description: messageOf(error), variant: "error" });
    return null;
  }
}

export function turnOffWithUndo(link: SharedLink): void {
  dropShare(link.id);
  const handle = undoToast({
    title: "Link turned off",
    description: "Anyone who opens it now sees that it doesn't work.",
    onUndo: () => {
      pendingTurnOffs.delete(link.resumeId);
      putShare(link);
    },
    onCommit: (options) => {
      pendingTurnOffs.delete(link.resumeId);
      api.revokeShare(link.id, options).catch((error: unknown) => {
        putShare(link);
        toast({ title: "Couldn't turn off the link", description: messageOf(error), variant: "error" });
      });
    },
  });
  pendingTurnOffs.set(link.resumeId, handle);
}
