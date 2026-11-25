"use client";

import { useProTools } from "@/components/account/pro-tools";
import { FREE_TEMPLATES, PLANS } from "@/config/plans";
import { useMessages } from "@/i18n/client";
import type { Messages } from "@/i18n/messages";
import { fmt } from "@/i18n/format";
import { TEMPLATE_INFO } from "@/lib/pdf/templates";
import { TEMPLATE_IDS } from "@/lib/resume/schema";

type LeadWords = Messages["formats"]["lead"];

const freeNames = FREE_TEMPLATES.map((id) => TEMPLATE_INFO[id].name);
const proCount = TEMPLATE_IDS.length - FREE_TEMPLATES.length;

export function formatsLead(free: boolean, t: LeadWords): string {
  const looks = fmt(t.looks, { count: TEMPLATE_IDS.length });
  if (!free) return fmt(t.paid, { looks });
  const [first = "", last = ""] = freeNames;
  const names = freeNames.length === 2 ? fmt(t.and, { first, last }) : freeNames.join(", ");
  return fmt(t.free, { looks, names, proCount, pro: PLANS.pro.name });
}

export function FormatsLead() {
  const free = useProTools() === false;
  const t = useMessages("formats").lead;
  return (
    <p className="mt-3 max-w-prose text-base/7 text-pretty text-muted">{formatsLead(free, t)}</p>
  );
}
