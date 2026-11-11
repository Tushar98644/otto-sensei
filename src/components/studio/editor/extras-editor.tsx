"use client";

import {
  Award,
  BookOpen,
  HandHeart,
  Languages,
  ListPlus,
  Plus,
  TriangleExclamationPoint,
  type LucideIcon,
} from "lucide-react";
import { memo } from "react";
import { flushSync } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Menu } from "@/components/ui/menu";
import {
  EXTRA_KINDS,
  EXTRA_KIND_LABELS,
  extrasOf,
  newExtraItem,
  newExtraSection,
  type ExtraKind,
  type Resume,
} from "@/lib/resume/schema";
import { pickNeighbor, setHidden } from "./edits";
import { EntryList } from "./entry-list";
import { ExtraItemEntry } from "./extra-item-entry";
import {
  EXTRA_DESCRIPTIONS,
  EXTRA_FORMS,
  appendExtraItem,
  appendExtraSection,
  defaultExtraTitle,
  moveExtraSection,
  patchExtraSection,
  removeExtraSection,
  removeSectionQuestion,
  renameExtraSection,
} from "./extras";
import { addButtonId, editThenFocus, entryFieldId, sectionDomId } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { MoveButtons } from "./move-buttons";
import { SectionCard } from "./section-card";
import {
  editResume,
  getResume,
  useExtraSectionMeta,
  useItemIds,
  useResumeValue,
} from "./use-editor";

const ADD_SECTION_ID = "fix-add-extra-section";

const KIND_ICONS: Record<ExtraKind, LucideIcon> = {
  languages: Languages,
  awards: Award,
  volunteering: HandHeart,
  publications: BookOpen,
  custom: ListPlus,
};

const toggleIdOf = (sectionId: string) => entryFieldId(sectionId, "section");

function focusAddSection() {
  document.getElementById(ADD_SECTION_ID)?.querySelector("button")?.focus();
}

// These print after the standard six sections, so they only move among themselves.
export const ExtrasArea = memo(function ExtrasArea({ resumeId }: { resumeId: string }) {
  const ids = useItemIds(resumeId, (resume) => extrasOf(resume));
  const full = ids.length >= LIST_LIMITS.extraSections;

  function add(kind: ExtraKind) {
    const section = newExtraSection(kind);
    const first = section.items[0];
    editThenFocus(
      () => editResume(resumeId, (resume) => appendExtraSection(resume, section)),
      first ? entryFieldId(first.id, "first") : toggleIdOf(section.id),
    );
  }

  return (
    <>
      {ids.map((id, index) => (
        <ExtraSectionCard
          key={id}
          resumeId={resumeId}
          sectionId={id}
          index={index}
          count={ids.length}
        />
      ))}
      <div id={ADD_SECTION_ID} className="flex flex-wrap items-center gap-x-3 gap-y-2 pt-1">
        {full ? (
          <>
            <Button variant="secondary" disabled>
              <Plus />
              Add a section
            </Button>
            <p className="text-sm text-muted">{`That's the most extra sections a resume can hold (${LIST_LIMITS.extraSections}).`}</p>
          </>
        ) : (
          <>
            <Menu
              label="Add a section"
              triggerClassName={buttonClasses({ variant: "secondary" })}
              trigger={
                <>
                  <Plus aria-hidden />
                  Add a section
                </>
              }
              items={EXTRA_KINDS.map((kind) => ({
                label: EXTRA_KIND_LABELS[kind],
                icon: KIND_ICONS[kind],
                description: EXTRA_DESCRIPTIONS[kind],
                onSelect: () => add(kind),
              }))}
            />
            {ids.length === 0 ? (
              <p className="text-sm text-muted">
                Languages, awards, volunteering, or one of your own.
              </p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
});

type ExtraSectionCardProps = { resumeId: string; sectionId: string; index: number; count: number };

const ExtraSectionCard = memo(function ExtraSectionCard({
  resumeId,
  sectionId,
  index,
  count,
}: ExtraSectionCardProps) {
  const meta = useExtraSectionMeta(resumeId, sectionId);
  const question = useResumeValue(
    resumeId,
    (resume) => {
      const section = extrasOf(resume).find((item) => item.id === sectionId);
      return section ? removeSectionQuestion(section) : null;
    },
    null,
  );
  const title = meta.title.trim() || defaultExtraTitle(meta.kind);
  const edit = (update: (resume: Resume) => Resume) => editResume(resumeId, update);

  // Focus moves to the section that takes this one's place, or the "Add a section" button.
  function remove() {
    const resume = getResume(resumeId);
    const ids = (resume ? extrasOf(resume) : []).map((section) => section.id);
    const neighbor = pickNeighbor(ids, sectionId, "next");
    flushSync(() => edit((resume) => removeExtraSection(resume, sectionId)));
    if (neighbor) document.getElementById(toggleIdOf(neighbor.id))?.focus();
    else focusAddSection();
  }

  return (
    <SectionCard
      title={title}
      count={meta.count}
      toggleId={toggleIdOf(sectionId)}
      sectionId={sectionDomId(sectionId)}
      status={
        meta.needWork > 0 ? (
          <Badge variant="warn">
            <TriangleExclamationPoint />
            {`${meta.needWork} ${meta.needWork === 1 ? "needs" : "need"} work`}
          </Badge>
        ) : null
      }
      actions={
        <MoveButtons
          label={title}
          canMoveUp={index > 0}
          canMoveDown={index < count - 1}
          onMove={(delta) => edit((resume) => moveExtraSection(resume, sectionId, delta))}
        />
      }
      options={{
        rename: {
          value: title,
          placeholder: defaultExtraTitle(meta.kind),
          maxLength: CHAR_LIMITS.extraSectionTitle,
          onSave: (next) => edit((resume) => renameExtraSection(resume, sectionId, next)),
        },
        hidden: meta.hidden,
        onToggleHidden: () =>
          edit((resume) =>
            patchExtraSection(resume, sectionId, (section) =>
              setHidden(section, section.hidden !== true),
            ),
          ),
        remove: { confirm: question, run: remove, resumeId },
      }}
    >
      <ExtraItems resumeId={resumeId} sectionId={sectionId} kind={meta.kind} />
    </SectionCard>
  );
});

const ExtraItems = memo(function ExtraItems({
  resumeId,
  sectionId,
  kind,
}: {
  resumeId: string;
  sectionId: string;
  kind: ExtraKind;
}) {
  const ids = useItemIds(
    resumeId,
    (resume) => extrasOf(resume).find((section) => section.id === sectionId)?.items ?? [],
  );
  const form = EXTRA_FORMS[kind];
  const addId = addButtonId(`extra-${sectionId}`);

  function add() {
    const item = newExtraItem();
    editThenFocus(
      () => editResume(resumeId, (resume) => appendExtraItem(resume, sectionId, item)),
      entryFieldId(item.id, "first"),
    );
  }

  return (
    <EntryList
      count={ids.length}
      empty={form.empty}
      addId={addId}
      addLabel={form.addLabel}
      onAdd={add}
      limit={LIST_LIMITS.extraItems}
    >
      {ids.map((id, index) => (
        <ExtraItemEntry
          key={id}
          resumeId={resumeId}
          sectionId={sectionId}
          kind={kind}
          addId={addId}
          entryId={id}
          index={index}
          count={ids.length}
        />
      ))}
    </EntryList>
  );
});
