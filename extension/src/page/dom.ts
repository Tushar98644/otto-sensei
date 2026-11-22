import { htmlToText } from "@/lib/jobs/html";

// The part of the DOM the readers use: a real Document in Chrome, the mini DOM in tests.
export interface PageNode {
  readonly tagName: string;
  readonly textContent: string | null;
  readonly innerHTML: string;
  readonly children: ArrayLike<PageNode>;
  readonly parentElement: PageNode | null;
  getAttribute(name: string): string | null;
  querySelector(selectors: string): PageNode | null;
  querySelectorAll(selectors: string): ArrayLike<PageNode>;
}

export type Page = { root: PageNode; url: string; title: string };

export function oneLine(value: string | null | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function all(root: PageNode, selectors: string): PageNode[] {
  return Array.from(root.querySelectorAll(selectors));
}

// The first selector that finds an element with text wins.
export function firstText(root: PageNode, selectors: readonly string[]): string {
  for (const selector of selectors) {
    for (const node of all(root, selector)) {
      const text = oneLine(node.textContent);
      if (text) return text;
    }
  }
  return "";
}

export function blockText(node: PageNode): string {
  return htmlToText(node.innerHTML);
}

export function firstBlock(root: PageNode, selectors: readonly string[], min = 40): string {
  for (const selector of selectors) {
    for (const node of all(root, selector)) {
      const text = blockText(node);
      if (text.length >= min) return text;
    }
  }
  return "";
}

export function firstScope(root: PageNode, selectors: readonly string[]): PageNode {
  for (const selector of selectors) {
    const node = root.querySelector(selector);
    if (node) return node;
  }
  return root;
}

export function attribute(root: PageNode, selector: string, name: string): string {
  return oneLine(root.querySelector(selector)?.getAttribute(name));
}
