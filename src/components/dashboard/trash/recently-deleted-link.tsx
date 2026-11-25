"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useNow } from "@/components/studio/use-now";
import { buttonClasses } from "@/components/ui/button";
import { useFormat, useMessages } from "@/i18n/client";
import { freshTrash, TRASH_DAYS } from "@/lib/store/history";
import { useStudioHydrated, useTrash } from "@/lib/store/resume-store";
import { TRASH_ROUTE } from "./trash-route";

export function RecentlyDeletedLink() {
  const { trash: t } = useMessages("dashboard");
  const format = useFormat();
  const hydrated = useStudioHydrated();
  const trash = useTrash();
  const now = useNow();
  const count = useMemo(() => (now > 0 ? freshTrash(trash, now).length : 0), [trash, now]);
  if (!hydrated || count === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm/6 text-subtle">
      <Trash2 className="size-4 text-muted" aria-hidden />
      <Link href={TRASH_ROUTE} className={buttonClasses({ variant: "link", className: "text-sm" })}>
        {t.link}
      </Link>
      <span>{format.plural(t.kept, count, { days: format.number(TRASH_DAYS) })}</span>
    </p>
  );
}
