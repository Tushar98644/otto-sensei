"use client";

import { useId, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFormat, useMessages } from "@/i18n/client";
import { fmt } from "@/i18n/format";
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
  const words = useMessages("portfolioContent");
  const intro = words.intro;
  const zones = useTimeZones();
  const zoneId = useId();
  const location = content.location;
  const browserZone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "";
  const availability = content.availability ??
    auto.availability ?? { open: false, text: "", short: "" };

  return (
    <SectionCard title={intro.title} meta={view.pitch ? intro.pitch : intro.noPitch}>
      <TextField
        label={intro.pitch}
        value={content.pitch}
        auto={auto.pitch}
        max={L.pitch}
        multiline
        hint={intro.pitchHint}
        onChange={(value) => set("pitch", value)}
      />
      <TextField
        label={intro.shortIntro}
        value={content.intro}
        auto={auto.intro}
        max={L.intro}
        multiline
        onChange={(value) => set("intro", value)}
      />
      <TagsField
        label={intro.disciplines}
        value={content.disciplines}
        auto={auto.disciplines}
        max={L.disciplines}
        hint={intro.disciplinesHint}
        onChange={(value) => set("disciplines", value)}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{intro.availability}</p>
          <AutoNote
            auto={content.availability === null && auto.availability !== null}
            onReset={content.availability ? () => set("availability", null) : undefined}
          />
        </div>
        <div className="border-y border-border">
          <CheckRow
            checked={availability.open}
            label={intro.open}
            hint={intro.openHint}
            onChange={(open) => set("availability", { ...availability, open })}
          />
        </div>
        <FieldRow>
          <Input
            aria-label={intro.line}
            placeholder={intro.linePlaceholder}
            value={availability.text}
            maxLength={L.availability}
            onChange={(event) =>
              set("availability", { ...availability, text: event.currentTarget.value })
            }
          />
          <Input
            aria-label={intro.short}
            placeholder={intro.shortPlaceholder}
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
          <p className="text-sm font-medium text-ink">{intro.location}</p>
          <AutoNote
            auto={location === null}
            onReset={location ? () => set("location", null) : undefined}
          />
        </div>
        <FieldRow>
          <Input
            aria-label={intro.city}
            placeholder={intro.cityPlaceholder}
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
              {intro.zone}
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
              <option value="">{intro.zonePick}</option>
              {browserZone && zones.includes(browserZone) ? (
                <option value={browserZone}>{fmt(intro.thisDevice, { zone: browserZone })}</option>
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
            ? fmt(intro.pinned, { city: view.location.city })
            : view.location
              ? intro.noPin
              : intro.addCity}
        </p>
        <ShowRow content={content} section="location" label={intro.showLocation} />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{intro.links}</p>
          <AutoNote
            auto={content.socials === null}
            onReset={content.socials ? () => set("socials", null) : undefined}
          />
        </div>
        {linksHidden ? <HiddenNote>{linksHidden}</HiddenNote> : null}
        <ListEditor
          items={content.socials ?? auto.socials}
          max={L.socials}
          removed={intro.linkRemoved}
          addLabel={intro.addLink}
          empty={intro.noLinks}
          title={(item) =>
            !showEmail && socialHref(item.url)?.startsWith("mailto:")
              ? fmt(intro.emailHidden, { label: item.label || item.url })
              : item.label || item.url
          }
          create={() => ({ id: newId("s"), label: "", url: "" })}
          onChange={(items, undo) => set("socials", items, undo)}
        >
          {(item, update) => (
            <FieldRow>
              <Input
                aria-label={words.fields.label}
                placeholder="GitHub"
                value={item.label}
                maxLength={L.label}
                onChange={(e) => update({ label: e.currentTarget.value })}
              />
              <Input
                aria-label={intro.address}
                placeholder={intro.addressPlaceholder}
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
  const words = useMessages("portfolioContent");
  const format = useFormat();
  const copy = words.about;
  const about = content.about ?? auto.about;
  return (
    <SectionCard
      title={copy.title}
      hidden={hidden}
      meta={about.length > 0 ? format.plural(copy.paragraphs, about.length) : words.empty}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-ink">{copy.you}</p>
          <AutoNote
            auto={content.about === null}
            onReset={content.about ? () => set("about", null) : undefined}
          />
        </div>
        <Textarea
          aria-label={copy.you}
          autoResize
          className="max-h-96"
          maxLength={L.aboutParagraph * L.aboutParagraphs}
          placeholder={copy.placeholder}
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
        <p className="text-sm/5 text-subtle">{copy.hint}</p>
      </div>
      <TagsField
        label={copy.highlights}
        value={content.highlights}
        auto={auto.highlights}
        max={L.highlights}
        maxLength={L.highlight}
        hint={copy.highlightsHint}
        onChange={(value) => set("highlights", value)}
      />
    </SectionCard>
  );
}
