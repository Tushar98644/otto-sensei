"use client";

import type { Format } from "@/i18n/intl";
import type { PluralForms } from "@/i18n/types";
import type { PortfolioContent } from "@/lib/portfolio/content";
import type { AutoContent } from "@/lib/portfolio/content-view";
import { editContent } from "./content-store";
import { AutoNote } from "./fields";

export type CardProps = { content: PortfolioContent; auto: AutoContent };

type AutoListKey = "now" | "stats" | "milestones" | "talks" | "writing" | "interests";

export function autoList<K extends AutoListKey>(
  content: PortfolioContent,
  auto: AutoContent,
  key: K,
) {
  const own = content[key] as NonNullable<PortfolioContent[K]> | null;
  const items = (own ?? auto[key]) as NonNullable<PortfolioContent[K]>;
  return {
    items,
    note: (
      <AutoNote
        auto={own === null && (auto[key] as unknown[]).length > 0}
        onReset={
          own !== null && (auto[key] as unknown[]).length > 0
            ? () => editContent((c) => ({ ...c, [key]: null }))
            : undefined
        }
      />
    ),
    set: (next: NonNullable<PortfolioContent[K]>, undo?: string) =>
      editContent((c) => ({ ...c, [key]: next }), undo),
  };
}

export const count = (format: Format, empty: string, n: number, forms: PluralForms) =>
  n === 0 ? empty : format.plural(forms, n);
