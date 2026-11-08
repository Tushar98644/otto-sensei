"use client";

import { FolderGit } from "lucide-react";
import dynamic from "next/dynamic";
import { memo, useState } from "react";
import { usernameFromResume } from "@/components/github/format";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { newProject, type Project } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import { BulletList } from "./bullet-list";
import { metaLine, moveItem, patchItem, removeItem, setHidden } from "./edits";
import { EntryList, type EntryProps } from "./entry-list";
import { EntryShell } from "./entry-shell";
import { addButtonId, editThenFocus, entryFieldId, removeEntryWithFocus } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { editList, getResume, useItemIds, useResumeValue } from "./use-editor";

const ADD_ID = addButtonId("projects");

// Loaded on first use: most people never open it.
const GitHubImportDialog = dynamic(() =>
  import("@/components/github/github-import-dialog").then((mod) => mod.GitHubImportDialog),
);

export const ProjectsEditor = memo(function ProjectsEditor({ resumeId }: { resumeId: string }) {
  const ids = useItemIds(resumeId, (resume) => resume.projects);
  const hasGitHub = useResumeValue(resumeId, (resume) => usernameFromResume(resume) !== "", false);
  const [github, setGithub] = useState({ used: false, open: false });
  // Followed only once the dialog has been opened, so typing elsewhere doesn't rerender this list.
  const resume = useResumeValue(resumeId, (current) => (github.used ? current : undefined), undefined);

  function add() {
    const project = newProject();
    editThenFocus(
      () => editList(resumeId, "projects", (projects) => [...projects, project]),
      entryFieldId(project.id, "first"),
    );
  }

  return (
    <EntryList
      count={ids.length}
      empty="No projects yet. Side projects, open source and school work all count."
      addId={ADD_ID}
      addLabel="Add a project"
      onAdd={add}
      limit={LIST_LIMITS.projects}
      more={
        <>
          {/* The resume names a GitHub profile, so the import starts on its own once opened. */}
          <Button variant="ghost" onClick={() => setGithub({ used: true, open: true })}>
            <FolderGit />
            {hasGitHub ? "Add from my GitHub" : "Add from GitHub"}
          </Button>
          {resume ? (
            <GitHubImportDialog
              resume={resume}
              open={github.open}
              onOpenChange={(open) => setGithub({ used: true, open })}
            />
          ) : null}
        </>
      }
    >
      {ids.map((id, index) => (
        <ProjectEntry key={id} resumeId={resumeId} entryId={id} index={index} count={ids.length} />
      ))}
    </EntryList>
  );
});

function removeQuestion(project: Project): string | null {
  const lines = project.bullets.filter((bullet) => bullet.text.trim()).length;
  if (lines > 0) return `Remove this project and its ${pluralize(lines, "line")}?`;
  return project.name.trim() || project.link.trim() ? "Remove this project?" : null;
}

const ProjectEntry = memo(function ProjectEntry({ resumeId, entryId, index, count }: EntryProps) {
  const project = useResumeValue(
    resumeId,
    (resume) => resume.projects.find((item) => item.id === entryId),
    undefined,
  );
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
      title={project.name.trim() || "New project"}
      canMoveUp={index > 0}
      canMoveDown={index < count - 1}
      onMove={(delta) =>
        editList(resumeId, "projects", (projects) => moveItem(projects, entryId, delta))
      }
      confirm={removeQuestion(project)}
      onRemove={remove}
      hidden={project.hidden === true}
      onToggleHidden={() =>
        editList(resumeId, "projects", (projects) =>
          patchItem(projects, entryId, (current) => setHidden(current, current.hidden !== true)),
        )
      }
      meta={metaLine([project.link])}
      details={{
        complete: project.name.trim() !== "",
        firstFieldId,
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Project name">
              <Input
                id={firstFieldId}
                value={project.name}
                onChange={(event) => update({ name: event.target.value })}
                maxLength={CHAR_LIMITS.projectName}
                placeholder="Budget tracker app"
              />
            </Field>
            <Field label="Link" optional>
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
        title="What you did"
      />
    </EntryShell>
  );
});
