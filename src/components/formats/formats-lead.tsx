import { FREE_TEMPLATES } from "@/config/plans";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";

const freeNames = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");

export function formatsLead(free: boolean): string {
  const looks = `One resume, ${TEMPLATE_IDS.length} looks.`;
  return free
    ? `${looks} ${freeNames} are free, and you can try the rest on your resume first.`
    : `${looks} Switch whenever you like: your words stay the same.`;
}
