import { decodeEntities } from "@/lib/jobs/html";
import type { Page, PageNode } from "../page/dom";

// Tests only: enough of an HTML parser and of CSS selectors to run the readers on saved pages.

const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);
const RAW = new Set(["script", "style", "textarea", "title", "noscript", "template", "xmp"]);

type Text = { kind: "text"; value: string };

class MiniElement implements PageNode {
  readonly kids: (MiniElement | Text)[] = [];
  innerStart = 0;
  innerEnd = 0;

  constructor(
    readonly source: string,
    readonly tag: string,
    readonly attrs: ReadonlyMap<string, string>,
    readonly parent: MiniElement | null,
  ) {}

  get tagName(): string {
    return this.tag.toUpperCase();
  }

  get parentElement(): MiniElement | null {
    return this.parent && this.parent.tag !== "#document" ? this.parent : null;
  }

  get children(): MiniElement[] {
    return this.kids.filter((kid): kid is MiniElement => kid instanceof MiniElement);
  }

  get textContent(): string {
    return this.kids
      .map((kid) => (kid instanceof MiniElement ? kid.textContent : kid.value))
      .join("");
  }

  get innerHTML(): string {
    return this.source.slice(this.innerStart, this.innerEnd);
  }

  getAttribute(name: string): string | null {
    return this.attrs.get(name.toLowerCase()) ?? null;
  }

  descendants(): MiniElement[] {
    const out: MiniElement[] = [];
    const walk = (node: MiniElement) => {
      for (const kid of node.children) {
        out.push(kid);
        walk(kid);
      }
    };
    walk(this);
    return out;
  }

  querySelectorAll(selectors: string): MiniElement[] {
    const lists = parseSelectors(selectors);
    return this.descendants().filter((node) => lists.some((chain) => matchesChain(node, chain)));
  }

  querySelector(selectors: string): MiniElement | null {
    return this.querySelectorAll(selectors)[0] ?? null;
  }
}

function readAttrs(raw: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const pattern = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  for (const match of raw.matchAll(pattern)) {
    const name = match[1]!.toLowerCase();
    if (!attrs.has(name)) attrs.set(name, decodeEntities(match[2] ?? match[3] ?? match[4] ?? ""));
  }
  return attrs;
}

function tagEnd(html: string, from: number): number {
  let quote = "";
  for (let i = from; i < html.length; i++) {
    const char = html[i]!;
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === ">") return i;
  }
  return html.length;
}

function parse(html: string): MiniElement {
  const root = new MiniElement(html, "#document", new Map(), null);
  root.innerStart = 0;
  root.innerEnd = html.length;
  let current = root;
  const lower = html.toLowerCase();
  let i = 0;
  const text = (value: string) => {
    if (value) current.kids.push({ kind: "text", value: decodeEntities(value) });
  };
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      text(html.slice(i));
      break;
    }
    text(html.slice(i, lt));
    if (html.startsWith("<!--", lt)) {
      const end = html.indexOf("-->", lt + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[lt + 1] === "!" || html[lt + 1] === "?") {
      const end = html.indexOf(">", lt);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    const closing = html[lt + 1] === "/";
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9:-]*/.exec(html.slice(lt + (closing ? 2 : 1), lt + 64));
    if (!nameMatch) {
      text("<");
      i = lt + 1;
      continue;
    }
    const name = nameMatch[0].toLowerCase();
    const end = tagEnd(html, lt + (closing ? 2 : 1) + name.length);
    if (closing) {
      let node: MiniElement | null = current;
      while (node && node.tag !== name) node = node.parent;
      if (node && node !== root) {
        let open: MiniElement | null = current;
        while (open && open !== node) {
          open.innerEnd = lt;
          open = open.parent;
        }
        node.innerEnd = lt;
        current = node.parent ?? root;
      }
      i = end + 1;
      continue;
    }
    const raw = html.slice(lt + 1 + name.length, end);
    const element = new MiniElement(html, name, readAttrs(raw.replace(/\/\s*$/, "")), current);
    current.kids.push(element);
    element.innerStart = end + 1;
    i = end + 1;
    if (VOID.has(name) || /\/\s*$/.test(raw)) {
      element.innerEnd = element.innerStart;
      continue;
    }
    if (RAW.has(name)) {
      const close = lower.indexOf(`</${name}`, i);
      const stop = close === -1 ? html.length : close;
      element.kids.push({ kind: "text", value: html.slice(i, stop) });
      element.innerEnd = stop;
      const gt = close === -1 ? -1 : html.indexOf(">", close);
      i = gt === -1 ? html.length : gt + 1;
      continue;
    }
    current = element;
  }
  for (let node: MiniElement | null = current; node && node !== root; node = node.parent) {
    node.innerEnd = html.length;
  }
  return root;
}

type AttrTest = { name: string; op: "" | "=" | "*=" | "^=" | "$=" | "~="; value: string };
type Compound = { tag: string | null; id: string | null; classes: string[]; attrs: AttrTest[] };
type Step = { compound: Compound; combinator: " " | ">" };

function parseCompound(text: string): Compound {
  const compound: Compound = { tag: null, id: null, classes: [], attrs: [] };
  const pattern =
    /^([a-zA-Z][a-zA-Z0-9-]*|\*)|#([\w-]+)|\.([\w-]+)|\[\s*([\w:-]+)\s*(?:([*^$~]?=)\s*(?:"([^"]*)"|'([^']*)'|([^\]\s]+)))?\s*\]/g;
  let consumed = 0;
  for (const match of text.matchAll(pattern)) {
    consumed += match[0].length;
    if (match[1]) compound.tag = match[1] === "*" ? null : match[1].toLowerCase();
    else if (match[2]) compound.id = match[2];
    else if (match[3]) compound.classes.push(match[3]);
    else if (match[4]) {
      compound.attrs.push({
        name: match[4].toLowerCase(),
        op: (match[5] ?? "") as AttrTest["op"],
        value: match[6] ?? match[7] ?? match[8] ?? "",
      });
    }
  }
  if (consumed !== text.length) throw new Error(`mini-dom: unsupported selector "${text}"`);
  return compound;
}

function parseSelectors(selectors: string): Step[][] {
  return selectors.split(",").map((one) => {
    const steps: Step[] = [];
    const parts = one
      .trim()
      .replace(/\s*>\s*/g, " > ")
      .split(/\s+/);
    let combinator: Step["combinator"] = " ";
    for (const part of parts) {
      if (part === ">") {
        combinator = ">";
        continue;
      }
      steps.push({ compound: parseCompound(part), combinator });
      combinator = " ";
    }
    return steps;
  });
}

function attrMatches(node: MiniElement, test: AttrTest): boolean {
  const value = node.getAttribute(test.name);
  if (value === null) return false;
  switch (test.op) {
    case "":
      return true;
    case "=":
      return value === test.value;
    case "*=":
      return value.includes(test.value);
    case "^=":
      return value.startsWith(test.value);
    case "$=":
      return value.endsWith(test.value);
    case "~=":
      return value.split(/\s+/).includes(test.value);
  }
}

function matchesCompound(node: MiniElement, compound: Compound): boolean {
  if (compound.tag && node.tag !== compound.tag) return false;
  if (compound.id && node.getAttribute("id") !== compound.id) return false;
  const classes = (node.getAttribute("class") ?? "").split(/\s+/);
  if (!compound.classes.every((name) => classes.includes(name))) return false;
  return compound.attrs.every((test) => attrMatches(node, test));
}

function matchesChain(node: MiniElement, chain: Step[]): boolean {
  const match = (at: MiniElement | null, index: number): boolean => {
    const step = chain[index]!;
    if (!at || !matchesCompound(at, step.compound)) return false;
    if (index === 0) return true;
    if (step.combinator === ">") return match(at.parent, index - 1);
    for (let up = at.parent; up; up = up.parent) {
      if (up.tag !== "#document" && match(up, index - 1)) return true;
    }
    return false;
  };
  return match(node, chain.length - 1);
}

export function pageFromHtml(html: string, url: string): Page {
  const root = parse(html);
  const title = (root.querySelector("title")?.textContent ?? "").replace(/\s+/g, " ").trim();
  return { root, url, title };
}
