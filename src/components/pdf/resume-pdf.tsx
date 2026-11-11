import type { PdfPageSize } from "@/lib/pdf/page-size";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { ResumeDocument } from "./document";
import { themeFor } from "./themes";

export type ResumePdfProps = {
  resume: Resume;
  pageSize?: PdfPageSize;
  // Defaults to the format saved on the resume, then Classic.
  template?: TemplateId;
};

export function ResumePdf({ resume, pageSize = "LETTER", template }: ResumePdfProps) {
  return <ResumeDocument resume={resume} pageSize={pageSize} theme={themeFor(resume, template)} />;
}
