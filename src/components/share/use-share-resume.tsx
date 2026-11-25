"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { useAccountGate } from "@/components/account/account-gate";
import { unlockProTool } from "@/components/account/pro-tools";
import { currentUserId, useMe } from "@/components/account/use-me";
import { Lazy, lazyComponent } from "@/components/ui/lazy";
import type { Resume } from "@/lib/resume/schema";
import { useShareLinksWords } from "./copy-link";
import { shareAndCopy } from "./share-actions";

const shareDialog = lazyComponent(() => import("./share-dialog").then((m) => m.ShareDialog));

export type ShareResume = {
  share: () => void;
  open: () => void;
  dialog: ReactNode;
};

export function useShareResume(resume: Resume): ShareResume {
  const gate = useAccountGate();
  const { user } = useMe();
  const t = useShareLinksWords().actions;
  const [used, setUsed] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [gateUsed, setGateUsed] = useState(false);
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
        if (!(await gate.requireUser(t.signIn))) return;
        owner = await currentUserId();
        if (!owner) return;
      }
      if (!(await unlockProTool("share"))) return;
      await shareAndCopy(resume, owner, open, t);
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
