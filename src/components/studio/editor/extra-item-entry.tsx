"use client";

import { memo } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { extrasOf, type ExtraItem, type ExtraKind, type Resume } from "@/lib/resume/schema";
import { BulletList } from "./bullet-list";
import { metaLine, moveItem, patchItem, removeItem, setHidden, singleLine } from "./edits";
import type { EntryProps } from "./entry-list";
import { EntryShell } from "./entry-shell";
import {
  EXTRA_FORMS,
  editExtraItems,
  extraItemHeading,
  removeItemQuestion,
  type ExtraForm,
} from "./extras";
import { entryFieldId, removeEntryWithFocus } from "./focus";
import { CHAR_LIMITS } from "./limits";
import { editResume, getResume, useResumeValue } from "./use-editor";

export type ExtraItemEntryProps = EntryProps & {
  sectionId: string;
  kind: ExtraKind;
  // Where focus goes when the last item is removed.
  addId: string;
};

function itemsOf(resume: Resume | undefined, sectionId: string): ExtraItem[] {
  return (resume ? extrasOf(resume) : []).find((section) => section.id === sectionId)?.items ?? [];
}

type ItemPatch = Partial<Omit<ExtraItem, "id" | "bullets" | "hidden">>;

// One language, award, role or entry of a custom section, shaped like a job: its fields fold away
// once it has a name, and its lines (where the kind has them) stay in view.
export const ExtraItemEntry = memo(function ExtraItemEntry({
  resumeId,
  sectionId,
  kind,
  addId,
  entryId,
  index,
  count,
}: ExtraItemEntryProps) {
  const item = useResumeValue(
    resumeId,
    (resume) => itemsOf(resume, sectionId).find((entry) => entry.id === entryId),
    undefined,
  );
  if (!item) return null;

  const form = EXTRA_FORMS[kind];
  const headingId = entryFieldId(entryId, "heading");
  const firstFieldId = entryFieldId(entryId, "first");
  const heading = extraItemHeading(item, form);
  const edit = (update: (items: ExtraItem[]) => ExtraItem[]) =>
    editResume(resumeId, (resume) => editExtraItems(resume, sectionId, update));
  const update = (patch: ItemPatch) =>
    edit((items) => patchItem(items, entryId, (current) => ({ ...current, ...patch })));

  function remove() {
    removeEntryWithFocus(itemsOf(getResume(resumeId), sectionId), entryId, addId, () =>
      edit((items) => removeItem(items, entryId)),
    );
  }

  return (
    <EntryShell
      resumeId={resumeId}
      headingId={headingId}
      removeId={entryFieldId(entryId, "remove")}
      title={heading}
      canMoveUp={index > 0}
      canMoveDown={index < count - 1}
      onMove={(delta) => edit((items) => moveItem(items, entryId, delta))}
      confirm={removeItemQuestion(item, form)}
      onRemove={remove}
      hidden={item.hidden === true}
      onToggleHidden={() =>
        edit((items) =>
          patchItem(items, entryId, (current) => setHidden(current, current.hidden !== true)),
        )
      }
      meta={metaLine([item.subtitle, item.date])}
      details={{
        complete: item.title.trim() !== "" || item.detail.trim() !== "",
        firstFieldId,
        content: (
          <ExtraItemFields item={item} form={form} firstFieldId={firstFieldId} onChange={update} />
        ),
      }}
    >
      {form.lines !== null || item.bullets.length > 0 ? (
        <BulletList
          resumeId={resumeId}
          section="extras"
          parentId={entryId}
          ownerHeadingId={headingId}
          bullets={item.bullets}
          title={form.lines ?? "Lines"}
        />
      ) : null}
    </EntryShell>
  );
});

function ExtraItemFields({
  item,
  form,
  firstFieldId,
  onChange: update,
}: {
  item: ExtraItem;
  form: ExtraForm;
  firstFieldId: string;
  onChange: (patch: ItemPatch) => void;
}) {
  // A field this kind doesn't ask for still shows once it holds text, so it can be edited.
  const date = form.date ?? (item.date.trim() ? { label: "Date", placeholder: "" } : null);
  const detail = form.detail ?? (item.detail.trim() ? { label: "Details", placeholder: "" } : null);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={form.title.label}>
        <Input
          id={firstFieldId}
          value={item.title}
          onChange={(event) => update({ title: event.target.value })}
          maxLength={CHAR_LIMITS.extraTitle}
          placeholder={form.title.placeholder}
        />
      </Field>
      <Field label={form.subtitle.label} optional>
        <Input
          value={item.subtitle}
          onChange={(event) => update({ subtitle: event.target.value })}
          maxLength={CHAR_LIMITS.extraSubtitle}
          placeholder={form.subtitle.placeholder}
        />
      </Field>
      {date ? (
        <Field label={date.label} optional>
          <Input
            value={item.date}
            onChange={(event) => update({ date: event.target.value })}
            maxLength={CHAR_LIMITS.extraDate}
            placeholder={date.placeholder}
          />
        </Field>
      ) : null}
      {detail ? (
        <Field label={detail.label} optional className="sm:col-span-2">
          <Textarea
            autoResize
            value={item.detail}
            // One short paragraph on the page; a stray line break would print as a gap.
            onChange={(event) => update({ detail: singleLine(event.target.value) })}
            maxLength={CHAR_LIMITS.extraDetail}
            placeholder={detail.placeholder}
          />
        </Field>
      ) : null}
    </div>
  );
}
