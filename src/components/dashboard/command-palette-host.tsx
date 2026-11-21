"use client";

import { useEffect } from "react";
import { Lazy, lazyComponent, useOpenedOnce } from "@/components/ui/lazy";
import type { CommandPaletteProps } from "./command-palette";
import {
  applePlatform,
  isPaletteShortcut,
  registerCommandPalette,
  setCommandPaletteOpen,
  useCommandPaletteOpen,
} from "./command-palette-store";
import type { StudioActions } from "./use-studio-actions";

const palette = lazyComponent(() => import("./command-palette").then((m) => m.CommandPalette));

export function CommandPaletteHost({ actions }: { actions: StudioActions }) {
  const open = useCommandPaletteOpen();
  const wanted = useOpenedOnce(open);

  useEffect(() => registerCommandPalette(), []);

  useEffect(() => {
    const apple = applePlatform();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !isPaletteShortcut(event, apple)) return;
      // Over another dialog it would pull focus away from the work in it.
      if (!open && document.querySelector("dialog[open]")) return;
      event.preventDefault();
      setCommandPaletteOpen(!open);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const props: CommandPaletteProps = { open, onOpenChange: setCommandPaletteOpen, actions };
  return <Lazy loader={palette} wanted={wanted} props={props} />;
}
