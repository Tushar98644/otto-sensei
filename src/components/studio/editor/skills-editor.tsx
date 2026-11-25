"use client";

import { memo } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { newSkillGroup, type SkillGroup } from "@/lib/resume/schema";
import { countText } from "../count";
import { ChipsInput } from "./chips-input";
import { addSkills, moveItem, patchItem, removeItem, setHidden } from "./edits";
import { EntryList, type EntryProps } from "./entry-list";
import { EntryShell } from "./entry-shell";
import { addButtonId, editThenFocus, entryFieldId, removeEntryWithFocus } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { editList, getResume, useItemIds, useResumeValue } from "./use-editor";

const ADD_ID = addButtonId("skills");

export const SkillsEditor = memo(function SkillsEditor({ resumeId }: { resumeId: string }) {
  const ids = useItemIds(resumeId, (resume) => resume.skills);

  const t = useMessages("studioSections").skills;

  function add() {
    const group = newSkillGroup("");
    editThenFocus(
      () => editList(resumeId, "skills", (groups) => [...groups, group]),
      entryFieldId(group.id, "skills"),
    );
  }

  return (
    <EntryList
      count={ids.length}
      empty={t.empty}
      addId={ADD_ID}
      addLabel={ids.length === 0 ? t.add : t.addGroup}
      onAdd={add}
      limit={LIST_LIMITS.skillGroups}
    >
      {ids.map((id, index) => (
        <SkillGroupEntry
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

const SkillGroupEntry = memo(function SkillGroupEntry({
  resumeId,
  entryId,
  index,
  count,
}: EntryProps) {
  const group = useResumeValue(
    resumeId,
    (resume) => resume.skills.find((item) => item.id === entryId),
    undefined,
  );
  const t = useMessages("studioSections").skills;
  const format = useFormat();
  if (!group) return null;

  const title = group.label.trim() || (count === 1 ? t.label : fmt(t.group, { number: index + 1 }));
  const firstFieldId = entryFieldId(entryId, "first");
  const update = (change: (current: SkillGroup) => SkillGroup) =>
    editList(resumeId, "skills", (groups) => patchItem(groups, entryId, change));

  function remove() {
    removeEntryWithFocus(getResume(resumeId)?.skills ?? [], entryId, ADD_ID, () =>
      editList(resumeId, "skills", (groups) => removeItem(groups, entryId)),
    );
  }

  return (
    <EntryShell
      resumeId={resumeId}
      headingId={entryFieldId(entryId, "heading")}
      removeId={entryFieldId(entryId, "remove")}
      title={title}
      canMoveUp={index > 0}
      canMoveDown={index < count - 1}
      onMove={(delta) => editList(resumeId, "skills", (groups) => moveItem(groups, entryId, delta))}
      confirm={group.items.length > 0 ? countText(format, t.remove, group.items.length) : null}
      onRemove={remove}
      hidden={group.hidden === true}
      onToggleHidden={() => update((current) => setHidden(current, current.hidden !== true))}
      details={{
        complete: group.items.length > 0,
        firstFieldId,
        content: (
          <Field label={t.groupName} optional hint={t.groupHint}>
            <Input
              id={firstFieldId}
              value={group.label}
              onChange={(event) => {
                const label = event.target.value;
                update((current) => ({ ...current, label }));
              }}
              maxLength={CHAR_LIMITS.skillGroupLabel}
              placeholder={t.groupPlaceholder}
            />
          </Field>
        ),
      }}
    >
      <ChipsInput
        id={entryFieldId(entryId, "skills")}
        label={t.label}
        labelHidden
        items={group.items}
        full={group.items.length >= LIST_LIMITS.skillsPerGroup}
        onAdd={(items) =>
          update((current) => ({
            ...current,
            items: addSkills(current.items, items, LIST_LIMITS.skillsPerGroup, CHAR_LIMITS.skill),
          }))
        }
        onRemove={(position) =>
          update((current) => ({
            ...current,
            items: current.items.filter((_, i) => i !== position),
          }))
        }
      />
    </EntryShell>
  );
});
