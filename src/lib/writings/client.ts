"use client";

import { api } from "@/lib/api/client";
import { getQueryClient } from "@/lib/queries/client";
import { LETTERED_APPLICATIONS, WRITINGS } from "@/lib/queries/keys";
import type { CreateWritingBody, Writing } from "./schema";

const synced = new Map<string, string>();

function forgetWritings(): void {
  const client = getQueryClient();
  void client.invalidateQueries({ queryKey: WRITINGS });
  void client.invalidateQueries({ queryKey: LETTERED_APPLICATIONS });
}

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

export function keepEdit(id: string | undefined, text: string): void {
  const value = text.trim();
  if (!id || !value || synced.get(id) === value) return;
  synced.set(id, value);
  api.editWriting(id, { text: value }).then(forgetWritings, (error: unknown) => {
    synced.delete(id);
    console.warn("Couldn't keep the edit", error);
  });
}
