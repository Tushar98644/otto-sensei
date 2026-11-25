"use client";

import { useMemo } from "react";
import { useMessages } from "@/i18n/client";
import type { TargetWords } from "./write-targets";

export function useTargetWords(): TargetWords {
  const { statuses } = useMessages("applications");
  const { targets } = useMessages("letters");
  return useMemo(
    () => ({
      statuses,
      untitled: targets.untitled,
      savedJob: targets.savedJob,
      tailoredCopy: targets.tailoredCopy,
    }),
    [statuses, targets],
  );
}
