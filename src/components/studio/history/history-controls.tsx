"use client";

import { History, Redo2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClasses, Button } from "@/components/ui/button";
import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import { Menu } from "@/components/ui/menu";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import type { Messages } from "@/i18n/messages";
import { historyKey, type HistoryKey } from "@/lib/store/history-keys";
import { historyLabel } from "./history-words";
import { useHistoryStatus, useStudioStore } from "@/lib/store/resume-store";

const versionsDialog = lazyComponent(() =>
  import("./versions-dialog").then((m) => m.VersionsDialog),
);

const IS_MAC =
  typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl+";

type HistoryCopy = Pick<Messages["studio"], "history" | "versions">;

function describe(action: string, label: string | undefined, studio: HistoryCopy): string {
  return label
    ? fmt(studio.history.labelled, { action, label: historyLabel(label, studio) })
    : action;
}

function stepHistory(id: string, direction: HistoryKey, studio: HistoryCopy): string | null {
  const t = studio.history;
  const store = useStudioStore.getState();
  const history = store.history[id];
  const next = direction === "undo" ? history?.past.at(-1) : history?.future.at(-1);
  const moved = direction === "undo" ? store.undo(id) : store.redo(id);
  if (!moved) return null;
  const verb = direction === "undo" ? t.undone : t.redone;
  return describe(verb, next?.label, studio);
}

export function HistoryControls({ resumeId }: { resumeId: string | null }) {
  const status = useHistoryStatus(resumeId);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versionsWanted = useOpenedOnce(versionsOpen);
  const [announcement, setAnnouncement] = useState("");
  const studio = useMessages("studio");
  const t = studio.history;

  function move(direction: HistoryKey) {
    if (!resumeId) return;
    const said = stepHistory(resumeId, direction, studio);
    if (said) setAnnouncement(said);
  }

  useEffect(() => {
    if (!resumeId) return;
    const id = resumeId;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const action = historyKey(event, target);
      if (!action) return;
      // Ours even when there's nothing left to undo, so the browser doesn't undo something else.
      event.preventDefault();
      const said = stepHistory(id, action, studio);
      if (said) setAnnouncement(said);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resumeId, studio]);

  if (!resumeId) return null;

  const undoText = describe(t.undo, status.undoLabel, studio);
  const redoText = describe(t.redo, status.redoLabel, studio);

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={undoText}
        title={`${undoText} (${MOD}Z)`}
        aria-keyshortcuts="Control+Z Meta+Z"
        disabled={!status.canUndo}
        onClick={() => move("undo")}
      >
        <Undo2 aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={redoText}
        title={`${redoText} (${IS_MAC ? "⇧⌘Z" : "Ctrl+Shift+Z"})`}
        aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
        disabled={!status.canRedo}
        onClick={() => move("redo")}
        className="max-sm:hidden"
      >
        <Redo2 aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t.versions}
        title={t.versions}
        aria-haspopup="dialog"
        onClick={() => setVersionsOpen(true)}
        className="max-sm:hidden"
      >
        <History aria-hidden />
      </Button>
      <div className="sm:hidden">
        <Menu
          label={t.menu}
          align="end"
          triggerLabel={t.menuTrigger}
          triggerClassName={buttonClasses({ variant: "ghost", size: "icon-sm" })}
          trigger={<History aria-hidden />}
          items={[
            {
              label: t.redo,
              icon: Redo2,
              ...(status.redoLabel ? { description: historyLabel(status.redoLabel, studio) } : {}),
              disabled: !status.canRedo,
              onSelect: () => move("redo"),
            },
            {
              label: t.versions,
              icon: History,
              description: t.versionsHint,
              onSelect: () => setVersionsOpen(true),
            },
          ]}
        />
      </div>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      <Lazy
        loader={versionsDialog}
        wanted={versionsWanted}
        props={{ resumeId, open: versionsOpen, onOpenChange: setVersionsOpen }}
      />
    </div>
  );
}
