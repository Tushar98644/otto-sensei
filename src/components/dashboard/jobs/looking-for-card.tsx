"use client";

import { ChevronDown } from "lucide-react";
import { Menu, type MenuEntry } from "@/components/ui/menu";
import { LEVEL_NAMES, placeLabel, placeLine, type RoleOption } from "@/lib/job-feed/looking-for";
import {
  PLACE_GROUPS,
  ROLE_FAMILIES,
  ROLE_LABELS,
  SENIORITIES,
  type LookingFor,
  type LookingForChoice,
  type PlaceChoice,
} from "@/lib/job-feed/types";

export type LookingForCardProps = {
  value: LookingFor;
  choice: LookingForChoice;
  // The roles the resume names, newest first.
  roles: readonly RoleOption[];
  // The work profile's country, offered as a place when it isn't one of the usual ones.
  country: string;
  saving: boolean;
  onChange: (next: LookingForChoice) => void;
};

const TRIGGER =
  "inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-medium text-ink underline decoration-ink/30 decoration-dotted underline-offset-4 transition-colors hover:bg-ink/5 pointer-coarse:py-1.5";

const COMMON_PLACES: readonly PlaceChoice[] = [
  "c:US",
  "c:CA",
  "c:GB",
  ...PLACE_GROUPS.map((group) => `g:${group}` as const),
];

function roleName(value: Pick<LookingFor, "title" | "family">): string {
  if (value.title) return value.title;
  return value.family ? `Any ${ROLE_LABELS[value.family].toLowerCase()} role` : "Any role";
}

// "Looking for: Senior · Product Manager · Remote, EU", each part a one-tap menu. Guessed from the
// resume and the work profile; what's changed is kept for the account and ranks Matches.
export function LookingForCard({
  value,
  choice,
  roles,
  country,
  saving,
  onChange,
}: LookingForCardProps) {
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

  const roleItems: MenuEntry[] = [
    ...roles.map((role) => ({
      label: role.title,
      description: role.family ? ROLE_LABELS[role.family] : undefined,
      checked: value.title.toLowerCase() === role.title.toLowerCase(),
      onSelect: () => onChange({ ...choice, role }),
    })),
    ...(roles.length > 0 ? ["separator" as const] : []),
    ...ROLE_FAMILIES.map((family) => ({
      label: `Any ${ROLE_LABELS[family].toLowerCase()} role`,
      checked: value.title === "" && value.family === family,
      onSelect: () => onChange({ ...choice, role: { title: "", family } }),
    })),
    ...(choice.role === null
      ? []
      : [
          "separator" as const,
          {
            label: "Go back to my latest job title",
            onSelect: () => onChange({ ...choice, role: null }),
          },
        ]),
  ];

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
      className="flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3 sm:px-6"
    >
      {/* A div, not a p: each Menu renders its popover panel as a div, which a p can't hold. */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-sm/6 text-muted">
        <span>Looking for:</span>
        <Menu
          label="Level"
          triggerLabel={`Level: ${value.level ? LEVEL_NAMES[value.level] : "any"}. Change it`}
          triggerClassName={TRIGGER}
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
          triggerLabel={`Role: ${roleName(value)}. Change it`}
          triggerClassName={TRIGGER}
          trigger={
            <>
              {roleName(value)}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={roleItems}
        />
        <span aria-hidden>·</span>
        <Menu
          label="Place"
          triggerLabel={`Place: ${placeLine(value)}. Change it`}
          triggerClassName={TRIGGER}
          trigger={
            <>
              {placeLine(value)}
              <ChevronDown aria-hidden className="size-3.5 text-subtle" />
            </>
          }
          items={placeItems}
        />
      </div>
      <p className="text-xs/5 text-subtle">
        Guessed from your resume and work profile. Matches are ordered for it; tap a part to change
        it.
      </p>
    </section>
  );
}
