"use client";

import { useId, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CONTENT_LIMITS as L,
  socialHref,
  type PortfolioContent,
  type PortfolioContentView,
} from "@/lib/portfolio/content";
import type { AutoContent } from "@/lib/portfolio/content-view";
import { CheckRow } from "../check-row";
import { editContent } from "./content-store";
import { AutoNote, FieldRow, ListEditor, newId, TagsField, TextField } from "./fields";
import { HiddenNote, SectionCard, ShowRow } from "./section-card";

type CardProps = { content: PortfolioContent; auto: AutoContent; view: PortfolioContentView };

const set = <K extends keyof PortfolioContent>(key: K, value: PortfolioContent[K], undo?: string) =>
  editContent((current) => ({ ...current, [key]: value }), undo);

function useTimeZones(): string[] {
  return useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [];
    }
  }, []);
}

export function ProfileCard({
  content,
  auto,
  view,
  linksHidden,
  showEmail,
}: CardProps & { linksHidden?: string; showEmail: boolean }) {
  const zones = useTimeZones();
  const zoneId = useId();
  const location = content.location;
  const browserZone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const availability = content.availability ??
    auto.availability ?? { open: false, text: "", short: "" };

  return (
    <SectionCard title="Intro" meta={view.pitch ? "Pitch" : "No pitch yet"}>
      <TextField
        label="Pitch"
        value={content.pitch}
        auto={auto.pitch}
        max={L.pitch}
        multiline
        hint="One sentence, the first thing people read."
        onChange={(value) => set("pitch", value)}
      />
      <TextField
        label="Short intro"
        value={content.intro}
        auto={auto.intro}
        max={L.intro}
        multiline
        onChange={(value) => set("intro", value)}
      />
      <TagsField
        label="What you do"
        value={content.disciplines}
        auto={auto.disciplines}
        max={L.disciplines}
        hint="A few words some designs rotate through: Developer, Designer, Writer."
        onChange={(value) => set("disciplines", value)}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Availability</p>
          <AutoNote
            auto={content.availability === null && auto.availability !== null}
            onReset={content.availability ? () => set("availability", null) : undefined}
          />
        </div>
        <div className="border-y border-border">
          <CheckRow
            checked={availability.open}
            label="Open to work"
            hint="Shows a small green dot on designs that have one."
            onChange={(open) => set("availability", { ...availability, open })}
          />
        </div>
        <FieldRow>
          <Input
            aria-label="Availability line"
            placeholder="Open to senior roles from January"
            value={availability.text}
            maxLength={L.availability}
            onChange={(event) =>
              set("availability", { ...availability, text: event.currentTarget.value })
            }
          />
          <Input
            aria-label="Short version"
            placeholder="Available Jan 2027"
            value={availability.short}
            maxLength={L.availabilityShort}
            onChange={(event) =>
              set("availability", { ...availability, short: event.currentTarget.value })
            }
          />
        </FieldRow>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Location and local time</p>
          <AutoNote
            auto={location === null}
            onReset={location ? () => set("location", null) : undefined}
          />
        </div>
        <FieldRow>
          <Input
            aria-label="City"
            placeholder="Lisbon, Portugal"
            maxLength={L.place}
            value={location?.label ?? auto.location?.label ?? ""}
            onChange={(event) =>
              set("location", {
                label: event.currentTarget.value,
                timezone: location?.timezone ?? auto.location?.timezone ?? "",
                lat: null,
                lng: null,
              })
            }
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor={zoneId} className="sr-only">
              Time zone
            </Label>
            <Select
              id={zoneId}
              value={location?.timezone || view.location?.timezone || ""}
              onChange={(event) =>
                set("location", {
                  label: location?.label ?? auto.location?.label ?? "",
                  timezone: event.currentTarget.value,
                  lat: location?.lat ?? null,
                  lng: location?.lng ?? null,
                })
              }
            >
              <option value="">Time zone…</option>
              {browserZone && zones.includes(browserZone) ? (
                <option value={browserZone}>{browserZone} (this device)</option>
              ) : null}
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </Select>
          </div>
        </FieldRow>
        <p className="text-sm/5 text-subtle">
          {view.location?.coords
            ? `Pinned at ${view.location.city} for map tiles.`
            : view.location
              ? "No map pin for this place; clocks still work once the time zone is set."
              : "Add your city for a clock or map tile."}
        </p>
        <ShowRow content={content} section="location" label="Show my location and local time" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">Links</p>
          <AutoNote
            auto={content.socials === null}
            onReset={content.socials ? () => set("socials", null) : undefined}
          />
        </div>
        {linksHidden ? <HiddenNote>{linksHidden}</HiddenNote> : null}
        <ListEditor
          items={content.socials ?? auto.socials}
          max={L.socials}
          noun="Link"
          addLabel="Add a link"
          empty="No links yet. GitHub, LinkedIn and your site come from your resume."
          title={(item) =>
            !showEmail && socialHref(item.url)?.startsWith("mailto:")
              ? `${item.label || item.url} (hidden: “Show my email” is off)`
              : item.label || item.url
          }
          create={() => ({ id: newId("s"), label: "", url: "" })}
          onChange={(items, undo) => set("socials", items, undo)}
        >
          {(item, update) => (
            <FieldRow>
              <Input
                aria-label="Label"
                placeholder="GitHub"
                value={item.label}
                maxLength={L.label}
                onChange={(e) => update({ label: e.currentTarget.value })}
              />
              <Input
                aria-label="Address"
                placeholder="https://github.com/you"
                value={item.url}
                maxLength={L.url}
                onChange={(e) => update({ url: e.currentTarget.value })}
              />
            </FieldRow>
          )}
        </ListEditor>
      </div>
    </SectionCard>
  );
}

export function AboutCard({
  content,
  auto,
  hidden,
}: Omit<CardProps, "view"> & { hidden?: string }) {
  const about = content.about ?? auto.about;
  return (
    <SectionCard
      title="About"
      hidden={hidden}
      meta={
        about.length > 0 ? `${about.length} paragraph${about.length === 1 ? "" : "s"}` : "Empty"
      }
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">About you</p>
          <AutoNote
            auto={content.about === null}
            onReset={content.about ? () => set("about", null) : undefined}
          />
        </div>
        <Textarea
          aria-label="About you"
          autoResize
          className="max-h-96"
          maxLength={L.aboutParagraph * L.aboutParagraphs}
          placeholder="Where you started, what you like working on, how you work."
          value={about.join("\n\n")}
          onChange={(event) =>
            set(
              "about",
              event.currentTarget.value
                .split(/\n\s*\n/)
                .map((paragraph) => paragraph.slice(0, L.aboutParagraph))
                .slice(0, L.aboutParagraphs),
            )
          }
        />
        <p className="text-sm/5 text-subtle">
          A blank line starts a new paragraph. Starts as your resume summary.
        </p>
      </div>
      <TagsField
        label="Words to highlight"
        value={content.highlights}
        auto={auto.highlights}
        max={L.highlights}
        maxLength={L.highlight}
        hint="Phrases from the text above that designs mark in colour or bold."
        onChange={(value) => set("highlights", value)}
      />
    </SectionCard>
  );
}
