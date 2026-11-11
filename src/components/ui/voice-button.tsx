"use client";

import { Mic } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { VOICE_LABELS } from "@/lib/voice/dictation";
import { appendDictation } from "@/lib/voice/join";
import { Button } from "./button";
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
  const { listening } = dictation;

  useLayoutEffect(() => {
    latest.current = value;
  }, [value]);

  // Also covers a parent <fieldset disabled> while a form sends.
  useEffect(() => {
    if (listening && buttonRef.current?.matches(":disabled")) dictation.cancel();
  });

  function take(chunk: string) {
    if (buttonRef.current?.matches(":disabled")) {
      dictation.cancel();
      return;
    }
    const { text, full } = appendDictation(latest.current, chunk, maxLength);
    if (text !== latest.current) {
      // Two results can land before the next render, so the second builds on the first.
      latest.current = text;
      onDictate(text);
    }
    if (full) {
      dictation.stop();
      toast({
        title: "This box is full",
        description: "Voice typing stopped. Cut a few words to add more.",
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
      aria-label={listening ? VOICE_LABELS.stop : VOICE_LABELS.start}
      data-listening={listening || undefined}
      onClick={dictation.toggle}
      className={cn(
        "text-muted hover:text-ink data-listening:bg-ink data-listening:text-white data-listening:hover:bg-ink",
        className,
      )}
    >
      {listening ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] ring-4 ring-ink/15 motion-safe:animate-pulse"
        />
      ) : null}
      <Mic />
    </Button>
  );
}
