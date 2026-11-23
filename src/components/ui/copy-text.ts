"use client";

import { toast } from "./toast";

// `quiet` skips the success toast when the control shows "Copied" itself; failures always say so.
export async function copyText(
  text: string,
  what: string,
  { quiet = false }: { quiet?: boolean } = {},
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    if (!quiet) {
      toast({
        title: "Copied",
        description: `Paste the ${what} where it goes.`,
        variant: "success",
      });
    }
    return true;
  } catch {
    toast({
      title: "Couldn't copy",
      description: "Select the text in the box and copy it from there.",
      variant: "error",
    });
    return false;
  }
}
