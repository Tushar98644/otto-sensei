"use client";

import { Check, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button, buttonClasses, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useMessages } from "@/i18n/client";
import { sharePath } from "@/lib/share/types";

const noSubscribe = () => () => {};

export function useShareUrl(slug: string): string {
  const origin = useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => "",
  );
  return origin ? new URL(sharePath(slug), origin).href : "";
}

const COPIED_MS = 2_500;

export function useShareLinksWords() {
  return useMessages("shareLinks");
}

export function useCopyLink() {
  const t = useShareLinksWords().copy;
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        toast({ title: t.cantCopy, description: t.selectLink, variant: "error" });
        return;
      }
      window.clearTimeout(timer.current);
      setCopied(true);
      timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    },
    [t],
  );

  return { copied, copy };
}

type LinkButtonProps = {
  slug: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
};

export function CopyLinkButton({ slug, variant = "primary", size = "md", label }: LinkButtonProps) {
  const url = useShareUrl(slug);
  const { copied, copy } = useCopyLink();
  const t = useShareLinksWords().copy;
  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => copy(url)}
        disabled={!url}
        aria-label={label}
        className="min-w-28"
      >
        {copied ? <Check aria-hidden /> : null}
        {copied ? t.copied : t.copyLink}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? t.linkCopied : ""}
      </span>
    </>
  );
}

export function OpenShareLink({ slug, variant = "ghost", size = "md", label }: LinkButtonProps) {
  const url = useShareUrl(slug);
  const t = useShareLinksWords().copy;
  return (
    <a
      href={url || sharePath(slug)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className={buttonClasses({ variant, size })}
    >
      {t.open}
      <ExternalLink aria-hidden />
      {label ? null : <span className="sr-only">{t.newTab}</span>}
    </a>
  );
}
