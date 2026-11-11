"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { unlockProTool } from "@/components/account/pro-tools";
import { currentUserId, useMe } from "@/components/account/use-me";
import { Lazy, lazyComponent } from "@/components/ui/lazy";
import type { Resume } from "@/lib/resume/schema";
import { shareAndCopy } from "./share-actions";

const shareDialog = lazyComponent(() => import("./share-dialog").then((m) => m.ShareDialog));

export type ShareResume = {
  // One click: makes the link (or points it at this version) and copies it. For a menu item.
  share: () => void;
  open: () => void;
  // Render once inside the component that calls the hook.
  dialog: ReactNode;
};

// The settings dialog mounts on first use, so a page of cards doesn't carry one each, and stays
// mounted after, so closing it hands focus back.
export function useShareResume(resume: Resume): ShareResume {
  const gate = useAccountGate();
  const { user } = useMe();
  const [used, setUsed] = useState(false);
  const [isOpen, setOpen] = useState(false);
  // The sign-in dialog mounts only once someone signed out tries to share, like the settings one.
  const [gateUsed, setGateUsed] = useState(false);
  // One link per resume, but two quick clicks would still copy twice and toast twice.
  const busy = useRef(false);

  const open = useCallback(() => {
    setUsed(true);
    setOpen(true);
  }, []);

  async function share() {
    if (busy.current) return;
    busy.current = true;
    try {
      let owner = user?.id ?? null;
      if (!owner) {
        setGateUsed(true);
        if (!(await gate.requireUser("Sign in to share a link to your resume."))) return;
        owner = await currentUserId();
        if (!owner) return;
      }
      // Share links are Pro. A link made before stays live, and its settings stay open on Free.
      if (!(await unlockProTool("share"))) return;
      await shareAndCopy(resume, owner, open);
    } finally {
      busy.current = false;
    }
  }

  return {
    share: () => void share(),
    open,
    dialog: (
      <>
        <Lazy
          loader={shareDialog}
          wanted={used}
          props={{ resume, open: isOpen, onOpenChange: setOpen }}
        />
        {gateUsed ? gate.dialogs : null}
      </>
    ),
  };
}
