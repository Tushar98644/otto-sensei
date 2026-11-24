"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import {
  familyWords,
  LEVEL_NAMES,
  placeLabel,
  placeLine,
  roleName,
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
};

const DEFAULT_NOTE =
  "Guessed from your resume and work profile. Matches are ordered for it; tap a part to change it.";

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
  note: footnote = DEFAULT_NOTE,
}: LookingForCardProps) {
  const [searching, setSearching] = useState(false);
  const levelItems: MenuEntry[] = [
    ...SENIORITIES.map((level) => ({
      label: LEVEL_NAMES[level],
      checked: value.level === level,
      onSelect: () => onChange({ ...choice, level }),
    })),
    ...(choice.level === null
      ? []
      : [
          "separator" as const,
          {
            label: "Go back to my resume's level",
            onSelect: () => onChange({ ...choice, level: null }),
          },
        ]),
  ];

  // Only jobs from the list and the kinds of work: a resume's titles can be anything, like a program or a site.
  const roleItems: MenuEntry[] = [
    {
      label: "Any other job…",
      description: "Search every kind of work by name",
      onSelect: () => setSearching(true),
    },
    "separator" as const,
    ...ROLE_FAMILIES.map((family) => ({
      label: `Any ${familyWords(family)} role`,
      checked: value.title === "" && value.family === family,
      onSelect: () => onChange({ ...choice, role: { title: "", family, occupation: null } }),
    })),
    ...(choice.role === null
      ? []
      : [
          "separator" as const,
          {
            label: "Go back to my resume's role",
            onSelect: () => onChange({ ...choice, role: null }),
          },
        ]),
  ];

  const trigger = tone === "inset" ? CHIP : TRIGGER;
  const role = roleName(value, occupation?.name ?? null, choice.role !== null);

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
      label: "Remote only",
      checked: value.remote,
      onSelect: () => onChange({ ...choice, remote: true }),
    },
    {
      label: "Remote or on-site",
      checked: !value.remote,
      onSelect: () => onChange({ ...choice, remote: false }),
    },
    "separator",
    ...places.map((place) => ({
      label: place === "anywhere" ? "Anywhere" : placeLabel(place),
      checked: value.place === place,
      onSelect: () => onChange({ ...choice, place }),
    })),
    ...(choice.place === null
      ? []
      : [
          "separator" as const,
          {
            label: "Go back to my work profile's country",
            onSelect: () => onChange({ ...choice, place: null }),
          },
        ]),
  ];

  return (
    <section
      aria-label="What you're looking for"
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
        <span className={tone === "inset" ? "mr-1" : undefined}>Looking for:</span>
        <Menu
          label="Level"
          triggerLabel={`Level: ${value.level ? LEVEL_NAMES[value.level] : "any"}. Change it`}
          triggerClassName={trigger}
          trigger={
            <>
              {value.level ? LEVEL_NAMES[value.level] : "Any level"}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={levelItems}
        />
        <Menu
          label="Role"
          triggerLabel={`Role: ${role}. Change it`}
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
          label="Place"
          triggerLabel={`Place: ${placeLine(value)}. Change it`}
          triggerClassName={trigger}
          trigger={
            <>
              {placeLine(value)}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={placeItems}
        />
      </div>
      <p className="text-xs/5 text-subtle">{footnote} Job names from O*NET® and ESCO.</p>
      <OccupationSearch
        open={searching}
        onOpenChange={setSearching}
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
