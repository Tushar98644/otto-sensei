import { isValidElement, type ReactNode } from "react";

// The words a node shows, read from its children, so structured data can quote copy written as JSX.
export function nodeText(node: ReactNode): string {
  return collect(node).replace(/\s+/g, " ").trim();
}

function collect(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number" || typeof node === "bigint") return String(node);
  if (Array.isArray(node)) return node.map(collect).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return collect(node.props.children);
  return "";
}
