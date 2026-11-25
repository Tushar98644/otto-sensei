"use client";

import { Mic } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useMessagesOr } from "@/i18n/client";
import EN_UI from "@/i18n/messages/en/ui";
import { isListening, type VoicePhase } from "@/lib/voice/dictation";
import { appendDictation } from "@/lib/voice/join";
import { elapsedText } from "@/lib/voice/recorder";
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
  const words = useMessagesOr("ui", EN_UI).voice;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const latest = useRef(value);
  const dictation = useDictation(take);
  const { phase, startedAt } = dictation;
  const listening = isListening(phase);
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
      dictation.stop();
      toast({ title: words.fullTitle, description: words.full });
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
      aria-label={labelFor(phase, words)}
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
          {words.sending}
        </span>
      ) : null}
      {sending ? <Spinner /> : <Mic />}
    </Button>
  );
}

function labelFor(phase: VoicePhase, words: (typeof EN_UI)["voice"]): string {
  if (phase === "idle") return words.start;
  if (phase === "listening") return words.listening;
  if (phase === "sending") return words.sending;
  return words.recording;
}

function Elapsed({ since }: { since: number }) {
  const [now, setNow] = useState(since);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  return elapsedText(now - since);
}
