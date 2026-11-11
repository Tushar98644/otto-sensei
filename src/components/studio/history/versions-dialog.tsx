"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { OttoNote } from "@/components/mascot/otto-note";
import { formatRelativeTime } from "@/components/studio/relative-time";
import { useNow } from "@/components/studio/use-now";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { undoToast } from "@/components/ui/undo-toast";
import {
  VERSION_NAME_MAX,
  cleanVersionName,
  suggestVersionName,
  versionToDrop,
} from "@/lib/store/history";
import { useStudioStore, useVersions, type ResumeVersion } from "@/lib/store/resume-store";
import { pluralize } from "@/lib/utils";

export type VersionsDialogProps = {
  resumeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function VersionsDialog({ resumeId, open, onOpenChange }: VersionsDialogProps) {
  const versions = useVersions(resumeId);
  return (
    <Dialog
      open={open && resumeId !== null}
      onOpenChange={onOpenChange}
      title="Versions"
      description="Save this resume as it is now, and come back to it any time. Restoring keeps what you have now as a version too."
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
  const [draft, setDraft] = useState(() => suggestVersionName(versions));
  const [error, setError] = useState<string | null>(null);
  const dropping = versionToDrop(versions);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = cleanVersionName(draft);
    if (!name) {
      setError("Give it a name, like “Before tailoring”.");
      return;
    }
    const saved = useStudioStore.getState().saveVersion(resumeId, name);
    if (!saved) {
      setError("That resume isn't here anymore.");
      return;
    }
    toast({ title: "Version saved", description: saved.name, variant: "success" });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
      <Field
        label="Name this version"
        error={error}
        hint={
          dropping
            ? `You can keep ${versions.length}. Saving removes the oldest, “${dropping.name}”.`
            : undefined
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
        <Button type="submit">Save version</Button>
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

  if (versions.length === 0) {
    return (
      <OttoNote
        size="sm"
        live={false}
        message="Save a version before a big change, like tailoring. You can come back to it later."
      />
    );
  }

  function deleteVersion(version: ResumeVersion) {
    useStudioStore.getState().deleteVersion(resumeId, version.id);
    undoToast({
      title: "Version deleted",
      description: version.name,
      onUndo: () => useStudioStore.getState().putVersionBack(resumeId, version),
    });
  }

  function restore(version: ResumeVersion) {
    if (!useStudioStore.getState().restoreVersion(resumeId, version.id)) return;
    toast({
      title: "Version restored",
      description: `“${version.name}” is back. What you had is kept in your versions.`,
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
        Saved · {pluralize(versions.length, "version")}
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
  return (
    <li className="flex items-center gap-2 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm/6 font-medium text-ink">{version.name}</p>
        <p className="text-xs/5 text-subtle">
          {version.auto ? "Kept for you" : "Saved"} {formatRelativeTime(version.savedAt, now)}
        </p>
      </div>
      <Button variant="secondary" size="sm" onClick={onRestore}>
        <RotateCcw aria-hidden />
        Restore
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete version “${version.name}”`}
        className="text-muted hover:text-ink"
        onClick={onDelete}
      >
        <Trash2 aria-hidden />
      </Button>
    </li>
  );
}
