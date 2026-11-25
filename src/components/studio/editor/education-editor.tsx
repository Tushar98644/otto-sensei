"use client";

import { memo } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useMessages } from "@/i18n/client";
import { newEducation, type Education } from "@/lib/resume/schema";
import { BulletList } from "./bullet-list";
import { DateRangeFields } from "./date-range-fields";
import { dateSpan, metaLine, moveItem, patchItem, removeItem, setHidden } from "./edits";
import { EntryList, type EntryProps } from "./entry-list";
import { EntryShell } from "./entry-shell";
import { addButtonId, editThenFocus, entryFieldId, removeEntryWithFocus } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { editList, getResume, useItemIds, useResumeValue } from "./use-editor";

const ADD_ID = addButtonId("education");

export const EducationEditor = memo(function EducationEditor({ resumeId }: { resumeId: string }) {
  const ids = useItemIds(resumeId, (resume) => resume.education);
  const t = useMessages("studioEditor").education;

  function add() {
    const school = newEducation();
    editThenFocus(
      () => editList(resumeId, "education", (schools) => [...schools, school]),
      entryFieldId(school.id, "first"),
    );
  }

  return (
    <EntryList
      count={ids.length}
      empty={t.empty}
      addId={ADD_ID}
      addLabel={t.add}
      onAdd={add}
      limit={LIST_LIMITS.education}
    >
      {ids.map((id, index) => (
        <EducationEntry
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

function hasContent(school: Education): boolean {
  const fields = [
    school.school,
    school.degree,
    school.field,
    school.location,
    school.startDate,
    school.endDate,
  ];
  return fields.some((v) => v.trim()) || school.bullets.some((bullet) => bullet.text.trim());
}

const EducationEntry = memo(function EducationEntry({
  resumeId,
  entryId,
  index,
  count,
}: EntryProps) {
  const school = useResumeValue(
    resumeId,
    (resume) => resume.education.find((item) => item.id === entryId),
    undefined,
  );
  const t = useMessages("studioEditor").education;
  if (!school) return null;

  const headingId = entryFieldId(entryId, "heading");
  const firstFieldId = entryFieldId(entryId, "first");
  const title = [school.degree, school.school].filter(Boolean).join(", ") || t.newItem;
  const update = (patch: Partial<Omit<Education, "id" | "bullets" | "hidden">>) =>
    editList(resumeId, "education", (schools) =>
      patchItem(schools, entryId, (current) => ({ ...current, ...patch })),
    );

  function remove() {
    removeEntryWithFocus(getResume(resumeId)?.education ?? [], entryId, ADD_ID, () =>
      editList(resumeId, "education", (schools) => removeItem(schools, entryId)),
    );
  }

  return (
    <EntryShell
      resumeId={resumeId}
      headingId={headingId}
      removeId={entryFieldId(entryId, "remove")}
      title={title}
      canMoveUp={index > 0}
      canMoveDown={index < count - 1}
      onMove={(delta) =>
        editList(resumeId, "education", (schools) => moveItem(schools, entryId, delta))
      }
      confirm={hasContent(school) ? t.remove : null}
      onRemove={remove}
      hidden={school.hidden === true}
      onToggleHidden={() =>
        editList(resumeId, "education", (schools) =>
          patchItem(schools, entryId, (current) => setHidden(current, current.hidden !== true)),
        )
      }
      meta={metaLine([school.field, dateSpan(school.startDate, school.endDate), school.location])}
      details={{
        complete: school.school.trim() !== "",
        firstFieldId,
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.school}>
              <Input
                id={firstFieldId}
                value={school.school}
                onChange={(event) => update({ school: event.target.value })}
                maxLength={CHAR_LIMITS.school}
                placeholder={t.schoolPlaceholder}
              />
            </Field>
            <Field label={t.degree} optional>
              <Input
                value={school.degree}
                onChange={(event) => update({ degree: event.target.value })}
                maxLength={CHAR_LIMITS.degree}
                placeholder={t.degreePlaceholder}
              />
            </Field>
            <Field label={t.field} optional>
              <Input
                value={school.field}
                onChange={(event) => update({ field: event.target.value })}
                maxLength={CHAR_LIMITS.field}
                placeholder={t.fieldPlaceholder}
              />
            </Field>
            <Field label={t.location} optional>
              <Input
                value={school.location}
                onChange={(event) => update({ location: event.target.value })}
                maxLength={CHAR_LIMITS.schoolLocation}
                placeholder={t.locationPlaceholder}
              />
            </Field>
            <DateRangeFields
              className="sm:col-span-2"
              startDate={school.startDate}
              endDate={school.endDate}
              presentLabel={t.present}
              onChange={update}
            />
          </div>
        ),
      }}
    >
      <BulletList
        resumeId={resumeId}
        section="education"
        parentId={entryId}
        ownerHeadingId={headingId}
        bullets={school.bullets}
        title={t.details}
        addLabel={t.addDetail}
      />
    </EntryShell>
  );
});
