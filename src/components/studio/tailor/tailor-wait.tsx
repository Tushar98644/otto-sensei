"use client";

import { useEffect, useState } from "react";
import { OttoWorking } from "@/components/mascot/otto-working";
import { Button } from "@/components/ui/button";
import { nextStageIn, tailorStage } from "./stages";

export type TailorWaitProps = { startedAt: number; onCancel: () => void };

export function TailorWait({ startedAt, onCancel }: TailorWaitProps) {
  const [now, setNow] = useState(() => Date.now());
  const wait = nextStageIn(now - startedAt);
  useEffect(() => {
    if (wait === null) return;
    const timer = window.setTimeout(() => setNow(Date.now()), wait);
    return () => window.clearTimeout(timer);
  }, [wait]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <OttoWorking task="tailor" message={tailorStage(now - startedAt)} />
      <Button variant="ghost" onClick={onCancel} className="self-start max-sm:ml-28 sm:self-auto">
        Cancel
      </Button>
    </div>
  );
}
