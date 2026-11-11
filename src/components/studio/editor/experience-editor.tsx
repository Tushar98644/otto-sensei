"use client";

import { memo, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { newExperience } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { EntryList } from "./entry-list";
import { EXPERIENCE_ADD_ID, ExperienceEntry } from "./experience-entry";
import { editThenFocus, entryFieldId } from "./focus";
import { LIST_LIMITS } from "./limits";
import { parseRoleLayout, roleLayout } from "./roles";
import { editList, pickResume } from "./use-editor";

const NO_LAYOUT: string[] = [];

export const ExperienceEditor = memo(function ExperienceEditor({ resumeId }: { resumeId: string }) {
  const layout = useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      return resume ? roleLayout(resume.experience) : NO_LAYOUT;
    }),
  );
  const units = useMemo(() => parseRoleLayout(layout), [layout]);
  const total = units.reduce((sum, ids) => sum + ids.length, 0);

  function add() {
    const job = newExperience();
    editThenFocus(
      () => editList(resumeId, "experience", (jobs) => [...jobs, job]),
      entryFieldId(job.id, "first"),
    );
  }

  return (
    <EntryList
      count={total}
      empty="No jobs yet. Start with your most recent one."
      addId={EXPERIENCE_ADD_ID}
      addLabel="Add a job"
      onAdd={add}
      limit={LIST_LIMITS.experience}
    >
      {units.flatMap((ids, index) =>
        ids.map((id, position) => (
          <ExperienceEntry
            key={id}
            resumeId={resumeId}
            entryId={id}
            index={index}
            count={units.length}
            rolePosition={ids.length > 1 ? position : -1}
            roleCount={ids.length}
            firstRoleId={ids[0] ?? id}
          />
        )),
      )}
    </EntryList>
  );
});
