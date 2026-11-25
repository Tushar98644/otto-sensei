"use client";

import { useMessages } from "@/i18n/client";
import type { StatusMenuCopy } from "./status-menu";

export function useStatusMenuCopy(): StatusMenuCopy {
  const { statuses, hints, statusMenu } = useMessages("applications");
  return { statuses, hints, ...statusMenu };
}
