"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { fmt } from "@/i18n/format";
import { CONTENT_LANGS, type ContentLang } from "@/lib/i18n/languages";
import { JOB_LANGUAGES_LIVE } from "@/lib/job-feed/job-langs";
import {
  ENGLISH_JOBS_SHARED,
  familyWords,
  placeLabel,
  placeLine,
  roleName,
  type JobsSharedWords,
  type RegionName,
} from "@/lib/job-feed/looking-for";
import { familyOfOccupation } from "@/lib/job-feed/roles";
import {
  LOOKING_FOR_LIMITS,
  PLACE_GROUPS,
  ROLE_FAMILIES,
  SENIORITIES,
  type LookingFor,
  type LookingForChoice,
  type OccupationOption,
  type PlaceChoice,
} from "@/lib/job-feed/types";
import { OccupationSearch } from "./occupation-search";

export type LookingForCardProps = {
  value: LookingFor;
  occupation: OccupationOption | null;
  choice: LookingForChoice;
  country: string;
  saving: boolean;
  onChange: (next: LookingForChoice) => void;
  tone?: "card" | "plain" | "inset";
  note?: string;
  // The jobsShared words; the setup card and /account read the English ones until they're translated.
  words?: JobsSharedWords;
  regionName?: RegionName;
};

// Each language in its own words, as language pickers usually show them.
const LANGUAGE_NAMES: Record<ContentLang, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
};

const TRIGGER =
  "inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-medium text-ink underline decoration-ink/30 decoration-dotted underline-offset-4 transition-colors hover:bg-ink/5 pointer-coarse:py-1.5";

// Inside the Jobs summary card each part is a quiet key, so the line reads as the search it is.
const CHIP =
  "inline-flex min-h-8 max-w-full items-center gap-1 rounded-lg bg-surface-muted px-2.5 py-1 text-left font-medium text-ink transition-colors hover:bg-surface-strong aria-expanded:bg-surface-strong pointer-coarse:min-h-10 [&>svg]:shrink-0";

const COMMON_PLACES: readonly PlaceChoice[] = [
  "c:US",
  "c:CA",
  "c:GB",
  ...PLACE_GROUPS.map((group) => `g:${group}` as const),
];

export function LookingForCard({
  value,
  occupation,
  choice,
  country,
  saving,
  onChange,
  tone = "card",
  words = ENGLISH_JOBS_SHARED,
  regionName,
  note: footnote = words.card.note,
}: LookingForCardProps) {
  const [searching, setSearching] = useState(false);
  const { card } = words;
  const levelItems: MenuEntry[] = [
    ...SENIORITIES.map((level) => ({
      label: words.levels[level],
      checked: value.level === level,
      onSelect: () => onChange({ ...choice, level }),
    })),
    ...(choice.level === null
      ? []
      : [
          "separator" as const,
          {
            label: card.backToLevel,
            onSelect: () => onChange({ ...choice, level: null }),
          },
        ]),
  ];

  // Only jobs from the list and the kinds of work: a resume's titles can be anything, like a program or a site.
  const roleItems: MenuEntry[] = [
    {
      label: card.otherJob,
      description: card.otherJobHint,
      onSelect: () => setSearching(true),
    },
    "separator" as const,
    ...ROLE_FAMILIES.map((family) => ({
      label: fmt(words.anyFamilyRole, { family: familyWords(family, words) }),
      checked: value.title === "" && value.family === family,
      onSelect: () => onChange({ ...choice, role: { title: "", family, occupation: null } }),
    })),
    ...(choice.role === null
      ? []
      : [
          "separator" as const,
          {
            label: card.backToRole,
            onSelect: () => onChange({ ...choice, role: null }),
          },
        ]),
  ];

  const trigger = tone === "inset" ? CHIP : TRIGGER;
  const role = roleName(value, occupation?.name ?? null, choice.role !== null, words);
  const place = placeLine(value, words, regionName);

  const own: PlaceChoice | null =
    country && !COMMON_PLACES.includes(`c:${country}`) ? `c:${country}` : null;
  const places: PlaceChoice[] = [
    "anywhere",
    ...(own ? [own] : []),
    ...COMMON_PLACES,
    ...(value.place !== "anywhere" && value.place !== own && !COMMON_PLACES.includes(value.place)
      ? [value.place]
      : []),
  ];
  const placeItems: MenuEntry[] = [
    {
      label: card.remoteOnly,
      checked: value.remote,
      onSelect: () => onChange({ ...choice, remote: true }),
    },
    {
      label: card.remoteOrOnsite,
      checked: !value.remote,
      onSelect: () => onChange({ ...choice, remote: false }),
    },
    "separator",
    ...places.map((option) => ({
      label: option === "anywhere" ? card.anywhere : placeLabel(option, words, regionName),
      checked: value.place === option,
      onSelect: () => onChange({ ...choice, place: option }),
    })),
    ...(choice.place === null
      ? []
      : [
          "separator" as const,
          {
            label: card.backToPlace,
            onSelect: () => onChange({ ...choice, place: null }),
          },
        ]),
  ];

  // Hidden until the app's language setting ships (job-langs.ts); a saved choice still applies.
  const langs = choice.langs ?? null;
  const langItems: MenuEntry[] = [
    ...CONTENT_LANGS.map((lang) => {
      const on = langs?.includes(lang) ?? false;
      const next = on ? (langs ?? []).filter((item) => item !== lang) : [...(langs ?? []), lang];
      return {
        label: LANGUAGE_NAMES[lang],
        checked: on,
        onSelect: () => {
          if (next.length > 0) onChange({ ...choice, langs: next });
        },
      };
    }),
    ...(langs === null
      ? []
      : [
          "separator" as const,
          { label: card.backToLangs, onSelect: () => onChange({ ...choice, langs: null }) },
        ]),
  ];
  const langLine = (langs ?? []).map((lang) => LANGUAGE_NAMES[lang]).join(", ");

  return (
    <section
      aria-label={card.label}
      aria-busy={saving}
      className={
        tone === "card"
          ? "flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3 sm:px-6"
          : tone === "inset"
            ? "flex flex-col gap-2"
            : "flex flex-col gap-1"
      }
    >
      {/* A div, not a p: each Menu renders its popover panel as a div, which a p can't hold. */}
      <div
        className={
          tone === "inset"
            ? "flex flex-wrap items-center gap-1.5 text-sm/5 text-muted"
            : "flex flex-wrap items-center gap-x-1 gap-y-1 text-sm/6 text-muted"
        }
      >
        <span className={tone === "inset" ? "mr-1" : undefined}>{card.lookingFor}</span>
        <Menu
          label={card.level}
          triggerLabel={fmt(card.levelTrigger, {
            level: value.level ? words.levels[value.level] : card.anyLevelWord,
          })}
          triggerClassName={trigger}
          trigger={
            <>
              {value.level ? words.levels[value.level] : card.anyLevel}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={levelItems}
        />
        <Menu
          label={card.role}
          triggerLabel={fmt(card.roleTrigger, { role })}
          triggerClassName={trigger}
          trigger={
            <>
              <span>{role}</span>
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={roleItems}
        />
        {tone === "inset" ? null : <span aria-hidden>·</span>}
        <Menu
          label={card.place}
          triggerLabel={fmt(card.placeTrigger, { place })}
          triggerClassName={trigger}
          trigger={
            <>
              {place}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={placeItems}
        />
        {JOB_LANGUAGES_LIVE ? (
          <Menu
            label={card.langs}
            triggerLabel={fmt(card.langsTrigger, { langs: langLine || card.langs })}
            triggerClassName={trigger}
            trigger={
              <>
                {langLine || card.langs}
                <ChevronDown aria-hidden className="size-3.5 text-subtle" />
              </>
            }
            items={langItems}
          />
        ) : null}
      </div>
      <p className="text-xs/5 text-subtle">
        {footnote}
        {` ${card.credit}`}
      </p>
      <OccupationSearch
        open={searching}
        onOpenChange={setSearching}
        words={words}
        onPick={(picked) =>
          onChange({
            ...choice,
            role: {
              title: picked.name.slice(0, LOOKING_FOR_LIMITS.titleChars),
              family: familyOfOccupation(picked.code),
              occupation: picked.code,
            },
          })
        }
      />
    </section>
  );
}
