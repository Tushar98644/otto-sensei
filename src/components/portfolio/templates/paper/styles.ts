import { templateCss } from "../css";

// Ported from umutxyp/Personal-Website (MIT, see ./LICENSE.txt): globals.css and the fox world of themes.css.
const ART = "/portfolio-templates/paper";

const night = `
  --bg: #0d1826;
  --card: #101b27;
  --ink: #e4eef8;
  --soft: #9db1c6;
  --accent: #47b8f5;
  --warm: #ff9770;
  --marker: #1d5c8f;
  --wash: #10283c;
  --leaf-1: #2f86b3;
  --leaf-2: #51aad6;
  --glow: #e6eef8;
  --ground: #050c14;
  --ground-ink: #dcddde;
  --ground-soft: #9b9ea1;
  --world: url("${ART}/dark/world-0.svg");
  --world-still: url("${ART}/dark/world-0-still.svg");
  --line-0: url("${ART}/dark/line-0.svg");
  --line-1: url("${ART}/dark/line-1.svg");
  --line-2: url("${ART}/dark/line-2.svg");
  --grow-0: url("${ART}/dark/grow-0.svg");
  --grow-1: url("${ART}/dark/grow-1.svg");
  --grow-2: url("${ART}/dark/grow-2.svg");
  --grow-3: url("${ART}/dark/grow-3.svg");
  --perch: url("${ART}/dark/perch.svg");
  --ground-art: url("${ART}/dark/ground.svg");
  color-scheme: dark;
`;

const wave = (size: string) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='9' viewBox='0 0 28 9'%3E%3Cpath d='M0 4.5C3.5 4.5 3.5 1.6 7 1.6S10.5 4.5 14 4.5S17.5 7.4 21 7.4S24.5 4.5 28 4.5' fill='none' stroke='%23000' stroke-width='3.2' stroke-linecap='round'/%3E%3C/svg%3E") left center / ${size} repeat-x`;

const css = `
:scope {
  --bg: #e9f4fd;
  --card: #ffffff;
  --ink: #14273d;
  --soft: #4d6379;
  --accent: #2188e0;
  --warm: #ff8559;
  --marker: #bfe2ff;
  --wash: #d6ecfa;
  --leaf-1: #86cfe0;
  --leaf-2: #4fa9cc;
  --glow: #fff0c0;
  --ground: #16314c;
  --ground-ink: #dee2e6;
  --ground-soft: #a2adb7;
  --world: url("${ART}/light/world-0.svg");
  --world-still: url("${ART}/light/world-0-still.svg");
  --line-0: url("${ART}/light/line-0.svg");
  --line-1: url("${ART}/light/line-1.svg");
  --line-2: url("${ART}/light/line-2.svg");
  --grow-0: url("${ART}/light/grow-0.svg");
  --grow-1: url("${ART}/light/grow-1.svg");
  --grow-2: url("${ART}/light/grow-2.svg");
  --grow-3: url("${ART}/light/grow-3.svg");
  --perch: url("${ART}/light/perch.svg");
  --ground-art: url("${ART}/light/ground.svg");
  --hand: var(--pf-font-shantell, "Shantell Sans"), "Comic Sans MS", "Segoe Print", cursive, sans-serif;
  --marker-font: var(--pf-font-gochi, "Gochi Hand"), var(--pf-font-shantell, "Shantell Sans"), cursive;
  color-scheme: light;
  position: relative;
  min-height: var(--pf-screen, 100vh);
  overflow-x: clip;
  background: var(--bg);
  color: var(--soft);
  font-family: var(--hand);
  font-variation-settings: "BNCE" 12, "INFM" 100, "SPAC" 0;
  font-size: 1.125rem;
  line-height: 1.6;
  transition: background-color 0.35s ease, color 0.35s ease;
}
@media (prefers-color-scheme: dark) {
  :scope:not([data-mode="light"]) { ${night} }
}
:scope[data-mode="dark"] { ${night} }
::selection { background: var(--marker); color: var(--ink); }
a { color: inherit; }
h1, h2, h3, h4 { color: var(--ink); font-weight: 800; font-variation-settings: "BNCE" 34, "INFM" 70, "SPAC" 0; line-height: 1.15; }
strong, b { color: var(--ink); font-weight: 800; }
mark {
  color: var(--ink);
  font-weight: 800;
  background: linear-gradient(102deg, transparent 1.5%, var(--marker) 4%, var(--marker) 95%, transparent 98.5%);
  border-radius: 0.6em 0.25em 0.7em 0.3em / 0.3em 0.7em 0.25em 0.6em;
  padding: 0.02em 0.28em;
  margin: 0 -0.08em;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
button { font: inherit; cursor: pointer; }
.wrap { width: min(1120px, 100% - 40px); margin-inline: auto; }

/* a wavy pen stroke under a title */
.wavy { position: relative; }
.wavy::after { content: ""; position: absolute; left: 0; bottom: 0; width: 100%; height: 9px; background: var(--accent); -webkit-mask: ${wave("28px 9px")}; mask: ${wave("28px 9px")}; }
.link { color: var(--accent); font-weight: 800; text-decoration: underline wavy; text-decoration-thickness: 1.5px; text-underline-offset: 5px; }
.link:hover { text-decoration-thickness: 2.5px; }

/* frames: a box as a pen draws it, with a plain border until the ink line is drawn */
.sketch { position: relative; display: block; background: var(--card); border: 2.5px solid var(--ink); border-radius: 21px; color: inherit; text-decoration: none; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.35s ease; }
.sketch[data-framed] { border-color: transparent; }
.frame-ink { position: absolute; left: -2.5px; top: -2.5px; overflow: visible; pointer-events: none; }
.frame-ink path { fill: none; stroke: var(--ink); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 0; }
a.sketch:hover { transform: translateY(-4px) rotate(-0.4deg); }
.tag { display: inline-flex; align-items: center; gap: 0.4em; padding: 0.18em 0.95em 0.22em; color: var(--ink); font-weight: 800; font-size: 0.96em; white-space: nowrap; text-decoration: none; background: var(--card); border: 2.3px solid var(--ink); border-radius: 19px 24px 21px 26px / 25px 19px 26px 20px; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), background-color 0.2s ease; }
a.tag:hover, button.tag:hover { transform: translateY(-3px) rotate(-1.5deg); background: var(--marker); }
.tag.small { font-weight: 500; font-size: 0.86em; border-width: 1.8px; padding: 0.1em 0.8em 0.14em; }

/* the theme's drawings */
.pic { display: block; position: relative; pointer-events: none; user-select: none; background-repeat: no-repeat; background-size: 100% 100%; }
.strip.line-0 { background-image: var(--line-0); }
.strip.line-1 { background-image: var(--line-1); }
.strip.line-2 { background-image: var(--line-2); }
.grown[data-pic="grow-0"] { background-image: var(--grow-0); }
.grown[data-pic="grow-1"] { background-image: var(--grow-1); }
.grown[data-pic="grow-2"] { background-image: var(--grow-2); }
.grown[data-pic="grow-3"] { background-image: var(--grow-3); }
.perch { background-image: var(--perch); }

/* header */
.header { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--bg) 88%, transparent); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); border-bottom: 2px dashed color-mix(in srgb, var(--ink) 22%, transparent); }
.header .wrap { display: flex; align-items: center; gap: 18px; min-height: 64px; }
.brand { display: flex; align-items: center; gap: 10px; min-width: 0; color: var(--ink); font-weight: 800; font-size: 1.188rem; text-decoration: none; white-space: nowrap; }
.brand-name { overflow: hidden; text-overflow: ellipsis; }
.brand-mark { display: grid; flex: none; place-items: center; width: 30px; height: 30px; border: 2px solid var(--ink); border-radius: 55% 45% 60% 40%; background: var(--marker); color: var(--ink); font-size: 0.75rem; line-height: 1; transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.brand:hover .brand-mark { transform: rotate(-12deg) scale(1.15); }
.nav { display: none; gap: 4px; margin-left: auto; }
.nav a { padding: 4px 11px; color: var(--soft); text-decoration: none; font-weight: 500; white-space: nowrap; border-radius: 14px 30px 16px 26px / 26px 14px 30px 16px; }
.nav a:hover { color: var(--ink); background: var(--wash); }
.picker { flex: none; margin-left: auto; }
.nav + .picker { margin-left: 0; }
.picker-button .dot { width: 0.72em; height: 0.72em; border: 1.6px solid var(--ink); border-radius: 60% 40% 55% 45%; background: var(--accent); }

/* the hero: the name in the sky, the world under it */
.hero { position: relative; padding-top: clamp(26px, 5cqw, 70px); }
.hero-text { position: relative; z-index: 1; padding: 0 20px; text-align: center; }
.hero h1 { font-family: var(--marker-font); font-variation-settings: normal; font-weight: 400; font-size: clamp(2.9rem, 12.4cqw, 8.6rem); line-height: 1; letter-spacing: -0.01em; overflow-wrap: anywhere; }
.hero .underline { position: relative; display: block; width: min(78%, 46rem); height: clamp(18px, 3cqw, 34px); margin: 0.35em auto 0; }
.hero .underline i { position: absolute; left: 0; top: 0; width: 100%; height: 45%; background: var(--accent); -webkit-mask: ${wave("auto 100%")}; mask: ${wave("auto 100%")}; }
.hero .underline i + i { left: 38%; top: 62%; width: 60%; height: 32%; opacity: 0.65; }
.hero .roles { display: flex; flex-wrap: wrap; justify-content: center; gap: 0 0.9em; margin: 0.5em 0 0; font-size: clamp(1.02rem, 2.1cqw, 1.55rem); }
.hero .roles li + li::before { content: "~"; margin-right: 0.9em; color: var(--accent); font-weight: 800; }
.scene { position: relative; height: clamp(250px, 36cqw, 660px); margin-top: clamp(6px, 2cqw, 28px); background: var(--world) 65% 100% / cover no-repeat; pointer-events: none; -webkit-mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 86%, transparent); mask-image: linear-gradient(to bottom, transparent, #000 18%, #000 86%, transparent); }
:scope:where([data-pf-still] *, [inert] *) .scene { background-image: var(--world-still); }
@media (prefers-reduced-motion: reduce) {
  .scene { background-image: var(--world-still); }
}

/* bubbles off the writing, drawn behind the letters */
.fx { position: relative; isolation: isolate; }
.fx-heading { flex: none; }
.fx-layer { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.fx-p { position: absolute; left: var(--x); top: var(--y); width: var(--s); height: var(--s); opacity: 0; animation: paper-fx var(--t) cubic-bezier(0.25, 0.6, 0.35, 1) forwards; }
.fx-bubble { border: 1.6px solid var(--accent); border-radius: 50%; background: radial-gradient(circle at 32% 30%, color-mix(in srgb, #fff 70%, transparent) 0 18%, transparent 30%); --o: 0.75; }
@keyframes paper-fx {
  0% { opacity: 0; transform: translate(0, 0) rotate(0) scale(0.5); }
  15% { opacity: var(--o, 0.9); }
  70% { opacity: var(--o, 0.9); }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(var(--r)) scale(1); }
}
:scope[data-mode="dark"] .hero h1 { text-shadow: 0 0 28px color-mix(in srgb, var(--glow) 22%, transparent); }
@media (prefers-color-scheme: dark) {
  :scope:not([data-mode="light"]) .hero h1 { text-shadow: 0 0 28px color-mix(in srgb, var(--glow) 22%, transparent); }
}

/* sections */
.section { margin-top: 64px; }
.heading { display: flex; align-items: flex-end; gap: 26px; margin-bottom: 26px; scroll-margin-top: 90px; }
.heading h2 { position: relative; flex: none; font-size: clamp(1.875rem, 4.6cqw, 2.75rem); padding-bottom: 12px; }
.heading .strip { display: none; flex: 1; min-width: 0; aspect-ratio: 900 / 84; margin-bottom: -4px; }
.reveal[data-reveal] { transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1); }
.reveal[data-reveal="waiting"] { opacity: 0; transform: translateY(18px); }
.links { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 12px; margin-top: 26px; }
.note { font-size: clamp(1.125rem, 2.1cqw, 1.375rem); line-height: 1.65; }
.note + .note { margin-top: 0.8em; }
.more { margin-top: 14px; }
.more.spaced { margin-top: 18px; }

/* the numbers */
.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px 12px; margin-top: 44px; text-align: center; }
.stats[data-n="1"] { grid-template-columns: 1fr; }
.stat b { display: inline-block; font-size: clamp(2.125rem, 5.4cqw, 3.625rem); line-height: 1.1; }
.stat b mark { padding: 0 0.22em; }
.stat span { display: block; margin-top: 6px; font-size: 1.062rem; }

/* the lead project, framed with plants and the fox on top */
.studio { margin-top: 96px; padding: 26px 20px 22px; }
.studio .perch { position: absolute; right: 6%; bottom: calc(100% - 3px); z-index: 1; width: min(190px, 30%); aspect-ratio: 260 / 170; }
.studio .grown { display: none; position: absolute; left: 2%; bottom: calc(100% - 5px); width: min(560px, 56%); aspect-ratio: 600 / 80; }
.studio-head { display: flex; align-items: center; gap: 16px; }
.studio-head h3 { font-size: clamp(1.625rem, 3.6cqw, 2.375rem); }
.studio-head p { font-size: 1.125rem; }
.studio-head p a { color: var(--accent); font-weight: 800; text-decoration: none; }
.studio > p { margin-top: 14px; font-size: 1.188rem; }
.studio .products { display: flex; flex-wrap: wrap; gap: 8px 10px; margin-top: 16px; }
.studio .figures { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px 26px; margin-top: 20px; padding-top: 16px; border-top: 2px dashed color-mix(in srgb, var(--ink) 30%, transparent); font-size: 1.125rem; }
.logo { display: grid; flex: none; place-items: center; width: 54px; height: 54px; border: 2.2px solid var(--ink); border-radius: 34% 30% 36% 28% / 30% 36% 28% 34%; background: var(--marker); color: var(--ink); font-family: var(--marker-font); font-size: 1.75rem; line-height: 1; }

/* project cards, each with plants growing along its top */
.cards { display: grid; grid-template-columns: 1fr; gap: 78px 26px; margin-top: 84px; }
.card { padding: 22px 24px 20px; }
.card .grown { position: absolute; left: 0; right: 0; bottom: calc(100% - 5px); aspect-ratio: 600 / 80; }
.card-head { display: flex; align-items: center; gap: 14px; }
.card-head h3 { font-size: 1.688rem; }
.card-head div > span { display: block; color: var(--accent); font-size: 0.9688rem; word-break: break-all; }
.card > p { margin-top: 14px; min-height: 3.2em; }
.card .figures { display: flex; flex-wrap: wrap; gap: 6px 20px; margin-top: 12px; font-size: 1.031rem; }

/* jobs */
.job { margin-top: 30px; padding: 22px 26px 20px; }
.job:first-of-type { margin-top: 0; }
.job-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px; }
.job-head h3 { font-size: 1.625rem; }
.job-head h3 a { color: inherit; text-decoration: underline wavy var(--accent); text-decoration-thickness: 2px; text-underline-offset: 6px; }
.job-head .role { color: var(--accent); font-weight: 800; }
.job-head .when { margin-left: auto; font-size: 1rem; }
.job-lead { margin-top: 10px; }
.job ul { margin: 12px 0 0; padding-left: 22px; list-style: disc; }
.job li { margin-top: 8px; }
.job li::marker { content: "~  "; color: var(--accent); font-weight: 800; }

/* tech stack */
.stack { display: flex; flex-wrap: wrap; justify-content: center; gap: 16px 38px; color: var(--ink); font-weight: 800; font-variation-settings: "BNCE" 34, "INFM" 70; font-size: clamp(1.25rem, 2.6cqw, 1.688rem); }
.stack li { text-decoration: underline wavy; text-decoration-thickness: 2px; text-underline-offset: 8px; text-decoration-color: var(--leaf-2); }
.stack li:nth-child(3n + 1) { text-decoration-color: var(--accent); }

/* lists of things */
.rows > li { padding: 18px 0 16px; border-bottom: 2px dashed color-mix(in srgb, var(--ink) 22%, transparent); }
.rows > li:last-child { border-bottom: 0; }
.row-head { display: flex; align-items: baseline; gap: 12px; }
.row-head::before { content: ""; flex: none; align-self: center; width: 15px; height: 15px; background: var(--leaf-1); border: 2px solid var(--ink); border-radius: 2px 60% 8px 60%; transform: rotate(-20deg); }
.rows > li:nth-child(3n + 2) .row-head::before { background: var(--leaf-2); transform: rotate(14deg); }
.rows > li:nth-child(3n) .row-head::before { background: var(--warm); }
.row-title { color: var(--ink); font-weight: 800; font-variation-settings: "BNCE" 34, "INFM" 70; font-size: 1.438rem; }
a.row-title { text-decoration: underline wavy var(--accent); text-decoration-thickness: 2px; text-underline-offset: 6px; }
a.row-title:hover { color: var(--accent); }
.row-head .stars { margin-left: auto; color: var(--ink); font-weight: 800; white-space: nowrap; }
.star { display: inline-block; width: 0.95em; height: 0.95em; margin-right: 0.3em; vertical-align: -0.1em; background: var(--warm); clip-path: polygon(50% 2%, 62% 36%, 98% 36%, 69% 58%, 80% 94%, 50% 72%, 20% 94%, 31% 58%, 2% 36%, 38% 36%); }
.rows p { margin: 6px 0 0 27px; }
.rows .meta { font-size: 0.9688rem; }

/* footer: the world's land, and the ground it stands on */
.footer { margin-top: 90px; }
.footer .ground { height: clamp(110px, 10.8cqw, 260px); background: var(--ground-art) 80% 100% / cover no-repeat; }
.footer-body { --ink: var(--ground-ink); --soft: var(--ground-soft); --card: color-mix(in srgb, var(--ground) 86%, #fff); --marker: color-mix(in srgb, var(--accent) 50%, var(--ground)); margin-top: -1px; padding: 26px 0 40px; background: var(--ground); color: var(--soft); text-align: center; }
.footer-body h4 { margin-bottom: 14px; font-size: 1.375rem; color: var(--ink); }
.theme-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
.theme-row .tag[aria-pressed="true"] { background: var(--marker); }
.footer-body .small { margin-top: 22px; font-size: 1rem; }
.footer-body .credit { padding: 12px 0 0; color: var(--ink); }

@container pf (min-width: 23.75rem) {
  .brand { font-size: 1.188rem; }
}
@container pf (min-width: 35.01rem) {
  .hero .roles { flex-direction: row; }
}
@container pf (max-width: 35rem) {
  .hero .roles { flex-direction: column; gap: 0; }
  .hero .roles li + li::before { content: none; }
}
@container pf (min-width: 45.01rem) {
  .heading .strip { display: block; }
  .stats { grid-template-columns: repeat(4, 1fr); }
  .stats[data-n="1"] { grid-template-columns: 1fr; }
  .stats[data-n="2"] { grid-template-columns: repeat(2, 1fr); }
  .stats[data-n="3"] { grid-template-columns: repeat(3, 1fr); }
}
@container pf (min-width: 47.51rem) {
  .studio { padding: 30px 34px 26px; }
  .studio .grown { display: block; }
  .cards { grid-template-columns: repeat(2, 1fr); }
}
@container pf (min-width: 56.26rem) {
  .nav { display: flex; }
}

@media (prefers-reduced-motion: no-preference) {
  .hero h1 { animation: paper-write 1.5s cubic-bezier(0.6, 0.1, 0.3, 1) 0.2s both; }
  .hero .underline i { animation: paper-grow 0.8s cubic-bezier(0.6, 0.1, 0.3, 1) 1.5s both; }
  .hero .underline i + i { animation-delay: 2s; }
  .hero .roles { animation: paper-rise 0.7s ease 2.2s both; }
  .scene { animation: paper-fade 0.8s ease both; }
  .wavy::after { animation: paper-grow 0.8s cubic-bezier(0.6, 0.1, 0.3, 1) 0.25s both; }
  .frame-ink path { stroke-dashoffset: 1; animation: paper-draw 1.1s cubic-bezier(0.6, 0.1, 0.3, 1) 0.1s forwards; }
}
:scope:where([data-pf-still] *, [inert] *) :where(.hero h1, .hero .underline i, .hero .roles, .scene) { animation: none; }
:scope:where([data-pf-still] *, [inert] *) .wavy::after { animation: none; }
:scope:where([data-pf-still] *, [inert] *) .frame-ink path { animation: none; stroke-dashoffset: 0; }
@keyframes paper-write { from { clip-path: inset(-20% 100% -30% 0); } to { clip-path: inset(-20% -5% -30% 0); } }
@keyframes paper-grow { from { width: 0; } }
@keyframes paper-rise { from { opacity: 0; transform: translateY(8px); } }
@keyframes paper-fade { from { opacity: 0; } }
@keyframes paper-draw { to { stroke-dashoffset: 0; } }
@media print {
  .header, .scene, .footer .ground, .theme-row, .fx-layer, .pic { display: none; }
}
`;

export const PAPER_CSS = templateCss(".pf-paper", css);
