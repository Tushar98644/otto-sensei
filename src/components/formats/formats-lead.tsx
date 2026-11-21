"use client";

import { useProTools } from "@/components/account/pro-tools";
import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";

const freeNames = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name).join(" and ");
const proCount = TEMPLATE_IDS.length - FREE_TEMPLATES.length;

export function formatsLead(free: boolean): string {
  const looks = `One resume, ${TEMPLATE_IDS.length} looks.`;
  return free
    ? `${looks} ${freeNames} are free. The other ${proCount} come with ${PLANS.pro.name}, and you can try them on your resume first.`
    : `${looks} Switch whenever you like: your words stay the same.`;
}

export function FormatsLead() {
  const free = useProTools() === false;
  return <p className="mt-3 max-w-prose text-base/7 text-pretty text-muted">{formatsLead(free)}</p>;
}
