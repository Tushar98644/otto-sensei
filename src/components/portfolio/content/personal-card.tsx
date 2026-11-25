"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useFormat, useMessages } from "@/i18n/client";
import { CONTENT_LIMITS as L, SHELF_KINDS, type ShelfKind } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { editContent } from "./content-store";
import { ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

export function PersonalCard({ content, auto }: CardProps) {
  const all = useMessages("portfolioContent");
  const words = all.personal;
  const format = useFormat();
  const interests = autoList(content, auto, "interests");
  return (
    <SectionCard
      title={words.title}
      meta={`${count(format, all.empty, interests.items.length, words.interests)} · ${count(format, all.empty, content.shelf.length, words.favourites)}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{words.heading}</p>
          {interests.note}
        </div>
        <ListEditor
          items={interests.items}
          max={L.interests}
          removed={words.removed}
          addLabel={words.add}
          empty={words.empty}
          title={(item) => item.title}
          create={() => ({ id: newId("i"), title: "", stat: "", line: "" })}
          onChange={(items, undo) => interests.set(items, undo)}
        >
          {(item, update) => (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  aria-label={words.interest}
                  className="col-span-2"
                  placeholder={words.interestPlaceholder}
                  value={item.title}
                  maxLength={L.label}
                  onChange={(e) => update({ title: e.currentTarget.value })}
                />
                <Input
                  aria-label={words.stat}
                  placeholder="V5"
                  value={item.stat}
                  maxLength={L.statValue}
                  onChange={(e) => update({ stat: e.currentTarget.value })}
                />
              </div>
              <Input
                aria-label={words.line}
                placeholder={words.linePlaceholder}
                value={item.line}
                maxLength={L.detail}
                onChange={(e) => update({ line: e.currentTarget.value })}
              />
            </>
          )}
        </ListEditor>
        <ShowRow content={content} section="interests" label={words.show} />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-ink">{words.shelf}</p>
        <ListEditor
          items={content.shelf}
          max={L.shelf}
          removed={words.shelfRemoved}
          addLabel={words.addShelf}
          empty={words.shelfEmpty}
          title={(item) => item.title}
          create={() => ({ id: newId("b"), kind: "book" as ShelfKind, title: "", by: "", url: "" })}
          onChange={(items, undo) => editContent((c) => ({ ...c, shelf: items }), undo)}
        >
          {(item, update) => (
            <div className="grid grid-cols-2 gap-3 @md:grid-cols-4">
              <Select
                aria-label={all.fields.kind}
                value={item.kind}
                onChange={(e) => update({ kind: e.currentTarget.value as ShelfKind })}
              >
                {SHELF_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {words.kinds[kind]}
                  </option>
                ))}
              </Select>
              <Input
                aria-label={all.fields.title}
                className="@md:col-span-2"
                placeholder="Designing Data-Intensive Applications"
                value={item.title}
                maxLength={L.title}
                onChange={(e) => update({ title: e.currentTarget.value })}
              />
              <Input
                aria-label={words.by}
                placeholder="Martin Kleppmann"
                value={item.by}
                maxLength={L.label}
                onChange={(e) => update({ by: e.currentTarget.value })}
              />
            </div>
          )}
        </ListEditor>
        <ShowRow content={content} section="shelf" label={words.showShelf} />
      </div>
    </SectionCard>
  );
}
