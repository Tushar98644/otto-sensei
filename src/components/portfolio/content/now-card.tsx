"use client";

import { Input } from "@/components/ui/input";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
import { CONTENT_LIMITS as L } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { editContent } from "./content-store";
import { FieldRow, ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

const NOW_LABELS = ["building", "reading", "learning", "listening"] as const;

export function NowCard({ content, auto }: CardProps) {
  const all = useMessages("portfolioContent");
  const words = all.now;
  const format = useFormat();
  const now = autoList(content, auto, "now");
  const stats = autoList(content, auto, "stats");
  return (
    <SectionCard
      title={words.title}
      meta={`${count(format, all.empty, now.items.length, words.things)} · ${count(format, all.empty, stats.items.length, words.numbers)}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{words.now}</p>
          {now.note}
        </div>
        <ListEditor
          items={now.items}
          max={L.now}
          removed={words.lineRemoved}
          addLabel={words.addLine}
          empty={words.empty}
          title={(item) => item.label}
          create={() => {
            const next = NOW_LABELS[now.items.length];
            return {
              id: newId("n"),
              label: next ? words.labels[next] : words.labels.doing,
              text: "",
            };
          }}
          onChange={(items, undo) => {
            now.set(items, undo);
            editContent((c) => ({ ...c, nowUpdatedAt: Date.now() }));
          }}
        >
          {(item, update) => (
            <FieldRow>
              <Input
                aria-label={all.fields.label}
                value={item.label}
                maxLength={L.nowLabel}
                onChange={(e) => update({ label: e.currentTarget.value })}
              />
              <Input
                aria-label={fmt(words.what, { label: item.label })}
                placeholder={words.whatPlaceholder}
                value={item.text}
                maxLength={L.nowText}
                onChange={(e) => update({ text: e.currentTarget.value })}
              />
            </FieldRow>
          )}
        </ListEditor>
        <ShowRow content={content} section="now" label={words.show} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{words.stats}</p>
          {stats.note}
        </div>
        <ListEditor
          items={stats.items}
          max={L.stats}
          removed={words.numberRemoved}
          addLabel={words.addNumber}
          empty={words.statsEmpty}
          title={(item) => [item.value, item.label].filter(Boolean).join(" ")}
          create={() => ({ id: newId("st"), value: "", label: "" })}
          onChange={(items, undo) => stats.set(items, undo)}
        >
          {(item, update) => (
            <div className="grid grid-cols-3 gap-3">
              <Input
                aria-label={words.number}
                placeholder="1.4M"
                value={item.value}
                maxLength={L.statValue}
                onChange={(e) => update({ value: e.currentTarget.value })}
              />
              <Input
                aria-label={words.counts}
                className="col-span-2"
                placeholder={words.countsPlaceholder}
                value={item.label}
                maxLength={L.statLabel}
                onChange={(e) => update({ label: e.currentTarget.value })}
              />
            </div>
          )}
        </ListEditor>
        <ShowRow content={content} section="stats" label={words.showStats} />
      </div>
    </SectionCard>
  );
}
