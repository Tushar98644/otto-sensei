import type { ComponentType } from "react";
import type { PdfPageSize } from "@/lib/pdf/page-size";
import { TEMPLATE_INFO, type TemplateInfo } from "@/lib/pdf/templates";
import { TEMPLATE_IDS, type Resume, type TemplateId } from "@/lib/resume/schema";
import { ResumeDocument } from "./document";
import { TEMPLATE_THEMES, themeFor } from "./themes";

export type ResumeTemplateProps = { resume: Resume; pageSize?: PdfPageSize };

export type ResumeTemplate = TemplateInfo & { Component: ComponentType<ResumeTemplateProps> };

export { TEMPLATE_THEMES };

function templateFor(id: TemplateId): ResumeTemplate {
  const info = TEMPLATE_INFO[id];
  function Component(props: ResumeTemplateProps) {
    return <ResumeDocument {...props} theme={themeFor(props.resume, id)} />;
  }
  Component.displayName = `${info.name}ResumePdf`;
  return { ...info, Component };
}

export const RESUME_TEMPLATES = Object.fromEntries(
  TEMPLATE_IDS.map((id) => [id, templateFor(id)]),
) as Record<TemplateId, ResumeTemplate>;

export const RESUME_TEMPLATE_LIST: readonly ResumeTemplate[] = TEMPLATE_IDS.map(
  (id) => RESUME_TEMPLATES[id],
);
