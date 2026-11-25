"use client";

import { CircleX, MailX, MessagesSquare } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import type { ApplicationStatus } from "@/lib/applications/status";
import { fromDateInput, fromTimeInput, toDateInput, toTimeInput } from "../form";
import { cardName, type BoardCard } from "./board";

export type MoveAsk = {
  card: BoardCard;
  column: "interview" | "closed";
  anchor: { x: number; y: number };
};

export type MoveAnswer = {
  status: ApplicationStatus;
  interviewAt: number | null;
  // Minutes after midnight on this device's clock; null with no time typed.
  interviewTime: number | null;
  prepare: boolean;
};

const WIDTH_PX = 320;
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
  const t = useMessages("applications").move;
  const titleId = useId();
  const dateId = useId();
  const timeId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [day, setDay] = useState(() =>
    ask.card.kind === "application" && ask.card.application.interviewAt
      ? toDateInput(ask.card.application.interviewAt)
      : "",
  );
  const [time, setTime] = useState(() =>
    ask.card.kind === "application" ? toTimeInput(ask.card.application.interviewTime) : "",
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
    const interviewAt = day ? fromDateInput(day) : null;
    const interviewTime = interviewAt === null ? null : fromTimeInput(time);
    onAnswer({ status: "interview", interviewAt, interviewTime, prepare });
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
              {t.howEnded}
            </p>
            <p className="mt-0.5 truncate text-sm/5 text-muted">{name}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                onAnswer({
                  status: "rejected",
                  interviewAt: null,
                  interviewTime: null,
                  prepare: false,
                })
              }
            >
              <CircleX aria-hidden className="text-muted" />
              {t.rejected}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                onAnswer({
                  status: "no_reply",
                  interviewAt: null,
                  interviewTime: null,
                  prepare: false,
                })
              }
            >
              <MailX aria-hidden className="text-muted" />
              {t.noReply}
            </Button>
          </div>
          <Button variant="ghost" size="sm" className="self-start" onClick={onCancel}>
            {t.cancel}
          </Button>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div>
            <p id={titleId} className="text-sm/5 font-semibold text-ink">
              {t.toInterview}
            </p>
            <p className="mt-0.5 truncate text-sm/5 text-muted">{name}</p>
          </div>
          <fieldset className="flex min-w-0 flex-col gap-1.5">
            <legend className="mb-1.5 text-sm/5 font-medium text-ink">
              {t.when} <span className="font-normal text-subtle">{t.optional}</span>
            </legend>
            <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2">
              <Input
                id={dateId}
                type="date"
                aria-label={t.day}
                value={day}
                onChange={(event) => setDay(event.target.value)}
              />
              <Input
                id={timeId}
                type="time"
                aria-label={t.time}
                value={time}
                disabled={!day}
                onChange={(event) => setTime(event.target.value)}
              />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm">
              {t.move}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => interview(true)}>
              <MessagesSquare aria-hidden />
              {t.movePrepare}
              {pro === false ? (
                <Badge variant="ink" className="h-5 px-1.5">
                  Pro
                </Badge>
              ) : null}
            </Button>
          </div>
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={onCancel}>
            {t.cancel}
          </Button>
        </form>
      )}
    </div>
  );
}
