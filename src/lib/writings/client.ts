"use client";

import { api } from "@/lib/api/client";
import type { CreateWritingBody, Writing } from "./schema";

// Client side of /api/writings for the studio, where keeping a letter or answer is a side effect:
// the text is already on screen, so a failed save must never turn into an error there. The
// Cover letters page calls the API itself and says when a save didn't happen.

// The text each saved row last had, so a field that loses focus unchanged sends nothing.
const synced = new Map<string, string>();

/** Saves a letter or answer the AI routes just wrote. Null when it couldn't be kept. */
export async function keepWriting(body: CreateWritingBody): Promise<Writing | null> {
  try {
    const { writing } = await api.saveWriting(body);
    synced.set(writing.id, writing.text);
    return writing;
  } catch (error) {
    console.warn("Couldn't keep the writing", error);
    return null;
  }
}

/** Sends the person's edit to the saved row, once per change. */
export function keepEdit(id: string | undefined, text: string): void {
  const value = text.trim();
  if (!id || !value || synced.get(id) === value) return;
  synced.set(id, value);
  api.editWriting(id, { text: value }).catch((error: unknown) => {
    // Sent again on the next pause in typing.
    synced.delete(id);
    console.warn("Couldn't keep the edit", error);
  });
}
