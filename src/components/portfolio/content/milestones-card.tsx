"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CONTENT_LIMITS as L, MILESTONE_KINDS, type MilestoneKind } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

const MILESTONE_LABELS: Record<MilestoneKind, string> = {
  award: "Award",
  hackathon: "Hackathon",
  launch: "Launch",
  press: "Press",
  talk: "Talk",
  other: "Other",
};

export function MilestonesCard({ content, auto }: CardProps) {
  const milestones = autoList(content, auto, "milestones");
  const talks = autoList(content, auto, "talks");
  return (
    <SectionCard
      title="Milestones and talks"
      meta={`${count(milestones.items.length, "milestone")} · ${count(talks.items.length, "talk")}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Milestones, awards and hackathons</p>
          {milestones.note}
        </div>
        <ListEditor
          items={milestones.items}
          max={L.milestones}
          noun="Milestone"
          addLabel="Add a milestone"
          empty="Awards and hackathons come from your resume's extra sections."
          title={(item) => item.title}
          create={() => ({
            id: newId("m"),
            kind: "award" as MilestoneKind,
            date: "",
            title: "",
            place: "",
            detail: "",
            result: "",
            url: "",
          })}
          onChange={(items, undo) => milestones.set(items, undo)}
        >
          {(item, update) => (
            <>
              <Input
                aria-label="What happened"
                placeholder="Best Fintech Hack, Lisbon Hack Week"
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
                <Select
                  aria-label="Kind"
                  value={item.kind}
                  onChange={(e) => update({ kind: e.currentTarget.value as MilestoneKind })}
                >
                  {MILESTONE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {MILESTONE_LABELS[kind]}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label="When"
                  placeholder="2024"
                  value={item.date}
                  maxLength={L.date}
                  onChange={(e) => update({ date: e.currentTarget.value })}
                />
                <Input
                  aria-label="Where"
                  placeholder="Lisbon"
                  value={item.place}
                  maxLength={L.place}
                  onChange={(e) => update({ place: e.currentTarget.value })}
                />
                <Input
                  aria-label="Result"
                  placeholder="Winner"
                  value={item.result}
                  maxLength={L.tag}
                  onChange={(e) => update({ result: e.currentTarget.value })}
                />
              </div>
              <Input
                aria-label="Link"
                type="url"
                placeholder="https:// (optional)"
                value={item.url}
                maxLength={L.url}
                onChange={(e) => update({ url: e.currentTarget.value })}
              />
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="milestones" label="Show milestones on my page" />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Talks</p>
          {talks.note}
        </div>
        <ListEditor
          items={talks.items}
          max={L.talks}
          noun="Talk"
          addLabel="Add a talk"
          empty="Talks you've given, with slides or a recording."
          title={(item) => item.title}
          create={() => ({
            id: newId("t"),
            title: "",
            event: "",
            date: "",
            place: "",
            url: "",
            recording: "",
            slides: "",
          })}
          onChange={(items, undo) => talks.set(items, undo)}
        >
          {(item, update) => (
            <>
              <Input
                aria-label="Talk title"
                placeholder="Postgres as a queue"
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <div className="grid grid-cols-2 gap-3 @sm:grid-cols-3">
                <Input
                  aria-label="Event"
                  placeholder="Lisbon Node meetup"
                  value={item.event}
                  maxLength={L.title}
                  onChange={(e) => update({ event: e.currentTarget.value })}
                />
                <Input
                  aria-label="When"
                  placeholder="Oct 2025"
                  value={item.date}
                  maxLength={L.date}
                  onChange={(e) => update({ date: e.currentTarget.value })}
                />
                <Input
                  aria-label="Where"
                  placeholder="Lisbon"
                  value={item.place}
                  maxLength={L.place}
                  onChange={(e) => update({ place: e.currentTarget.value })}
                />
              </div>
              <div className="grid gap-3 @md:grid-cols-2">
                <Input
                  aria-label="Slides link"
                  type="url"
                  placeholder="Slides https://"
                  value={item.slides}
                  maxLength={L.url}
                  onChange={(e) => update({ slides: e.currentTarget.value })}
                />
                <Input
                  aria-label="Recording link"
                  type="url"
                  placeholder="Recording https://"
                  value={item.recording}
                  maxLength={L.url}
                  onChange={(e) => update({ recording: e.currentTarget.value })}
                />
              </div>
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="talks" label="Show talks on my page" />
      </div>
    </SectionCard>
  );
}
