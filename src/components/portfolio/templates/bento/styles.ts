import { templateCss } from "../css";
import { frameVars } from "./frame";

// Ported from Ladvace/astro-bento-portfolio (MIT, see ./LICENSE.txt): src/style.css, uno.config.ts
// and the UnoCSS classes in src/pages/index.astro and src/components/*.astro, written out as CSS.
// Breakpoints (sm 640, md 768, lg 1024) are container queries on the template root. Satoshi and
// Cabinet Grotesk (Fontshare) are swapped for Figtree.
const css = `
:scope {
  --darkslate-50: #f7f7f7;
  --darkslate-100: #e3e3e3;
  --darkslate-200: #c9c9c9;
  --darkslate-300: #9a9a9a;
  --darkslate-400: #383838;
  --darkslate-500: #171717;
  --darkslate-700: #111111;
  --darkslate-800: #0e0e0e;
  --darkslate-900: #0b0b0b;
  --primary-400: #e64f59;
  --primary-500: #e63946;
  --primary-800: #a01b2b;
  --ns-fill: var(--darkslate-500);
  --ns-rail: var(--darkslate-400);
  --ns-pad: 1.625rem;
  ${frameVars("ns", { cornerSize: 40 })}
  ${frameVars("bt", { cornerSize: 20, thickness: 1.5, fill: "#0b0b0b", stroke: "#e63946" })}
  ${frameVars("sw", { cornerSize: 12, fill: "#000", stroke: "#383838" })}
  position: relative;
  isolation: isolate;
  min-height: var(--pf-screen, 100vh);
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--darkslate-700);
  color: #fff;
  font-family: var(--pf-font-figtree, "Figtree"), ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  line-height: 1.5;
  overflow-x: clip;
}
:scope.yellow { --primary-400: #ffee58; --primary-500: #ffeb3b; --primary-800: #f9a825; }
:scope.blue { --primary-400: #42a5f5; --primary-500: #2196f3; --primary-800: #1565c0; }
:scope.purple { --primary-400: #ab47bc; --primary-500: #9c27b0; --primary-800: #6a1b9a; }
:scope.green { --primary-400: #81c784; --primary-500: #66bb6a; --primary-800: #388e3c; }
a { color: inherit; text-decoration: none; }
b { font-weight: 700; }
.lines { position: absolute; inset: 0 0 auto 0; height: var(--pf-screen, 100vh); z-index: -1; pointer-events: none; --line: var(--darkslate-400); background: linear-gradient(90deg, var(--line) 1px, transparent 1px) center / 80px 80px, linear-gradient(var(--line) 1px, transparent 1px) center / 80px 80px; mask: linear-gradient(0deg, transparent 40%, white); -webkit-mask: linear-gradient(0deg, transparent 40%, white); }

.grid { position: relative; display: grid; gap: 0.5rem; width: 100%; max-width: 72rem; margin: auto; padding: 0.5rem; overflow-x: clip; }

/* Tiles (components/Card) with the nine-slice frame */
.card { position: relative; isolation: isolate; display: flex; flex-direction: column; justify-content: flex-start; min-width: 0; width: 100%; height: 100%; padding: var(--ns-pad-y, var(--ns-pad)) var(--ns-pad-x, var(--ns-pad)); overflow: hidden; color: #fff; transition: transform 0.15s ease-out; }
.card.center, .card.link { justify-content: center; }
.card.p4 { --ns-pad: 1rem; }
.card.tight { --ns-pad-y: 0.75rem; --ns-pad-x: 1.5rem; }
.card::before { content: ""; position: absolute; inset: 0; z-index: -1; border: var(--ns-border) solid transparent; border-image: var(--ns-image) var(--ns-slice) fill / var(--ns-border) stretch; pointer-events: none; }
@supports (-webkit-mask-box-image: linear-gradient(#000, #000) 10 fill / 10px stretch) {
  .card { background-color: var(--ns-fill); min-width: var(--ns-min); min-height: var(--ns-min); -webkit-mask-box-image: var(--ns-mask) var(--ns-slice) fill / var(--ns-border) stretch; }
  .card::before { z-index: 2; border: 0; border-image: none; background-color: var(--ns-rail); -webkit-mask-box-image: var(--ns-rail-mask) var(--ns-slice) fill / var(--ns-border) stretch; transition: background-color 150ms ease-out; }
  .card:hover { --ns-rail: var(--primary-500); }
  .card:not(:hover)::before { transition: none; }
}
.card > .bg { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
.card-link { position: relative; display: flex; flex-direction: column; width: 100%; height: auto; }
.card-arrow { position: absolute; right: 0; top: 0; bottom: 0; margin: auto 0; z-index: 20; width: 14px; height: 14px; flex-shrink: 0; transition: transform 0.1s ease-in-out, color 0.1s; }
.card-arrow.corner { bottom: auto; margin: 0; }
.card:hover .card-arrow { color: var(--primary-500); transform: translate(0.25rem, -0.25rem); }
.card h2.title { margin: 0; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; z-index: 20; }

/* Intro (IntroCard) */
.intro-row { display: flex; width: 100%; height: 100%; align-items: center; gap: 1rem; }
.intro-text { display: flex; flex-direction: column; justify-content: space-between; gap: 1rem; min-width: 0; flex: 1; }
.welcome { margin: 0; font-size: 0.875rem; line-height: 1.25rem; font-weight: 300; color: var(--darkslate-300); }
.intro-p { margin: 0; font-size: 1rem; line-height: 1.5rem; font-weight: 300; }
.intro-p span + span { display: block; margin-top: 0.5rem; }
.socials { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.btn-shell { display: inline-flex; width: fit-content; height: 100%; --bt-lift: drop-shadow(1px 1px 0 var(--primary-500)); filter: var(--bt-lift) var(--bt-lift) var(--bt-lift); }
.btn-shell:has(.btn:active) { filter: none; }
.btn { position: relative; display: inline-flex; align-items: center; justify-content: center; width: fit-content; height: 100%; max-height: 50px; padding: 0.5rem 1.25rem; border: 1px solid var(--primary-500); border-radius: 0.5rem; background: var(--darkslate-900); color: var(--darkslate-50); font-size: 1.25rem; box-shadow: 2px 2px 0 var(--primary-500); cursor: pointer; transition: color 0.1s ease-in-out; }
.btn:hover { color: var(--primary-500); }
.btn:active { box-shadow: none; transform: translate(3px, 3px); }
.btn svg { width: 1.25rem; height: 1.25rem; }
@supports (-webkit-mask-box-image: linear-gradient(#000, #000) 10 fill / 10px stretch) {
  .btn { border: 0; border-radius: 0; box-shadow: none; min-width: var(--bt-min); min-height: var(--bt-min); -webkit-mask-box-image: var(--bt-mask) var(--bt-slice) fill / var(--bt-border) stretch; }
  .btn::before { content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none; background: var(--primary-500); -webkit-mask-box-image: var(--bt-rail-mask) var(--bt-slice) fill / var(--bt-border) stretch; }
}
.avatar { position: absolute; right: -110px; bottom: -20px; z-index: -1; opacity: 0.5; pointer-events: none; display: flex; flex-direction: column; align-items: center; }
.avatar img, .avatar .initials { width: 220px; height: 270px; object-fit: cover; border-radius: 9999px 9999px 2rem 2rem; filter: drop-shadow(0 18px 24px rgb(0 0 0 / 0.5)); }
.avatar:has(.initials) { display: none; }
.avatar .initials { display: grid; place-items: center; background: radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--primary-500) 55%, #000), var(--darkslate-800)); color: #fff; font-size: 4.5rem; font-weight: 800; letter-spacing: -0.04em; }
@media (prefers-reduced-motion: no-preference) { .avatar img, .avatar .initials { animation: bento-levitate 4s ease-in-out infinite; } }
@keyframes bento-levitate { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

/* Stack & tools (AboutMe) */
.stack { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.75rem; }
.stack-group { display: flex; flex-direction: column; gap: 0.375rem; }
.stack-label { font-size: 0.625rem; line-height: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--darkslate-300); }
.chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.chip { padding: 0.125rem 0.5rem; border: 1px solid var(--darkslate-400); border-radius: 9999px; color: var(--darkslate-100); font-size: 0.6875rem; line-height: 1rem; transition: border-color 0.15s, color 0.15s; }
.chip:hover { border-color: var(--primary-500); color: #fff; }

/* Contacts (ContactsCard) */
.contact h2.title { color: #fff; }
.contact address { display: flex; flex-direction: column; margin-top: 1rem; font-style: italic; }
.contact .label { margin: 0; color: var(--darkslate-300); font-weight: 400; font-size: 1rem; }
.contact address p { margin: 0; }
.contact .email { font-size: 0.875rem; overflow-wrap: anywhere; }
.find { display: flex; flex-direction: column; width: fit-content; margin-top: 1rem; }
.find a { display: inline-block; width: fit-content; color: var(--darkslate-100); transition: all 0.15s; }
.find a:hover { color: var(--primary-400); transform: translateX(0.125rem); }

/* Time zone (TimeZoneCard) */
.tz { display: flex; flex-direction: column; justify-content: center; height: 100%; }
.tz-block { display: flex; flex-direction: column; }
.tz-head { display: flex; align-items: center; gap: 0.375rem; }
.dot { width: 0.375rem; height: 0.375rem; flex-shrink: 0; border-radius: 9999px; background: #4ade80; }
@media (prefers-reduced-motion: no-preference) { .dot { animation: bento-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; } }
@keyframes bento-pulse { 50% { opacity: 0.5; } }
.tz-label { font-size: 0.625rem; line-height: 0.875rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: var(--darkslate-300); }
.tz-format { padding: 0 0.375rem; border: 1px solid var(--darkslate-400); border-radius: 0.25rem; background: none; color: var(--darkslate-300); font: inherit; font-size: 0.5rem; line-height: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; cursor: pointer; }
.tz-format:hover { color: #fff; border-color: var(--darkslate-200); }
.clock { white-space: nowrap; font-size: clamp(1.375rem, 2.2cqi, 1.65rem); line-height: 1.1; font-weight: 700; font-variant-numeric: tabular-nums; }
.tz-sub { display: flex; align-items: center; gap: 0.25rem; font-size: 0.625rem; line-height: 0.875rem; color: var(--darkslate-300); }
.tz-sub .sep { opacity: 0.4; }
.tz-rule { display: flex; align-items: center; gap: 0.5rem; margin: 0.25rem 0; }
.tz-rule::before, .tz-rule::after { content: ""; flex: 1; height: 1px; background: var(--darkslate-400); opacity: 0.4; }
.tz-rule span { min-width: 13ch; text-align: center; font-size: 0.625rem; line-height: 0.875rem; color: var(--darkslate-300); white-space: nowrap; }

/* GitHub tile (in the place of Design Works) */
.marquee { position: absolute; inset: 0; z-index: -1; display: flex; flex-direction: column; justify-content: center; gap: 0.5rem; overflow: hidden; opacity: 0.3; }
.marquee::before, .marquee::after { content: ""; position: absolute; inset: 0 auto 0 0; z-index: 10; width: 2.5rem; background: linear-gradient(to right, var(--darkslate-500), transparent); }
.marquee::after { inset: 0 0 0 auto; background: linear-gradient(to left, var(--darkslate-500), transparent); }
.marquee-row { display: flex; gap: 0.5rem; width: max-content; }
.marquee-row > * { width: 3.5rem; height: 3.5rem; flex-shrink: 0; border-radius: 0.5rem; object-fit: cover; }
.marquee-row .cell { background: var(--darkslate-400); }
@media (prefers-reduced-motion: no-preference) {
  .marquee-row.left { animation: bento-left 40s linear infinite; }
  .marquee-row.right { animation: bento-right 40s linear infinite; }
}
@keyframes bento-left { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes bento-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
.heat { position: absolute; inset: 0; z-index: -1; display: grid; grid-template-columns: repeat(12, 1fr); align-items: end; gap: 3px; padding: 1rem 1.25rem; opacity: 0.35; }
.heat span { display: block; border-radius: 2px; background: var(--primary-500); }
.gh-meta { margin-top: 0.125rem; font-size: 0.625rem; line-height: 0.875rem; color: var(--darkslate-300); }

/* Now */
.now-head { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.now-title { display: flex; align-items: baseline; gap: 0.5rem; }
.now-title h2 { margin: 0; font-size: 1.125rem; line-height: 1.75rem; font-weight: 700; }
.now-what { font-size: 0.625rem; line-height: 0.875rem; color: var(--darkslate-300); }
.now-date { display: flex; align-items: center; gap: 0.375rem; font-size: 0.625rem; line-height: 0.875rem; color: var(--darkslate-300); }
.pulse { position: relative; display: flex; width: 0.5rem; height: 0.5rem; }
.pulse::before { content: ""; position: absolute; inset: 0; border-radius: 9999px; background: var(--primary-400); opacity: 0.75; }
.pulse::after { content: ""; position: relative; display: inline-flex; width: 0.5rem; height: 0.5rem; border-radius: 9999px; background: var(--primary-500); }
@media (prefers-reduced-motion: no-preference) { .pulse::before { animation: bento-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; } }
@keyframes bento-ping { 75%, 100% { transform: scale(2); opacity: 0; } }
.now-text { margin: 0.25rem 0 0; font-size: 0.75rem; line-height: 1rem; }
.now-text b { font-weight: 500; color: var(--darkslate-300); }

/* Project link tiles (Playground, Guestbook, Blog in the original) */
.shot { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: top; opacity: 0.35; filter: grayscale(0.4); transition: opacity 0.2s; }
.card:hover .shot { opacity: 0.5; }
.shade { position: absolute; inset: 0; background: linear-gradient(90deg, var(--darkslate-500) 10%, transparent); }
.pattern { position: absolute; inset: 0; opacity: 0.5; background-image: radial-gradient(circle, var(--primary-800) 2px, transparent 2.5px); background-size: 18px 18px; mask: linear-gradient(90deg, transparent 30%, #000); -webkit-mask: linear-gradient(90deg, transparent 30%, #000); }
.project-title { margin: 0; font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; padding-right: 1.5rem; }
.project-line { margin: 0; padding-right: 1.5rem; font-size: 0.75rem; line-height: 1rem; color: var(--darkslate-300); display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

/* Experience */
.jobs { display: flex; flex-direction: column; gap: 0.625rem; margin-top: 0.75rem; }
.job { display: grid; grid-template-columns: 1fr auto; gap: 0 0.75rem; align-items: baseline; }
.job-title { font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; }
.job-at { color: var(--darkslate-300); font-weight: 400; }
.job-dates { font-size: 0.625rem; line-height: 0.875rem; color: var(--darkslate-300); white-space: nowrap; font-variant-numeric: tabular-nums; }

/* Accent swatches (ThemeChangeCard) */
.swatches { display: flex; align-items: center; justify-content: center; gap: 0.75rem; height: 100%; }
.swatch { --sw-rotate: 45deg; position: relative; width: 1.5rem; height: 1.5rem; border: 0; border-radius: 9999px; cursor: pointer; transform: rotate(var(--sw-rotate)) scale(1); transition: all 0.2s; box-shadow: 0 0 0 2px transparent; }
.swatch:hover { transform: rotate(var(--sw-rotate)) scale(1.2); }
.swatch[aria-pressed="true"] { box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.15), 0 0 0 3.5px white; transform: rotate(var(--sw-rotate)) scale(1.15); }
@supports (-webkit-mask-box-image: linear-gradient(#000, #000) 10 fill / 10px stretch) {
  .swatch { border-radius: 0; box-shadow: none; -webkit-mask-box-image: var(--sw-mask) var(--sw-slice) fill / var(--sw-border) stretch; }
  .swatch::before { content: ""; position: absolute; inset: 0; background: var(--sw-rail, var(--darkslate-400)); -webkit-mask-box-image: var(--sw-rail-mask) var(--sw-slice) fill / var(--sw-border) stretch; }
  .swatch[aria-pressed="true"] { --sw-rotate: 0deg; --sw-rail: #fff; box-shadow: none; }
}
.swatch.red { background: #e63946; }
.swatch.yellow { background: #eab308; }
.swatch.blue { background: #3b82f6; }
.swatch.purple { background: #a855f7; }
.swatch.green { background: #22c55e; }

/* Footer tile */
.foot { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; height: 100%; text-align: center; font-size: 0.625rem; line-height: 0.875rem; }
.foot p { margin: 0; }
.foot .heart { display: inline-block; vertical-align: middle; width: 25px; height: 21px; margin: 0 0.25rem; image-rendering: pixelated; }
.foot .design-credit { font-size: 0.625rem; line-height: 0.875rem; opacity: 1; color: var(--darkslate-300); }
.foot .credit { padding: 0; font-size: 0.625rem; line-height: 0.875rem; }
.foot .credit a { gap: 4px; color: var(--primary-500); }
.foot .credit svg { width: 14px; height: 14px; }

/* Placement: each tile's span, by breakpoint */
@container pf (min-width: 640px) { .grid { padding: 1rem; } }
@container pf (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; padding: 1.5rem; }
  .t-intro { grid-column: span 2; }
  .t-stack, .t-contact { grid-row: span 2; }
  .t-exp { grid-column: span 2; }
  .avatar, .avatar:has(.initials) { display: flex; position: relative; right: auto; bottom: auto; z-index: auto; opacity: 1; pointer-events: auto; padding-bottom: 0.75rem; }
  .tz-block { flex: 1; align-items: center; justify-content: center; }
  .clock { font-size: clamp(1.5rem, 2.9cqi, 1.875rem); }
}
@container pf (min-width: 1024px) {
  .grid { grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: minmax(5.5rem, auto); grid-auto-flow: dense; gap: 1rem; min-height: max(var(--pf-screen, 100vh), 720px); }
  .t-intro { grid-column: span 3; grid-row: span 4; }
  .t-stack { grid-row: span 6; }
  .t-contact { grid-row: span 4; }
  .t-tz { grid-row: span 2; }
  .t-exp { grid-column: span 2; grid-row: span 2; }
  .card.pad-lg { --ns-pad: clamp(1.125rem, 2.6cqi, 1.875rem); }
  .tz-block { flex: none; align-items: flex-start; justify-content: flex-start; }
  .clock { font-size: clamp(1.375rem, 2.2cqi, 1.65rem); }
}
`;

export const BENTO_CSS = templateCss(".pf-bento", css);
