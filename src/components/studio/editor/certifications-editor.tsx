"use client";

import { memo } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import { newCertification, type Certification } from "@/lib/resume/schema";
import { metaLine, moveItem, patchItem, removeItem, setHidden } from "./edits";
import { EntryList, type EntryProps } from "./entry-list";
import { EntryShell } from "./entry-shell";
import { addButtonId, editThenFocus, entryFieldId, removeEntryWithFocus } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { editList, getResume, useItemIds, useResumeValue } from "./use-editor";

const ADD_ID = addButtonId("certifications");

export const CertificationsEditor = memo(function CertificationsEditor({
  resumeId,
}: {
  resumeId: string;
}) {
  const ids = useItemIds(resumeId, (resume) => resume.certifications);
  const t = useMessages("studioEditor").certifications;

  function add() {
    const certification = newCertification();
    editThenFocus(
      () => editList(resumeId, "certifications", (items) => [...items, certification]),
      entryFieldId(certification.id, "first"),
    );
  }

  return (
    <EntryList
      count={ids.length}
      empty={t.empty}
      addId={ADD_ID}
      addLabel={t.add}
      onAdd={add}
      limit={LIST_LIMITS.certifications}
    >
      {ids.map((id, index) => (
        <CertificationEntry
          key={id}
          resumeId={resumeId}
          entryId={id}
          index={index}
          count={ids.length}
        />
      ))}
    </EntryList>
  );
});

const CertificationEntry = memo(function CertificationEntry({
  resumeId,
  entryId,
  index,
  count,
}: EntryProps) {
  const certification = useResumeValue(
    resumeId,
    (resume) => resume.certifications.find((item) => item.id === entryId),
    undefined,
  );
  const t = useMessages("studioEditor").certifications;
  if (!certification) return null;

  const update = (patch: Partial<Omit<Certification, "id" | "hidden">>) =>
    editList(resumeId, "certifications", (items) =>
      patchItem(items, entryId, (current) => ({ ...current, ...patch })),
    );

  function remove() {
    removeEntryWithFocus(getResume(resumeId)?.certifications ?? [], entryId, ADD_ID, () =>
      editList(resumeId, "certifications", (items) => removeItem(items, entryId)),
    );
  }

  const filled = [certification.name, certification.issuer, certification.date].some((v) =>
    v.trim(),
  );
  const firstFieldId = entryFieldId(entryId, "first");

  return (
    <EntryShell
      resumeId={resumeId}
      headingId={entryFieldId(entryId, "heading")}
      removeId={entryFieldId(entryId, "remove")}
      title={certification.name.trim() || t.newItem}
      canMoveUp={index > 0}
      canMoveDown={index < count - 1}
      onMove={(delta) =>
        editList(resumeId, "certifications", (items) => moveItem(items, entryId, delta))
      }
      confirm={filled ? t.remove : null}
      onRemove={remove}
      hidden={certification.hidden === true}
      onToggleHidden={() =>
        editList(resumeId, "certifications", (items) =>
          patchItem(items, entryId, (current) => setHidden(current, current.hidden !== true)),
        )
      }
      meta={metaLine([certification.issuer, certification.date])}
      details={{
        complete: certification.name.trim() !== "",
        firstFieldId,
        content: (
          <CertificationFields
            certification={certification}
            firstFieldId={firstFieldId}
            onChange={update}
          />
        ),
      }}
    />
  );
});

function CertificationFields({
  certification,
  firstFieldId,
  onChange: update,
}: {
  certification: Certification;
  firstFieldId: string;
  onChange: (patch: Partial<Omit<Certification, "id" | "hidden">>) => void;
}) {
  const t = useMessages("studioEditor").certifications;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.name} className="sm:col-span-2">
        <Input
          id={firstFieldId}
          value={certification.name}
          onChange={(event) => update({ name: event.target.value })}
          maxLength={CHAR_LIMITS.certName}
          placeholder="Google Data Analytics Certificate"
        />
      </Field>
      <Field label={t.issuer} optional>
        <Input
          value={certification.issuer}
          onChange={(event) => update({ issuer: event.target.value })}
          maxLength={CHAR_LIMITS.certIssuer}
          placeholder="Google"
        />
      </Field>
      <Field label={t.date} optional>
        <Input
          value={certification.date}
          onChange={(event) => update({ date: event.target.value })}
          maxLength={CHAR_LIMITS.certDate}
          placeholder={t.datePlaceholder}
        />
      </Field>
    </div>
  );
}
