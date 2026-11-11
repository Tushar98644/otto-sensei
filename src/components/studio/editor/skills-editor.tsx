"use client";

import { memo } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { newSkillGroup, type SkillGroup } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
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
      empty="No skills yet. Add the tools and skills you use most."
      addId={ADD_ID}
      addLabel={ids.length === 0 ? "Add skills" : "Add another group"}
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
  if (!group) return null;

  const title = group.label.trim() || (count === 1 ? "Skills" : `Group ${index + 1}`);
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
      confirm={
        group.items.length > 0
          ? `Remove this group and its ${pluralize(group.items.length, "skill")}?`
          : null
      }
      onRemove={remove}
      hidden={group.hidden === true}
      onToggleHidden={() => update((current) => setHidden(current, current.hidden !== true))}
      details={{
        complete: group.items.length > 0,
        firstFieldId,
        content: (
          <Field
            label="Group name"
            optional
            hint="Like Languages, Tools or Design. Leave it empty for one simple list."
          >
            <Input
              id={firstFieldId}
              value={group.label}
              onChange={(event) => {
                const label = event.target.value;
                update((current) => ({ ...current, label }));
              }}
              maxLength={CHAR_LIMITS.skillGroupLabel}
              placeholder="Tools"
            />
          </Field>
        ),
      }}
    >
      <ChipsInput
        id={entryFieldId(entryId, "skills")}
        label="Skills"
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
