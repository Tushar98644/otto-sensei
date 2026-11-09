// Each template ships its own stylesheet, ported from its reference site, inside a <style> the
// template renders. Every selector is prefixed with the template's root class here, so a template
// can't touch the app or another template; `:scope` stands for the root itself. The sheets are
// constants written in this folder, never user text.
//
// Inline sheets rather than CSS modules: /p/<slug> then carries only the chosen template's CSS,
// and the same markup renders unchanged in tests and the static screenshot script.

function splitSelectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < list.length; i += 1) {
    const char = list[i];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(list.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(list.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function scopeSelector(root: string, selector: string): string {
  return selector.includes(":scope") ? selector.replaceAll(":scope", root) : `${root} ${selector}`;
}

// @keyframes steps ("from", "50%") are not selectors; they're set aside while the rest is scoped.
// Keyframe names stay global, so each template prefixes its own ("navy-fadeup").
const KEYFRAMES = /@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}/g;

/**
 * Prefixes every rule's selectors with `root`. At-rules (@container, @media, @supports, @page)
 * are left as they are and the rules inside them are scoped; @keyframes pass through untouched.
 */
export function scopeCss(root: string, css: string): string {
  const kept: string[] = [];
  const flat = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(KEYFRAMES, (block) => `@kept${kept.push(block) - 1};`);
  return flat
    .replace(
      /(^|[{};])(\s*)([^{}@;]+?)(\s*)\{/g,
      (_match, before: string, space: string, list: string) => {
        const scoped = splitSelectors(list).map((selector) => scopeSelector(root, selector));
        return `${before}${space}${scoped.join(", ")} {`;
      },
    )
    .replace(/@kept(\d+);/g, (_match, index: string) => kept[Number(index)] ?? "")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

// What every template starts from: its own box, the container its narrow layouts answer to (so the
// editor's preview column gets the phone layout, like a phone does), and a reset of the app's base
// styles (the serif h1/h2, balanced headings, list padding) back to plain HTML defaults.
export const BASE_CSS = `
:scope { container: pf / inline-size; display: flow-root; flex: 1 0 auto; overflow-wrap: anywhere; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
:scope :where(*, *::before, *::after) { box-sizing: border-box; }
:scope :where(h1, h2, h3, h4, h5, h6, p, ul, ol, dl, dt, dd, figure) { margin: 0; padding: 0; font-family: inherit; font-size: inherit; font-weight: inherit; line-height: inherit; text-wrap: wrap; }
:scope :where(ul, ol) { list-style: none; }
:scope :where(img) { display: block; max-width: 100%; }
:scope :where(button) { font: inherit; }
:scope :where(a, button):focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
:scope .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
:scope .credit { display: flex; justify-content: center; padding: 8px 20px 40px; font-size: 14px; line-height: 20px; }
:scope .credit a { display: inline-flex; align-items: center; gap: 8px; color: inherit; text-decoration: none; border: 0; opacity: 0.85; }
:scope .credit a:hover { opacity: 1; }
:scope .credit .brand { text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; }
@media print { :scope .credit { display: none; } }
:scope .design-credit { margin: 0; font-size: 12px; line-height: 18px; text-align: center; opacity: 0.75; }
:scope .design-credit a { color: inherit; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px; }
`;

export function templateCss(root: string, css: string): string {
  return scopeCss(root, `${BASE_CSS}\n${css}`);
}
