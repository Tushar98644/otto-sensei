import { templateCss } from "../css";

// Ported from alanagoyal/alanagoyal's Notes app (MIT, see ./LICENSE.txt): its shadcn tokens and github-markdown overrides.
const DARK = `
  --background: hsl(0 0% 10%);
  --foreground: hsl(0 0% 98%);
  --muted: hsl(0 0% 14.9%);
  --muted-foreground: hsl(0 0% 63.9%);
  --border: hsl(0 0% 14.9%);
  --selected: #9d7d28;
  --selected-ink: #fff;
  --search: #353533;
  --search-line: transparent;
  --grouped: #000;
  --code: #30363d;
  color-scheme: dark;
`;

const css = `
:scope {
  --background: hsl(0 0% 100%);
  --foreground: hsl(0 0% 20%);
  --muted: hsl(0 0% 96.1%);
  --muted-foreground: hsl(0 0% 45.1%);
  --border: hsl(0 0% 89.8%);
  --rule: color-mix(in srgb, var(--muted-foreground) 20%, transparent);
  --selected: #ffe390;
  --selected-ink: inherit;
  --link: #e2a727;
  --search: var(--background);
  --search-line: var(--rule);
  --grouped: #f2f2f7;
  --code: #f6f8fa;
  color-scheme: light;
  display: flex;
  flex-direction: column;
  height: var(--pf-screen, 100dvh);
  min-height: 0;
  overflow: hidden;
  background: var(--background);
  color: var(--foreground);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", var(--pf-font-inter, "Inter"), system-ui, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
}
@media (prefers-color-scheme: dark) {
  :scope { ${DARK} }
}
::selection { background: var(--selected); color: inherit; }
a { color: var(--link); text-decoration: underline; text-underline-offset: 2px; }
button { padding: 0; border: 0; background: none; color: inherit; cursor: pointer; }

.app { position: relative; display: flex; flex: 1; min-height: 0; }

/* sidebar */
.sidebar { display: flex; flex-direction: column; width: 100%; min-width: 0; background: var(--grouped); }
.side-nav { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; background: inherit; user-select: none; }
.lights { display: flex; align-items: center; gap: 0.375rem; padding: 0.5rem; }
.light { width: 0.75rem; height: 0.75rem; border-radius: 9999px; }
.light.red { background: #ef4444; }
.light.yellow { background: #eab308; }
.light.green { background: #22c55e; }
.side-tools { display: flex; align-items: center; gap: 0.125rem; color: var(--muted-foreground); }
.side-tools svg { width: 2rem; height: 2rem; padding: 0.375rem; stroke-width: 2.25; }
.side-tools svg + svg { padding: 0.45rem; stroke-width: 1.8; }
.side-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 0 0.5rem; overscroll-behavior: contain; }
.search { position: relative; padding: 0.5rem; }
.search-icon { position: absolute; top: 50%; left: 1.25rem; width: 1rem; height: 1rem; color: var(--muted-foreground); transform: translateY(-50%); pointer-events: none; }
.search input { width: 100%; padding: 0.125rem 2rem; border: 1px solid var(--search-line); border-radius: 0.5rem; background: var(--search); color: var(--foreground); font: inherit; font-size: 1rem; line-height: 1.5rem; outline: none; appearance: none; }
.search input::placeholder { color: var(--muted-foreground); font-size: 0.875rem; }
.search input::-webkit-search-cancel-button { display: none; }
.search-clear { position: absolute; top: 50%; right: 1rem; display: flex; color: var(--muted-foreground); transform: translateY(-50%); }
.search-clear svg { width: 1rem; height: 1rem; }
.list { padding: 0.5rem 0; }
.group { margin-left: 0.5rem; padding: 0.25rem 0; font-size: 0.75rem; line-height: 1rem; font-weight: 700; color: var(--muted-foreground); }
.item { height: 70px; }
.item button { display: flex; flex-direction: column; justify-content: center; width: 100%; height: 100%; padding: 0.5rem 1rem; text-align: left; border-radius: 0.375rem; }
.item[data-divider]::after { content: ""; display: block; margin: 0 1.5rem; border-top: 1px solid var(--rule); }
.item-title { display: -webkit-box; overflow: hidden; padding: 0 0.5rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 700; overflow-wrap: anywhere; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
.item-sub { display: flex; align-items: baseline; overflow: hidden; padding-left: 0.5rem; font-size: 0.75rem; line-height: 1rem; color: var(--muted-foreground); }
.item-date { flex-shrink: 0; margin-right: 0.25rem; color: var(--foreground); font-variant-numeric: tabular-nums; white-space: nowrap; }
.item-preview { flex: 1; width: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { margin-top: 1rem; padding: 0 0.5rem; font-size: 0.875rem; color: var(--muted-foreground); }

/* note */
.pane { display: none; flex: 1; min-width: 0; overflow-y: auto; padding: 0.75rem; background: var(--background); overscroll-behavior: contain; }
.app[data-open="true"] .sidebar { display: none; }
.app[data-open="true"] .pane { display: block; }
.back { display: flex; align-items: center; padding-top: 0.5rem; color: var(--link); font-size: 1rem; }
.back svg { width: 1.5rem; height: 1.5rem; stroke-width: 2.25; }
.back span { margin-left: 0.125rem; }
.note { padding: 0 0.5rem 2rem; }
.stamp { display: flex; justify-content: center; min-height: 1.5rem; align-items: center; margin-bottom: 0; font-size: 0.75rem; color: var(--muted-foreground); }
.note-title { display: flex; align-items: center; min-height: 50px; margin: 0 0 1rem; padding: 0.5rem 0; font-size: 1.5rem; line-height: 1.5; font-weight: 700; overflow-wrap: anywhere; }
.note-emoji { margin-right: 0.5rem; }

/* markdown-body */
.body { max-width: 980px; font-size: 1rem; line-height: 1.5; }
.body p { margin: 0 0 16px; }
.body .meta { margin-top: -8px; color: var(--muted-foreground); font-size: 0.9em; }
.body ul { margin: 0 0 16px; padding-left: 2em; list-style: disc; }
.body li { margin: 0.5em 0; }
.body strong { font-weight: 600; }
.body blockquote { margin: 0 0 16px; padding: 0 1em; border-left: 0.25em solid #dfe2e5; color: #6a737d; }
.body blockquote p { margin-bottom: 4px; }
.sec { margin: 0; }
.sec > summary { display: block; margin: 24px 0 16px 0; list-style: none; cursor: pointer; }
.sec > summary::-webkit-details-marker { display: none; }
.sec > summary h2 { position: relative; display: flex; align-items: flex-start; font-size: 1.25em; line-height: 1.25; font-weight: 600; }
.sec > summary h2::before {
  content: "";
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0 0.25rem 0 -1.5rem;
  border-radius: 0.375rem;
  background: var(--muted-foreground);
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'/%3E%3C/svg%3E") center / 1rem no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'/%3E%3C/svg%3E") center / 1rem no-repeat;
  opacity: 0;
  transform: rotate(90deg);
}
.sec:not([open]) > summary h2::before { opacity: 1; transform: none; }
.sec > summary:hover h2::before, .sec > summary:focus-visible h2::before { opacity: 1; }
.sec > summary:focus-visible { outline: 2px solid #0a7cff; outline-offset: 2px; border-radius: 0.375rem; }
.body > .sec:first-child > summary { margin-top: 0; }
.credit { padding: 1rem 0.5rem 1.5rem; font-size: 0.75rem; color: var(--muted-foreground); }

@container pf (min-width: 48rem) {
  .sidebar { width: 320px; flex-shrink: 0; border-right: 1px solid var(--rule); background: var(--muted); }
  .item.active button { background: var(--selected); color: var(--selected-ink); }
  .item.active .item-sub { color: color-mix(in srgb, var(--muted-foreground) 100%, transparent); }
  .item[data-divider]::after { margin: 0 0.5rem; }
  .item.active::after, .item:has(+ .item.active)::after { border-color: transparent; }
  .app[data-open] .sidebar { display: flex; }
  .app[data-open] .pane { display: block; }
  .back { display: none; }
  .search input { font-size: 0.875rem; }
  .body { font-size: 0.875rem; }
  .sec > summary h2::before { width: 1.25rem; }
}
@media (prefers-reduced-motion: no-preference) {
  .sec > summary h2::before { transition: transform 0.2s, opacity 0.15s; }
}
@media print {
  :scope { height: auto; overflow: visible; }
  .sidebar, .back { display: none; }
  .pane { display: block; overflow: visible; }
  .note[hidden] { display: block; }
}
`;

export const FOLIO_CSS = templateCss(".pf-folio", css);
