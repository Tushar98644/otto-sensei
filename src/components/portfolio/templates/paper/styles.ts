import { templateCss } from "../css";

// Ported from CaliCastle/cali.so (application code MIT, see ./LICENSE.txt; Cali's own writing,
// photos, artwork, name and branding are not part of that grant and none of them are here): the
// warm working-paper palette, ambient guides, section tags, rows, nav cards, shelves, polaroids,
// footer trees and dock from app/globals.css, written out for this page. The original's
// "max-width: 39.99rem" queries become container queries on the template root. Geist and Geist
// Mono, as the original.
const css = `
:scope {
  --gray-1: oklch(0.99 0.001 95);
  --gray-2: oklch(0.975 0.0015 95);
  --gray-3: oklch(0.95 0.002 95);
  --gray-4: oklch(0.91 0.0025 92);
  --gray-8: oklch(0.56 0.004 78);
  --gray-11: oklch(0.31 0.0045 72);
  --gray-12: oklch(0.23 0.0045 70);
  --background: var(--gray-1);
  --foreground: var(--gray-12);
  --muted: var(--gray-3);
  --muted-foreground: var(--gray-8);
  --border: var(--gray-4);
  --paper: oklch(0.98 0.004 95);
  --paper-ink: oklch(0.52 0.012 95);
  --hairline: 1px;
  --ease-swift: cubic-bezier(0.2, 0.8, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --shadow-medium: 0 8px 30px rgb(0 0 0 / 0.12);
  --grain-opacity: 0.3;
  --guide-opacity: 0.5;
  --shelf-shadow: 27 22 17;
  --wood-front-bottom: oklch(0.61 0.065 64);
  --wood-front-top: oklch(0.79 0.05 74);
  --wood-grain: rgb(71 42 17 / 0.08);
  --wood-top-back: oklch(0.77 0.045 75);
  --wood-top-front: oklch(0.84 0.04 78);
  position: relative;
  isolation: isolate;
  min-height: var(--pf-screen, 100vh);
  padding: 3.5rem 0 5rem;
  background: var(--background);
  color: var(--foreground);
  font-family: var(--pf-font-geist, "Geist"), ui-sans-serif, system-ui, sans-serif;
  line-height: 1.5;
  overflow-x: clip;
}
@media (min-resolution: 192dpi) { :scope { --hairline: 0.5px; } }
@media (prefers-color-scheme: dark) {
  :scope {
    --gray-1: oklch(0.16 0.006 80);
    --gray-2: oklch(0.19 0.007 80);
    --gray-3: oklch(0.22 0.008 80);
    --gray-4: oklch(0.27 0.009 80);
    --gray-8: oklch(0.61 0.01 84);
    --gray-11: oklch(0.87 0.007 90);
    --gray-12: oklch(0.94 0.006 92);
    --grain-opacity: 0.22;
    --guide-opacity: 0.4;
    --shelf-shadow: 0 0 0;
    --wood-front-bottom: oklch(0.29 0.035 49);
    --wood-front-top: oklch(0.43 0.04 59);
    --wood-grain: rgb(0 0 0 / 0.15);
    --wood-top-back: oklch(0.38 0.035 56);
    --wood-top-front: oklch(0.47 0.035 62);
    color-scheme: dark;
  }
}
::selection { background: oklch(0.9 0.17 105 / 0.58); }
a { color: inherit; text-decoration: none; }
.muted { color: var(--muted-foreground); }
.hairline-top { border-top: var(--hairline) solid var(--border); }

/* Entrances: develop out of a blur, or swing up into place */
@media (prefers-reduced-motion: no-preference) {
  .enter { animation: paper-develop 350ms var(--ease-swift) backwards; animation-delay: var(--enter-delay, 0ms); }
  .enter-swing { animation: paper-swing 400ms var(--ease-swift) backwards; animation-delay: var(--enter-delay, 0ms); }
}
@keyframes paper-develop { from { opacity: 0; filter: blur(4px); } }
@keyframes paper-swing { from { opacity: 0; transform: translateY(12px) rotate(-2deg); filter: blur(2px); } }

/* Ambient background: paper grain, dashed column guides with registration crosses, edge fades */
.grain { position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: var(--grain-opacity); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)'/%3E%3C/svg%3E"); background-size: 128px 128px; }
.guides { position: fixed; inset: 0; z-index: -1; pointer-events: none; opacity: var(--guide-opacity); }
.guide { position: absolute; top: 0; bottom: 0; width: 1px; background: repeating-linear-gradient(to bottom, color-mix(in oklab, var(--muted-foreground) 45%, transparent) 0 2px, transparent 2px 4px); }
.guide.l { left: max(16px, calc((100% - 37.5rem) / 2)); }
.guide.r { right: max(16px, calc((100% - 37.5rem) / 2)); }
.guide::after { content: ""; position: absolute; top: 14px; left: -4px; width: 9px; height: 9px; color: color-mix(in oklab, var(--muted-foreground) 45%, transparent); background: linear-gradient(currentColor, currentColor) center / 9px var(--hairline) no-repeat, linear-gradient(currentColor, currentColor) center / var(--hairline) 9px no-repeat; }
.fade { position: fixed; left: 0; right: 0; height: 4.5rem; z-index: 90; pointer-events: none; }
.fade.top { top: 0; -webkit-mask-image: linear-gradient(to bottom, black 15%, transparent); mask-image: linear-gradient(to bottom, black 15%, transparent); background: linear-gradient(to bottom, color-mix(in oklab, var(--background) 62%, transparent), transparent); }
.fade.bottom { bottom: 0; -webkit-mask-image: linear-gradient(to top, black 15%, transparent); mask-image: linear-gradient(to top, black 15%, transparent); background: linear-gradient(to top, color-mix(in oklab, var(--background) 62%, transparent), transparent); }

.column { width: 100%; max-width: 37.5rem; margin: 0 auto; padding: 0 1.5rem; }

/* Masthead: name, intro, halftone initials. The original's pixel-cluster stamp is its own mark and
   stays out. */
.masthead { display: flex; flex-direction: column-reverse; justify-content: space-between; gap: 2.5rem; }
.intro { max-width: 19rem; }
.name { display: flex; align-items: center; gap: 0.5rem; }
.name h1 { font-size: 1rem; line-height: 1.5rem; font-weight: 600; letter-spacing: -0.025em; color: var(--foreground); }
.intro-text { margin-top: 1rem; }
.intro-text p { font-size: 0.875rem; line-height: 1.625; color: var(--muted-foreground); }
.intro-text p + p { margin-top: 0.75rem; }
.intro-text .mark { color: var(--foreground); font-weight: 500; }
.intro-text a { color: var(--foreground); text-decoration-line: underline; text-decoration-thickness: 1px; text-decoration-color: color-mix(in oklab, var(--muted-foreground) 45%, transparent); text-underline-offset: 3px; transition: color 150ms, text-decoration-color 150ms; }
.intro-text a:hover { text-decoration-color: currentColor; }
.intro-text a:has(.ext-mark) { white-space: nowrap; }
.ext-mark { display: inline-block; width: 0.8rem; height: 0.8rem; margin-inline-start: 0.12em; vertical-align: -0.05em; stroke-width: 1.6; opacity: 0.6; transition: opacity 150ms ease, transform 180ms ease; }
a:hover .ext-mark { opacity: 1; transform: translate(1px, -1px); }
.portrait { width: 9.35rem; flex-shrink: 0; }
/* The halftone print where Cali has his portrait: the initials over a soft round shade, both seen
   through a 3px screen of dots */
.halftone { position: relative; display: grid; place-items: center; aspect-ratio: 1; overflow: hidden; mix-blend-mode: multiply; -webkit-mask-image: radial-gradient(circle, #000 0.95px, transparent 1.35px); mask-image: radial-gradient(circle, #000 0.95px, transparent 1.35px); -webkit-mask-size: 3px 3px; mask-size: 3px 3px; }
.halftone::before { content: ""; position: absolute; inset: 6%; border-radius: 50%; background: radial-gradient(circle at 32% 28%, color-mix(in oklab, var(--foreground) 4%, transparent), color-mix(in oklab, var(--foreground) 46%, transparent) 55%, color-mix(in oklab, var(--foreground) 82%, transparent) 100%); }
.halftone-ink { position: relative; color: var(--paper); font-size: 3.75rem; font-weight: 700; letter-spacing: -0.05em; line-height: 1; }
@media (prefers-color-scheme: dark) { .halftone { mix-blend-mode: screen; } }

/* Nav cards */
.nav-cards { display: grid; grid-template-columns: repeat(var(--cards, 3), 1fr); margin: 3.5rem -1.5rem 0; border-top: var(--hairline) solid var(--border); border-bottom: var(--hairline) solid var(--border); }
.nav-card { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; min-width: 0; padding: 1.25rem 0.375rem 1rem; text-align: center; }
.nav-card + .nav-card { border-left: var(--hairline) solid var(--border); }
.nav-card:active { transform: scale(0.985); }
.vignette { position: relative; display: grid; place-items: center; width: 100%; height: 3.25rem; margin-bottom: 0.25rem; }
.sheets span { position: absolute; width: 2.375rem; height: 2.875rem; transition: transform 300ms var(--ease-spring); background: repeating-linear-gradient(to bottom, transparent 0 7px, color-mix(in oklab, var(--paper-ink) 35%, transparent) 7px 7.5px) 50% 60% / 70% 60% no-repeat, var(--paper); box-shadow: 0 0 0 1px rgb(0 0 0 / 0.08), 0 1px 2px rgb(0 0 0 / 0.12); }
.sheets span:nth-child(1) { transform: rotate(-7deg) translateX(-9px); }
.sheets span:nth-child(2) { transform: rotate(4deg) translateX(9px); }
.sheets span:nth-child(3) { transform: rotate(-1deg) translateY(-2px); }
/* Three spines from the shelf, the last one leaning */
.spines span { position: absolute; bottom: 0.2rem; left: calc(50% - 1.15rem + var(--i) * 0.8rem); width: 0.7rem; height: calc(2.35rem + var(--i) * 0.3rem - var(--i) * var(--i) * 0.2rem); border-radius: 1px; background: var(--book); box-shadow: inset -2px 0 0 rgb(0 0 0 / 0.14), inset 0 3px 0 color-mix(in oklab, var(--book-ink) 30%, transparent), 0 0 0 1px rgb(0 0 0 / 0.06); transform-origin: bottom right; transition: transform 300ms var(--ease-spring); }
.spines span:nth-child(3) { transform: rotate(9deg); }
.tool { position: absolute; left: 50%; top: 50%; width: 3.25rem; height: 3.25rem; overflow: hidden; transform: translate(-50%, -50%); border: var(--hairline) solid color-mix(in oklab, var(--foreground) 20%, var(--border)); border-radius: 0.75rem; background: color-mix(in oklab, var(--foreground) 4%, var(--background)); box-shadow: 0 0 0 1px rgb(0 0 0 / 0.03), 0 1px 1px -0.5px rgb(0 0 0 / 0.06), 0 3px 3px -1.5px rgb(0 0 0 / 0.06); transition: transform 300ms var(--ease-spring); }
.tool .guides-svg { position: absolute; inset: 0; width: 100%; height: 100%; stroke: color-mix(in oklab, var(--foreground) 25%, transparent); stroke-width: 0.65; fill: none; }
.tool .mark-svg { position: absolute; top: 50%; left: 50%; width: 26px; height: 26px; stroke-width: 1.5; color: color-mix(in oklab, var(--foreground) 84%, var(--muted-foreground)); transform: translate(-50%, -50%); transition: transform 300ms var(--ease-spring); }
@media (hover: hover) and (pointer: fine) {
  .nav-card:hover .sheets span:nth-child(1) { transform: rotate(-13deg) translateX(-16px) translateY(-2px); }
  .nav-card:hover .sheets span:nth-child(2) { transform: rotate(9deg) translateX(16px) translateY(-1px); }
  .nav-card:hover .sheets span:nth-child(3) { transform: rotate(-2deg) translateY(-5px); }
  .nav-card:hover .spines span { transform: translateY(-2px); }
  .nav-card:hover .spines span:nth-child(3) { transform: rotate(16deg); }
  .nav-card:hover .tool { transform: translate(-50%, calc(-50% - 2px)); }
  .nav-card:hover .tool .mark-svg { transform: translate(-50%, -50%) rotate(-8deg) scale(1.06); }
}
.nc-label { font-size: 0.8125rem; line-height: 1.25; font-weight: 500; color: var(--foreground); }
.nc-sub { font-size: 0.75rem; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }

/* Numbered section tags: boxed index, hazard hatch, mono label */
.section { margin-top: 4rem; scroll-margin-top: 2rem; }
.section-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.tag { display: inline-flex; align-items: stretch; color: var(--gray-8); font-family: var(--pf-font-geist-mono, "Geist Mono"), ui-monospace, monospace; font-size: 0.75rem; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; }
.tag-index { display: flex; align-items: center; padding: 0.0625rem 0.375rem; border: var(--hairline) solid color-mix(in oklab, var(--muted-foreground) 45%, transparent); font-size: 0.6875rem; font-variant-numeric: tabular-nums; }
.tag-hatch { width: 0.75rem; border: var(--hairline) solid color-mix(in oklab, var(--muted-foreground) 45%, transparent); border-left: none; background: repeating-linear-gradient(-45deg, color-mix(in oklab, var(--muted-foreground) 55%, transparent) 0 1px, transparent 1px 3.5px); }
.tag-label { align-self: center; padding-left: 0.625rem; }
.list { display: flex; flex-direction: column; margin-top: 1rem; }
@media (hover: hover) and (pointer: fine) {
  .focus-list > li { transition: opacity 180ms var(--ease-swift); }
  .focus-list:hover > li:not(:hover):not(:focus-within) { opacity: 0.44; }
}

/* Experience-style rows */
.row { display: grid; grid-template-columns: minmax(0, 1fr) max-content; align-items: start; gap: 1rem; padding: 0.625rem 0; font-size: 0.875rem; line-height: 1.25rem; }
.row-main { display: flex; min-width: 0; align-items: flex-start; gap: 0.75rem; }
.row-text { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 0.125rem; }
.row-title { font-weight: 500; overflow-wrap: anywhere; transition: color 150ms ease; }
a.row-title:hover { color: var(--foreground); }
.row-sub { color: var(--muted-foreground); overflow-wrap: anywhere; }
/* Full month names ("September 2023") wrap on a phone rather than squeeze the name beside them. */
.row-date { max-width: 8.5rem; color: var(--muted-foreground); font-variant-numeric: tabular-nums; text-align: right; }
.row-stat { white-space: nowrap; color: var(--muted-foreground); font-family: var(--pf-font-geist-mono, "Geist Mono"), ui-monospace, monospace; font-size: 0.75rem; letter-spacing: 0.02em; }
.icon { display: flex; align-items: center; justify-content: center; width: 2rem; height: 2rem; flex: none; overflow: hidden; border: var(--hairline) solid color-mix(in oklab, var(--foreground) 20%, var(--border)); border-radius: 0.5rem; background: color-mix(in oklab, var(--foreground) 4%, var(--background)); font-size: 0.6875rem; font-weight: 600; color: var(--muted-foreground); }

/* Writing rows: a print-pile thumb, the title, a dotted leader and the date */
.post { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; font-size: 0.9375rem; }
.pile { position: relative; isolation: isolate; display: block; width: 4rem; height: 2.75rem; flex: none; }
.pile .sheet { position: absolute; inset: 1px; border-radius: 3px; background: var(--paper); box-shadow: 0 0 0 1px color-mix(in oklab, var(--paper-ink) 22%, transparent); }
.pile .sheet:first-child { opacity: 0.62; transform: translate(-2px, 1px) rotate(-1.6deg); }
.pile .sheet:nth-child(2) { opacity: 0.82; transform: translate(2px, -1px) rotate(1.1deg); }
.thumb { position: relative; display: block; width: 4rem; height: 2.75rem; border-radius: 3px; overflow: hidden; box-shadow: 0 0 0 1px var(--border); background: var(--paper); }
/* A dithered print for every post: two dot screens fading across the sheet at the post's own angle */
.thumb::before, .thumb::after { content: ""; position: absolute; inset: 0; background: radial-gradient(circle, var(--foreground) 0.85px, transparent 1.2px) 0 0 / 3px 3px; }
.thumb::before { -webkit-mask-image: linear-gradient(var(--angle, 120deg), #000 10%, transparent 75%); mask-image: linear-gradient(var(--angle, 120deg), #000 10%, transparent 75%); }
.thumb::after { background-size: 2px 2px; background-image: radial-gradient(circle, var(--foreground) 0.6px, transparent 0.85px); -webkit-mask-image: radial-gradient(circle at var(--spot, 70% 40%), #000 0 22%, transparent 60%); mask-image: radial-gradient(circle at var(--spot, 70% 40%), #000 0 22%, transparent 60%); }
.post-title { min-width: 0; color: var(--gray-11); font-weight: 500; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; overflow-wrap: anywhere; }
.leader { flex: 1; min-width: 1.5rem; height: 1px; align-self: center; background: radial-gradient(circle, color-mix(in oklab, var(--muted-foreground) 41%, transparent) 0.5px, transparent 0.5px) 0 0 / 6px 1px repeat-x; }
.post time { flex-shrink: 0; font-size: 0.8125rem; letter-spacing: 0.01em; color: var(--muted-foreground); font-variant-numeric: tabular-nums; }

/* Room shelves: books and records on a wooden plank */
.shelf { position: relative; margin-top: 1.25rem; }
.books { display: flex; align-items: flex-end; gap: 1px; height: 13.5rem; overflow: hidden; }
.book { position: relative; display: block; flex: none; border-radius: 2px; box-shadow: 0 0 0 var(--hairline) rgb(0 0 0 / 0.09), 1px 2px 3px -1px rgb(var(--shelf-shadow) / 0.2), 4px 9px 16px -9px rgb(var(--shelf-shadow) / 0.3); transition: transform 180ms var(--ease-swift); }
@media (hover: hover) and (pointer: fine) { a.book:hover { transform: translateY(-5px); } }
.cover { display: flex; flex-direction: column; gap: 0.25rem; width: 9.25rem; height: 210px; padding: 1rem 0.75rem; border-radius: 2px 4px 4px 2px; background: var(--book, var(--paper)); color: var(--book-ink, var(--paper-ink)); font-size: 0.75rem; line-height: 1.35; }
.cover b { font-weight: 600; font-size: 0.875rem; color: inherit; }
.spine { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; width: var(--w, 32px); height: var(--h, 200px); padding: 0.625rem 0; overflow: hidden; color: var(--book-ink, var(--paper-ink)); background: linear-gradient(to right, rgb(0 0 0 / 0.12), transparent 35%, rgb(255 255 255 / 0.12) 75%, rgb(0 0 0 / 0.08)), var(--book, var(--paper)); box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08); }
.spine-title { flex: 1; min-height: 0; overflow: hidden; font-size: 0.625rem; font-weight: 500; white-space: nowrap; writing-mode: vertical-rl; }
.spine-by { flex: none; font-size: 0.5rem; opacity: 0.72; white-space: nowrap; writing-mode: vertical-rl; max-height: 40%; overflow: hidden; }
.records { display: flex; align-items: flex-end; justify-content: center; height: 7.5rem; }
.sleeve { position: relative; flex: none; display: flex; flex-direction: column; justify-content: flex-end; width: 6.5rem; height: 6.5rem; margin-left: -1.75rem; padding: 0.5rem; border-radius: 2px; background: var(--book); color: var(--book-ink); box-shadow: 0 0 0 var(--hairline) rgb(0 0 0 / 0.09), 4px 9px 16px -9px rgb(var(--shelf-shadow) / 0.4); font-size: 0.625rem; line-height: 1.2; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; transition: transform 180ms var(--ease-swift); }
.sleeve:first-child { margin-left: 0; }
.sleeve.lead { z-index: 2; width: 7.5rem; height: 7.5rem; }
.sleeve::before { content: ""; position: absolute; top: 18%; right: 14%; width: 34%; aspect-ratio: 1; border-radius: 9999px; background: radial-gradient(circle, var(--book-ink) 0 12%, transparent 13% 40%, color-mix(in oklab, var(--book-ink) 40%, transparent) 41% 44%, transparent 45%); opacity: 0.5; }
.sleeve small { display: block; margin-top: 0.125rem; font-weight: 400; text-transform: none; letter-spacing: 0; opacity: 0.75; }
@media (hover: hover) and (pointer: fine) { a.sleeve:hover { transform: translateY(-5px); } }
.plank { position: relative; z-index: 1; display: block; height: 12px; border-radius: 1px 1px 2px 2px; background: radial-gradient(ellipse 22% 38% at 12% 22%, transparent 0 92%, var(--wood-grain) 93% 95%, transparent 96%), radial-gradient(ellipse 32% 42% at 67% 70%, transparent 0 93%, var(--wood-grain) 94% 96%, transparent 97%), linear-gradient(92deg, transparent 0 8%, var(--wood-grain) 14%, transparent 22% 54%, var(--wood-grain) 61%, transparent 72%), linear-gradient(180deg, var(--wood-front-top), var(--wood-front-bottom)); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.28), inset 0 -1px 0 rgb(51 28 10 / 0.2), 1px 3px 3px -2px rgb(var(--shelf-shadow) / 0.24), 3px 10px 16px -8px rgb(var(--shelf-shadow) / 0.34), 6px 24px 34px -18px rgb(var(--shelf-shadow) / 0.28); }
.plank::before { content: ""; position: absolute; top: -6px; left: 0; right: 0; height: 6px; clip-path: polygon(0.8% 0, 99.2% 0, 100% 100%, 0 100%); background: linear-gradient(91deg, transparent 0 16%, var(--wood-grain) 25%, transparent 34% 67%, var(--wood-grain) 75%, transparent 83%), linear-gradient(180deg, var(--wood-top-front), var(--wood-top-back)); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.32); }
.annotation { display: flex; width: max-content; max-width: calc(100% - 2rem); height: 1.75rem; margin: 0.375rem auto 0; align-items: center; justify-content: center; color: var(--muted-foreground); font-size: 0.875rem; line-height: 1; }
.annotation span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Footer: colophon, then contact and index set as folder trees */
.footer { width: 100%; max-width: 37.5rem; margin: 6rem auto 0; padding: 0 1.5rem 6rem; font-size: 0.875rem; color: var(--muted-foreground); }
.footer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2rem 1.5rem; padding-top: 2rem; }
.colophon { grid-column: span 2; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: center; gap: 1.5rem; letter-spacing: -0.011em; color: color-mix(in oklab, var(--muted-foreground) 85%, transparent); font-variant-numeric: tabular-nums; }
.braille { margin-top: 0.25rem; color: color-mix(in oklab, var(--muted-foreground) 55%, transparent); font-size: 0.75rem; line-height: 1; letter-spacing: 0.05em; }
.stamps { display: flex; flex-direction: column; gap: 0.625rem; justify-self: end; }
.stamp { display: flex; align-items: center; gap: 0.5rem; min-height: 1.375rem; color: color-mix(in oklab, var(--muted-foreground) 88%, transparent); font-family: var(--pf-font-geist-mono, "Geist Mono"), ui-monospace, monospace; letter-spacing: 0.02em; }
.stamp svg { width: 1.375rem; height: 1.375rem; flex: none; fill: none; stroke: currentColor; overflow: visible; }
.stamp .globe { stroke-width: 0.7; opacity: 0.5; }
.stamp .ring, .stamp .ticks { opacity: 0.28; stroke-width: 1; stroke-linecap: round; }
.stamp .hour { opacity: 0.78; stroke-width: 1.6; stroke-linecap: round; }
.stamp .minute { opacity: 0.72; stroke-width: 1.2; stroke-linecap: round; }
.stamp .pin { fill: currentColor; stroke: none; }
.readout { display: flex; flex-direction: column; gap: 0.0625rem; font-size: 0.75rem; font-variant-numeric: tabular-nums; }
.readout > span:first-child { letter-spacing: 0.08em; color: color-mix(in oklab, var(--muted-foreground) 72%, transparent); }
.readout time { display: block; min-width: 8ch; white-space: nowrap; }
.footer-label { margin-bottom: 0.375rem; font-size: 0.875rem; font-weight: 500; letter-spacing: -0.011em; text-transform: uppercase; color: color-mix(in oklab, var(--muted-foreground) 75%, transparent); }
.tree li { position: relative; display: flex; align-items: center; min-height: 1.75rem; padding-left: 1.125rem; }
.tree li::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 1px; background: color-mix(in oklab, var(--muted-foreground) 22%, transparent); }
.tree li:last-child::before { bottom: auto; height: 50%; }
.tree li::after { content: ""; position: absolute; left: 0; top: 50%; width: 0.625rem; height: 1px; background: color-mix(in oklab, var(--muted-foreground) 22%, transparent); }
.tree a { transition: color 150ms ease; }
.tree a:hover { color: var(--foreground); }
.ends { margin-top: 2.5rem; display: grid; gap: 0.5rem; }
.ends .credit { justify-content: flex-start; padding: 0; }

/* The pill dock */
.dock { position: fixed; bottom: 0.5rem; left: 50%; z-index: 100; display: flex; align-items: center; gap: 0.25rem; height: 3.5rem; padding: 0.375rem; transform: translateX(-50%); border-radius: 999px; background: color-mix(in oklab, var(--background) 68%, transparent); box-shadow: 0 0 0 1px var(--border), var(--shadow-medium); -webkit-backdrop-filter: blur(12px) saturate(1.4); backdrop-filter: blur(12px) saturate(1.4); }
.dock::before { content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.2), inset 0 -1px 0 rgb(255 255 255 / 0.06); }
.dock-item { position: relative; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: 999px; color: var(--muted-foreground); transition: color 150ms ease, background-color 150ms ease; }
.dock-item:hover { color: var(--foreground); background: color-mix(in oklab, var(--foreground) 6%, transparent); }
.dock-item:active { transform: scale(0.97); }
.dock-item svg { width: 1.125rem; height: 1.125rem; stroke-width: 1.5; }
.dock-avatar { display: block; width: 1.625rem; height: 1.625rem; overflow: hidden; border-radius: 999px; box-shadow: inset 0 0 0 1px var(--border); background: var(--muted); font-size: 0.5625rem; font-weight: 600; line-height: 1.625rem; text-align: center; color: var(--foreground); }
.dock-rule { width: 1px; height: 1.5rem; margin: 0 0.125rem; background: var(--border); }

@container pf (min-width: 640px) {
  .masthead { flex-direction: row; align-items: flex-start; }
  .portrait { width: 15rem; }
  .halftone-ink { font-size: 6rem; }
  .nav-card { gap: 0.25rem; padding: 1.5rem 0.75rem 1.25rem; }
  .vignette { height: 3.5rem; margin-bottom: 0.375rem; }
  .nc-label { font-size: 0.875rem; line-height: 1.5; }
  .nc-sub { font-size: 0.875rem; }
  .post-title { display: block; white-space: nowrap; text-overflow: ellipsis; }
  .row-date { max-width: none; white-space: nowrap; }
  .footer { padding-bottom: 3rem; }
  .footer-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .colophon { grid-column: auto; order: -1; display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 0.625rem; }
  .stamps { justify-self: auto; }
  .dock { bottom: 1.25rem; }
}
@media print { .grain, .guides, .fade, .dock { display: none; } }
`;

export const PAPER_CSS = templateCss(".pf-paper", css);
