"use client";

import { ArrowUpRight, Check } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";

const SHOWN_MS = 4_000;

// On until the page has been in view for a few seconds, so it's still there after a trip to Gmail.
export function useFlash(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    let timer = 0;
    const arm = () => {
      window.clearTimeout(timer);
      if (document.visibilityState === "visible") {
        timer = window.setTimeout(() => setOn(false), SHOWN_MS);
      }
    };
    arm();
    document.addEventListener("visibilitychange", arm);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", arm);
    };
  }, [on]);
  return [on, useCallback(() => setOn(true), [])];
}

export type GmailButtonProps = {
  href: string;
  onPress?: () => boolean | Promise<boolean>;
  doneLabel?: string;
  main?: boolean;
  children: ReactNode;
};

// A real link, so the new tab is never blocked; the copy starts in the same press.
export function GmailButton({
  href,
  onPress,
  doneLabel,
  main = false,
  children,
}: GmailButtonProps) {
  const [done, flash] = useFlash();
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={
          onPress ? () => void Promise.resolve(onPress()).then((ok) => ok && flash()) : undefined
        }
        className={buttonClasses({
          variant: main ? "primary" : "secondary",
          className: "max-sm:w-full",
        })}
      >
        {done ? (
          <>
            <Check aria-hidden />
            {doneLabel}
          </>
        ) : (
          <>
            {children}
            <ArrowUpRight aria-hidden />
          </>
        )}
      </a>
      <span role="status" className="sr-only">
        {done ? doneLabel : ""}
      </span>
    </>
  );
}
