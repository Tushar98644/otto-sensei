import { templateCss } from "../css";

// Ported from samuelkraft/samuelkraft-next (MIT, see ./LICENSE.txt): the Tailwind classes in
// pages/{_app,index}.tsx, components/{header,Link,Workplaces}.tsx and styles/globals.css written
// out as CSS. The original sets html to 14px, so every rem there is 14px here. Radix Sand
// (@radix-ui/colors, MIT) supplies the colours, light and dark like the original's system
// theme. Breakpoint (md 768) is a container query on the template root. Inter, as the original.
const css = `
:scope {
  --sand1: #fdfdfc;
  --sand3: #f1f0ef;
  --sand4: #e9e8e6;
  --sand6: #dad9d6;
  --sand11: #63635e;
  --sand12: #21201c;
  --sandA4: rgb(31 21 0 / 0.1);
  --tile: #101010;
  --header: rgb(253 253 252 / 0.8);
  --inner-shadow: rgb(0 0 0 / 0.1);
  position: relative;
  min-height: var(--pf-screen, 100vh);
  background: var(--sand1);
  color: var(--sand12);
  font-family: var(--pf-font-inter, "Inter"), ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  line-height: 21px;
  font-weight: 500;
  overflow-x: clip;
}
@media (prefers-color-scheme: dark) {
  :scope {
    --sand1: #111110;
    --sand3: #222221;
    --sand4: #2a2a28;
    --sand6: #3b3a37;
    --sand11: #b5b3ad;
    --sand12: #eeeeec;
    --sandA4: rgb(255 250 213 / 0.12);
    --header: rgb(21 21 20 / 0.8);
    --inner-shadow: rgb(255 255 255 / 0.1);
    color-scheme: dark;
  }
}
a { color: inherit; text-decoration: none; }
.secondary { color: var(--sand11); }
.ext { text-decoration-line: underline; text-decoration-style: dotted; text-underline-offset: 2px; }
.ext:hover { text-decoration-style: solid; }

/* animate-in: 18px up and in, 500ms, 90ms apart */
@media (prefers-reduced-motion: no-preference) {
  .in { animation: folio-in 500ms both; animation-delay: calc(var(--index, 0) * 90ms); }
}
@keyframes folio-in { 0% { transform: translateY(18px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }

/* Hovering a list dims its other rows */
.animated-list > li { transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1); }
@media (hover: hover) {
  .animated-list:hover > li { opacity: 0.5; }
  .animated-list:hover > li:hover { opacity: 1; }
}

/* Header (components/header.tsx): a stack of ever-blurrier layers fading out below 48px */
.header { position: sticky; top: 0; z-index: 10; height: 48px; margin-bottom: -48px; pointer-events: none; }
.blur { position: absolute; inset: 0 0 auto 0; height: 112px; z-index: -1; }
.blur > div { position: absolute; inset: 0; }

.main { max-width: 640px; margin: 0 auto; padding: 70px 14px 84px; }
.stack { display: flex; flex-direction: column; gap: 56px; }
.intro { display: flex; flex-direction: column; gap: 14px; }
.avatar { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 9999px; background: var(--sand4); color: var(--sand11); font-size: 10px; font-weight: 600; }
h1 { font-size: 14px; line-height: 21px; font-weight: 500; }
.intro .mark { color: var(--sand12); }
.connect { display: flex; flex-wrap: wrap; gap: 4px 21px; }
.connect li { color: var(--sand11); }
.connect li:hover { color: var(--sand12); }

.block { display: flex; flex-direction: column; gap: 14px; }
.block > h2 { color: var(--sand11); font-size: 14px; line-height: 21px; font-weight: 500; }

/* Projects (SelectedProjects) */
.projects { display: flex; flex-direction: column; gap: 14px; }
.card { position: relative; display: flex; flex-direction: column; gap: 14px; margin: 0 -14px; padding: 14px; border-radius: 14px; transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1); }
.card:hover { background: var(--sandA4); }
.card > .cover { position: absolute; inset: 0; z-index: 0; border-radius: 14px; }
.card > .graphic, .card > .text { position: relative; z-index: 10; pointer-events: none; }
.card > .text { display: flex; flex-direction: column; gap: 3.5px; }
h3 { font-size: 14px; line-height: 21px; font-weight: 500; }
.tile { position: relative; isolation: isolate; display: grid; place-items: center; height: 283px; overflow: hidden; border-radius: 10.5px; background: radial-gradient(60% 80% at var(--glow-x, 50%) 50%, oklch(0.42 0.12 var(--hue, 250) / 0.35), transparent 70%), var(--tile); }
/* A faint dot screen behind the icon, fading out from the middle */
.tile::before { content: ""; position: absolute; inset: 0; z-index: -1; background: radial-gradient(rgb(255 255 255 / 0.09) 1px, transparent 1.4px) 0 0 / 14px 14px; -webkit-mask-image: radial-gradient(circle at 50% 50%, #000, transparent 65%); mask-image: radial-gradient(circle at 50% 50%, #000, transparent 65%); }
.app-icon { display: flex; align-items: center; justify-content: center; width: 120px; height: 120px; border-radius: 27px; background: linear-gradient(160deg, oklch(0.72 0.14 var(--hue-2, 250)), oklch(0.42 0.13 var(--hue, 250)) 75%); box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.3), inset 0 0 0 1px rgb(255 255 255 / 0.1), 0 10px 30px rgb(0 0 0 / 0.5); color: #fff; font-size: 40px; font-weight: 600; letter-spacing: -0.02em; text-shadow: 0 1px 2px rgb(0 0 0 / 0.25); }
@media (prefers-reduced-motion: no-preference) { .app-icon { transition: transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1); } .card:hover .app-icon { transform: scale(1.04) rotate(-2deg); } }

/* Work (components/Workplaces.tsx) */
.places { display: flex; flex-direction: column; gap: 28px; }
.place { display: flex; justify-content: space-between; gap: 14px; }
a.place { margin: -7px -10.5px; padding: 7px 10.5px; }
.place-main { display: flex; align-items: center; gap: 14px; min-width: 0; }
.logo { display: flex; flex: none; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 9999px; background: var(--sand4); color: var(--sand11); font-size: 14px; font-weight: 600; }
.place-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
/* Full month names ("September 2023") wrap on a phone rather than squeeze the name beside them. */
.place time { flex: 0 1 auto; max-width: 40%; overflow-wrap: normal; color: var(--sand11); font-variant-numeric: tabular-nums; text-align: right; }
.external-arrow::after { content: "↗"; margin-left: 3px; color: var(--sand11); }

/* Posts (SelectedPosts) */
.posts { width: 100%; }
.post { display: flex; align-items: center; gap: 14px; margin: 0 -14px; padding: 14px; border-radius: 14px; transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1); }
a.post:hover { background: var(--sandA4); }
.post-title { display: flex; flex: 1; flex-wrap: wrap; align-items: baseline; gap: 3.5px 10.5px; min-width: 0; }
.post time { flex-shrink: 0; text-align: right; font-variant-numeric: tabular-nums; color: var(--sand11); }

.foot { margin-top: 84px; color: var(--sand11); }
.foot .credit { justify-content: flex-start; padding: 12px 0 0; }

@container pf (min-width: 768px) {
  .main { padding: 70px 21px 154px; }
  .stack { gap: 84px; }
}
`;

export const FOLIO_CSS = templateCss(".pf-folio", css);
