"use client";

import { CircleX, MailX, MessagesSquare } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProMark } from "@/components/ui/pro-mark";
import type { ApplicationStatus } from "@/lib/applications/status";
import { fromDateInput, toDateInput } from "../form";
import { cardName, type BoardCard } from "./board";

export type MoveAsk = {
  card: BoardCard;
  column: "interview" | "closed";
  anchor: { x: number; y: number };
};

export type MoveAnswer = { status: ApplicationStatus; interviewAt: number | null; prepare: boolean };

const WIDTH_PX = 288;
const GUTTER_PX = 12;

export function MovePopover({
  ask,
  pro,
  onAnswer,
  onCancel,
}: {
  ask: MoveAsk;
  pro: boolean | null;
  onAnswer: (answer: MoveAnswer) => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const dateId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState(() =>
    ask.card.kind === "application" && ask.card.application.interviewAt
      ? toDateInput(ask.card.application.interviewAt)
      : "",
  );
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const name = cardName(ask.card);
  // Read through a ref, so a new callback from the board doesn't move focus back to the top.
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  }, [onCancel]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const height = panel.offsetHeight;
    const left = Math.min(
      Math.max(GUTTER_PX, ask.anchor.x - WIDTH_PX / 2),
      window.innerWidth - WIDTH_PX - GUTTER_PX,
    );
    const below = ask.anchor.y + 8;
    const top =
      below + height + GUTTER_PX > window.innerHeight
        ? Math.max(GUTTER_PX, ask.anchor.y - height - 8)
        : below;
    setPosition({ left: Math.max(GUTTER_PX, left), top });
  }, [ask.anchor.x, ask.anchor.y]);

  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") cancelRef.current();
    }
    function onDown(event: globalThis.PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node)) cancelRef.current();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, []);

  function interview(prepare: boolean) {
    onAnswer({ status: "interview", interviewAt: day ? fromDateInput(day) : null, prepare });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    interview(false);
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-labelledby={titleId}
      style={{ width: WIDTH_PX, left: position?.left ?? -9999, top: position?.top ?? 0 }}
      className="fixed z-50 flex flex-col gap-3 rounded-xl bg-surface p-4 shadow-float ring-1 ring-ink/6"
    >
      {ask.column === "closed" ? (
        <>
          <div>
            <p id={titleId} className="text-sm/5 font-semibold text-ink">
              How did it end?
            </p>
            <p className="mt-0.5 truncate text-sm/5 text-muted">{name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAnswer({ status: "rejected", interviewAt: null, prepare: false })}
            >
              <CircleX aria-hidden className="text-muted" />
              Rejected
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAnswer({ status: "no_reply", interviewAt: null, prepare: false })}
            >
              <MailX aria-hidden className="text-muted" />
              No reply
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="self-start" onClick={onCancel}>
            Cancel
          </Button>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <p id={titleId} className="text-sm/5 font-semibold text-ink">
              Move to Interviewing
            </p>
            <p className="mt-0.5 truncate text-sm/5 text-muted">{name}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={dateId} className="text-sm/5 font-medium text-ink">
              Interview day <span className="font-normal text-subtle">(optional)</span>
            </label>
            <Input id={dateId} type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              Move
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => interview(true)}>
              <MessagesSquare aria-hidden />
              Move and prepare
              {pro === false ? <ProMark /> : null}
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onCancel}>
            Cancel
          </Button>
        </form>
      )}
    </div>
  );
}
