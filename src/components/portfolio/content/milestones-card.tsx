"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useFormat, useMessages } from "@/i18n/client";
import { CONTENT_LIMITS as L, MILESTONE_KINDS, type MilestoneKind } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

export function MilestonesCard({ content, auto }: CardProps) {
  const all = useMessages("portfolioContent");
  const words = all.milestones;
  const fields = all.fields;
  const format = useFormat();
  const milestones = autoList(content, auto, "milestones");
  const talks = autoList(content, auto, "talks");
  return (
    <SectionCard
      title={words.title}
      meta={`${count(format, all.empty, milestones.items.length, words.milestones)} · ${count(format, all.empty, talks.items.length, words.talks)}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{words.heading}</p>
          {milestones.note}
        </div>
        <ListEditor
          items={milestones.items}
          max={L.milestones}
          removed={words.removed}
          addLabel={words.add}
          empty={words.empty}
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
                aria-label={words.what}
                placeholder={words.whatPlaceholder}
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
                <Select
                  aria-label={fields.kind}
                  value={item.kind}
                  onChange={(e) => update({ kind: e.currentTarget.value as MilestoneKind })}
                >
                  {MILESTONE_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {words.kinds[kind]}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label={fields.when}
                  placeholder="2024"
                  value={item.date}
                  maxLength={L.date}
                  onChange={(e) => update({ date: e.currentTarget.value })}
                />
                <Input
                  aria-label={fields.where}
                  placeholder={words.wherePlaceholder}
                  value={item.place}
                  maxLength={L.place}
                  onChange={(e) => update({ place: e.currentTarget.value })}
                />
                <Input
                  aria-label={words.result}
                  placeholder={words.resultPlaceholder}
                  value={item.result}
                  maxLength={L.tag}
                  onChange={(e) => update({ result: e.currentTarget.value })}
                />
              </div>
              <Input
                aria-label={fields.link}
                type="url"
                placeholder={fields.optionalLink}
                value={item.url}
                maxLength={L.url}
                onChange={(e) => update({ url: e.currentTarget.value })}
              />
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="milestones" label={words.show} />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{words.talksHeading}</p>
          {talks.note}
        </div>
        <ListEditor
          items={talks.items}
          max={L.talks}
          removed={words.talkRemoved}
          addLabel={words.addTalk}
          empty={words.talksEmpty}
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
                aria-label={words.talkTitle}
                placeholder={words.talkPlaceholder}
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <div className="grid grid-cols-2 gap-3 @sm:grid-cols-3">
                <Input
                  aria-label={words.event}
                  placeholder={words.eventPlaceholder}
                  value={item.event}
                  maxLength={L.title}
                  onChange={(e) => update({ event: e.currentTarget.value })}
                />
                <Input
                  aria-label={fields.when}
                  placeholder={words.talkDate}
                  value={item.date}
                  maxLength={L.date}
                  onChange={(e) => update({ date: e.currentTarget.value })}
                />
                <Input
                  aria-label={fields.where}
                  placeholder={words.wherePlaceholder}
                  value={item.place}
                  maxLength={L.place}
                  onChange={(e) => update({ place: e.currentTarget.value })}
                />
              </div>
              <div className="grid gap-3 @md:grid-cols-2">
                <Input
                  aria-label={words.slides}
                  type="url"
                  placeholder={words.slidesPlaceholder}
                  value={item.slides}
                  maxLength={L.url}
                  onChange={(e) => update({ slides: e.currentTarget.value })}
                />
                <Input
                  aria-label={words.recording}
                  type="url"
                  placeholder={words.recordingPlaceholder}
                  value={item.recording}
                  maxLength={L.url}
                  onChange={(e) => update({ recording: e.currentTarget.value })}
                />
              </div>
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="talks" label={words.showTalks} />
      </div>
    </SectionCard>
  );
}
