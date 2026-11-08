"use client";

import { toast } from "@/components/ui/toast";
import { undoToast, type UndoHandle } from "@/components/ui/undo-toast";
import { api, isApiError } from "@/lib/api/client";
import type { Resume } from "@/lib/resume/schema";
import { sharePath, type SharedLink } from "@/lib/share/types";
import { DEFAULT_SHARE_OPTIONS } from "./share-options";
import { useShareStore } from "./share-store";

// The two share actions that need no dialog: make (or refresh) a resume's link and copy it in one
// click, and turn a link off with Undo instead of a confirm.

// Links turned off whose Undo hasn't run out, by resume. Sharing that resume again in the meantime
// takes the turn-off back, so the held DELETE can't land on the link just handed out.
const pendingTurnOffs = new Map<string, UndoHandle>();

function messageOf(error: unknown): string {
  if (isApiError(error) || error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function absolute(link: SharedLink): string {
  return new URL(sharePath(link.slug), window.location.origin).href;
}

// Safari only lets a page write to the clipboard during the click itself, so the write starts now
// with the address still on its way; elsewhere a plain write after the fact works too.
export async function copyWhenReady(url: Promise<string>): Promise<boolean> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (!clipboard) return false;
  if (typeof ClipboardItem !== "undefined" && typeof clipboard.write === "function") {
    try {
      const blob = url.then((text) => new Blob([text], { type: "text/plain" }));
      // A failed link is reported by the caller; this copy of the rejection has nowhere to go.
      void blob.catch(() => undefined);
      await clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      return true;
    } catch {
      // Falls through: either the browser said no to the early write, or the link failed.
    }
  }
  try {
    await clipboard.writeText(await url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Makes the resume's link, or points its live link at this version, and copies it. Keeps the
 * link's own settings (contact details, search engines); a new link starts with both off.
 * Resolves with the link, or null after telling the person why it failed.
 */
export async function shareAndCopy(
  resume: Resume,
  owner: string,
  onSettings: () => void,
): Promise<SharedLink | null> {
  pendingTurnOffs.get(resume.id)?.undo();
  const made = (async () => {
    // A live link's settings must be known before saving over it.
    await useShareStore.getState().load(owner);
    if (useShareStore.getState().status === "error") {
      throw new Error("Couldn't check the links you already made. Check your connection, then try again.");
    }
    const existing = useShareStore.getState().links.find((item) => item.resumeId === resume.id);
    const options = existing
      ? { showContact: existing.showContact, allowIndexing: existing.allowIndexing }
      : DEFAULT_SHARE_OPTIONS;
    const { link } = await api.share({ resume, ...options });
    useShareStore.getState().put(link);
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

/** Turns a link off at once, with Undo; the server hears about it once Undo has run out. */
export function turnOffWithUndo(link: SharedLink): void {
  const store = useShareStore.getState();
  store.drop(link.id);
  const handle = undoToast({
    title: "Link turned off",
    description: "Anyone who opens it now sees that it doesn't work.",
    onUndo: () => {
      pendingTurnOffs.delete(link.resumeId);
      useShareStore.getState().put(link);
    },
    onCommit: (options) => {
      pendingTurnOffs.delete(link.resumeId);
      api.revokeShare(link.id, options).catch((error: unknown) => {
        useShareStore.getState().put(link);
        toast({ title: "Couldn't turn off the link", description: messageOf(error), variant: "error" });
      });
    },
  });
  pendingTurnOffs.set(link.resumeId, handle);
}
