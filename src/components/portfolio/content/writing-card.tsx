"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTENT_LIMITS as L } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { editContent } from "./content-store";
import { FieldRow, ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

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
