"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

const COPIED_MS = 2_000;

// The failure toast's words come from the caller, in its language.
export function useCopyLink(
  url: string,
  failed: { title: string; description: string },
): { copied: boolean; copy: () => Promise<void> } {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      toast({ title: failed.title, description: failed.description, variant: "error" });
    }
  }

  return { copied, copy };
}
