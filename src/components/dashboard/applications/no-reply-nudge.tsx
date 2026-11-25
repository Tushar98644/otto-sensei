"use client";

import { useState } from "react";
import { errorMessage } from "@/components/account/errors";
import { OttoNote } from "@/components/mascot/otto-note";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { NO_REPLY_AFTER_DAYS } from "@/lib/applications/nudge";
import type { Application } from "@/lib/applications/schema";
import { nudgeLine } from "./copy";
import { markNoReply } from "./use-applications";

export function NoReplyNudge({ stale }: { stale: readonly Application[] }) {
  const t = useMessages("applications");
  const { nudge } = t;
  const format = useFormat();
  const [dismissed, setDismissed] = useState("");
  const [saving, setSaving] = useState(false);
  const key = stale.map((application) => application.id).join(",");
  if (stale.length === 0 || key === dismissed) return null;

  async function close() {
    setSaving(true);
    try {
      const changed = await markNoReply(stale);
      toast({
        title: format.plural(nudge.marked, changed),
        variant: "success",
      });
    } catch (error) {
      toast({
        title: nudge.cantMark,
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
        meta={format.plural(nudge.waiting, stale.length, {
          days: format.number(NO_REPLY_AFTER_DAYS),
        })}
        message={nudgeLine(stale, t, format)}
      >
        <Button variant="secondary" loading={saving} onClick={() => void close()}>
          {stale.length === 1
            ? nudge.markOne
            : fmt(nudge.markAll, { count: format.number(stale.length) })}
        </Button>
        <Button variant="ghost" onClick={() => setDismissed(key)}>
          {nudge.notNow}
        </Button>
      </OttoNote>
    </div>
  );
}
