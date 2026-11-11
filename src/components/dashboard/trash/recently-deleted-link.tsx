"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useNow } from "@/components/studio/use-now";
import { buttonClasses } from "@/components/ui/button";
import { freshTrash, TRASH_DAYS } from "@/lib/store/history";
import { useStudioHydrated, useTrash } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";
import { TRASH_ROUTE } from "./trash-route";

export function RecentlyDeletedLink() {
  const hydrated = useStudioHydrated();
  const trash = useTrash();
  const now = useNow();
  const count = useMemo(() => (now > 0 ? freshTrash(trash, now).length : 0), [trash, now]);
  if (!hydrated || count === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm/6 text-subtle">
      <Trash2 className="size-4 text-muted" aria-hidden />
      <Link href={TRASH_ROUTE} className={buttonClasses({ variant: "link", className: "text-sm" })}>
        Recently deleted
      </Link>
      <span>
        {pluralize(count, "resume")}, kept for {TRASH_DAYS} days
      </span>
    </p>
  );
}
