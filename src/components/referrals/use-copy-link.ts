"use client";

import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";

const COPIED_MS = 2_000;

export function useCopyLink(
  url: string,
  fallback: string,
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
      toast({ title: "Couldn't copy the link", description: fallback, variant: "error" });
    }
  }

  return { copied, copy };
}
