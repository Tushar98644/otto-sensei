import { designOf } from "@/lib/pdf/design";
import { templateOf } from "@/lib/pdf/templates";
import type { Resume, TemplateId } from "@/lib/resume/schema";
import { applyDesign } from "./design";
import { classic } from "./templates/classic";
import { compact } from "./templates/compact";
import { developer } from "./templates/developer";
import { executive } from "./templates/executive";
import { minimal } from "./templates/minimal";
import { modern } from "./templates/modern";
import type { TemplateTheme } from "./theme";

export const TEMPLATE_THEMES: Record<TemplateId, TemplateTheme> = {
  classic,
  modern,
  compact,
  executive,
  developer,
  minimal,
};

export function themeFor(resume: Pick<Resume, "template" | "design">, template?: TemplateId) {
  return applyDesign(TEMPLATE_THEMES[template ?? templateOf(resume)], designOf(resume));
}
