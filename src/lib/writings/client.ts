"use client";

import { api } from "@/lib/api/client";
import { getQueryClient } from "@/lib/queries/client";
import { WRITINGS } from "@/lib/queries/keys";
import type { CreateWritingBody, Writing } from "./schema";

// Saving is a side effect in the studio: the text is already on screen, so a failed save never
// becomes an error there.

// The text each saved row last had, so a field that loses focus unchanged sends nothing.
const synced = new Map<string, string>();

const forgetWritings = () => void getQueryClient().invalidateQueries({ queryKey: WRITINGS });

/** null when it couldn't be kept. */
export async function keepWriting(body: CreateWritingBody): Promise<Writing | null> {
  try {
    const { writing } = await api.saveWriting(body);
    synced.set(writing.id, writing.text);
    forgetWritings();
    return writing;
  } catch (error) {
    console.warn("Couldn't keep the writing", error);
    return null;
  }
}

/** Once per change. */
export function keepEdit(id: string | undefined, text: string): void {
  const value = text.trim();
  if (!id || !value || synced.get(id) === value) return;
  synced.set(id, value);
  api.editWriting(id, { text: value }).then(forgetWritings, (error: unknown) => {
    // Sent again on the next pause in typing.
    synced.delete(id);
    console.warn("Couldn't keep the edit", error);
  });
}
