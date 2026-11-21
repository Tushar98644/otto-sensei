import { cn } from "@/lib/utils";

const count = new Intl.NumberFormat("en-US");

export function TextHint({ text, length, max }: { text: string; length: number; max: number }) {
  return (
    <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <span>{text}</span>
      <span className={cn("tabular-nums", length > max && "font-medium text-fail-ink")}>
        {count.format(length)} / {count.format(max)}
      </span>
    </span>
  );
}
