"use client";

import { memo, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { LivePill } from "@/components/ui/live-pill";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { setBulletText, type BulletSection } from "@/lib/resume/ops";
import { newBullet, type Bullet } from "@/lib/resume/schema";
import { cn, pluralize } from "@/lib/utils";
import {
  bulletsOf,
  editBullets,
  hasLineBreak,
  insertAfter,
  moveItem,
  patchItem,
  pickNeighbor,
  planPaste,
  removeItem,
  setHidden,
  singleLine,
  splitPastedLines,
} from "./edits";
import { useOpenFix } from "./fix-launcher";
import { ottoCanFix, wantsOtto } from "./fix-queue";
import { addLineButtonId, bulletDeleteId, bulletInputId, editThenFocus } from "./focus";
import { HIDDEN_LABEL, HiddenChip } from "./hidden-chip";
import { BULLET_LIMITS, CHAR_LIMITS } from "./limits";
import { LINE_FLASH_LABEL, useLineFlash } from "./line-flash";
import { IssueChip } from "./line-help";
import { LineMenu, LineTools } from "./line-tools";
import { LineDescription, LineTip, useLineLint } from "./lint-notes";
import { useTouchLayout } from "./touch";
import { editLines, getResume, useBulletIssues, useIsLinted } from "./use-editor";

const SHOWN_ON_FOCUS = "sr-only group-focus-within/line:not-sr-only";

export type BulletRowProps = {
  resumeId: string;
  section: BulletSection;
  parentId: string;
  ownerHeadingId: string;
  bullet: Bullet;
  index: number;
  count: number;
};

// Tools are sr-only, not hidden, so Tab still reaches them; touch screens get one ⋯ menu instead.
export const BulletRow = memo(function BulletRow({
  resumeId,
  section,
  parentId,
  ownerHeadingId,
  bullet,
  index,
  count,
}: BulletRowProps) {
  const issues = useBulletIssues(resumeId, bullet.id);
  const openFix = useOpenFix();
  const flashed = useLineFlash(bullet.id);
  const inputId = bulletInputId(bullet.id);
  const labelId = `${inputId}-label`;
  const lintId = `${inputId}-lint`;
  const max = BULLET_LIMITS[section];
  const position = index + 1;
  const hasText = bullet.text.trim() !== "";
  const hidden = bullet.hidden === true;
  const linted = useIsLinted(resumeId, bullet.id);
  const lint = useLineLint(issues, hasText && linted);
  const flagged = !hidden && lint !== null && wantsOtto(lint);
  const fixable = !hidden && lint !== null && ottoCanFix(lint);
  const layout = useTouchLayout();

  function edit(update: (bullets: Bullet[]) => Bullet[]) {
    editLines(resumeId, section, (resume) => editBullets(resume, { section, parentId }, update));
  }

  function siblingIds(): string[] {
    const resume = getResume(resumeId);
    const bullets = resume ? bulletsOf(resume, { section, parentId }) : null;
    return bullets?.map((line) => line.id) ?? [];
  }

  function setText(text: string) {
    // A line break typed after a space becomes that same space, so nothing changed.
    editLines(resumeId, section, (resume) =>
      bulletsOf(resume, { section, parentId })?.find((line) => line.id === bullet.id)?.text === text
        ? resume
        : setBulletText(resume, bullet.id, text),
    );
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setText(singleLine(event.target.value));
  }

  function addLineBelow() {
    if (count >= max) {
      toast({ title: `This can hold up to ${max} lines.` });
      return;
    }
    const fresh = newBullet();
    editThenFocus(
      () => edit((bullets) => insertAfter(bullets, bullet.id, [fresh])),
      bulletInputId(fresh.id),
      "start",
    );
  }

  function remove(from: "keyboard" | "button") {
    const byKeyboard = from === "keyboard";
    const neighbor = pickNeighbor(siblingIds(), bullet.id, byKeyboard ? "previous" : "next");
    let targetId = addLineButtonId(parentId);
    if (neighbor) targetId = byKeyboard ? bulletInputId(neighbor.id) : bulletDeleteId(neighbor.id);
    editThenFocus(
      () => edit((bullets) => removeItem(bullets, bullet.id)),
      targetId,
      neighbor?.before ? "end" : "start",
    );
  }

  function moveByKeyboard(field: HTMLTextAreaElement, delta: -1 | 1) {
    const { selectionStart, selectionEnd } = field;
    // The moved textarea drops focus when React moves its node, so render now and restore it.
    flushSync(() => edit((bullets) => moveItem(bullets, bullet.id, delta)));
    field.focus();
    field.setSelectionRange(selectionStart, selectionEnd);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    const modified = event.altKey || event.ctrlKey || event.metaKey;
    if (event.key === "Enter" && !modified) {
      event.preventDefault();
      addLineBelow();
      return;
    }
    if (
      event.key === "Backspace" &&
      !modified &&
      !event.shiftKey &&
      event.currentTarget.value === "" &&
      count > 1
    ) {
      event.preventDefault();
      remove("keyboard");
      return;
    }
    if (event.altKey && !event.ctrlKey && !event.metaKey) {
      const delta = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
      if (delta === 0 || index + delta < 0 || index + delta >= count) return;
      event.preventDefault();
      moveByKeyboard(event.currentTarget, delta);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const raw = event.clipboardData.getData("text/plain");
    if (!hasLineBreak(raw)) return;
    event.preventDefault();
    const field = event.currentTarget;
    const plan = planPaste({
      before: field.value.slice(0, field.selectionStart),
      after: field.value.slice(field.selectionEnd),
      lines: splitPastedLines(raw),
      room: max - count,
      maxChars: CHAR_LIMITS.bullet,
    });
    const added = plan.added.map((text) => newBullet(text));
    editThenFocus(
      () =>
        edit((bullets) =>
          insertAfter(
            patchItem(bullets, bullet.id, (line) => ({ ...line, text: plan.current })),
            bullet.id,
            added,
          ),
        ),
      bulletInputId(added.at(-1)?.id ?? bullet.id),
      plan.caret,
    );
    if (plan.dropped > 0) {
      toast({
        title: "Some lines didn't fit",
        description: `This can hold up to ${max} lines, so ${pluralize(plan.dropped, "line")} ${plan.dropped === 1 ? "was" : "were"} left out.`,
      });
    }
  }

  const fine = layout === "fine";
  const fixInChipRow = layout === "phone" && flagged;
  const fixBelow = fixable && (fine || (layout === "tablet" && flagged));
  const fixButton = (
    <Button
      variant="ghost"
      size="sm"
      disabled={!hasText}
      aria-describedby={`${labelId} ${ownerHeadingId}`}
      onClick={() => openFix(bullet.id)}
      className={cn("max-sm:h-11", !fixInChipRow && "-ml-3")}
    >
      <OttoMark tone="line" small className="size-5 text-ink" />
      Fix with Otto
    </Button>
  );
  const tools = {
    position,
    canMoveUp: index > 0,
    canMoveDown: index < count - 1,
    hidden,
    deleteId: bulletDeleteId(bullet.id),
    onMove: (delta: -1 | 1) => edit((bullets) => moveItem(bullets, bullet.id, delta)),
    onToggleHidden: () =>
      edit((bullets) => patchItem(bullets, bullet.id, (line) => setHidden(line, !hidden))),
    onRemove: () => remove("button"),
  };

  return (
    <li className="group/line">
      <label id={labelId} htmlFor={inputId} className="sr-only">
        {`Line ${position}`}
      </label>
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-y-1.5 border-b border-border-strong transition-colors focus-within:border-ink focus-within:shadow-[inset_0_-1px_0_var(--color-ink)] sm:grid-cols-[minmax(0,1fr)_auto_auto]",
          hidden && "border-dashed",
        )}
      >
        <div className="relative col-start-1 row-start-1 grid min-w-0">
          {flagged ? (
            <div
              aria-hidden
              className="pointer-events-none col-start-1 row-start-1 py-2.5 text-base wrap-break-word whitespace-pre-wrap text-transparent sm:text-sm"
            >
              <span className="bg-highlight box-decoration-clone">{bullet.text}</span>
            </div>
          ) : null}
          <Textarea
            id={inputId}
            variant="line"
            autoResize
            value={bullet.text}
            maxLength={CHAR_LIMITS.bullet}
            aria-labelledby={`${labelId} ${ownerHeadingId}`}
            aria-describedby={lint || hidden ? lintId : undefined}
            placeholder="What did you do, and what changed because of it?"
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            className={cn(
              "col-start-1 row-start-1 border-b-0 focus-visible:shadow-none",
              hidden && "text-muted",
            )}
          />
        </div>
        <div className="col-span-2 row-start-2 flex min-h-6 items-center gap-2 max-sm:mb-2.5 max-sm:empty:hidden sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:mt-2 sm:ml-3 sm:w-36 sm:justify-end">
          {flashed ? (
            <span aria-hidden className="flex">
              <LivePill announce={false}>{LINE_FLASH_LABEL}</LivePill>
            </span>
          ) : hidden ? (
            <span aria-hidden className="flex">
              <HiddenChip />
            </span>
          ) : lint && lint.length > 0 ? (
            <IssueChip
              issues={lint}
              text={bullet.text}
              onFix={() => openFix(bullet.id)}
              onSetText={setText}
            />
          ) : null}
          {fixInChipRow ? fixButton : null}
        </div>
        {fine ? null : (
          <LineMenu {...tools} className="col-start-2 row-start-1 ml-1 sm:col-start-3" />
        )}
      </div>
      {hidden ? (
        <div id={lintId} className="sr-only">
          {HIDDEN_LABEL}
        </div>
      ) : (
        <LineDescription id={lintId} issues={lint} />
      )}
      {fine || fixBelow ? (
        // not-sr-only resets padding and margin, so the spacing lives on the inner row.
        <div className={cn(fine && !flagged && SHOWN_ON_FOCUS)}>
          <div className="flex flex-col gap-1 pt-2 pb-1">
            <div className="flex items-center gap-1">
              {fixBelow ? fixButton : null}
              {fine ? <LineTools {...tools} className={cn(flagged && SHOWN_ON_FOCUS)} /> : null}
            </div>
            {lint && fine ? (
              <div className={cn(flagged && SHOWN_ON_FOCUS)}>
                <LineTip issues={lint} />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </li>
  );
});
