"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { memo, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { SECTION_LABELS, isSectionHidden, type SectionKey } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { BasicsForm } from "./basics-form";
import { CertificationsEditor } from "./certifications-editor";
import { EducationEditor } from "./education-editor";
import { ExperienceEditor } from "./experience-editor";
import { ExtrasArea } from "./extras-editor";
import { FixDialogProvider } from "./fix-dialog";
import { sectionDomId } from "./focus";
import { CHAR_LIMITS } from "./limits";
import { useFlashAnnouncement } from "./line-flash";
import { MoveButtons } from "./move-buttons";
import { ProjectsEditor } from "./projects-editor";
import { SectionCard } from "./section-card";
import { moveSection, sectionDisplayOrder, setSectionHidden, setSectionTitle } from "./sections";
import { SkillsEditor } from "./skills-editor";
import { SummaryEditor } from "./summary-editor";
import { editResume, pickResume, useResumeValue, useSectionMeta } from "./use-editor";

const NO_SECTIONS: SectionKey[] = [];

// Every section of one resume, in its print order, then the extra sections. Re-renders only when
// sections move. `intro` sits above the sections, inside the Fix dialog's reach, so it can open a
// line's fix too.
export const ResumeEditor = memo(function ResumeEditor({
  resumeId,
  intro,
}: {
  resumeId: string;
  intro?: ReactNode;
}) {
  const order = useStudioStore(
    useShallow((state) => {
      const resume = pickResume(state, resumeId);
      return resume ? sectionDisplayOrder(resume.sectionOrder) : NO_SECTIONS;
    }),
  );

  return (
    <FixDialogProvider resumeId={resumeId}>
      {intro}
      {/* Keeps a focused field clear of the sticky step bar when the browser scrolls to it. Scoped
          to the sections: the dialogs and the bar itself must scroll normally. */}
      <div className="flex flex-col gap-3 [&_:is(input,textarea,button)]:scroll-mb-28">
        <BasicsCard resumeId={resumeId} />
        {order.map((key, index) => (
          <SectionSlot
            key={key}
            resumeId={resumeId}
            sectionKey={key}
            isFirst={index === 0}
            isLast={index === order.length - 1}
          />
        ))}
        <ExtrasArea resumeId={resumeId} />
      </div>
      <FlashAnnouncer />
    </FixDialogProvider>
  );
});

// The "Line updated" pill comes and goes, so the news is read out from one region that is
// always on the page.
function FlashAnnouncer() {
  const message = useFlashAnnouncement();
  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}

// Starts collapsed when an import already filled in the name and email, so the lines that need
// work come first. Only the first render decides; typing never collapses it.
const BasicsCard = memo(function BasicsCard({ resumeId }: { resumeId: string }) {
  const name = useResumeValue(resumeId, (resume) => resume.basics.name.trim(), "");
  const hasEmail = useResumeValue(resumeId, (resume) => resume.basics.email.trim() !== "", false);
  return (
    <SectionCard
      title="Name and contact"
      count={name || null}
      sectionId={sectionDomId("basics")}
      defaultOpen={!(name && hasEmail)}
    >
      <BasicsForm resumeId={resumeId} />
    </SectionCard>
  );
});

type SectionSlotProps = {
  resumeId: string;
  sectionKey: SectionKey;
  isFirst: boolean;
  isLast: boolean;
};

const SectionSlot = memo(function SectionSlot({
  resumeId,
  sectionKey,
  isFirst,
  isLast,
}: SectionSlotProps) {
  const { title, count, needWork, hidden } = useSectionMeta(resumeId, sectionKey);
  const label = title || SECTION_LABELS[sectionKey];

  return (
    <SectionCard
      title={label}
      count={count}
      sectionId={sectionDomId(sectionKey)}
      options={{
        rename: {
          value: label,
          placeholder: SECTION_LABELS[sectionKey],
          maxLength: CHAR_LIMITS.sectionTitle,
          onSave: (next) =>
            editResume(resumeId, (resume) => setSectionTitle(resume, sectionKey, next)),
        },
        hidden,
        onToggleHidden: () =>
          editResume(resumeId, (resume) =>
            setSectionHidden(resume, sectionKey, !isSectionHidden(resume, sectionKey)),
          ),
      }}
      status={
        needWork > 0 ? (
          <Badge variant="warn">
            <TriangleExclamationPoint />
            {`${needWork} ${needWork === 1 ? "needs" : "need"} work`}
          </Badge>
        ) : null
      }
      actions={
        <MoveButtons
          label={label}
          canMoveUp={!isFirst}
          canMoveDown={!isLast}
          onMove={(delta) =>
            editResume(resumeId, (resume) => moveSection(resume, sectionKey, delta))
          }
        />
      }
    >
      {renderSection(sectionKey, resumeId)}
    </SectionCard>
  );
});

function renderSection(key: SectionKey, resumeId: string): ReactNode {
  switch (key) {
    case "summary":
      return <SummaryEditor resumeId={resumeId} />;
    case "experience":
      return <ExperienceEditor resumeId={resumeId} />;
    case "projects":
      return <ProjectsEditor resumeId={resumeId} />;
    case "education":
      return <EducationEditor resumeId={resumeId} />;
    case "skills":
      return <SkillsEditor resumeId={resumeId} />;
    case "certifications":
      return <CertificationsEditor resumeId={resumeId} />;
  }
}
