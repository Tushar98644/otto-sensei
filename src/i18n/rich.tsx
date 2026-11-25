import { Fragment, type ReactNode } from "react";
import { fmt } from "./format";
import type { MessageValue } from "./types";

export const RICH_TAGS = ["b", "link"] as const;
export type RichTag = (typeof RICH_TAGS)[number];
// index counts that tag within the message, so a message with two links can send each one somewhere.
export type RichTags = Partial<Record<RichTag, (chunk: string, index: number) => ReactNode>>;

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
  const seen: Partial<Record<RichTag, number>> = {};
  let last = 0;
  for (const match of template.matchAll(TAG)) {
    const [whole, tag, inner = ""] = match;
    const name = tag as RichTag;
    const index = seen[name] ?? 0;
    seen[name] = index + 1;
    if (match.index > last) parts.push(fill(template.slice(last, match.index), values));
    const render = tags[name] ?? (name === "b" ? bold : (chunk: string) => chunk);
    parts.push(<Fragment key={match.index}>{render(fill(inner, values), index)}</Fragment>);
    last = match.index + whole.length;
  }
  if (last === 0) return fill(template, values);
  if (last < template.length) parts.push(fill(template.slice(last), values));
  return parts;
}

export function tagsOf(template: string): string[] {
  return [...template.matchAll(/<\/?([a-z]+)>/g)].map(([tag]) => tag);
}
