"use client";

import { memo } from "react";
import { offersGitHubImport, usernameFromResume } from "@/components/github/format";
import { GitHubImportButton } from "@/components/github/github-import-button";
import { GitHubOffer } from "@/components/github/github-offer";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormat, useMessages } from "@/i18n/client";
import type { Format } from "@/i18n/intl";
import type { Messages } from "@/i18n/messages";
import { newProject, type Project } from "@/lib/resume/schema";
import { countText } from "../count";
import { BulletList } from "./bullet-list";
import { DateRangeFields } from "./date-range-fields";
import { dateSpan, metaLine, moveItem, patchItem, removeItem, setHidden } from "./edits";
import { EntryList, type EntryProps } from "./entry-list";
import { EntryShell } from "./entry-shell";
import { addButtonId, editThenFocus, entryFieldId, removeEntryWithFocus } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { editList, getResume, useItemIds, useResumeValue } from "./use-editor";

const ADD_ID = addButtonId("projects");

export const ProjectsEditor = memo(function ProjectsEditor({ resumeId }: { resumeId: string }) {
  const ids = useItemIds(resumeId, (resume) => resume.projects);
  const username = useResumeValue(resumeId, usernameFromResume, "");
  const upFront = useResumeValue(resumeId, offersGitHubImport, false);
  const t = useMessages("studioEditor").projects;

  function add() {
    const project = newProject();
    editThenFocus(
      () => editList(resumeId, "projects", (projects) => [...projects, project]),
      entryFieldId(project.id, "first"),
    );
  }

  const list = (
    <EntryList
      count={ids.length}
      empty={t.empty}
      addId={ADD_ID}
      addLabel={t.add}
      onAdd={add}
      limit={LIST_LIMITS.projects}
      more={
        upFront ? null : (
          <GitHubImportButton
            resumeId={resumeId}
            variant="ghost"
            label={username ? t.githubMine : t.github}
          />
        )
      }
    >
      {ids.map((id, index) => (
        <ProjectEntry key={id} resumeId={resumeId} entryId={id} index={index} count={ids.length} />
      ))}
    </EntryList>
  );

  if (!upFront) return list;
  return (
    <div className="flex flex-col gap-6">
      <GitHubOffer resumeId={resumeId} />
      {list}
    </div>
  );
});

function removeQuestion(
  t: Messages["studioEditor"]["projects"],
  format: Format,
  project: Project,
): string | null {
  const lines = project.bullets.filter((bullet) => bullet.text.trim()).length;
  if (lines > 0) return countText(format, t.removeWithLines, lines);
  const filled = [project.name, project.link, project.tech, project.startDate, project.endDate];
  return filled.some((value) => value?.trim()) ? t.remove : null;
}

const ProjectEntry = memo(function ProjectEntry({ resumeId, entryId, index, count }: EntryProps) {
  const project = useResumeValue(
    resumeId,
    (resume) => resume.projects.find((item) => item.id === entryId),
    undefined,
  );
  const editor = useMessages("studioEditor");
  const t = editor.projects;
  const format = useFormat();
  if (!project) return null;

  const headingId = entryFieldId(entryId, "heading");
  const firstFieldId = entryFieldId(entryId, "first");
  const update = (patch: Partial<Omit<Project, "id" | "bullets" | "hidden">>) =>
    editList(resumeId, "projects", (projects) =>
      patchItem(projects, entryId, (current) => ({ ...current, ...patch })),
    );

  function remove() {
    removeEntryWithFocus(getResume(resumeId)?.projects ?? [], entryId, ADD_ID, () =>
      editList(resumeId, "projects", (projects) => removeItem(projects, entryId)),
    );
  }

  return (
    <EntryShell
      resumeId={resumeId}
      headingId={headingId}
      removeId={entryFieldId(entryId, "remove")}
      title={project.name.trim() || t.newItem}
      canMoveUp={index > 0}
      canMoveDown={index < count - 1}
      onMove={(delta) =>
        editList(resumeId, "projects", (projects) => moveItem(projects, entryId, delta))
      }
      confirm={removeQuestion(t, format, project)}
      onRemove={remove}
      hidden={project.hidden === true}
      onToggleHidden={() =>
        editList(resumeId, "projects", (projects) =>
          patchItem(projects, entryId, (current) => setHidden(current, current.hidden !== true)),
        )
      }
      meta={metaLine([
        project.link,
        dateSpan(project.startDate ?? "", project.endDate ?? ""),
      ])}
      details={{
        complete: project.name.trim() !== "",
        firstFieldId,
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.name}>
              <Input
                id={firstFieldId}
                value={project.name}
                onChange={(event) => update({ name: event.target.value })}
                maxLength={CHAR_LIMITS.projectName}
                placeholder={t.namePlaceholder}
              />
            </Field>
            <Field label={t.link} optional>
              <Input
                type="url"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                value={project.link}
                onChange={(event) => update({ link: event.target.value })}
                maxLength={CHAR_LIMITS.projectLink}
                placeholder="github.com/alex/budget"
              />
            </Field>
            <Field label={t.tools} optional className="sm:col-span-2">
              <Input
                value={project.tech ?? ""}
                onChange={(event) => update({ tech: event.target.value })}
                maxLength={CHAR_LIMITS.projectTech}
                placeholder="React, Node.js, PostgreSQL"
              />
            </Field>
            <DateRangeFields
              className="sm:col-span-2"
              startDate={project.startDate ?? ""}
              endDate={project.endDate ?? ""}
              presentLabel={t.present}
              onChange={update}
            />
          </div>
        ),
      }}
    >
      <BulletList
        resumeId={resumeId}
        section="projects"
        parentId={entryId}
        ownerHeadingId={headingId}
        bullets={project.bullets}
        title={editor.whatYouDid}
      />
    </EntryShell>
  );
});
