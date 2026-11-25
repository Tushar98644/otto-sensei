import { formatFor, type Format } from "@/i18n/intl";
import { cn } from "@/lib/utils";

export function TextHint({
  text,
  length,
  max,
  format = formatFor("en"),
}: {
  text: string;
  length: number;
  max: number;
  format?: Format;
}) {
  return (
    <span className="flex flex-wrap justify-between gap-x-4 gap-y-1">
      <span>{text}</span>
      <span className={cn("tabular-nums", length > max && "font-medium text-fail-ink")}>
        {format.number(length)} / {format.number(max)}
      </span>
    </span>
  );
}
