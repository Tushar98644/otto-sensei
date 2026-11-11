"use client";

import { Input } from "@/components/ui/input";
import { CONTENT_LIMITS as L } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { editContent } from "./content-store";
import { FieldRow, ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

export function NowCard({ content, auto }: CardProps) {
  const now = autoList(content, auto, "now");
  const stats = autoList(content, auto, "stats");
  return (
    <SectionCard
      title="Now and numbers"
      meta={`${count(now.items.length, "thing")} · ${count(stats.items.length, "number")}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Now</p>
          {now.note}
        </div>
        <ListEditor
          items={now.items}
          max={L.now}
          noun="Line"
          addLabel="Add a line"
          empty="What you're building, reading or learning these days."
          title={(item) => item.label}
          create={() => ({
            id: newId("n"),
            label: ["Building", "Reading", "Learning", "Listening"][now.items.length] ?? "Doing",
            text: "",
          })}
          onChange={(items, undo) => {
            now.set(items, undo);
            editContent((c) => ({ ...c, nowUpdatedAt: Date.now() }));
          }}
        >
          {(item, update) => (
            <FieldRow>
              <Input
                aria-label="Label"
                value={item.label}
                maxLength={L.nowLabel}
                onChange={(e) => update({ label: e.currentTarget.value })}
              />
              <Input
                aria-label={`${item.label} what`}
                placeholder="Shiftboard v2"
                value={item.text}
                maxLength={L.nowText}
                onChange={(e) => update({ text: e.currentTarget.value })}
              />
            </FieldRow>
          )}
        </ListEditor>
        <ShowRow content={content} section="now" label="Show “Now” on my page" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Headline numbers</p>
          {stats.note}
        </div>
        <ListEditor
          items={stats.items}
          max={L.stats}
          noun="Number"
          addLabel="Add a number"
          empty="Years of experience, users served, stars: pulled from your lines when they have numbers."
          title={(item) => [item.value, item.label].filter(Boolean).join(" ")}
          create={() => ({ id: newId("st"), value: "", label: "" })}
          onChange={(items, undo) => stats.set(items, undo)}
        >
          {(item, update) => (
            <div className="grid grid-cols-3 gap-3">
              <Input
                aria-label="Number"
                placeholder="1.4M"
                value={item.value}
                maxLength={L.statValue}
                onChange={(e) => update({ value: e.currentTarget.value })}
              />
              <Input
                aria-label="What it counts"
                className="col-span-2"
                placeholder="payouts a month"
                value={item.label}
                maxLength={L.statLabel}
                onChange={(e) => update({ label: e.currentTarget.value })}
              />
            </div>
          )}
        </ListEditor>
        <ShowRow content={content} section="stats" label="Show the numbers on my page" />
      </div>
    </SectionCard>
  );
}
