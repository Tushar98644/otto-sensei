"use client";

import { toast } from "./toast";

// The toasts in the reader's language: `paste` is the whole "Paste the address where it goes." line.
export type CopyWords = { copied: string; paste: string; cantCopy: string; selectText: string };

// `quiet` skips the success toast when the control shows "Copied" itself; failures always say so.
export async function copyText(
  text: string,
  what: string,
  { quiet = false, words }: { quiet?: boolean; words?: CopyWords } = {},
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    if (!quiet) {
      toast({
        title: words?.copied ?? "Copied",
        description: words?.paste ?? `Paste the ${what} where it goes.`,
        variant: "success",
      });
    }
    return true;
  } catch {
    toast({
      title: words?.cantCopy ?? "Couldn't copy",
      description: words?.selectText ?? "Select the text in the box and copy it from there.",
      variant: "error",
    });
    return false;
  }
}
