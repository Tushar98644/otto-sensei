"use client";

import { Check, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { sharePath } from "@/lib/share/types";

const noSubscribe = () => () => {};

/** The full address of a share page, from wherever the app is running. "" on the server. */
export function useShareUrl(slug: string): string {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  return origin ? new URL(sharePath(slug), origin).href : "";
}

// Like a live pill's finished state, the "Copied" label fades after about 2.5s.
const COPIED_MS = 2_500;

/** Copies a link; `copied` stays true for a moment so the button can say so. */
export function useCopyLink() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // No clipboard access (an insecure page, or the browser said no).
      toast({
        title: "Couldn't copy",
        description: "Select the link and copy it yourself.",
        variant: "error",
      });
      return;
    }
    window.clearTimeout(timer.current);
    setCopied(true);
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
  }, []);

  return { copied, copy };
}

type LinkButtonProps = {
  slug: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  // For rows with several links: "Copy link for Maya Chen".
  label?: string;
};

export function CopyLinkButton({ slug, variant = "primary", size = "md", label }: LinkButtonProps) {
  const url = useShareUrl(slug);
  const { copied, copy } = useCopyLink();
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => copy(url)}
        disabled={!url}
        aria-label={label}
        // Keeps its width when the label turns into "Copied".
        className="min-w-28"
      >
        {copied ? <Check aria-hidden /> : null}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </>
  );
}

export function OpenShareLink({ slug, variant = "ghost", size = "md", label }: LinkButtonProps) {
  const url = useShareUrl(slug);
  return (
    <a
      href={url || sharePath(slug)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={buttonClasses({ variant, size })}
    >
      Open page
      <ExternalLink aria-hidden />
      {label ? null : <span className="sr-only">(opens in a new tab)</span>}
    </a>
  );
}
