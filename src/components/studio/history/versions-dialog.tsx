"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { countText } from "@/components/studio/count";
import { relativeTimeIn } from "@/components/studio/relative-time";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import {
  VERSION_NAME_MAX,
  cleanVersionName,
  suggestVersionName,
  versionToDrop,
} from "@/lib/store/history";
import { versionName } from "./history-words";
import { useStudioStore, useVersions, type ResumeVersion } from "@/lib/store/resume-store";

export type VersionsDialogProps = {
  resumeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VersionsDialog({ resumeId, open, onOpenChange }: VersionsDialogProps) {
  const versions = useVersions(resumeId);
  const t = useMessages("studio").versions;
  return (
    <Dialog
      open={open && resumeId !== null}
      onOpenChange={onOpenChange}
      title={t.title}
      description={t.description}
    >
      {open && resumeId ? (
        <div className="flex flex-col gap-8">
          <SaveVersionForm key={versions.length} resumeId={resumeId} versions={versions} />
          <VersionList
            resumeId={resumeId}
            versions={versions}
            onRestored={() => onOpenChange(false)}
          />
        </div>
      ) : null}
    </Dialog>
  );
}

function SaveVersionForm({
  resumeId,
  versions,
}: {
  resumeId: string;
  versions: readonly ResumeVersion[];
}) {
  const t = useMessages("studio").versions;
  const [draft, setDraft] = useState(() => suggestVersionName(versions, t.suggested));
  const [error, setError] = useState<string | null>(null);
  const dropping = versionToDrop(versions);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = cleanVersionName(draft);
    if (!name) {
      setError(t.nameNeeded);
      return;
    }
    const saved = useStudioStore.getState().saveVersion(resumeId, name);
    if (!saved) {
      setError(t.gone);
      return;
    }
    toast({ title: t.saved, description: saved.name, variant: "success" });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Field
        label={t.nameLabel}
        error={error}
        hint={
          dropping ? fmt(t.dropping, { count: versions.length, name: versionName(dropping.name, t) }) : undefined
        }
      >
        <Input
          value={draft}
          maxLength={VERSION_NAME_MAX}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(null);
          }}
          onFocus={(event) => event.currentTarget.select()}
          data-autofocus
          autoComplete="off"
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit">{t.save}</Button>
      </div>
    </form>
  );
}

function VersionList({
  resumeId,
  versions,
  onRestored,
}: {
  resumeId: string;
  versions: readonly ResumeVersion[];
  onRestored: () => void;
}) {
  const now = useNow();
  const t = useMessages("studio").versions;
  const format = useFormat();

  if (versions.length === 0) {
    return <OttoNote size="sm" live={false} message={t.empty} />;
  }

  function deleteVersion(version: ResumeVersion) {
    useStudioStore.getState().deleteVersion(resumeId, version.id);
    undoToast({
      title: t.deleted,
      description: versionName(version.name, t),
      onUndo: () => useStudioStore.getState().putVersionBack(resumeId, version),
    });
  }

  function restore(version: ResumeVersion) {
    if (!useStudioStore.getState().restoreVersion(resumeId, version.id)) return;
    toast({
      title: t.restored,
      description: fmt(t.restoredNote, { name: versionName(version.name, t) }),
      variant: "success",
    });
    onRestored();
  }

  return (
    <section aria-labelledby="saved-versions" className="flex flex-col gap-3">
      <h3
        id="saved-versions"
        className="text-xs/4 font-medium tracking-widest text-subtle uppercase"
      >
        {fmt(t.savedCount, { versions: countText(format, t.count, versions.length) })}
      </h3>
      <ul className="divide-y divide-border border-y border-border">
        {versions.map((version) => (
          <VersionRow
            key={version.id}
            version={version}
            now={now}
            onRestore={() => restore(version)}
            onDelete={() => deleteVersion(version)}
          />
        ))}
      </ul>
    </section>
  );
}

function VersionRow({
  version,
  now,
  onRestore,
  onDelete,
}: {
  version: ResumeVersion;
  now: number;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const studio = useMessages("studio");
  const t = studio.versions;
  const when = relativeTimeIn(useFormat(), studio.justNow, version.savedAt, now);
  return (
    <li className="flex items-center gap-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm/6 font-medium text-ink">{versionName(version.name, t)}</p>
        <p className="text-xs/5 text-subtle">
          {fmt(version.auto ? t.keptWhen : t.savedWhen, { when })}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onRestore}>
        <RotateCcw aria-hidden />
        {t.restore}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={fmt(t.delete, { name: versionName(version.name, t) })}
        className="text-muted hover:text-ink"
        onClick={onDelete}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
