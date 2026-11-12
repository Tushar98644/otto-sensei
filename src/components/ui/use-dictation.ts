"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useMe } from "@/components/account/use-me";
import { api } from "@/lib/api/client";
import {
  canDictate,
  isListening,
  startDictation,
  type DictationSession,
  type VoicePhase,
} from "@/lib/voice/dictation";
import { voiceProblemCopy, type VoiceProblem } from "@/lib/voice/problems";
import type { VoiceClip } from "@/lib/voice/recorder";
import { toast } from "./toast";

export type Dictation = {
  supported: boolean;
  phase: VoicePhase;
  startedAt: number | null;
  toggle: () => void;
  stop: () => void;
  cancel: () => void;
};

const subscribe = () => () => {};
const browserSupports = () => canDictate(window);
const serverSupports = () => false;

// The server and hydration both say no, so the button appears after mount without a mismatch.
export function useVoiceSupported(): boolean {
  return useSyncExternalStore(subscribe, browserSupports, serverSupports);
}

export function reportVoiceProblem(problem: VoiceProblem): void {
  toast({ ...voiceProblemCopy(problem), variant: "error" });
}

async function transcribe(clip: VoiceClip, signal: AbortSignal): Promise<string> {
  return (await api.transcribe(clip.audio, clip.seconds, signal)).text;
}

export function useDictation(onText: (text: string) => void): Dictation {
  const supported = useVoiceSupported();
  const { me } = useMe();
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const session = useRef<DictationSession | null>(null);
  const onTextRef = useRef(onText);
  const listening = isListening(phase);

  useLayoutEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    return () => {
      session.current?.cancel();
    };
  }, []);

  function finish(how: "stop" | "cancel") {
    session.current?.[how]();
  }

  const stopOnEscape = useEffectEvent(() => finish("stop"));

  useEffect(() => {
    if (!listening) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.isComposing) return;
      // Captured first, so Escape stops listening without also closing the dialog around it.
      event.preventDefault();
      event.stopPropagation();
      stopOnEscape();
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [listening]);

  function start() {
    const mine = () => session.current === started;
    const started = startDictation(
      window,
      { signedOut: Boolean(me && !me.user), transcribe },
      {
        onPhase: (next, at) => {
          if (!mine()) return;
          setPhase(next);
          setStartedAt(at ?? null);
        },
        onText: (text) => {
          if (mine()) onTextRef.current(text);
        },
        onProblem: reportVoiceProblem,
        onEnd: () => {
          if (!mine()) return;
          session.current = null;
          setStartedAt(null);
          setPhase("idle");
        },
      },
    );
    if (!started) return;
    session.current = started;
    setPhase("starting");
  }

  return {
    supported,
    phase,
    startedAt,
    toggle: () => {
      if (phase === "idle") start();
      else if (listening) finish("stop");
    },
    stop: () => finish("stop"),
    cancel: () => finish("cancel"),
  };
}
