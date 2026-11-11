"use client";

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  dictationProblem,
  getRecognition,
  startDictation,
  type DictationSession,
} from "@/lib/voice/dictation";
import { toast } from "./toast";

export type Dictation = {
  supported: boolean;
  listening: boolean;
  toggle: () => void;
  stop: () => void;
  cancel: () => void;
};

const subscribe = () => () => {};
const browserSupports = () => getRecognition(window) !== null;
const serverSupports = () => false;

// The server and hydration both say no, so the button appears after mount without a mismatch.
export function useVoiceSupported(): boolean {
  return useSyncExternalStore(subscribe, browserSupports, serverSupports);
}

export function reportDictationError(code: string): void {
  const problem = dictationProblem(code);
  if (problem) toast({ ...problem, variant: "error" });
}

export function useDictation(onText: (chunk: string) => void): Dictation {
  const supported = useVoiceSupported();
  const [listening, setListening] = useState(false);
  const session = useRef<DictationSession | null>(null);
  const onTextRef = useRef(onText);

  useLayoutEffect(() => {
    onTextRef.current = onText;
  });

  useEffect(() => {
    return () => {
      session.current?.cancel();
    };
  }, []);

  function finish(how: "stop" | "cancel") {
    const current = session.current;
    session.current = null;
    setListening(false);
    current?.[how]();
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
    const Recognition = getRecognition(window);
    if (!Recognition) return;
    const started = startDictation(Recognition, navigator.language, {
      onText: (chunk) => onTextRef.current(chunk),
      onError: reportDictationError,
      onEnd: () => {
        if (session.current !== started) return;
        session.current = null;
        setListening(false);
      },
    });
    if (!started) return;
    session.current = started;
    setListening(true);
  }

  return {
    supported,
    listening,
    toggle: () => (listening ? finish("stop") : start()),
    stop: () => finish("stop"),
    cancel: () => finish("cancel"),
  };
}
