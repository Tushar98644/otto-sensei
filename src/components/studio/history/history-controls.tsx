"use client";

import { History, Redo2, Undo2 } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonClasses, Button } from "@/components/ui/button";
import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import { Menu } from "@/components/ui/menu";
import { historyKey, type HistoryKey } from "@/lib/store/history-keys";
import { useHistoryStatus, useStudioStore } from "@/lib/store/resume-store";

const versionsDialog = lazyComponent(() =>
  import("./versions-dialog").then((m) => m.VersionsDialog),
);

const IS_MAC =
  typeof navigator !== "undefined" && /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
const MOD = IS_MAC ? "⌘" : "Ctrl+";

function describe(action: "Undo" | "Redo", label: string | undefined): string {
  return label ? `${action}: ${label}` : action;
}

function stepHistory(id: string, direction: HistoryKey): string | null {
  const store = useStudioStore.getState();
  const history = store.history[id];
  const next = direction === "undo" ? history?.past.at(-1) : history?.future.at(-1);
  const moved = direction === "undo" ? store.undo(id) : store.redo(id);
  if (!moved) return null;
  const verb = direction === "undo" ? "Undone" : "Redone";
  return next?.label ? `${verb}: ${next.label}` : verb;
}

export function HistoryControls({ resumeId }: { resumeId: string | null }) {
  const status = useHistoryStatus(resumeId);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const versionsWanted = useOpenedOnce(versionsOpen);
  const [announcement, setAnnouncement] = useState("");

  function move(direction: HistoryKey) {
    if (!resumeId) return;
    const said = stepHistory(resumeId, direction);
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
      const said = stepHistory(id, action);
      if (said) setAnnouncement(said);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resumeId]);

  if (!resumeId) return null;

  const undoText = describe("Undo", status.undoLabel);
  const redoText = describe("Redo", status.redoLabel);

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
        aria-label="Versions"
        title="Versions"
        aria-haspopup="dialog"
        onClick={() => setVersionsOpen(true)}
        className="max-sm:hidden"
      >
        <History aria-hidden />
      </Button>
      <div className="sm:hidden">
        <Menu
          label="Resume history"
          align="end"
          triggerLabel="Redo and versions"
          triggerClassName={buttonClasses({ variant: "ghost", size: "icon-sm" })}
          trigger={<History aria-hidden />}
          items={[
            {
              label: "Redo",
              icon: Redo2,
              ...(status.redoLabel ? { description: status.redoLabel } : {}),
              disabled: !status.canRedo,
              onSelect: () => move("redo"),
            },
            {
              label: "Versions",
              icon: History,
              description: "Save or restore this resume",
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
