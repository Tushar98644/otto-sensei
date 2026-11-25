"use client";

import { Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";

export type EntryProps = { resumeId: string; entryId: string; index: number; count: number };

export type EntryListProps = {
  count: number;
  empty: string;
  addId: string;
  addLabel: string;
  onAdd: () => void;
  limit: number;
  more?: ReactNode;
  children: ReactNode;
};

export function EntryList({
  count,
  empty,
  addId,
  addLabel,
  onAdd,
  limit,
  more,
  children,
}: EntryListProps) {
  const full = count >= limit;
  const t = useMessages("studioEditor").entry;
  return (
    <div className="flex flex-col gap-4">
      {count > 0 ? (
        // Safari drops list semantics from lists without bullets unless the role is explicit.
        <ol role="list" className="flex flex-col">
          {children}
        </ol>
      ) : (
        <p className="text-sm text-muted">{empty}</p>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button id={addId} variant="secondary" onClick={onAdd} disabled={full}>
          <Plus />
          {addLabel}
        </Button>
        {full ? null : more}
        {full ? <p className="text-sm text-muted">{fmt(t.full, { max: limit })}</p> : null}
      </div>
    </div>
  );
}
