"use client";

import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { OttoNote } from "@/components/mascot/otto-note";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { NO_REPLY_AFTER_DAYS, nudgeMessage } from "@/lib/applications/nudge";
import type { Application } from "@/lib/applications/schema";
import { formatCount } from "@/lib/applications/stats";
import { markNoReply } from "./use-applications";

// Applications left on "applied" for weeks read as "still waiting" and flatter the win rate.
// Otto offers to close them; "Not now" hides the offer until another one goes quiet.
export function NoReplyNudge({ stale }: { stale: readonly Application[] }) {
  const [dismissed, setDismissed] = useState("");
  const [saving, setSaving] = useState(false);
  const key = stale.map((application) => application.id).join(",");
  if (stale.length === 0 || key === dismissed) return null;

  async function close() {
    setSaving(true);
    try {
      const changed = await markNoReply(stale);
      toast({
        title: `Marked ${formatCount(changed, "application")} as no reply`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Couldn't mark them as no reply",
        description: errorMessage(error),
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-surface p-5 sm:p-6">
      <OttoNote
        live={false}
        meta={`${formatCount(stale.length, "application")} waiting ${NO_REPLY_AFTER_DAYS}+ days`}
        message={nudgeMessage(stale)}
      >
        <Button variant="secondary" loading={saving} onClick={() => void close()}>
          {stale.length === 1 ? "Mark as no reply" : `Mark all ${stale.length} as no reply`}
        </Button>
        <Button variant="ghost" onClick={() => setDismissed(key)}>
          Not now
        </Button>
      </OttoNote>
    </div>
  );
}
