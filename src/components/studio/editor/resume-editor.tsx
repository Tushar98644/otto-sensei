"use client";

import { TriangleExclamationPoint } from "lucide-react";
import { memo, type ReactNode } from "react";
import { useShallow } from "zustand/react/shallow";
import { Badge } from "@/components/ui/badge";
import { useFormat, useMessages } from "@/i18n/client";
import { sectionHeadingIn } from "@/lib/resume/labels";
import { SECTION_LABELS, isSectionHidden, type SectionKey } from "@/lib/resume/schema";
import { useStudioStore } from "@/lib/store/resume-store";
import { BasicsForm } from "./basics-form";
import { CertificationsEditor } from "./certifications-editor";
import { EducationEditor } from "./education-editor";
import { ExperienceEditor } from "./experience-editor";
import { ExtrasArea } from "./extras-editor";
import { FixDialogProvider } from "./fix-provider";
import { sectionDomId } from "./focus";
import { CHAR_LIMITS } from "./limits";
import { countText } from "../count";
import { useLineFlashed } from "./line-flash";
import { MoveButtons } from "./move-buttons";
import { ProjectsEditor } from "./projects-editor";
import { SectionCard } from "./section-card";
import { moveSection, sectionDisplayOrder, setSectionHidden, setSectionTitle } from "./sections";
import { SkillsEditor } from "./skills-editor";
import { SummaryEditor } from "./summary-editor";
import { editResume, pickResume, useResumeValue, useSectionMeta } from "./use-editor";

const NO_SECTIONS: SectionKey[] = [];

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

function FlashAnnouncer() {
  const flashed = useLineFlashed();
  const t = useMessages("studioEditor");
  return (
    <p role="status" className="sr-only">
      {flashed ? t.lineUpdated : ""}
    </p>
  );
}

const BasicsCard = memo(function BasicsCard({ resumeId }: { resumeId: string }) {
  const name = useResumeValue(resumeId, (resume) => resume.basics.name.trim(), "");
  const hasEmail = useResumeValue(resumeId, (resume) => resume.basics.email.trim() !== "", false);
  const t = useMessages("studioSections");
  return (
    <SectionCard
      title={t.basics.section}
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
  // Headings print on the resume, so they follow its language (set on import or by hand), as the PDF does.
  const lang = useStudioStore((s) => s.resumes[resumeId]?.lang ?? "en");
  const fallback = sectionHeadingIn(sectionKey, lang);
  const label = title && (lang === "en" || title !== SECTION_LABELS[sectionKey]) ? title : fallback;
  const t = useMessages("studioEditor");
  const format = useFormat();

  return (
    <SectionCard
      title={label}
      count={count}
      sectionId={sectionDomId(sectionKey)}
      options={{
        rename: {
          value: label,
          placeholder: fallback,
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
            {countText(format, t.counts.needWork, needWork)}
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
