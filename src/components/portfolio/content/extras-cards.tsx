"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_LIMITS as L,
  MILESTONE_KINDS,
  SHELF_KINDS,
  type MilestoneKind,
  type PortfolioContent,
  type ShelfKind,
} from "@/lib/portfolio/content";
import type { AutoContent } from "@/lib/portfolio/content-view";
import { editContent } from "./content-store";
import { AutoNote, FieldRow, ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

// The lists beyond the resume. Lists Otto can fill (now, numbers, milestones, talks, writing,
// interests) start automatic; the first edit makes them the owner's.

type CardProps = { content: PortfolioContent; auto: AutoContent };

type AutoListKey = "now" | "stats" | "milestones" | "talks" | "writing" | "interests";

function autoList<K extends AutoListKey>(content: PortfolioContent, auto: AutoContent, key: K) {
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

const MILESTONE_LABELS: Record<MilestoneKind, string> = {
  award: "Award",
  hackathon: "Hackathon",
  launch: "Launch",
  press: "Press",
  talk: "Talk",
  other: "Other",
};

const SHELF_LABELS: Record<ShelfKind, string> = {
  book: "Book",
  album: "Album",
  film: "Film",
  game: "Game",
  tool: "Tool",
  other: "Other",
};

const count = (n: number, word: string) =>
  n === 0 ? "Empty" : `${n} ${word}${n === 1 ? "" : "s"}`;

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

export function WritingCard({ content, auto }: CardProps) {
  const writing = autoList(content, auto, "writing");
  const testimonials = content.testimonials;
  return (
    <SectionCard
      title="Writing and kind words"
      meta={`${count(writing.items.length, "post")} · ${count(testimonials.length, "quote")}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Writing</p>
          {writing.note}
        </div>
        <ListEditor
          items={writing.items}
          max={L.writing}
          noun="Post"
          addLabel="Add a post"
          empty="Links to posts and articles. Publications on your resume show up here."
          title={(item) => item.title}
          create={() => ({
            id: newId("w"),
            title: "",
            url: "",
            date: "",
            minutes: null,
            publisher: "",
          })}
          onChange={(items, undo) => writing.set(items, undo)}
        >
          {(item, update) => (
            <>
              <Input
                aria-label="Title"
                placeholder="Postgres is a fine queue"
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <Input
                aria-label="Link"
                type="url"
                placeholder="https://"
                value={item.url}
                maxLength={L.url}
                onChange={(e) => update({ url: e.currentTarget.value })}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  aria-label="Date"
                  placeholder="Sep 2026"
                  value={item.date}
                  maxLength={L.date}
                  onChange={(e) => update({ date: e.currentTarget.value })}
                />
                <Input
                  aria-label="Minutes to read"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={L.minutes}
                  placeholder="8 min"
                  value={item.minutes ?? ""}
                  onChange={(e) => {
                    const minutes = Math.round(Number(e.currentTarget.value));
                    update({ minutes: minutes >= 1 && minutes <= L.minutes ? minutes : null });
                  }}
                />
                <Input
                  aria-label="Where it ran"
                  placeholder="Own blog"
                  value={item.publisher}
                  maxLength={L.label}
                  onChange={(e) => update({ publisher: e.currentTarget.value })}
                />
              </div>
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="writing" label="Show writing on my page" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Testimonials</p>
        <ListEditor
          items={testimonials}
          max={L.testimonials}
          noun="Quote"
          addLabel="Add a quote"
          empty="A line from a manager, client or teammate, with their name."
          title={(item) => item.name || item.quote.slice(0, 40)}
          create={() => ({ id: newId("q"), quote: "", name: "", role: "", url: "" })}
          onChange={(items, undo) => editContent((c) => ({ ...c, testimonials: items }), undo)}
        >
          {(item, update) => (
            <>
              <Textarea
                aria-label="What they said"
                autoResize
                placeholder="Jordan is the engineer you hand the scary migration to."
                value={item.quote}
                maxLength={L.quote}
                onChange={(e) => update({ quote: e.currentTarget.value })}
              />
              <FieldRow>
                <Input
                  aria-label="Their name"
                  placeholder="Maya Okafor"
                  value={item.name}
                  maxLength={L.label}
                  onChange={(e) => update({ name: e.currentTarget.value })}
                />
                <Input
                  aria-label="Their role"
                  placeholder="VP Engineering, Ledgerly"
                  value={item.role}
                  maxLength={L.title}
                  onChange={(e) => update({ role: e.currentTarget.value })}
                />
              </FieldRow>
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="testimonials" label="Show testimonials on my page" />
      </div>
    </SectionCard>
  );
}

export function PersonalCard({ content, auto }: CardProps) {
  const interests = autoList(content, auto, "interests");
  return (
    <SectionCard
      title="Outside work"
      meta={`${count(interests.items.length, "interest")} · ${count(content.shelf.length, "favourite")}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Interests</p>
          {interests.note}
        </div>
        <ListEditor
          items={interests.items}
          max={L.interests}
          noun="Interest"
          addLabel="Add an interest"
          empty="Hobbies, each with a number if you like: Bouldering, V5."
          title={(item) => item.title}
          create={() => ({ id: newId("i"), title: "", stat: "", line: "" })}
          onChange={(items, undo) => interests.set(items, undo)}
        >
          {(item, update) => (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  aria-label="Interest"
                  className="col-span-2"
                  placeholder="Bouldering"
                  value={item.title}
                  maxLength={L.label}
                  onChange={(e) => update({ title: e.currentTarget.value })}
                />
                <Input
                  aria-label="Its number"
                  placeholder="V5"
                  value={item.stat}
                  maxLength={L.statValue}
                  onChange={(e) => update({ stat: e.currentTarget.value })}
                />
              </div>
              <Input
                aria-label="One line"
                placeholder="Outdoors at Sintra when it's dry."
                value={item.line}
                maxLength={L.detail}
                onChange={(e) => update({ line: e.currentTarget.value })}
              />
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="interests" label="Show interests on my page" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">Bookshelf</p>
        <ListEditor
          items={content.shelf}
          max={L.shelf}
          noun="Favourite"
          addLabel="Add a book or album"
          empty="Books, albums or films you'd hand a friend."
          title={(item) => item.title}
          create={() => ({ id: newId("b"), kind: "book" as ShelfKind, title: "", by: "", url: "" })}
          onChange={(items, undo) => editContent((c) => ({ ...c, shelf: items }), undo)}
        >
          {(item, update) => (
            <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
              <Select
                aria-label="Kind"
                value={item.kind}
                onChange={(e) => update({ kind: e.currentTarget.value as ShelfKind })}
              >
                {SHELF_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {SHELF_LABELS[kind]}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Title"
                className="@md:col-span-2"
                placeholder="Designing Data-Intensive Applications"
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <Input
                aria-label="By"
                placeholder="Martin Kleppmann"
                value={item.by}
                maxLength={L.label}
                onChange={(e) => update({ by: e.currentTarget.value })}
              />
            </div>
          )}
        </ListEditor>
        <ShowRow content={content} section="shelf" label="Show the bookshelf on my page" />
      </div>
    </SectionCard>
  );
}
