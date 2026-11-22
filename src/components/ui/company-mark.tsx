import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CompanyTint = { name: string; bg: string; ink: string };

// Soft, earthy tints beside mist, forest and otter; never violet or the status colours, so a mark never reads as a status.
export const COMPANY_TINTS: readonly CompanyTint[] = [
  { name: "sage", bg: "#e2eee6", ink: "#24543f" },
  { name: "sand", bg: "#f4ead9", ink: "#6f4b25" },
  { name: "harbor", bg: "#e2e9f2", ink: "#2e4866" },
  { name: "clay", bg: "#f5e4dc", ink: "#853f27" },
  { name: "lichen", bg: "#eaecd8", ink: "#4f5520" },
  { name: "heather", bg: "#eee4ec", ink: "#66395a" },
  { name: "tide", bg: "#dcecec", ink: "#1d5658" },
  { name: "pebble", bg: "#ebe8e2", ink: "#4c463c" },
];

export type CompanyMarkSize = "sm" | "md" | "lg";

const SIZES: Record<CompanyMarkSize, string> = {
  sm: "size-7 rounded-md text-base",
  md: "size-9 rounded-[10px] text-xl",
  lg: "size-12 rounded-xl text-[1.75rem]",
};

const ICON_SIZES: Record<CompanyMarkSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

const LEGAL = /\b(inc|llc|ltd|limited|corp|corporation|gmbh|plc|pvt|pte)\b/g;

export function companyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(LEGAL, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function companyTint(name: string): CompanyTint {
  let hash = 0x811c9dc5;
  for (const char of companyKey(name)) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return COMPANY_TINTS[(hash >>> 0) % COMPANY_TINTS.length]!;
}

export function companyInitial(name: string): string {
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? [];
  const word = words.length > 1 && words[0]!.toLowerCase() === "the" ? words[1]! : words[0];
  return word ? Array.from(word)[0]!.toLocaleUpperCase() : "";
}

export function CompanyMark({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: CompanyMarkSize;
  className?: string;
}) {
  const initial = companyInitial(name);
  const base = cn(
    "inline-flex shrink-0 select-none items-center justify-center leading-none inset-ring inset-ring-ink/6 shadow-[inset_0_1px_0_rgb(255_255_255/0.65)]",
    SIZES[size],
    className,
  );
  if (!initial) {
    return (
      <span aria-hidden className={cn(base, "bg-surface-muted text-muted")}>
        <Building2 className={ICON_SIZES[size]} />
      </span>
    );
  }
  const tint = companyTint(name);
  return (
    <span
      aria-hidden
      data-tint={tint.name}
      className={cn(base, "font-display font-semibold")}
      style={{ backgroundColor: tint.bg, color: tint.ink }}
    >
      {initial}
    </span>
  );
}
