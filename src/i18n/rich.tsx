import { Fragment, type ReactNode } from "react";
import { fmt } from "./format";
import type { MessageValue } from "./types";

export const RICH_TAGS = ["b", "link"] as const;
export type RichTag = (typeof RICH_TAGS)[number];
export type RichTags = Partial<Record<RichTag, (chunk: string) => ReactNode>>;

const TAG = /<(b|link)>([\s\S]*?)<\/\1>/g;

const fill = (text: string, values: Record<string, MessageValue> | undefined) =>
  values ? fmt(text, values) : text;

const bold = (chunk: string) => <strong>{chunk}</strong>;

// Turns <b>…</b> and <link>…</link> into elements; tags are read before {values} go in, so a value can never add one.
export function rich(
  template: string,
  tags: RichTags = {},
  values?: Record<string, MessageValue>,
): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of template.matchAll(TAG)) {
    const [whole, name, inner = ""] = match;
    if (match.index > last) parts.push(fill(template.slice(last, match.index), values));
    const render = tags[name as RichTag] ?? (name === "b" ? bold : (chunk: string) => chunk);
    parts.push(<Fragment key={match.index}>{render(fill(inner, values))}</Fragment>);
    last = match.index + whole.length;
  }
  if (last === 0) return fill(template, values);
  if (last < template.length) parts.push(fill(template.slice(last), values));
  return parts;
}

export function tagsOf(template: string): string[] {
  return [...template.matchAll(/<\/?([a-z]+)>/g)].map(([tag]) => tag);
}
