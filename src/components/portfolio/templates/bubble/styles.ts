import { templateCss } from "../css";

// Ported from Nuu-maan/portfolio-template (MIT, see ./LICENSE.txt): its Y2K sky, stripe lettering and stickers.

const CSS = `
:scope {
  --pink-hero: #ff6f9c; --pink-deep: #e23f7a; --blue-sky: #b9d8ff; --blue-deep: #5b8def;
  --lavender: #cdb6ff; --lavender-deep: #7452e0; --yellow-sun: #ffd24c; --yellow-deep: #f0a800;
  --cream: #fff6e3; --ink: #1a1a2e;
  --display: var(--pf-font-lilita), "Arial Rounded MT Bold", system-ui, sans-serif;
  --body: var(--pf-font-sora), system-ui, sans-serif;
  --vh: var(--pf-screen, 100svh);
  --shadow: drop-shadow(3px 4px 0 var(--ink));
  position: relative;
  background: var(--blue-sky); color: var(--ink);
  font-family: var(--body); font-size: 15px; line-height: 1.55;
  overflow-x: clip;
}
:scope ::selection { background: var(--pink-hero); color: var(--ink); }
:scope :where(a) { color: inherit; text-decoration: none; }
:scope :where(a, button):focus-visible { outline: 3px solid var(--ink); outline-offset: 3px; }
.defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.display { font-family: var(--display); font-weight: 400; letter-spacing: 0.01em; }
.sticker { filter: var(--shadow); }
.m { display: block; overflow: visible; }

/* ---------- lettering ---------- */
.t-stripe { -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill; text-shadow: 0 4px 0 var(--ink), 0 8px 0 var(--pink-hero), 0 10px 0 var(--ink), 0 14px 0 var(--yellow-sun), 0 16px 0 var(--ink); }
.t-stripe-sm { -webkit-text-stroke: 1.5px var(--ink); paint-order: stroke fill; text-shadow: 0 3px 0 var(--ink), 0 6px 0 var(--pink-hero), 0 8px 0 var(--ink); }
.t-sticker { -webkit-text-stroke: 2px var(--ink); paint-order: stroke fill; text-shadow: 0 4px 0 var(--ink), 0 5px 0 rgba(0, 0, 0, 0.15); }

/* ---------- sections ---------- */
.sec { position: relative; isolation: isolate; min-height: var(--vh); display: flex; flex-direction: column; overflow: hidden; }
.sec::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; color: #fff; opacity: 0.4;
  background-image: linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%), linear-gradient(45deg, transparent 75%, currentColor 75%), linear-gradient(-45deg, transparent 75%, currentColor 75%);
  background-size: 18px 18px; background-position: 0 0, 0 9px, 9px -9px, -9px 0; }
.sec[data-tone="sky"] { background: var(--blue-sky); }
.sec[data-tone="lavender"] { background: var(--lavender); }
.sec[data-tone="lavender"]::before { opacity: 0.35; }
.sec[data-tone="yellow"] { background: var(--yellow-sun); }
.sec[data-tone="yellow"]::before { color: var(--yellow-deep); opacity: 0.45; background-image: radial-gradient(currentColor 1.5px, transparent 1.5px); background-size: 14px 14px; background-position: 0 0; }
.sec[data-tone="cream"] { background: var(--cream); }
.sec[data-tone="cream"]::before { color: var(--pink-hero); opacity: 0.16; }
.sec[data-tone="grape"] { background: var(--lavender-deep); color: var(--cream); }
.sec[data-tone="grape"]::before { color: var(--lavender); opacity: 0.35; }
.inner { position: relative; z-index: 10; width: 100%; max-width: 80rem; margin: 0 auto; padding: 4.5rem 1rem 2.5rem; }

/* ---------- pills, buttons, corner badges ---------- */
.corner { position: absolute; top: 0.75rem; z-index: 30; display: flex; align-items: center; gap: 0.375rem; }
.corner.l { left: 0.75rem; }
.corner.r { right: 0.75rem; }
.pill { display: inline-block; padding: 0.375rem 0.75rem; border: 3px solid var(--ink); border-radius: 999px; font-family: var(--display); font-size: 0.75rem; letter-spacing: 0.1em; line-height: 1.2; filter: var(--shadow); white-space: nowrap; }
.mono-pill { padding: 0.25rem 0.5rem; border: 2px solid var(--ink); border-radius: 0.375rem; font-family: var(--display); font-size: 0.75rem; background: var(--cream); color: var(--ink); filter: var(--shadow); }
.weights { display: flex; gap: 0.375rem; }
.weight { padding: 0.25rem 0.5rem; border: 2px solid var(--ink); border-radius: 0.375rem; font-family: var(--display); font-size: 0.625rem; line-height: 1.15; text-transform: uppercase; filter: var(--shadow); max-width: 7rem; }
[data-c="cream"] { background: var(--cream); color: var(--ink); }
[data-c="ink"] { background: var(--ink); color: var(--cream); }
[data-c="yellow"] { background: var(--yellow-sun); color: var(--ink); }
[data-c="pink"] { background: var(--pink-hero); color: var(--ink); }
[data-c="blue"] { background: var(--blue-sky); color: var(--ink); }
[data-c="lavender"] { background: var(--lavender); color: var(--ink); }
.sub { display: block; }
[data-c="cream"] .sub { color: var(--pink-deep); }
[data-c="ink"] .sub { color: rgba(255, 246, 227, 0.8); }
:where([data-c="yellow"], [data-c="pink"], [data-c="blue"], [data-c="lavender"]) .sub { color: rgba(26, 26, 46, 0.75); }
.btn { display: inline-block; padding: 0.625rem 1.25rem; border: 3px solid var(--ink); border-radius: 999px; font-family: var(--display); font-size: 0.95rem; letter-spacing: 0.02em; text-transform: uppercase; filter: var(--shadow); }
.btn:hover { transform: translateY(2px); }
.btn-yellow { background: var(--yellow-sun); color: var(--ink); }
.btn-cream { background: var(--cream); color: var(--ink); }
.btn-ink { background: var(--ink); color: var(--cream); }
.ctas { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.75rem; }

/* ---------- hero ---------- */
.hero-in { display: flex; flex-direction: column; align-items: center; text-align: center; padding-top: 4rem; }
.stage { position: relative; width: min(100%, 56rem); padding: 2.25rem 1.25rem 3rem; display: flex; flex-direction: column; align-items: center; }
.stage::before { content: ""; position: absolute; inset: 0; z-index: -1; border: 3px solid var(--ink); border-radius: 50%; background: rgba(255, 111, 156, 0.7); }
.stage .pill { position: absolute; top: 0; left: 50%; transform: translate(-50%, -50%); max-width: 92%; overflow: hidden; text-overflow: ellipsis; }
.hero-name { color: var(--cream); font-size: clamp(1.6rem, min(16cqi, calc(min(100cqi - 2.5rem, 50rem) / (var(--chars, 6) * 0.74))), 11rem); line-height: 0.85; padding-bottom: 0.18em; overflow-wrap: anywhere; text-transform: uppercase; }
.hero-name span { display: block; }
.bio { max-width: 36rem; margin-top: 0.75rem; font-size: 0.95rem; font-weight: 500; }
.stage + .ctas { margin-top: -1.4rem; }
.cue { position: absolute; bottom: 0.25rem; left: 50%; z-index: 20; transform: translateX(-50%); font-family: var(--display); font-size: 0.7rem; letter-spacing: 0.2em; pointer-events: none; white-space: nowrap; }

/* ---------- floor, mascots, sky bits ---------- */
.floor { position: relative; z-index: 4; margin-top: auto; height: clamp(8.5rem, 22cqi, 14rem); flex-shrink: 0; }
.floor::before, .floor::after { content: ""; position: absolute; left: 0; right: 0; height: 50%; border-top: 4px solid var(--ink); }
.floor::before { top: 0; background: var(--pink-hero); }
.floor::after { bottom: 0;
  background-color: var(--cream);
  background-image: linear-gradient(45deg, rgba(255, 111, 156, 0.8) 25%, transparent 25%), linear-gradient(-45deg, rgba(255, 111, 156, 0.8) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255, 111, 156, 0.8) 75%), linear-gradient(-45deg, transparent 75%, rgba(255, 111, 156, 0.8) 75%);
  background-size: 18px 18px; background-position: 0 0, 0 9px, 9px -9px, -9px 0; }
.actor { position: absolute; bottom: 4%; z-index: 6; }
.actor .m { width: 100%; height: auto; }
.actor.md, .sky.md { display: none; }
.say { position: absolute; z-index: 7; display: none; }
.bubble-say { position: relative; display: inline-block; padding: 0.5rem 1rem; border: 3px solid var(--ink); border-radius: 24px; background: var(--cream); color: var(--ink); font-family: var(--display); font-size: 1rem; line-height: 1.2; filter: var(--shadow); text-align: left; }
.bubble-say::after { content: ""; position: absolute; left: 1.4rem; bottom: -14px; width: 22px; height: 18px; background: var(--cream); border: 3px solid var(--ink); border-top: 0; clip-path: polygon(0 0, 100% 0, 50% 100%); }
.bubble-say::before { content: ""; position: absolute; left: calc(1.4rem + 3px); bottom: -9px; width: 16px; height: 12px; z-index: 1; background: var(--cream); clip-path: polygon(0 0, 100% 0, 50% 100%); }
.bubble-say em { font-style: normal; color: var(--pink-deep); }
.sky { position: absolute; z-index: 2; pointer-events: none; }
.sky .m { width: 100%; height: auto; }
.sparkle { color: var(--cream); }

/* ---------- browser windows ---------- */
.win { border: 4px solid var(--ink); border-radius: 20px; overflow: hidden; filter: var(--shadow); background: var(--cream); color: var(--ink); min-width: 0; }
.win-bar { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: var(--cream); border-bottom: 3px solid var(--ink); }
.win-bar i { width: 0.75rem; height: 0.75rem; flex-shrink: 0; border-radius: 50%; border: 2px solid var(--ink); }
.win-bar i:nth-child(1) { background: var(--pink-hero); }
.win-bar i:nth-child(2) { background: var(--yellow-sun); }
.win-bar i:nth-child(3) { background: var(--blue-sky); }
.win-title { margin-left: 0.5rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--display); font-size: 0.75rem; color: rgba(26, 26, 46, 0.7); }
.win-body { position: relative; }
.win[data-c="pink"] .win-body { background: var(--pink-hero); }
.win[data-c="blue"] .win-body { background: var(--blue-sky); }
.win[data-c="lavender"] .win-body { background: var(--lavender); }
.win[data-c="yellow"] .win-body { background: var(--yellow-sun); }
.halftone::before { content: ""; position: absolute; inset: 0; pointer-events: none; color: rgba(26, 26, 46, 0.2); background-image: radial-gradient(currentColor 1.5px, transparent 1.5px); background-size: 14px 14px; }

/* ---------- stack ---------- */
.two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
.specimen { display: grid; grid-template-columns: 1fr auto; column-gap: 0.75rem; row-gap: 0.2rem; padding: 0.75rem 1rem; font-family: var(--display); }
.specimen .word { font-size: clamp(1.3rem, 3.2cqi, 2.25rem); line-height: 1.05; -webkit-text-stroke: 1px var(--ink); overflow-wrap: anywhere; }
.specimen .word.group { font-size: clamp(1.1rem, 2.2cqi, 1.5rem); color: rgba(26, 26, 46, 0.6); -webkit-text-stroke: 0; }
.specimen .weight-name { align-self: end; padding-bottom: 0.2rem; font-size: 0.625rem; letter-spacing: 0.12em; color: rgba(26, 26, 46, 0.6); }
.specimen .note { grid-column: 1 / -1; margin-top: 0.5rem; padding-top: 0.5rem; border-top: 2px dashed rgba(26, 26, 46, 0.3); font-family: var(--body); font-size: 0.7rem; color: rgba(26, 26, 46, 0.75); }
.tiles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
.tile { padding: 0.75rem; border: 3px solid var(--ink); border-radius: 1rem; filter: var(--shadow); min-width: 0; }
.tile:nth-child(odd) { rotate: -2deg; }
.tile:nth-child(even) { rotate: 2deg; }
.tile b { display: block; font-family: var(--display); font-weight: 400; font-size: clamp(1.5rem, 3cqi, 1.9rem); line-height: 1; }
.tile span { display: block; margin-top: 0.25rem; font-size: 0.625rem; letter-spacing: 0.1em; text-transform: uppercase; }
.title-xl { color: var(--cream); line-height: 0.85; padding-bottom: 0.3em; font-size: clamp(3.2rem, 12cqi, 9rem); text-transform: uppercase; }
.title-xl .pink { color: var(--pink-hero); }
.title-xl .deep { color: var(--pink-deep); }
.title-xl .yellow { color: var(--yellow-sun); }
.lede { max-width: 28rem; font-size: 0.95rem; color: rgba(26, 26, 46, 0.85); }
.chip-rows { display: grid; gap: 0.75rem; margin-top: 1.25rem; }
.chip-row { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.375rem; }
.chip-label { width: 100%; font-family: var(--display); font-size: 0.625rem; letter-spacing: 0.25em; color: rgba(26, 26, 46, 0.6); text-transform: uppercase; }
.chip { padding: 0.25rem 0.6rem; border: 2px solid var(--ink); border-radius: 999px; font-family: var(--display); font-size: 0.72rem; }
.sec > .marquee { margin-top: auto; }
.sec > .marquee + .floor { margin-top: 0; }
.marquee { position: relative; z-index: 5; overflow: hidden; padding: 0.5rem 0; border-block: 4px solid var(--ink); flex-shrink: 0; }
.marquee[data-c="ink"] { color: var(--yellow-sun); }
.marquee[data-c="pink"] { color: var(--cream); }
.marquee-track { display: flex; width: max-content; }
.marquee-track span { display: flex; align-items: center; gap: 1.5rem; padding: 0 1.5rem; font-family: var(--display); font-size: 1.5rem; white-space: nowrap; text-transform: uppercase; }
.marquee-track span::after { content: ""; width: 0.75rem; height: 0.75rem; border-radius: 50%; background: currentColor; }

/* ---------- jobs ---------- */
.center { display: flex; flex-direction: column; align-items: center; text-align: center; }
.hands { display: flex; align-items: flex-end; justify-content: center; gap: 0.5rem; margin-top: 0.5rem; }
.hands .m { width: 6rem; height: auto; }
.cols { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; max-width: 52rem; margin: 1.5rem auto 0; }
.col { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }
.col-head { padding-left: 0.5rem; font-family: var(--display); font-size: 0.625rem; letter-spacing: 0.3em; color: rgba(26, 26, 46, 0.7); }
.card { padding: 0.75rem 1rem; border: 3px solid var(--ink); border-radius: 1rem; filter: var(--shadow); min-width: 0; }
.card:nth-child(4n + 1) { rotate: -2deg; }
.card:nth-child(4n + 2) { rotate: 2.5deg; }
.card:nth-child(4n + 3) { rotate: -1.5deg; }
.card:nth-child(4n) { rotate: 2deg; }
.card h3 { font-family: var(--display); font-weight: 400; font-size: 1.15rem; line-height: 1.1; }
.card h3 a:hover { text-decoration: underline; text-decoration-thickness: 2px; }
.card .sub { margin-top: 0.15rem; font-family: var(--display); font-size: 0.8rem; }
.card p { margin-top: 0.4rem; font-size: 0.8rem; line-height: 1.45; }
.card .big { font-family: var(--display); font-size: clamp(1.3rem, 2.6cqi, 1.6rem); line-height: 1; }
.col .bubble-say { align-self: flex-start; margin-top: 0.5rem; rotate: -4deg; }

/* ---------- work ---------- */
.work-head { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.75rem; align-items: end; padding: 1rem 1.25rem 1.25rem; }
.work-head .title-xl { font-size: clamp(2.75rem, 10cqi, 8rem); padding-bottom: 0.25em; }
.work-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.builds { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.75rem; margin-top: 1.25rem; }
.build .win-body { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1rem; text-align: center; min-height: 12rem; }
.build .who { position: relative; width: 4.5rem; }
.build .who .m { width: 100%; height: auto; }
.build h3 { position: relative; font-family: var(--display); font-weight: 400; font-size: 1.2rem; line-height: 1; }
.build .kind { position: relative; font-size: 0.625rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(26, 26, 46, 0.7); }
.build p { position: relative; font-size: 0.78rem; line-height: 1.45; max-width: 26rem; }
.build .go { position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 0.4rem; margin-top: auto; }
.build .go a { padding: 0.2rem 0.6rem; border: 2px solid var(--ink); border-radius: 999px; background: var(--cream); font-family: var(--display); font-size: 0.7rem; }
.build .go a:hover { background: var(--ink); color: var(--cream); }
.flower { position: absolute; bottom: 0.25rem; z-index: 6; width: 2.25rem; }
.flower .m { width: 100%; height: auto; }

/* ---------- notebook ---------- */
.books { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.25rem; margin-top: 1.5rem; align-items: start; }
.book-list { padding: 0.5rem 1rem 1rem; }
.book-list li { padding: 0.6rem 0; border-bottom: 2px dashed rgba(26, 26, 46, 0.25); }
.book-list li:last-child { border-bottom: 0; }
.book-list .what { font-family: var(--display); font-size: 1.05rem; line-height: 1.15; }
.book-list a.what:hover { color: var(--pink-deep); }
.book-list .meta { display: block; margin-top: 0.15rem; font-size: 0.72rem; color: rgba(26, 26, 46, 0.7); }

/* ---------- contact ---------- */
.contact .title-xl { color: var(--yellow-sun); font-size: clamp(3.6rem, 16cqi, 13rem); padding-bottom: 0.2em; }
.blurb { max-width: 36rem; margin-top: 1.5rem; font-size: 1rem; color: var(--cream); }
.reach { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0.75rem; width: 100%; margin-top: 1.25rem; padding: 1rem; border: 4px solid var(--ink); border-radius: 1.5rem; background: var(--cream); color: var(--ink); text-align: left; filter: var(--shadow); }
.reach a { display: block; min-width: 0; }
.reach a:hover { transform: translateY(-2px); }
.reach .k { display: block; font-family: var(--display); font-size: 0.625rem; letter-spacing: 0.12em; color: rgba(26, 26, 46, 0.6); }
.reach .v { display: block; font-family: var(--display); font-size: 1rem; overflow-wrap: anywhere; }
.signoff { margin-top: 1rem; font-size: 0.8rem; color: var(--cream); }
.credit { position: relative; z-index: 10; color: var(--cream); }

@container pf (max-width: 639px) {
  .stage { padding: 2.25rem 2rem 3rem; }
  .bio { font-size: 0.875rem; }
}
@container pf (min-width: 640px) {
  .inner { padding: 5rem 1.5rem 3rem; }
  .corner { top: 1.25rem; gap: 0.5rem; }
  .corner.l { left: 1.25rem; }
  .corner.r { right: 1.25rem; }
  .bio { font-size: 1.05rem; }
  .btn { font-size: 1.1rem; padding: 0.75rem 1.5rem; }
  .builds { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .reach { grid-template-columns: repeat(var(--n, 3), minmax(0, 1fr)); }
  .say { display: block; }
}
@container pf (min-width: 768px) {
  :scope { --shadow: drop-shadow(4px 6px 0 var(--ink)); }
  .sec::before { background-size: 24px 24px; background-position: 0 0, 0 12px, 12px -12px, -12px 0; }
  .t-stripe { -webkit-text-stroke: 4px var(--ink); text-shadow: 0 6px 0 var(--ink), 0 12px 0 var(--pink-hero), 0 14px 0 var(--ink), 0 20px 0 var(--yellow-sun), 0 22px 0 var(--ink), 0 28px 0 var(--lavender), 0 30px 0 var(--ink), 0 36px 0 var(--blue-sky), 0 38px 0 var(--ink); }
  .t-stripe-sm { -webkit-text-stroke: 3px var(--ink); text-shadow: 0 4px 0 var(--ink), 0 8px 0 var(--pink-hero), 0 10px 0 var(--ink), 0 14px 0 var(--yellow-sun), 0 16px 0 var(--ink); }
  .t-sticker { -webkit-text-stroke: 3px var(--ink); text-shadow: 0 6px 0 var(--ink), 0 7px 0 rgba(0, 0, 0, 0.15); }
  .weight { font-size: 0.66rem; }
  .actor.md, .sky.md { display: block; }
  .stage { padding: 3rem 4rem 3.75rem; }
  .cols { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .cols.one { grid-template-columns: minmax(0, 32rem); justify-content: center; }
  .books { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .books.one { grid-template-columns: minmax(0, 34rem); justify-content: center; }
  .hands .m { width: 8rem; }
  .work-head { grid-template-columns: minmax(0, 1fr) auto; }
  .work-badges { flex-direction: column; align-items: flex-end; }
  .flower { width: 3rem; }
}
@container pf (min-width: 1024px) {
  .two { grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 2rem; }
  .two > .first { order: 2; }
  .builds { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@container pf (max-width: 520px) {
  .weights .weight:nth-child(n + 3), .corner .hide-s { display: none; }
}
@media (prefers-reduced-motion: no-preference) {
  .bob { animation: bubble-bob 4s ease-in-out infinite; }
  .wobble { animation: bubble-wobble 3s ease-in-out infinite; }
  .spin { animation: bubble-spin 18s linear infinite; }
  .marquee-track { animation: bubble-marquee 22s linear infinite; }
  .enter { animation: bubble-enter 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both; animation-delay: var(--late, 0.6s); }
  .btn, .reach a { transition: transform 0.15s; }
  .reveal { transition: opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1), transform 0.7s cubic-bezier(0.22, 1, 0.36, 1); }
  .reveal[data-shown="false"] { opacity: 0; transform: translateY(28px) scale(0.96) rotate(-3deg); }
  @supports (animation-timeline: view()) {
    .drift { animation: bubble-drift linear both; animation-timeline: view(); }
  }
}
:scope:where([data-pf-still] *, [inert] *) :where(.bob, .wobble, .spin, .marquee-track, .enter, .drift) { animation: none; }
@keyframes bubble-bob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-12px) rotate(2deg); } }
@keyframes bubble-wobble { 0%, 100% { transform: rotate(-6deg); } 50% { transform: rotate(6deg); } }
@keyframes bubble-spin { to { transform: rotate(360deg); } }
@keyframes bubble-marquee { to { transform: translateX(-50%); } }
@keyframes bubble-enter { from { transform: translateY(60px); opacity: 0; } }
@keyframes bubble-drift { from { translate: 0 calc(-1px * var(--speed, 30)); } to { translate: 0 calc(1px * var(--speed, 30)); } }
@media print {
  .sky, .actor, .say, .marquee, .floor, .cue { display: none; }
  .sec { min-height: 0; }
}
`;

export const BUBBLE_CSS = templateCss(".pf-bubble", CSS);
