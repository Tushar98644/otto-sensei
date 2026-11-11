"use client";

import { Plus } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { Experience } from "@/lib/resume/schema";
import { pluralize } from "@/lib/utils";
import { BulletList } from "./bullet-list";
import { DateRangeFields } from "./date-range-fields";
import {
  dateSpan,
  insertAfter,
  metaLine,
  moveItem,
  patchItem,
  removeItem,
  setHidden,
} from "./edits";
import type { EntryProps } from "./entry-list";
import { EntryShell } from "./entry-shell";
import { addButtonId, editThenFocus, entryFieldId, removeEntryWithFocus } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { MoveButtons } from "./move-buttons";
import { moveRoleUnit, newRole } from "./roles";
import { editList, getResume, useResumeValue } from "./use-editor";

export const EXPERIENCE_ADD_ID = addButtonId("experience");

const companyHeadingId = (firstRoleId: string) => entryFieldId(firstRoleId, "company");

export type ExperienceEntryProps = EntryProps & {
  rolePosition: number;
  roleCount: number;
  firstRoleId: string;
};

function hasContent(job: Experience): boolean {
  return (
    [job.title, job.company, job.location, job.startDate, job.endDate].some((v) => v.trim()) ||
    job.bullets.some((bullet) => bullet.text.trim())
  );
}

function removeQuestion(job: Experience, noun: string): string | null {
  if (!hasContent(job)) return null;
  const lines = job.bullets.filter((bullet) => bullet.text.trim()).length;
  return lines > 0
    ? `Remove this ${noun} and its ${pluralize(lines, "line")}?`
    : `Remove this ${noun}?`;
}

export const ExperienceEntry = memo(function ExperienceEntry({
  resumeId,
  entryId,
  index,
  count,
  rolePosition,
  roleCount,
  firstRoleId,
}: ExperienceEntryProps) {
  const job = useResumeValue(
    resumeId,
    (resume) => resume.experience.find((item) => item.id === entryId),
    undefined,
  );
  if (!job) return null;

  const grouped = rolePosition >= 0 && roleCount > 1;
  const headingId = entryFieldId(entryId, "heading");
  const firstFieldId = entryFieldId(entryId, "first");
  const role = job.title.trim();
  const company = job.company.trim();
  const title = [role, company].filter(Boolean).join(" at ") || "New job";
  const offerRole = company !== "" && (!grouped || rolePosition === roleCount - 1);
  const update = (patch: ExperiencePatch) =>
    editList(resumeId, "experience", (jobs) =>
      patchItem(jobs, entryId, (current) => ({ ...current, ...patch })),
    );

  function remove() {
    removeEntryWithFocus(getResume(resumeId)?.experience ?? [], entryId, EXPERIENCE_ADD_ID, () =>
      editList(resumeId, "experience", (jobs) => removeItem(jobs, entryId)),
    );
  }

  const move = (delta: -1 | 1) =>
    editList(resumeId, "experience", (jobs) =>
      grouped ? moveItem(jobs, entryId, delta) : moveRoleUnit(jobs, entryId, delta),
    );

  return (
    <EntryShell
      resumeId={resumeId}
      headingId={headingId}
      removeId={entryFieldId(entryId, "remove")}
      title={grouped ? `${role || "New role"} at ${company}` : title}
      heading={grouped ? role || "New role" : title}
      headingLevel={grouped ? 5 : 4}
      rail={grouped ? (rolePosition === 0 ? "start" : "continue") : undefined}
      lead={
        grouped && rolePosition === 0 ? (
          <CompanyHeader
            resumeId={resumeId}
            roleId={entryId}
            company={company}
            roles={roleCount}
            canMoveUp={index > 0}
            canMoveDown={index < count - 1}
          />
        ) : null
      }
      canMoveUp={grouped ? rolePosition > 0 : index > 0}
      canMoveDown={grouped ? rolePosition < roleCount - 1 : index < count - 1}
      onMove={move}
      confirm={removeQuestion(job, grouped ? "role" : "job")}
      onRemove={remove}
      hidden={job.hidden === true}
      onToggleHidden={() =>
        editList(resumeId, "experience", (jobs) =>
          patchItem(jobs, entryId, (current) => setHidden(current, current.hidden !== true)),
        )
      }
      meta={metaLine([dateSpan(job.startDate, job.endDate), job.location])}
      details={{
        complete: role !== "" && company !== "",
        firstFieldId,
        content: <ExperienceFields job={job} firstFieldId={firstFieldId} onChange={update} />,
      }}
    >
      <BulletList
        resumeId={resumeId}
        section="experience"
        parentId={entryId}
        ownerHeadingId={grouped ? `${headingId} ${companyHeadingId(firstRoleId)}` : headingId}
        bullets={job.bullets}
        title="What you did"
        actions={
          offerRole ? (
            <AddRoleButton resumeId={resumeId} afterId={entryId} firstRoleId={firstRoleId} />
          ) : null
        }
      />
    </EntryShell>
  );
});

const REVEAL_CLASSES =
  "opacity-0 transition-opacity group-hover/company:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100";

function CompanyHeader({
  resumeId,
  roleId,
  company,
  roles,
  canMoveUp,
  canMoveDown,
}: {
  resumeId: string;
  roleId: string;
  company: string;
  roles: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  return (
    <div className="group/company flex items-start gap-1 sm:-mr-3">
      <div className="min-w-0 flex-1 py-2.5">
        <h4 id={companyHeadingId(roleId)} className="text-base/6 font-medium break-words text-ink">
          {company}
        </h4>
        <p className="text-sm/5 text-subtle">{pluralize(roles, "role")}</p>
      </div>
      <MoveButtons
        label={company}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        onMove={(delta) =>
          editList(resumeId, "experience", (jobs) => moveRoleUnit(jobs, roleId, delta))
        }
        className={REVEAL_CLASSES}
      />
    </div>
  );
}

function AddRoleButton({
  resumeId,
  afterId,
  firstRoleId,
}: {
  resumeId: string;
  afterId: string;
  firstRoleId: string;
}) {
  const company = useResumeValue(
    resumeId,
    (resume) => resume.experience.find((job) => job.id === firstRoleId)?.company.trim() ?? "",
    "",
  );
  const full = useResumeValue(
    resumeId,
    (resume) => resume.experience.length >= LIST_LIMITS.experience,
    false,
  );

  function add() {
    const job = newRole(company);
    editThenFocus(
      () => editList(resumeId, "experience", (jobs) => insertAfter(jobs, afterId, [job])),
      entryFieldId(job.id, "first"),
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={add}
      disabled={full}
      className="text-muted hover:text-ink max-sm:h-11"
    >
      <Plus />
      {`Add another role at ${company}`}
    </Button>
  );
}

type ExperiencePatch = Partial<Omit<Experience, "id" | "bullets" | "hidden">>;

function ExperienceFields({
  job,
  firstFieldId,
  onChange: update,
}: {
  job: Experience;
  firstFieldId: string;
  onChange: (patch: ExperiencePatch) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Job title">
        <Input
          id={firstFieldId}
          value={job.title}
          onChange={(event) => update({ title: event.target.value })}
          maxLength={CHAR_LIMITS.jobTitle}
          placeholder="Product designer"
        />
      </Field>
      <Field label="Company">
        <Input
          value={job.company}
          onChange={(event) => update({ company: event.target.value })}
          maxLength={CHAR_LIMITS.company}
          placeholder="Northwind"
        />
      </Field>
      <Field label="Location" optional className="sm:col-span-2">
        <Input
          value={job.location}
          onChange={(event) => update({ location: event.target.value })}
          maxLength={CHAR_LIMITS.jobLocation}
          placeholder="Remote, or city and country"
        />
      </Field>
      <DateRangeFields
        className="sm:col-span-2"
        startDate={job.startDate}
        endDate={job.endDate}
        presentLabel="I work here now"
        onChange={update}
      />
    </div>
  );
}
