"use client";

import { RotateCcw, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";

const LIMIT_MS = 2 * 60_000;
const TICK_MS = 250;

type TimerState =
  | { status: "idle" }
  | { status: "running"; endsAt: number }
  | { status: "paused"; left: number }
  | { status: "done" };

function clock(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PracticeTimer() {
  const { timer: t } = useMessages("prep");
  const [state, setState] = useState<TimerState>({ status: "idle" });
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (state.status !== "running") return;
    const { endsAt } = state;
    const id = window.setInterval(() => {
      const time = Date.now();
      if (time >= endsAt) setState({ status: "done" });
      else setNow(time);
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [state]);

  function start(left: number) {
    const time = Date.now();
    setNow(time);
    setState({ status: "running", endsAt: time + left });
  }

  if (state.status === "idle") {
    return (
      <Button variant="secondary" onClick={() => start(LIMIT_MS)}>
        <Timer aria-hidden />
        {t.start}
      </Button>
    );
  }

  const left =
    state.status === "running"
      ? Math.max(0, state.endsAt - now)
      : state.status === "paused"
        ? state.left
        : 0;

  return (
    <div className="inline-flex h-11 items-center gap-1 rounded-xl bg-surface-muted pr-1 pl-3.5">
      <Timer aria-hidden className="size-4 text-muted" />
      <span
        role="timer"
        aria-label={t.left}
        className="w-11 text-center text-base font-medium text-ink tabular-nums"
      >
        {clock(left)}
      </span>
      {state.status === "running" ? (
        <Button variant="ghost" size="sm" onClick={() => setState({ status: "paused", left })}>
          {t.pause}
        </Button>
      ) : state.status === "paused" ? (
        <Button variant="ghost" size="sm" onClick={() => start(state.left)}>
          {t.resume}
        </Button>
      ) : (
        <span className="px-2 text-sm text-muted">{t.wrapUp}</span>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.reset}
        onClick={() => setState({ status: "idle" })}
      >
        <RotateCcw className="text-muted" />
      </Button>
      <span className="sr-only" aria-live="polite">
        {state.status === "done" ? t.up : ""}
      </span>
    </div>
  );
}
