"use client";

import { Mic } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { elapsedText, VOICE_LABELS } from "@/lib/voice/recorder";
import { appendDictation } from "@/lib/voice/join";
import { Button } from "./button";
import { Spinner } from "./spinner";
import { toast } from "./toast";
import { useDictation } from "./use-dictation";

export type VoiceButtonProps = Omit<
  ComponentProps<"button">,
  "value" | "onClick" | "children" | "type" | "ref"
> & {
  value: string;
  maxLength?: number;
  onDictate: (text: string) => void;
  size?: "icon" | "icon-sm";
};

const PILL =
  "pointer-events-none absolute top-1/2 right-full mr-1.5 -translate-y-1/2 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums";

export function VoiceButton({
  value,
  maxLength,
  onDictate,
  size = "icon-sm",
  className,
  ...props
}: VoiceButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const latest = useRef(value);
  const dictation = useDictation(take);
  const { phase, startedAt } = dictation;
  const listening = phase === "starting" || phase === "recording";
  const sending = phase === "sending";

  useLayoutEffect(() => {
    latest.current = value;
  }, [value]);

  // Also covers a parent <fieldset disabled> while a form sends.
  useEffect(() => {
    if (phase !== "idle" && buttonRef.current?.matches(":disabled")) dictation.cancel();
  });

  function take(text: string) {
    if (buttonRef.current?.matches(":disabled")) return;
    const { text: next, full } = appendDictation(latest.current, text, maxLength);
    if (next !== latest.current) {
      latest.current = next;
      onDictate(next);
    }
    if (full) {
      toast({
        title: "This box is full",
        description: "Some of what you said didn't fit. Cut a few words to add more.",
      });
    }
  }

  if (!dictation.supported) return null;

  return (
    <Button
      {...props}
      ref={buttonRef}
      variant="ghost"
      size={size}
      aria-pressed={listening}
      aria-disabled={sending || undefined}
      aria-label={
        sending ? VOICE_LABELS.sending : listening ? VOICE_LABELS.stop : VOICE_LABELS.start
      }
      data-listening={listening || undefined}
      data-sending={sending || undefined}
      onClick={dictation.toggle}
      className={cn(
        "text-muted hover:text-ink data-listening:bg-ink data-listening:text-white data-listening:hover:bg-ink data-sending:cursor-progress",
        className,
      )}
    >
      {listening ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-4 ring-ink/15 motion-safe:animate-pulse"
        />
      ) : null}
      {phase === "recording" && startedAt !== null ? (
        <span aria-hidden className={cn(PILL, "bg-ink text-white")}>
          <Elapsed since={startedAt} />
        </span>
      ) : null}
      {sending ? (
        <span
          aria-hidden
          className={cn(PILL, "border border-border bg-surface text-muted shadow-sm")}
        >
          {VOICE_LABELS.sending}
        </span>
      ) : null}
      {sending ? <Spinner /> : <Mic />}
    </Button>
  );
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(since);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  return elapsedText(now - since);
}
