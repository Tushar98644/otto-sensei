"use client";

import { cn } from "@/lib/utils";
import { Input, type InputProps } from "./input";
import { Textarea, type TextareaProps } from "./textarea";
import { useVoiceSupported } from "./use-dictation";
import { VoiceButton } from "./voice-button";

type Voice = { onDictate: (text: string) => void };

type MicProps = Voice & {
  value: unknown;
  maxLength?: number;
  disabled?: boolean;
};

// Top-right, not bottom-right: a textarea's resize grip lives in that corner.
function MicInBox({ value, maxLength, disabled, onDictate }: MicProps) {
  return (
    <VoiceButton
      value={typeof value === "string" ? value : ""}
      maxLength={maxLength}
      disabled={disabled}
      onDictate={onDictate}
      className="absolute top-1.5 right-1.5 size-8 after:absolute after:-inset-1.5 pointer-coarse:size-8"
    />
  );
}

export function VoiceTextarea({ onDictate, className, ...props }: TextareaProps & Voice) {
  const supported = useVoiceSupported();
  return (
    <div className="relative">
      <Textarea {...props} className={cn(supported && "pr-12", className)} />
      <MicInBox
        value={props.value}
        maxLength={props.maxLength}
        disabled={props.disabled}
        onDictate={onDictate}
      />
    </div>
  );
}

export function VoiceInput({ onDictate, className, ...props }: InputProps & Voice) {
  const supported = useVoiceSupported();
  return (
    <div className="relative">
      <Input {...props} className={cn(supported && "pr-12", className)} />
      <MicInBox
        value={props.value}
        maxLength={props.maxLength}
        disabled={props.disabled}
        onDictate={onDictate}
      />
    </div>
  );
}
