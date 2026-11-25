"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormat, useMessages } from "@/i18n/client";
import { CONTENT_LIMITS as L } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { editContent } from "./content-store";
import { FieldRow, ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

export function WritingCard({ content, auto }: CardProps) {
  const all = useMessages("portfolioContent");
  const words = all.writing;
  const fields = all.fields;
  const format = useFormat();
  const writing = autoList(content, auto, "writing");
  const testimonials = content.testimonials;
  return (
    <SectionCard
      title={words.title}
      meta={`${count(format, all.empty, writing.items.length, words.posts)} · ${count(format, all.empty, testimonials.length, words.quotes)}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{words.heading}</p>
          {writing.note}
        </div>
        <ListEditor
          items={writing.items}
          max={L.writing}
          removed={words.removed}
          addLabel={words.add}
          empty={words.empty}
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
                aria-label={fields.title}
                placeholder={words.titlePlaceholder}
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <Input
                aria-label={fields.link}
                type="url"
                placeholder="https://"
                value={item.url}
                maxLength={L.url}
                onChange={(e) => update({ url: e.currentTarget.value })}
              />
              <div className="grid grid-cols-3 gap-3">
                <Input
                  aria-label={words.date}
                  placeholder={words.datePlaceholder}
                  value={item.date}
                  maxLength={L.date}
                  onChange={(e) => update({ date: e.currentTarget.value })}
                />
                <Input
                  aria-label={words.minutes}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={L.minutes}
                  placeholder={words.minutesPlaceholder}
                  value={item.minutes ?? ""}
                  onChange={(e) => {
                    const minutes = Math.round(Number(e.currentTarget.value));
                    update({ minutes: minutes >= 1 && minutes <= L.minutes ? minutes : null });
                  }}
                />
                <Input
                  aria-label={words.publisher}
                  placeholder={words.publisherPlaceholder}
                  value={item.publisher}
                  maxLength={L.label}
                  onChange={(e) => update({ publisher: e.currentTarget.value })}
                />
              </div>
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="writing" label={words.show} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">{words.testimonials}</p>
        <ListEditor
          items={testimonials}
          max={L.testimonials}
          removed={words.quoteRemoved}
          addLabel={words.addQuote}
          empty={words.quotesEmpty}
          title={(item) => item.name || item.quote.slice(0, 40)}
          create={() => ({ id: newId("q"), quote: "", name: "", role: "", url: "" })}
          onChange={(items, undo) => editContent((c) => ({ ...c, testimonials: items }), undo)}
        >
          {(item, update) => (
            <>
              <Textarea
                aria-label={words.said}
                autoResize
                placeholder={words.saidPlaceholder}
                value={item.quote}
                maxLength={L.quote}
                onChange={(e) => update({ quote: e.currentTarget.value })}
              />
              <FieldRow>
                <Input
                  aria-label={words.name}
                  placeholder="Maya Okafor"
                  value={item.name}
                  maxLength={L.label}
                  onChange={(e) => update({ name: e.currentTarget.value })}
                />
                <Input
                  aria-label={words.role}
                  placeholder={words.rolePlaceholder}
                  value={item.role}
                  maxLength={L.title}
                  onChange={(e) => update({ role: e.currentTarget.value })}
                />
              </FieldRow>
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="testimonials" label={words.showQuotes} />
      </div>
    </SectionCard>
  );
}
