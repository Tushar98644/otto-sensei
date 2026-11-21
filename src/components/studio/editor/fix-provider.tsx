"use client";

import type { ReactNode } from "react";
import { LazyUpgradeDialog } from "@/components/account/lazy-dialogs";
import { FixDialog } from "./fix-dialog";
import { FixAllContext, FixLauncherContext } from "./fix-launcher";
import { LazyFixAllDialog } from "./lazy-fix-all-dialog";
import { useFixAll } from "./use-fix-all";
import { useFixFlow } from "./use-fix-flow";

export function FixDialogProvider({
  resumeId,
  children,
}: {
  resumeId: string;
  children: ReactNode;
}) {
  const flow = useFixFlow(resumeId);
  const all = useFixAll(resumeId);
  return (
    <FixLauncherContext value={flow.open}>
      <FixAllContext value={all.start}>
        {children}
        <FixDialog flow={flow} resumeId={resumeId} />
        <LazyFixAllDialog all={all} />
        <LazyUpgradeDialog
          open={all.upsell.open}
          onOpenChange={(open) => {
            if (!open) all.closeUpsell();
          }}
          feature={all.upsell.feature}
        />
        {flow.dialogs}
        {all.dialogs}
      </FixAllContext>
    </FixLauncherContext>
  );
}
