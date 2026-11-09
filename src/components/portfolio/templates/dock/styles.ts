import { templateCss } from "../css";

// Ported from dillionverma/portfolio (MIT, see ./LICENSE.txt): the Tailwind classes in
// src/app/{layout,page}.tsx, src/components/{project-card,timeline,navbar}.tsx, section/*.tsx and
// magicui/{blur-fade,dock}.tsx written out as CSS, with the shadcn tokens from src/app/globals.css.
// Breakpoints (sm 640, md 768, lg 1024, xl 1280) are container queries on the template root.
// The original's fonts (Geist, Geist Mono) are free and used as is.
const css = `
:scope {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --link: #3b82f6;
  position: relative;
  isolation: isolate;
  min-height: var(--pf-screen, 100vh);
  background: var(--background);
  color: var(--foreground);
  font-family: var(--pf-font-geist, "Geist"), ui-sans-serif, system-ui, sans-serif;
  line-height: 1.5;
  overflow-x: clip;
}
:scope[data-theme="dark"] {
  --background: oklch(0.18 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --border: oklch(1 0 0 / 10%);
  --ring: oklch(0.556 0 0);
  color-scheme: dark;
}
*, ::before, ::after { border-color: var(--border); }
a { color: inherit; text-decoration: none; }
svg { flex-shrink: 0; }

.grid-top { position: absolute; inset: 0 0 auto 0; height: 100px; overflow: hidden; z-index: 0; color: var(--foreground); mask-image: linear-gradient(to bottom, black, transparent); -webkit-mask-image: linear-gradient(to bottom, black, transparent); }
.flicker { display: block; width: 100%; height: 100%; }
.flicker canvas { pointer-events: none; display: block; }
.page { position: relative; z-index: 10; max-width: 42rem; margin: 0 auto; padding: 3rem 1.5rem 6rem; }
.main { display: flex; flex-direction: column; gap: 3.5rem; position: relative; }

/* BlurFade: in from a 6px blur, 6px above, 0.4s ease-out, staggered by 0.04s steps. */
@media (prefers-reduced-motion: no-preference) {
  .bf { animation: dock-blurfade 0.4s ease-out both; animation-delay: calc(0.04s + var(--d, 0s)); }
  .bf-text { --y: -8px; }
}
@keyframes dock-blurfade { from { opacity: 0; filter: blur(6px); transform: translateY(var(--y, -6px)); } to { opacity: 1; filter: blur(0); transform: none; } }

/* Hero */
.hero-row { display: flex; flex-direction: column; justify-content: space-between; gap: 1.5rem 0.5rem; }
.hero-text { display: flex; flex-direction: column; gap: 0.5rem; order: 2; min-width: 0; }
.hero h1 { font-size: 1.875rem; line-height: 2.25rem; font-weight: 600; letter-spacing: -0.05em; }
.hero .lead { max-width: 600px; color: var(--muted-foreground); }
.avatar-wrap { order: 1; }
.avatar { position: relative; display: flex; overflow: hidden; width: 6rem; height: 6rem; flex-shrink: 0; border-radius: 9999px; border: 1px solid var(--border); box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1), 0 0 0 4px var(--muted); }
.avatar img { width: 100%; height: 100%; object-fit: cover; aspect-ratio: 1; }
.avatar .fallback { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; border-radius: 9999px; background: var(--muted); font-size: 1.25rem; font-weight: 500; }

/* Section heads */
.section { display: flex; flex-direction: column; min-height: 0; }
.gap-4 { row-gap: 1rem; }
.gap-6 { row-gap: 1.5rem; }
h2.title { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; }
.prose { color: var(--muted-foreground); line-height: 1.625; text-wrap: pretty; font-size: 1rem; }
.prose p + p { margin-top: 1.25em; }
.prose .mark { color: var(--primary); text-decoration: underline; text-underline-offset: 4px; }

/* Photos (the live site's grid under About) */
.photos { columns: 3; column-gap: 0.75rem; }
.photos img { width: 100%; height: auto; margin-bottom: 0.75rem; border-radius: 0.5rem; break-inside: avoid; object-fit: cover; }

/* Work and education rows (work-section.tsx, page.tsx) */
.rows { display: grid; gap: 1.5rem; width: 100%; }
.row { display: grid; gap: 0.5rem; width: 100%; }
.row > summary { list-style: none; cursor: pointer; }
.row > summary::-webkit-details-marker { display: none; }
.row-head { display: flex; align-items: center; justify-content: space-between; column-gap: 0.75rem; width: 100%; text-align: left; }
.row-main { display: flex; align-items: center; column-gap: 0.75rem; flex: 1; min-width: 0; }
.logo { width: 2rem; height: 2rem; padding: 0.25rem; flex: none; overflow: hidden; border: 1px solid var(--border); border-radius: 9999px; background: var(--background); box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1), 0 0 0 2px var(--border); object-fit: contain; }
div.logo { display: flex; align-items: center; justify-content: center; background: var(--muted); color: var(--muted-foreground); font-size: 0.625rem; font-weight: 600; }
.row-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.125rem; }
.row-title { font-weight: 600; line-height: 1; display: flex; align-items: center; gap: 0.5rem; }
.row-sub { font-size: 0.875rem; line-height: 1.25rem; color: var(--muted-foreground); }
.row-date { display: flex; align-items: center; gap: 0.25rem; flex: none; font-size: 0.75rem; line-height: 1rem; font-variant-numeric: tabular-nums; color: var(--muted-foreground); text-align: right; }
.chev { position: relative; display: inline-flex; align-items: center; width: 0.875rem; height: 0.875rem; }
.chev svg { position: absolute; width: 0.875rem; height: 0.875rem; color: var(--muted-foreground); stroke-width: 2; }
.chev .right { opacity: 0; transform: translateX(0); transition: all 0.3s ease-out; }
.chev .down { opacity: 0; transform: rotate(0); transition: all 0.2s; }
.row > summary:hover .chev .right { opacity: 1; transform: translateX(0.25rem); }
.row[open] .chev .right { opacity: 0; transform: none; }
.row[open] .chev .down { opacity: 1; transform: rotate(180deg); }
.row-body { margin-left: 3.25rem; font-size: 0.75rem; line-height: 1rem; color: var(--muted-foreground); display: grid; gap: 0.375rem; }
@media (prefers-reduced-motion: no-preference) { .row[open] .row-body { animation: dock-open 0.2s ease-out; } }
@keyframes dock-open { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
a.row-head .arrow { width: 0.875rem; height: 0.875rem; color: var(--muted-foreground); opacity: 0; transform: translateX(-0.5rem); transition: all 0.2s; }
a.row-head:hover .arrow { opacity: 1; transform: none; }
.edu { display: flex; flex-direction: column; gap: 2rem; }

/* Skills */
.badges { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.skill { display: flex; align-items: center; gap: 0.5rem; height: 2rem; width: fit-content; padding: 0 1rem; border: 1px solid var(--border); border-radius: 0.75rem; background: var(--background); box-shadow: 0 0 0 2px color-mix(in oklab, var(--border) 20%, transparent); font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: var(--foreground); }

/* Section header pill between fading rules (projects, hackathons) */
.head { display: flex; flex-direction: column; row-gap: 1rem; align-items: center; justify-content: center; }
.pill-row { display: flex; align-items: center; width: 100%; }
.rule { flex: 1; height: 1px; }
.rule.l { background: linear-gradient(to right, transparent 5%, var(--border) 95%, transparent); }
.rule.r { background: linear-gradient(to left, transparent 5%, var(--border) 95%, transparent); }
.pill { z-index: 10; padding: 0.25rem 1rem; border: 1px solid var(--border); border-radius: 0.75rem; background: var(--primary); color: var(--background); font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; }
.head-text { display: flex; flex-direction: column; row-gap: 0.75rem; align-items: center; justify-content: center; text-align: center; }
.head-text h2 { font-size: 1.875rem; line-height: 2.25rem; font-weight: 700; letter-spacing: -0.05em; }
.head-text p { color: var(--muted-foreground); text-wrap: balance; text-align: center; }

/* Project cards (project-card.tsx) */
.cards { display: grid; grid-template-columns: 1fr; gap: 0.75rem; max-width: 800px; margin: 0 auto; grid-auto-rows: 1fr; width: 100%; }
.cards > * { height: 100%; }
.card { display: flex; flex-direction: column; height: 100%; border: 1px solid var(--border); border-radius: 0.75rem; overflow: hidden; transition: all 0.2s; }
.card:hover { box-shadow: 0 0 0 2px var(--muted); }
.media { position: relative; flex-shrink: 0; }
.media > a, .media > div:first-child { display: block; }
.media img, .media video, .media iframe, .media .blank { display: block; width: 100%; height: 12rem; object-fit: cover; border: 0; background: var(--muted); }
.media-links { position: absolute; top: 0.5rem; right: 0.5rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.badge { display: inline-flex; align-items: center; justify-content: center; gap: 0.375rem; width: fit-content; white-space: nowrap; border: 1px solid transparent; border-radius: 0.375rem; padding: 0.125rem 0.5rem; font-size: 0.75rem; line-height: 1rem; font-weight: 500; }
.badge svg { width: 0.75rem; height: 0.75rem; }
.badge.black { background: #000; color: #fff; }
.badge.black:hover { background: rgb(0 0 0 / 0.9); }
.badge.solid { background: var(--primary); color: var(--primary-foreground); }
.badge.outline { height: 1.5rem; padding: 0 0.5rem; border-color: var(--border); color: var(--foreground); font-size: 11px; }
.card-body { display: flex; flex-direction: column; gap: 0.75rem; flex: 1; padding: 1.5rem; }
.card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }
.card-top h3 { font-weight: 600; }
.card-top time { font-size: 0.75rem; line-height: 1rem; color: var(--muted-foreground); }
.card-top .open { color: var(--muted-foreground); border-radius: 0.125rem; transition: color 0.15s; }
.card-top .open:hover { color: var(--foreground); }
.card-top .open svg { width: 1rem; height: 1rem; }
.card-desc { flex: 1; font-size: 0.75rem; line-height: 1.625; color: var(--muted-foreground); text-wrap: pretty; }
.tags { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: auto; }

/* Timeline (timeline.tsx, hackathons-section.tsx) */
.timeline { position: relative; display: flex; flex-direction: column; gap: 1rem; padding: 1rem; width: 100%; --timeline-gap: 2rem; }
.timeline-list { position: relative; width: 100%; display: flex; flex-direction: column; gap: 2rem; }
.t-item { position: relative; width: 100%; display: flex; align-items: flex-start; justify-content: space-between; gap: 2.5rem; }
.t-connect { position: relative; display: flex; flex-shrink: 0; justify-content: center; align-items: flex-start; align-self: stretch; }
.t-line { position: absolute; left: 50%; top: 0; width: 1px; height: calc(100% + var(--timeline-gap)); transform: translateX(-50%); background: var(--border); }
.t-item:last-child .t-line { display: none; }
.t-dot { position: relative; z-index: 20; flex-shrink: 0; }
.t-dot img, .t-dot .blank { display: block; width: 2.5rem; height: 2.5rem; padding: 0.25rem; overflow: hidden; border: 1px solid var(--border); border-radius: 9999px; background: var(--card); box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 0 0 2px var(--border); object-fit: contain; }
.t-body { display: flex; flex: 1; flex-direction: column; justify-content: flex-start; gap: 0.5rem; min-width: 0; }
.t-body time { font-size: 0.75rem; line-height: 1rem; color: var(--muted-foreground); }
.t-body h3 { font-weight: 600; line-height: 1; }
.t-body p { font-size: 0.875rem; line-height: 1.25rem; color: var(--muted-foreground); }
.t-body p.detail { line-height: 1.625; }
.t-links { margin-top: 0.25rem; display: flex; flex-wrap: wrap; gap: 0.5rem; }

/* Contact (contact-section.tsx) */
.contact { position: relative; border: 1px solid var(--border); border-radius: 0.75rem; padding: 2.5rem; }
.contact .pill { position: absolute; top: -1rem; left: 50%; transform: translateX(-50%); }
.contact .grid-half { position: absolute; inset: 0 0 auto 0; height: 50%; border-radius: 0.75rem; overflow: hidden; color: var(--foreground); mask-image: linear-gradient(to bottom, black, transparent); -webkit-mask-image: linear-gradient(to bottom, black, transparent); }
.contact-body { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; }
.contact-body h2 { font-size: 1.875rem; line-height: 2.25rem; font-weight: 700; letter-spacing: -0.05em; }
.contact-body p { max-width: 32rem; margin: 0 auto; color: var(--muted-foreground); text-wrap: balance; }
.contact-body a { color: var(--link); text-underline-offset: 4px; border-radius: 0.125rem; }
.contact-body a:hover { text-decoration: underline; }

/* Footer credit, above the dock */
.foot { position: relative; z-index: 10; padding: 0 1.5rem 7rem; color: var(--muted-foreground); }
.foot .credit { padding-bottom: 0; }

/* Floating dock (navbar.tsx, magicui/dock.tsx) */
.dock-bar { pointer-events: none; position: fixed; left: 0; right: 0; bottom: 1rem; z-index: 30; }
.dock { pointer-events: auto; position: relative; z-index: 50; display: flex; align-items: flex-end; justify-content: center; gap: 0.5rem; width: fit-content; height: 3.5rem; margin: 0 auto; padding: 0.5rem; overflow: visible; border: 1px solid var(--border); border-radius: 9999px; background: color-mix(in oklab, var(--card) 90%, transparent); backdrop-filter: blur(64px); -webkit-backdrop-filter: blur(64px); box-shadow: 0 0 10px 3px color-mix(in oklab, var(--primary) 5%, transparent); }
.dock-item { position: relative; display: flex; }
.dock-icon { position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: var(--size, 40px); height: var(--size, 40px); border: 1px solid var(--border); border-radius: 1.5rem; background: var(--background); color: var(--muted-foreground); cursor: pointer; transition: color 0.15s, background-color 0.15s, width 0.12s ease-out, height 0.12s ease-out; }
.dock-icon:hover { color: var(--foreground); background: var(--muted); }
.dock-icon svg { width: var(--icon, 20px); height: var(--icon, 20px); transition: width 0.12s ease-out, height 0.12s ease-out; }
.dock-sep { width: 1px; height: 66.666%; margin: auto; background: var(--border); }
.tip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); padding: 0.5rem 1rem; border-radius: 0.75rem; background: var(--primary); color: var(--primary-foreground); font-size: 0.875rem; line-height: 1.25rem; white-space: nowrap; box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.3); opacity: 0; pointer-events: none; transition: opacity 0.1s, transform 0.1s; }
.tip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: var(--primary); }
.dock-item:hover .tip, .dock-item:focus-within .tip { opacity: 1; transform: translateX(-50%); }
.theme .moon { display: none; }
:scope[data-theme="dark"] .theme .sun { display: none; }
:scope[data-theme="dark"] .theme .moon { display: block; }

@container pf (min-width: 640px) {
  .page { padding-top: 6rem; padding-bottom: 6rem; }
  .hero h1 { font-size: 2.25rem; line-height: 2.5rem; }
  .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .head-text h2 { font-size: 2.25rem; line-height: 2.5rem; }
  .row-body { font-size: 0.875rem; line-height: 1.25rem; }
  .contact-body h2 { font-size: 3rem; line-height: 1; }
}
@container pf (min-width: 768px) {
  .hero-row { flex-direction: row; }
  .hero-text { order: 1; }
  .avatar-wrap { order: 2; }
  .avatar { width: 8rem; height: 8rem; }
  .hero .lead { font-size: 1.125rem; line-height: 1.75rem; }
  .logo { width: 2.5rem; height: 2.5rem; }
  .head-text p { font-size: 1.125rem; line-height: 1.625; }
}
@container pf (min-width: 1024px) {
  .hero h1 { font-size: 3rem; line-height: 1; }
  .hero .lead { font-size: 1.25rem; line-height: 1.75rem; }
  .head-text p { font-size: 1rem; line-height: 1.625; }
}
@container pf (min-width: 1280px) {
  .head-text p { font-size: 1.125rem; line-height: 1.625; }
}
@container pf (max-width: 480px) {
  .photos { columns: 2; }
}
`;

export const DOCK_CSS = templateCss(".pf-dock", css);
