"use client";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CONTENT_LIMITS as L, SHELF_KINDS, type ShelfKind } from "@/lib/portfolio/content";
import { autoList, count, type CardProps } from "./auto-list";
import { editContent } from "./content-store";
import { ListEditor, newId } from "./fields";
import { SectionCard, ShowRow } from "./section-card";

const SHELF_LABELS: Record<ShelfKind, string> = {
  book: "Book",
  album: "Album",
  film: "Film",
  game: "Game",
  tool: "Tool",
  other: "Other",
};

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
