"use client";

import { toast } from "./toast";

export async function copyText(text: string, what: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `Paste the ${what} where it goes.`, variant: "success" });
  } catch {
    toast({
      title: "Couldn't copy",
      description: "Select the text in the box and copy it from there.",
      variant: "error",
    });
  }
}
