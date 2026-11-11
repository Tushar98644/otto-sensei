import { templateCss } from "../css";

// Ported from BartoszJarocki/cv (MIT, see ./LICENSE.txt): its Tailwind classes and oklch roles
// written out as CSS. Breakpoints are container queries on the template root.
const css = `
:scope {
  --bg: oklch(0.984 0.0025 95);
  --ink: oklch(0.21 0.006 70);
  --body: oklch(0.4 0.006 70);
  --faint: oklch(0.54 0.005 70);
  --rule: oklch(0.91 0.004 80);
  --wash: oklch(0.956 0.004 85);
  --radius: 0.5rem;
  color-scheme: light;
  position: relative;
  min-height: var(--pf-screen, 100vh);
  background: var(--bg);
  color: var(--ink);
  font-family: var(--pf-font-geist-mono, "Geist Mono"), ui-monospace, monospace;
  line-height: 1.5;
}
@media screen and (prefers-color-scheme: dark) {
  :scope {
    --bg: oklch(0.155 0.004 70);
    --ink: oklch(0.94 0.004 80);
    --body: oklch(0.76 0.004 80);
    --faint: oklch(0.6 0.004 80);
    --rule: oklch(0.27 0.004 70);
    --wash: oklch(0.2 0.004 70);
    color-scheme: dark;
  }
}
*, ::before, ::after { border-color: var(--rule); }
::selection { background: var(--ink); color: var(--bg); }
:where(a, button):focus-visible { outline: 1px solid var(--ink); outline-offset: 3px; }
a { color: inherit; text-decoration-line: none; text-decoration-color: var(--faint); text-decoration-thickness: 1px; text-underline-offset: 0.28em; }
a:hover { text-decoration-line: underline; }

/* animate-fade-in, staggered 75ms per section */
@media (prefers-reduced-motion: no-preference) {
  .fade { animation: cv-fade-in 400ms ease-out both; }
}
@keyframes cv-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

.main { position: relative; width: 100%; margin: 0 auto; padding: 1rem; scroll-margin-block: 3rem; }
.sheet { width: 100%; max-width: 42rem; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }

/* Header */
.head { display: flex; align-items: center; justify-content: space-between; column-gap: 1rem; }
.head-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.375rem; }
.head h1 { font-family: var(--pf-font-geist-pixel, "Geist Pixel"), var(--pf-font-geist-mono, "Geist Mono"), monospace; font-size: 28px; line-height: 1; font-weight: 400; }
.about { max-width: 28rem; text-wrap: pretty; font-size: 0.875rem; line-height: 1.25rem; color: var(--body); }
.where { max-width: 28rem; font-size: 0.75rem; line-height: 1rem; color: var(--ink); }
.where a, .where span { display: inline-flex; column-gap: 0.375rem; align-items: baseline; line-height: 1; vertical-align: baseline; }
.where svg { width: 0.75rem; height: 0.75rem; align-self: center; }
.contact { display: flex; column-gap: 0.25rem; padding-top: 0.25rem; }
.contact a { display: inline-flex; width: 2rem; height: 2rem; align-items: center; justify-content: center; border-radius: calc(var(--radius) - 2px); color: var(--faint); transition: color 150ms; }
.contact a:hover { color: var(--ink); }
.contact svg { width: 1rem; height: 1rem; }
.print-contact { display: none; flex-wrap: wrap; column-gap: 0.5rem; font-size: 0.875rem; color: var(--faint); }
.print-contact a { color: var(--ink); text-decoration-line: underline; }
.avatar { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 7rem; height: 7rem; overflow: hidden; border-radius: 0.75rem; background: radial-gradient(circle, color-mix(in srgb, var(--ink) 9%, transparent) 1px, transparent 1.5px) 0 0 / 7px 7px, var(--wash); box-shadow: 0 0 0 1px var(--wash); font-family: var(--pf-font-geist-pixel, "Geist Pixel"), monospace; font-size: 2.5rem; color: var(--ink); }

/* Section (components/ui/section.tsx) */
.section { display: flex; min-height: 0; flex-direction: column; row-gap: 0.75rem; }
.section > h2 { font-size: 0.875rem; line-height: 1.4; text-transform: lowercase; color: var(--faint); }
.summary { text-wrap: pretty; font-size: 0.875rem; line-height: 1.25rem; color: var(--body); display: grid; gap: 0.5rem; }
.summary strong { font-weight: 500; color: var(--ink); }

.entries { display: flex; flex-direction: column; gap: 2rem; }
.entries.tight { gap: 1rem; }
.entry-top { display: flex; flex-direction: column; gap: 0.25rem; }
.entry-line { display: flex; align-items: baseline; justify-content: space-between; column-gap: 0.5rem; }
.entry-line h3 { font-size: 0.875rem; line-height: 1.375; font-weight: 500; min-width: 0; }
.entry-top h4 { font-size: 0.875rem; line-height: 1.375; color: var(--body); }
.dates { flex-shrink: 0; font-size: 13px; line-height: 1.5; font-variant-numeric: tabular-nums; color: var(--faint); }
.arrow { font-weight: 400; color: var(--faint); }
.desc { margin-top: 0.375rem; text-wrap: pretty; font-size: 0.75rem; line-height: 1rem; color: var(--body); }
.desc ul { list-style: disc inside; }
.degree { margin-top: 0.375rem; font-size: 0.875rem; line-height: 1.25rem; color: var(--body); }

/* Tag list (components/ui/tag-list.tsx) */
.tags { margin-top: 0.5rem; font-size: 0.75rem; line-height: 1.625; color: var(--faint); }
.tags.skills { margin-top: 0; font-size: 0.875rem; line-height: 1.625; color: var(--body); }
.tags li { display: inline; white-space: nowrap; }
.tags .dot { white-space: normal; color: var(--faint); }

/* Side projects */
.projects { display: grid; grid-template-columns: 1fr; gap: 2rem 1.5rem; scroll-margin-bottom: 4rem; }
.projects h3 { font-size: 0.875rem; line-height: 1.375; font-weight: 500; }
.projects .url { display: none; }
.projects p { margin-top: 0.25rem; text-wrap: pretty; font-size: 0.75rem; line-height: 1rem; color: var(--body); }

/* The command menu hint and dialog (components/command-menu*.tsx) */
.hint { position: fixed; bottom: 0; left: 0; right: 0; z-index: 30; display: none; padding: 1.5rem 0.25rem 0.25rem; text-align: center; font-size: 0.875rem; line-height: 1.25rem; color: var(--faint); background: linear-gradient(to top, var(--bg), transparent); pointer-events: none; }
.hint kbd { display: inline-flex; height: 1.25rem; align-items: center; gap: 0.25rem; padding: 0 0.375rem; border: 1px solid var(--rule); border-radius: 0.25rem; background: var(--wash); font: inherit; font-size: 10px; font-weight: 500; color: var(--ink); user-select: none; }
.hint kbd span { font-size: 0.75rem; }
.cmd { width: calc(100% - 2rem); max-width: 32rem; margin: auto; padding: 0; border: 1px solid var(--rule); background: var(--bg); color: var(--ink); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1); font-family: inherit; overflow: hidden; }
.cmd::backdrop { background: color-mix(in oklab, var(--bg) 80%, transparent); }
@media (prefers-reduced-motion: no-preference) { .cmd[open] { animation: cv-pop 150ms ease-out; } }
@keyframes cv-pop { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: none; } }
.cmd-search { display: flex; align-items: center; padding: 0 0.75rem; border-bottom: 1px solid var(--rule); }
.cmd-search svg { width: 1.25rem; height: 1.25rem; margin-right: 0.5rem; opacity: 0.5; flex-shrink: 0; }
.cmd-search input { display: flex; height: 3rem; width: 100%; padding: 0.75rem 0; border: 0; background: transparent; color: inherit; font: inherit; font-size: 0.875rem; outline: none; }
.cmd-search input::placeholder { color: var(--faint); }
.cmd-list { max-height: 300px; overflow: auto; padding-bottom: 0.25rem; }
.cmd-group { padding: 0.25rem 0.5rem; }
.cmd-group > p { padding: 0.375rem 0.5rem; font-size: 0.75rem; font-weight: 500; color: var(--faint); }
.cmd-item { display: flex; width: 100%; align-items: center; padding: 0.75rem 0.5rem; border: 0; border-radius: calc(var(--radius) - 4px); background: transparent; color: var(--body); font: inherit; font-size: 0.875rem; text-align: left; cursor: default; }
.cmd-item:hover, .cmd-item:focus-visible, .cmd-item[data-active="true"] { background: var(--wash); color: var(--ink); outline: none; }
.cmd-empty { padding: 1.5rem 0; text-align: center; font-size: 0.875rem; }
.cmd-close { position: absolute; top: 0.75rem; right: 0.75rem; display: flex; padding: 0.25rem; border: 0; border-radius: 0.125rem; background: transparent; color: inherit; opacity: 0.7; cursor: pointer; }
.cmd-close:hover { opacity: 1; }
.cmd-close svg { width: 1rem; height: 1rem; }

.foot { padding: 3rem 0 1rem; display: grid; gap: 0.5rem; color: var(--faint); }

@container pf (min-width: 640px) {
  .head h1 { font-size: 32px; }
}
@container pf (min-width: 768px) {
  .main { padding: 4rem; }
  .projects { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container pf (min-width: 1024px) {
  .projects { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@container pf (min-width: 1280px) {
  .hint { display: block; }
}

/* The original prints on one A4 sheet: tighter type, contacts written out, no chrome. */
@media print {
  :scope { background: transparent; min-height: 0; }
  .fade { animation: none !important; opacity: 1 !important; transform: none !important; }
  .main { padding: 0; }
  .sheet { max-width: none; gap: 0.75rem; }
  .head-text { gap: 0.25rem; }
  .about, .entry-top h4, .degree, .summary { font-size: 12px; line-height: 1.25; }
  .contact, .hint, .cmd, .arrow, .foot { display: none; }
  .print-contact { display: flex; font-size: 12px; line-height: 1.25; }
  .section { row-gap: 0.25rem; }
  .section > h2 { line-height: 1.25; }
  .entries { gap: 0.375rem; }
  .entries.tight { gap: 0.25rem; }
  .entries article, .projects article { break-inside: avoid; }
  .entry-top { gap: 0.125rem; }
  .entry-line h3, .projects h3, .dates { line-height: 1; }
  .desc { margin-top: 0.125rem; font-size: 10px; line-height: 1.25; }
  .degree { margin-top: 0.25rem; }
  .tags { margin-top: 0.125rem; font-size: 9px; line-height: 1.375; }
  .tags.skills { font-size: 10px; }
  .projects { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
  .projects .url { display: block; overflow-wrap: anywhere; font-size: 10px; line-height: 1.25; text-decoration-line: underline; }
  .projects p { margin-top: 0.125rem; font-size: 10px; line-height: 1.25; }
}
@page { size: A4; margin: 10mm; }
`;

export const CV_CSS = templateCss(".pf-cv", css);
