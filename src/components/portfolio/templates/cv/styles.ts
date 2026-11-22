import { templateCss } from "../css";

// Ported from ncdai/chanhdai.com (MIT, see ./LICENSE.txt); its Tailwind classes written out as CSS.
const DARK = `
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --border: oklch(0.274 0.006 286.033);
  --input: oklch(1 0 0 / 0.15);
  --accent-muted: color-mix(in oklab, var(--muted) 20%, transparent);
  --dimension: color-mix(in oklab, oklch(37% 0.013 285.805) 80%, var(--background));
  --dimension-foreground: oklch(37% 0.013 285.805);
  --hand: var(--muted-foreground);
  --chip: oklch(0.21 0.006 285.885 / 0.8);
  --glow-0: #fff;
  --glow-1: oklch(0.442 0.017 285.786);
  --ring: color-mix(in oklab, var(--foreground) 20%, transparent);
  --tile-ring: var(--line);
  color-scheme: dark;
`;

const css = `
:scope {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --border: oklch(0.92 0.004 286.32);
  --input: var(--border);
  --line: color-mix(in oklab, var(--border) 64%, var(--background));
  --accent-muted: color-mix(in oklab, var(--muted) 50%, transparent);
  --info: oklch(0.623 0.214 259.815);
  --dimension: color-mix(in oklab, oklch(70.5% 0.015 286.067) 60%, var(--background));
  --dimension-foreground: oklch(70.5% 0.015 286.067);
  --hand: oklch(0.379 0.146 265.522);
  --chip: oklch(0.985 0 0 / 0.8);
  --glow-0: oklch(0.37 0.013 285.805);
  --glow-1: oklch(0.705 0.015 286.067);
  --ring: var(--foreground);
  --tile-ring: color-mix(in oklab, var(--border) 50%, transparent);
  --stripe: color-mix(in oklab, var(--line) 56%, transparent);
  --sans: var(--pf-font-geist, "Geist"), ui-sans-serif, system-ui, sans-serif;
  --mono: var(--pf-font-geist-mono, "Geist Mono"), ui-monospace, monospace;
  --script: var(--pf-font-caveat, "Caveat"), cursive;
  color-scheme: light;
  position: relative;
  isolation: isolate;
  min-height: var(--pf-screen, 100vh);
  overflow-x: clip;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.5;
  font-synthesis-weight: none;
  text-rendering: optimizeLegibility;
}
@media (prefers-color-scheme: dark) {
  :scope:not([data-theme="light"]) { ${DARK} }
}
:scope[data-theme="dark"] { ${DARK} }
::selection { background: var(--foreground); color: var(--background); }
a { color: inherit; text-decoration: none; }
.link { text-decoration-thickness: 1px; text-underline-offset: 3px; }
.link:hover { text-decoration-line: underline; }
.link-underline { text-decoration: underline; text-decoration-color: color-mix(in oklab, currentColor 30%, transparent); text-decoration-thickness: 1px; text-underline-offset: 3px; transition: text-decoration-color 0.15s; }
.link-underline:hover { text-decoration-color: currentColor; }
.strong { margin-left: 0.125rem; font-weight: 500; }
.muted { color: var(--muted-foreground); }

/* screen-line-top / screen-line-bottom: rules that run the full width of the screen */
.hd-in::before, .hd-in::after, .panel::before, .panel::after, .profile::before, .profile::after,
.avatar-row::before, .panel-hd::after, .company::after, .caps::after, .ft-title::after,
.logotype::before, .logotype::after {
  content: "";
  position: absolute;
  left: -100vw;
  z-index: -1;
  width: 200vw;
  height: 1px;
  background: var(--line);
  pointer-events: none;
}
.hd-in::before, .panel::before, .profile::before, .avatar-row::before, .logotype::before { top: 0; }
.hd-in::after, .panel::after, .profile::after, .panel-hd::after, .company::after, .caps::after,
.ft-title::after, .logotype::after { bottom: 0; }
.hd-in::after, .profile::after, .logotype::after { z-index: 1; }
.logotype::after { background: color-mix(in oklab, var(--foreground) 15%, transparent); }
.socials.joined::before, .socials.joined::after { content: none; }

/* stripe-divider */
.sep, .ft-stripe, .inner-sep { position: relative; height: 2rem; }
.sep::before, .ft-stripe::before, .inner-sep::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100vw;
  z-index: -1;
  width: 200vw;
  height: 100%;
  background-image: repeating-linear-gradient(315deg, var(--stripe) 0, var(--stripe) 1px, transparent 0, transparent 50%);
  background-size: 10px 10px;
}
.sep { border-inline: 1px solid var(--line); }
.ft-stripe { height: 3rem; }
.ft-stripe::before, .inner-sep::before { border-block: 1px solid var(--line); }

/* header */
.hd { position: sticky; top: 0; z-index: 50; height: 3.75rem; padding: 0.25rem 0.5rem 0; background: var(--background); }
.hd-in { position: relative; display: flex; align-items: center; gap: 0.5rem; height: 100%; max-width: 48rem; margin: 0 auto; padding: 0 0.5rem 0 1rem; border-inline: 1px solid var(--line); }
.mark { display: flex; }
.mark svg { display: block; height: 1.5rem; width: auto; fill: var(--foreground); }
.grow { flex: 1; }
.nav { display: none; align-items: center; gap: 1rem; font-size: 0.875rem; font-weight: 500; }
.nav a { color: var(--muted-foreground); transition: color 0.15s; }
.nav a:hover { color: var(--foreground); }
.vsep { width: 1px; height: 1.25rem; margin: 0 0.5rem; background: var(--border); }
.theme-btn { position: relative; display: grid; place-items: center; width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: 10px; background: transparent; color: var(--foreground); cursor: pointer; touch-action: manipulation; }
.theme-btn:hover { background: var(--muted); }
.theme-btn svg { width: 0.875rem; height: 0.875rem; }
.theme-btn path { transform-origin: center; }
:scope[data-theme="dark"] .theme-btn path { transform: rotate(180deg); }
@media (prefers-color-scheme: dark) {
  :scope:not([data-theme="light"]) .theme-btn path { transform: rotate(180deg); }
}

/* frame */
.main, .ft { padding: 0 0.5rem; }
.frame { max-width: 48rem; margin: 0 auto; }
.frame-dim { display: none; position: relative; height: 2rem; border-inline: 1px solid var(--line); }

/* dimensions */
.dim { position: absolute; inset: 0; color: var(--dimension); pointer-events: none; user-select: none; }
.frame-dim .dim { inset: 0 -1px; }
.dim svg { flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1; stroke-linejoin: round; }
.dim .flip-x { transform: scaleX(-1); }
.dim .flip-y { transform: scaleY(-1); }
.dim-line { display: flex; align-items: center; }
.dim-line.h { position: absolute; inset: 50% 0 auto; padding: 0 1px; transform: translateY(-50%); }
.dim-line.v { flex-direction: column; padding: 1px 0; }
.dim-rule { flex: 1; background: currentColor; }
.dim-line.h .dim-rule { height: 1px; }
.dim-line.v .dim-rule { width: 1px; }
.dim-value { font-family: var(--mono); font-size: 0.75rem; line-height: 1; color: var(--dimension-foreground); font-variant-numeric: tabular-nums; }
.dim-line.h .dim-value { padding: 0 0.25rem; }
.dim-line.v .dim-value { padding: 0.25rem 0; }
.ext { position: absolute; background: currentColor; }
.frame-dim .ext, .logo-dim .ext { top: 0.25rem; bottom: 0.25rem; width: 1px; }
.ext.l { left: 0; }
.ext.r { right: 0; }
.sep-dim { display: none; z-index: 2; }
.sep-dim .ext, .dia .ext { height: 1px; }
.sep-dim .ext { left: 100%; right: -2rem; }
.sep-dim .ext.t { top: 0; transform: translateY(-1px); }
.sep-dim .ext.b { top: 100%; }
.sep-dim .dim-line { position: absolute; top: -1px; bottom: -1px; right: -1.5rem; transform: translateX(50%); }
.sep-dim .out { position: absolute; white-space: nowrap; top: 50%; left: 100%; margin-left: 2rem; transform: translateY(-50%); }
.dia { display: none; z-index: -1; }
.dia .ext { left: -2rem; right: 50%; }
.dia .ext.t { top: 0; }
.dia .ext.b { top: 100%; transform: translateY(-1px); }
.dia .dim-line { position: absolute; top: 0; bottom: 0; left: -1.5rem; transform: translateX(-50%); }

/* profile header */
.profile { position: relative; display: grid; grid-template-columns: auto 1fr; grid-template-rows: 1fr auto; overflow-y: clip; border-inline: 1px solid var(--line); }
.cover { position: relative; grid-column: span 2; padding: 0.5rem; }
.iso { display: block; width: 100%; height: auto; overflow: visible; touch-action: manipulation;
  --pattern: color-mix(in oklab, var(--foreground) 12%, var(--background));
  --stroke: color-mix(in oklab, var(--foreground) 16%, var(--background)); }
.iso .hatch { stroke: var(--pattern); stroke-width: 1; }
.iso .face { fill: var(--background); }
.iso .edge { stroke: var(--stroke); }
.iso .edge, .iso .edge-glow { stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.iso .guides { stroke: var(--line); stroke-width: 1; stroke-dasharray: 4 2; vector-effect: non-scaling-stroke; }
.iso .glow-0 { stop-color: var(--glow-0); }
.iso .glow-1 { stop-color: var(--glow-1); stop-opacity: 0; }
.iso .angle { display: none; color: var(--dimension); fill: none; stroke: currentColor; stroke-width: 1; stroke-linejoin: round; }
.iso .angle path { vector-effect: non-scaling-stroke; }
.iso .angle text { fill: var(--dimension-foreground); stroke: none; font-family: var(--mono); font-size: 12px; user-select: none; }
.avatar-col { display: flex; flex-direction: column; }
.avatar-row { position: relative; flex-shrink: 0; margin-top: auto; border-right: 1px solid var(--line); }
.avatar { position: relative; z-index: 10; display: flex; width: 7.5rem; height: 7.5rem; margin: 0 -1px; border-radius: 9999px; background: var(--background); }
.avatar > svg { width: 58%; height: auto; margin: auto; overflow: visible; }
.avatar-fill { fill: var(--muted); }
.avatar-line { fill: none; stroke: var(--foreground); stroke-width: 1; vector-effect: non-scaling-stroke; }
.avatar-ring { position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 0 0 1px var(--ring); pointer-events: none; }
.name-col { display: flex; flex-direction: column; min-width: 0; }
.name-box { position: relative; z-index: 1; margin-top: auto; border-top: 1px solid var(--line); }
.name-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.125rem 0 0.125rem 1rem; transform: translateX(-1px); }
.name-row h1 { font-size: 1.875rem; line-height: 1.1; font-weight: 500; letter-spacing: -0.025em; transform: translateY(-1px); }
.open { display: flex; }
.taglines { min-height: 3.125rem; padding: 0.25rem 0 0.25rem 1rem; border-top: 1px solid var(--line); }
.swap { display: inline-block; font-family: var(--mono); font-size: 0.875rem; color: var(--muted-foreground); text-wrap: balance; }

/* handwritten notes */
.note { position: absolute; display: none; pointer-events: none; user-select: none; font-family: var(--script); font-size: 1.125rem; line-height: 1; letter-spacing: -0.02em; color: var(--hand); }
.note .arrow { width: 2rem; height: 2rem; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
.note-follow { top: -1.75rem; right: 100%; width: 5rem; margin-right: 1rem; flex-direction: column; align-items: flex-end; }
.note-follow span { transform: rotate(-6deg); }
.note-follow .arrow { width: 1.75rem; height: 1.75rem; transform: translateX(0.75rem) scaleX(-1) rotate(-6deg); }
.note-cursor { bottom: 5rem; left: 100%; width: 9rem; flex-direction: column; align-items: flex-start; }
.note-cursor .arrow { transform: scaleY(-1) rotate(-6deg); }
.note-cursor span { margin-left: 0.75rem; transform: rotate(-6deg); }

/* panels */
.panel { position: relative; border-inline: 1px solid var(--line); }
.panel-hd { position: relative; padding: 0 1rem; }
.panel-title { font-size: 1.875rem; line-height: 2.25rem; font-weight: 500; letter-spacing: -0.025em; text-wrap: balance; }
.panel-title sup { position: relative; top: -0.75em; margin-left: 0.25rem; font-size: 0.875rem; font-weight: 500; letter-spacing: 0; color: var(--muted-foreground); vertical-align: baseline; }
.panel-body { padding: 1rem; }
.caps { position: relative; padding: 0.75rem 1rem; text-align: center; font-size: 0.875rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted-foreground); }
.tile { display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; border: 1px solid color-mix(in oklab, var(--muted-foreground) 15%, transparent); border-radius: 0.375rem; background: var(--muted); color: var(--muted-foreground); box-shadow: 0 0 0 1px var(--background), 0 0 0 2px var(--tile-ring); user-select: none; }
.tile svg { width: 1rem; height: 1rem; flex-shrink: 0; pointer-events: none; }

/* overview */
.ov-grid { display: grid; gap: 0.625rem 1rem; }
.ov-item { display: flex; align-items: center; gap: 1rem; font-family: var(--mono); font-size: 0.875rem; line-height: 1.25rem; }
.ov-item p { text-wrap: balance; }
.ov-rule { position: absolute; top: 0; bottom: 0; left: 50%; z-index: -1; display: none; width: 1px; border-right: 1px dashed var(--line); transform: translateX(-0.5625rem); pointer-events: none; }
.blink { display: inline-block; }

/* social links */
.social-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.sbtn { position: relative; display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; border: 1px solid var(--input); border-radius: 10px; background: var(--background); color: color-mix(in oklab, var(--foreground) 80%, transparent); transition: background-color 0.15s; }
.sbtn:hover { background: var(--muted); color: var(--foreground); }
.sbtn svg { width: 1.125rem; height: 1.125rem; }
.tip { position: absolute; bottom: calc(100% + 0.375rem); left: 50%; z-index: 5; padding: 0.25rem 0.5rem; border-radius: 0.375rem; background: var(--foreground); color: var(--background); font-size: 0.75rem; line-height: 1rem; white-space: nowrap; opacity: 0; transform: translateX(-50%); transition: opacity 0.15s; pointer-events: none; }
.sbtn:hover .tip, .sbtn:focus-visible .tip { opacity: 1; }

/* typeset */
.typeset { font-size: 15px; line-height: 1.6; text-wrap: pretty; }
.typeset > * + * { margin-top: 1em; }
.typeset ul { padding-left: 0.875rem; list-style: disc; }
.typeset li { padding-left: 0.125rem; }
.typeset li + li { margin-top: 0.5em; }
.typeset li::marker { color: color-mix(in oklab, var(--muted-foreground) 70%, transparent); font-size: 0.75rem; }
.typeset strong { font-weight: 500; }

/* numbers */
.num-list { display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.875rem; }
.num-row { display: flex; align-items: baseline; gap: 0.5rem; }
.leader { flex: 1; min-width: 1rem; border-bottom: 1px dotted var(--border); transform: translateY(-0.25rem); }
.num-row dd { font-variant-numeric: tabular-nums; }

/* testimonials */
.quote-grid { display: grid; gap: 0.5rem; padding: 0.5rem; }
.quote { display: flex; flex-direction: column; justify-content: space-between; gap: 1.25rem; padding: 1rem; border: 1px solid var(--border); }
.quote blockquote { margin: 0; font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif; font-size: 1.125rem; line-height: 1.45; text-wrap: pretty; }
.quote-by { display: flex; align-items: center; gap: 0.75rem; }
.quote-avatar { display: grid; flex-shrink: 0; place-items: center; width: 2rem; height: 2rem; border-radius: 9999px; background: var(--muted); color: var(--muted-foreground); font-family: var(--mono); font-size: 0.6875rem; box-shadow: inset 0 0 0 1px var(--border); }
.quote-who { display: flex; flex-direction: column; min-width: 0; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; }
.quote-role { font-size: 0.75rem; line-height: 1rem; font-weight: 400; color: var(--muted-foreground); }

/* stack */
.stack { position: relative; --col: 12rem; }
.stack-rule { position: absolute; top: 0; bottom: 0; left: var(--col); z-index: -1; display: none; width: 1px; border-right: 1px dashed var(--line); pointer-events: none; }
.stack-row { display: grid; align-items: start; row-gap: 0.5rem; padding: 1rem 0; border-bottom: 1px solid var(--line); }
.stack-row:last-child { border-bottom: 0; }
.stack-cat { padding-left: 1rem; font-size: 0.875rem; line-height: 1.5rem; }
.stack-index { margin-right: 0.375rem; font-family: var(--mono); color: color-mix(in oklab, var(--muted-foreground) 80%, transparent); user-select: none; }
.pills { display: flex; flex-wrap: wrap; gap: 0.375rem; padding: 0 1rem; }
.pill { display: flex; align-items: center; height: 1.5rem; padding: 0 0.5rem; border-radius: 9999px; background: var(--chip); box-shadow: inset 0 0 0 1px var(--border); font-family: var(--mono); font-size: 0.75rem; }

/* experience and education */
.xp { padding: 0 1rem; }
.company { position: relative; display: flex; flex-direction: column; gap: 1rem; padding: 1rem 0; }
.company-head { display: flex; align-items: flex-start; gap: 0.75rem; }
.company-logo { display: grid; flex-shrink: 0; place-items: center; width: 1.5rem; height: 1.5rem; border-radius: 9999px; background: var(--muted); color: var(--muted-foreground); font-size: 0.6875rem; font-weight: 600; box-shadow: inset 0 0 0 1px var(--border); user-select: none; }
.company-text { display: flex; flex: 1; flex-direction: column; gap: 0.25rem 0.75rem; min-width: 0; padding-right: 0.25rem; }
.company-text h3 { font-size: 1.25rem; line-height: 1.5rem; font-weight: 500; }
.company-meta { display: flex; align-items: center; gap: 0.375rem; min-width: 0; font-size: 0.875rem; color: var(--muted-foreground); white-space: nowrap; }
.truncate { overflow: hidden; text-overflow: ellipsis; }
.ping { position: relative; display: flex; align-items: center; justify-content: center; width: 0.625rem; height: 0.625rem; transform: translate(1px, 1px); }
.ping span:first-child { position: absolute; inset: 0; border-radius: 9999px; background: var(--info); opacity: 0.5; }
.ping span:last-child { position: relative; width: 0.375rem; height: 0.375rem; border-radius: 9999px; background: var(--info); }
.positions { position: relative; display: flex; flex-direction: column; gap: 1rem; }
.positions::before { content: ""; position: absolute; left: 0.75rem; width: 1px; height: 100%; background: var(--border); }
.edu { padding: 1rem; }
.edu::before { height: calc(100% - 2rem); }
.pos { position: relative; }
.pos-end { position: absolute; bottom: 0; left: 0.75rem; display: none; width: 1rem; height: 1rem; background: var(--background); pointer-events: none; }
.pos:last-child .pos-end { display: flex; }
.pos-end::after { content: ""; width: 100%; height: 100%; border-bottom: 1px solid var(--border); border-left: 1px solid var(--border); transform: translateY(-0.5625rem); }
summary { display: block; list-style: none; cursor: pointer; }
summary::-webkit-details-marker { display: none; }
.pos summary, .pos-static { position: relative; display: block; width: 100%; }
.pos summary::before { content: ""; position: absolute; inset: -0.25rem -0.25rem -0.375rem 1.75rem; z-index: -1; border-radius: 0.5rem; transition: background-color 0.15s ease-out; }
.pos summary:hover::before { background: var(--accent-muted); }
.pos summary:focus-visible { outline: none; }
.pos summary:focus-visible::before { box-shadow: inset 0 0 0 2px color-mix(in oklab, var(--muted-foreground) 50%, transparent); }
.pos-head { position: relative; z-index: 1; display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.25rem; }
.pos-title { flex: 1; font-weight: 500; text-wrap: balance; }
.chev { flex-shrink: 0; width: 1rem; height: 1.5rem; color: var(--muted-foreground); }
.meta { display: block; overflow: hidden; font-size: 0.875rem; line-height: 1.25rem; color: var(--muted-foreground); }
.pos .meta { margin-left: 2.25rem; }
.meta-in { display: flex; flex-wrap: wrap; align-items: center; row-gap: 0.25rem; margin-left: -1rem; }
.meta-item { position: relative; display: inline-flex; align-items: center; margin-left: 0.5rem; padding-left: 0.5rem; }
.meta-item::before { content: ""; position: absolute; top: 50%; left: 0; width: 1px; height: 1rem; background: var(--border); transform: translateY(-50%); }
.period { display: inline-flex; align-items: center; gap: 0.125rem; font-variant-numeric: tabular-nums; }
.dash { font-family: var(--mono); }
.inf { width: 1.125rem; height: 1.125rem; stroke-width: 1.5; transform: translateY(0.5px); }
.pos-body { padding: 0.75rem 0 0.25rem 2.25rem; }
.tags { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.pos .tags { padding: 0.75rem 0 0 2.25rem; }
.tag { display: inline-flex; align-items: center; padding: 0.125rem 0.375rem; border: 1px solid var(--border); border-radius: 9999px; background: var(--chip); font-family: var(--mono); font-size: 0.75rem; line-height: 1rem; color: var(--muted-foreground); }

/* row lists: projects, writing, talks, recognition */
.row { border-bottom: 1px solid var(--line); }
.rows .row:last-child { border-bottom: 0; }
.more .rows { border-top: 1px solid var(--line); }
.row-head { position: relative; display: flex; align-items: center; transition: background-color 0.15s; }
.row-head:hover { background: var(--accent-muted); }
summary.row-head:focus-visible { outline: 2px solid color-mix(in oklab, var(--muted-foreground) 50%, transparent); outline-offset: -2px; }
.row-tile { display: flex; margin: 0 1rem; }
.row-main { display: flex; flex: 1; align-items: center; gap: 0.5rem; min-width: 0; padding: 1rem; border-left: 1px dashed var(--line); }
.row-text { display: flex; flex: 1; flex-direction: column; gap: 0.25rem; min-width: 0; }
.row-title { font-weight: 500; line-height: 1.375; text-wrap: balance; }
.row-link { position: relative; z-index: 2; display: flex; flex-shrink: 0; align-items: center; justify-content: center; width: 1.5rem; height: 1.5rem; color: var(--muted-foreground); transition: color 0.15s; }
.row-link::after { content: ""; position: absolute; inset: -0.5rem; }
.row-link:hover { color: var(--foreground); }
.row-link svg { width: 1rem; height: 1rem; pointer-events: none; }
.row-body { display: flex; flex-direction: column; gap: 1rem; padding: 1rem; border-top: 1px solid var(--line); }
.outcome { font-family: var(--mono); font-size: 0.8125rem; color: var(--muted-foreground); }
.mono-mark { font-family: var(--mono); font-size: 0.75rem; font-weight: 500; line-height: 1; }
.dot { width: 0.375rem; height: 0.375rem; border-radius: 9999px; background: var(--muted-foreground); opacity: 0.5; }
details[open] > summary .chev { color: var(--foreground); }

/* show more */
.more-bar { display: flex; justify-content: center; margin-top: -1px; padding: 1rem 0; }
.more-btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 2rem; padding: 0 0.625rem 0 0.75rem; border: 0; border-radius: 10px; background: var(--muted); color: var(--foreground); box-shadow: inset 0 0 1px color-mix(in oklab, var(--foreground) 20%, transparent); font: inherit; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
.more-btn:hover { background: color-mix(in oklab, var(--muted) 80%, var(--border)); }
.more-btn svg { width: 1rem; height: 1rem; }
.more-btn .up { transform: rotate(180deg); }

/* footer */
.ft .frame { border-inline: 1px solid var(--line); }
.ft-title { position: relative; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.5rem 1rem; padding: 0.75rem 1rem; }
.outlined { font-size: 1.875rem; line-height: 1; font-weight: 500; color: var(--background); -webkit-text-stroke: 1px var(--foreground); paint-order: stroke fill; }
.ft-sub { font-size: 0.875rem; color: var(--muted-foreground); }
.colophon { display: grid; grid-auto-flow: row dense; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; background: var(--line); font-family: var(--mono); }
.field { display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; padding: 0.75rem 1rem; background: var(--background); }
.field.wide { grid-column: span 2; }
.field dt { font-size: 0.625rem; line-height: 1rem; font-weight: 500; letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted-foreground); }
.field dd { flex: 1; font-size: 0.875rem; }
.field-list { display: flex; flex-direction: column; gap: 0.25rem; }
.logotype { position: relative; margin: 0 -0.5rem; }
.logotype-crop { overflow: hidden; }
.logotype svg { display: block; width: 100%; max-width: min(80rem, calc(var(--cols) * 2.75rem)); height: auto; margin: 0 auto; transform: translateY(37.5%); }
.logotype .hatch { stroke: var(--line); stroke-width: 1; }
.logo-clear { fill: none; stroke: var(--background); stroke-width: 2; }
.logo-line { fill: none; stroke: color-mix(in oklab, var(--foreground) 10%, transparent); stroke-width: 2; }
.sweep-0 { stop-color: var(--foreground); stop-opacity: 0; }
.sweep-1 { stop-color: var(--foreground); stop-opacity: 1; }
.logo-dim { position: relative; height: 2rem; max-width: min(80rem, calc(var(--cols) * 2.75rem)); margin: 0 auto; }
.ft .credit { padding-top: 1rem; }

@container pf (min-width: 24rem) {
  .avatar { width: 8rem; height: 8rem; }
}
@container pf (min-width: 40rem) {
  .hd-in { gap: 1rem; }
  .nav { display: flex; }
  .cover { grid-area: 1 / 2 / 2 / 3; padding: 1rem; }
  .avatar-col { grid-area: 1 / 1 / 3 / 2; }
  .name-col { grid-area: 2 / 2 / 3 / 3; }
  .avatar { width: 10rem; height: 10rem; }
  .taglines { min-height: 2.25rem; }
  .iso .angle { display: block; }
  .ov-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .ov-item.wide { grid-column: span 2; }
  .ov-rule { display: block; }
  .quote-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stack-rule { display: block; }
  .stack-row { grid-template-columns: var(--col) minmax(0, 1fr); }
  .company-head { align-items: center; }
  .company-text { flex-direction: row; align-items: baseline; justify-content: space-between; }
}
@container pf (min-width: 48rem) {
  .colophon { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@container pf (min-width: 49rem) {
  .frame-dim { display: block; }
}
@container pf (min-width: 64rem) {
  .sep-dim, .dia { display: block; }
  .note-follow { display: flex; }
}
@media (pointer: fine) {
  @container pf (min-width: 68rem) {
    .note-cursor { display: flex; }
  }
}

@media (prefers-reduced-motion: no-preference) {
  .ping span:first-child { animation: cv-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
  .blink { animation: cv-blink 2s step-end infinite; }
  .swap { animation: cv-swap 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
  .theme-btn path { transition: transform 0.5s ease; }
}
:scope:where([data-pf-still] *, [inert] *) .ping span:first-child,
:scope:where([data-pf-still] *, [inert] *) .blink,
:scope:where([data-pf-still] *, [inert] *) .swap { animation: none; }
@keyframes cv-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
@keyframes cv-blink { 50% { opacity: 0; } }
@keyframes cv-swap { from { opacity: 0; transform: translateY(0.5rem); filter: blur(2px); } to { opacity: 1; transform: none; filter: none; } }
@media print {
  .hd, .note, .dim, .sep, .ft-stripe, .logotype, .logo-dim, .more-bar { display: none; }
  .more [hidden] { display: block; }
}
`;

export const CV_CSS = templateCss(".pf-cv", css);
