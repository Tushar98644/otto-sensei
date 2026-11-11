"use client";

import { Trash } from "lucide-react";
import { memo, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { OttoMark } from "@/components/site/otto-mark";
import { Button } from "@/components/ui/button";
import { LivePill } from "@/components/ui/live-pill";
import { StatusPill } from "@/components/ui/status";
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
import { addLineButtonId, bulletDeleteId, bulletInputId, editThenFocus } from "./focus";
import { HIDDEN_LABEL, HiddenChip, HideToggle } from "./hidden-chip";
import { BULLET_LIMITS, CHAR_LIMITS } from "./limits";
import { IssueChip, wantsOtto } from "./line-help";
import { LINE_FLASH_LABEL, useLineFlash } from "./line-flash";
import { LineDescription, LineTip, useLineLint } from "./lint-notes";
import { ICON_ACTION_CLASSES, MoveButtons } from "./move-buttons";
import { editLines, getResume, useBulletIssues, useIsLinted } from "./use-editor";

const SHOWN_ON_FOCUS = "sr-only group-focus-within/line:not-sr-only pointer-coarse:not-sr-only";

export type BulletRowProps = {
  resumeId: string;
  section: BulletSection;
  parentId: string;
  // Space-separated ids allowed (a role and its company): each line is announced with its owner.
  ownerHeadingId: string;
  bullet: Bullet;
  index: number;
  count: number;
};

// Tools show on focus, not hover: a row growing under the pointer makes the list jump. They're
// sr-only rather than hidden, so Tab still reaches them.
// Memoized and fed primitives, so typing in one line re-renders only that line.
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
  // Hidden lines, and lines under a hidden entry or section, never print, so aren't linted.
  const linted = useIsLinted(resumeId, bullet.id);
  const lint = useLineLint(issues, hasText && linted);
  const flagged = !hidden && lint !== null && wantsOtto(lint);

  function edit(update: (bullets: Bullet[]) => Bullet[]) {
    editLines(resumeId, section, (resume) => editBullets(resume, { section, parentId }, update));
  }

  function siblingIds(): string[] {
    const resume = getResume(resumeId);
    const bullets = resume ? bulletsOf(resume, { section, parentId }) : null;
    return bullets?.map((line) => line.id) ?? [];
  }

  function setText(text: string) {
    editLines(resumeId, section, (resume) => setBulletText(resume, bullet.id, text));
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

  // Backspace lands on the line above; the delete button moves focus on so no keyboard pops up.
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

  return (
    <li className="group/line">
      <label id={labelId} htmlFor={inputId} className="sr-only">
        {`Line ${position}`}
      </label>
      {/* The rule sits on this row, not the field, so a chip wrapped under the words (phones)
          stays inside its own ruled line. Dashed when hidden: not on the printed page. */}
      <div
        className={cn(
          "flex flex-col gap-1.5 border-b border-border-strong transition-colors focus-within:border-ink focus-within:shadow-[inset_0_-1px_0_var(--color-ink)] sm:flex-row sm:items-start sm:gap-3",
          hidden && "border-dashed",
        )}
      >
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
          className={cn("flex-1 border-b-0 focus-visible:shadow-none", hidden && "text-muted")}
        />
        {/* Fixed size, so a pill replacing the chip never moves the row and every line wraps at the
            same place. Pills are aria-hidden: the line's description reads them instead. */}
        <div className="flex h-6 shrink-0 items-center max-sm:mb-2.5 max-sm:empty:hidden sm:mt-2 sm:w-36 sm:justify-end">
          {flashed ? (
            <span aria-hidden className="flex">
              <LivePill announce={false}>{LINE_FLASH_LABEL}</LivePill>
            </span>
          ) : hidden ? (
            <span aria-hidden className="flex">
              <HiddenChip />
            </span>
          ) : lint && lint.length === 0 ? (
            <span aria-hidden className="flex">
              <StatusPill status="pass">Looks good</StatusPill>
            </span>
          ) : lint ? (
            <IssueChip
              issues={lint}
              text={bullet.text}
              onFix={() => openFix(bullet.id)}
              onSetText={setText}
            />
          ) : null}
        </div>
      </div>
      {hidden ? (
        <div id={lintId} className="sr-only">
          {HIDDEN_LABEL}
        </div>
      ) : (
        <LineDescription id={lintId} issues={lint} />
      )}
      {/* not-sr-only resets padding and margin, so the spacing lives on the inner row. */}
      <div className={cn(!flagged && SHOWN_ON_FOCUS)}>
        <div className="flex flex-col gap-1 pt-2 pb-1">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={!hasText}
              aria-describedby={`${labelId} ${ownerHeadingId}`}
              onClick={() => openFix(bullet.id)}
              className="-ml-3 max-sm:h-11"
            >
              <OttoMark tone="line" small className="size-5 text-ink" />
              Fix with Otto
            </Button>
            {/* flex-1 rather than ml-auto: not-sr-only resets margins. */}
            <div className={cn("flex flex-1 justify-end", flagged && SHOWN_ON_FOCUS)}>
              <div className="-mr-2 flex items-center">
                <MoveButtons
                  label={`line ${position}`}
                  canMoveUp={index > 0}
                  canMoveDown={index < count - 1}
                  onMove={(delta) => edit((bullets) => moveItem(bullets, bullet.id, delta))}
                />
                <HideToggle
                  label={`line ${position}`}
                  hidden={hidden}
                  onToggle={() =>
                    edit((bullets) =>
                      patchItem(bullets, bullet.id, (line) => setHidden(line, !hidden)),
                    )
                  }
                />
                <Button
                  id={bulletDeleteId(bullet.id)}
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete line ${position}`}
                  onClick={() => remove("button")}
                  className={ICON_ACTION_CLASSES}
                >
                  <Trash />
                </Button>
              </div>
            </div>
          </div>
          {/* Under the buttons, so the tip appearing on focus never moves the button being pressed. */}
          {lint ? (
            <div className={cn(flagged && SHOWN_ON_FOCUS)}>
              <LineTip issues={lint} />
            </div>
          ) : null}
        </div>
      </div>
    </li>
  );
});
