"use client";

import { Plus, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { newId, type ResumeLink } from "@/lib/resume/schema";
import { cn } from "@/lib/utils";
import { patchItem, pickNeighbor, removeItem } from "./edits";
import { addButtonId, editThenFocus, entryFieldId } from "./focus";
import { CHAR_LIMITS, LIST_LIMITS } from "./limits";
import { ICON_ACTION_CLASSES } from "./move-buttons";
import { editResume } from "./use-editor";

const ADD_ID = addButtonId("links");

export function LinksEditor({ resumeId, links }: { resumeId: string; links: ResumeLink[] }) {
  const full = links.length >= LIST_LIMITS.links;

  function setLinks(update: (current: ResumeLink[]) => ResumeLink[]) {
    editResume(resumeId, (resume) => ({
      ...resume,
      basics: { ...resume.basics, links: update(resume.basics.links) },
    }));
  }

  function patch(id: string, change: Partial<Omit<ResumeLink, "id">>) {
    setLinks((current) => patchItem(current, id, (link) => ({ ...link, ...change })));
  }

  function add() {
    const link: ResumeLink = { id: newId(), label: "", url: "" };
    editThenFocus(() => setLinks((current) => [...current, link]), entryFieldId(link.id, "first"));
  }

  function remove(id: string) {
    const neighbor = pickNeighbor(
      links.map((link) => link.id),
      id,
      "next",
    );
    editThenFocus(
      () => setLinks((current) => removeItem(current, id)),
      neighbor ? entryFieldId(neighbor.id, "remove") : ADD_ID,
    );
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-ink">
        Links <span className="font-normal text-muted">(optional)</span>
      </legend>
      <p className="-mt-1 text-sm text-muted">
        LinkedIn, a portfolio, GitHub: whatever shows your work.
      </p>
      {links.length > 0 ? (
        <ul role="list" className="flex flex-col gap-4">
          {links.map((link, index) => (
            <li key={link.id} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Name" className="sm:w-40">
                <Input
                  id={entryFieldId(link.id, "first")}
                  value={link.label}
                  onChange={(event) => patch(link.id, { label: event.target.value })}
                  maxLength={CHAR_LIMITS.linkLabel}
                  placeholder="LinkedIn"
                />
              </Field>
              <Field label="Web address" className="sm:flex-1">
                <Input
                  type="url"
                  inputMode="url"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={link.url}
                  onChange={(event) => patch(link.id, { url: event.target.value })}
                  maxLength={CHAR_LIMITS.linkUrl}
                  placeholder="linkedin.com/in/alex-morgan"
                />
              </Field>
              <Button
                id={entryFieldId(link.id, "remove")}
                variant="ghost"
                size="icon"
                aria-label={`Remove link ${link.label.trim() || index + 1}`}
                onClick={() => remove(link.id)}
                className={cn("self-end sm:self-auto", ICON_ACTION_CLASSES)}
              >
                <Trash />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          id={ADD_ID}
          variant="ghost"
          onClick={add}
          disabled={full}
          className="-ml-4 text-muted hover:text-ink"
        >
          <Plus />
          Add a link
        </Button>
        {full ? (
          <p className="text-sm text-muted">{`That's the most links a resume can hold (${LIST_LIMITS.links}).`}</p>
        ) : null}
      </div>
    </fieldset>
  );
}
