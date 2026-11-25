"use client";

import { useProTools } from "@/components/account/pro-tools";
import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { useMessagesOr } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import EN_FORMATS from "@/i18n/messages/en/formats";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";

type LeadWords = (typeof EN_FORMATS)["lead"];

const freeNames = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name);
const proCount = TEMPLATE_IDS.length - FREE_TEMPLATES.length;

export function formatsLead(free: boolean, t: LeadWords = EN_FORMATS.lead): string {
  const looks = fmt(t.looks, { count: TEMPLATE_IDS.length });
  if (!free) return fmt(t.paid, { looks });
  const [first = "", last = ""] = freeNames;
  const names = freeNames.length === 2 ? fmt(t.and, { first, last }) : freeNames.join(", ");
  return fmt(t.free, { looks, names, proCount, pro: PLANS.pro.name });
}

export function FormatsLead() {
  const free = useProTools() === false;
  const t = useMessagesOr("formats", EN_FORMATS).lead;
  return (
    <p className="mt-3 max-w-prose text-base/7 text-pretty text-muted">{formatsLead(free, t)}</p>
  );
}
