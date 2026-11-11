import { templateCss } from "../css";

// Ported from antfu/antfu.me (code MIT, see ./LICENSE.txt; the site's words and pictures are
// CC BY-NC-SA and none of them are here): the UnoCSS utilities and scoped styles of
// src/components/{NavBar,ListProjects,ListPosts,Footer}.vue and src/styles/{main,prose,
// markdown}.css written out as CSS. Breakpoints (md 768, lg 1024, xl 1280) are container
// queries on the template root. Fonts as the original: Inter, DM Mono and, for the inline link
// chips, Roboto Condensed.
const css = `
:scope {
  --c-bg: #fff;
  --fg-light: #888;
  --fg: #555;
  --fg-deep: #222;
  --fg-deeper: #000;
  --plum: #88888825;
  color-scheme: light;
  position: relative;
  isolation: isolate;
  min-height: var(--pf-screen, 100vh);
  background: var(--c-bg);
  color: #000;
  font-family: var(--pf-font-inter, "Inter"), ui-sans-serif, system-ui, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  overflow-x: clip;
}
@media (prefers-color-scheme: dark) {
  :scope {
    --c-bg: #050505;
    --fg: #bbb;
    --fg-deep: #ddd;
    --fg-deeper: #fff;
    color-scheme: dark;
    color: #fff;
  }
}
::selection { background: #8884; }
a { color: inherit; text-decoration: none; }
code { font-family: var(--pf-font-dm-mono, "DM Mono"), ui-monospace, monospace; font-size: 0.875em; }
svg { flex: none; }

/* slide-enter (main.css): 10px up and in over 1s, one 90ms stage after another */
@media (prefers-reduced-motion: no-preference) {
  .slide-enter, .slide-enter-content > * {
    --enter-stage: 0;
    --enter-step: 90ms;
    --enter-initial: 0ms;
    animation: prose-slide-enter 1s both 1;
    animation-delay: calc(var(--enter-initial) + var(--enter-stage) * var(--enter-step));
  }
  .slide-enter-content > :nth-child(1) { --enter-stage: 1; }
  .slide-enter-content > :nth-child(2) { --enter-stage: 2; }
  .slide-enter-content > :nth-child(3) { --enter-stage: 3; }
  .slide-enter-content > :nth-child(4) { --enter-stage: 4; }
  .slide-enter-content > :nth-child(5) { --enter-stage: 5; }
  .slide-enter-content > :nth-child(6) { --enter-stage: 6; }
  .slide-enter-content > :nth-child(7) { --enter-stage: 7; }
  .slide-enter-content > :nth-child(8) { --enter-stage: 8; }
  .slide-enter-content > :nth-child(9) { --enter-stage: 9; }
  .slide-enter-content > :nth-child(10) { --enter-stage: 10; }
  .slide-enter-content > :nth-child(n + 11) { --enter-stage: 11; }
}
@keyframes prose-slide-enter { 0% { translate: 0 10px; opacity: 0; } to { translate: 0 0; opacity: 1; } }

/* ArtPlum: the branches drawn behind the page */
.plum { position: fixed; inset: 0; z-index: -1; pointer-events: none; -webkit-mask-image: radial-gradient(circle, transparent, black); mask-image: radial-gradient(circle, transparent, black); }
.plum canvas { display: block; }

/* NavBar.vue */
.header { position: relative; z-index: 40; }
.logo { position: absolute; display: flex; align-items: center; justify-content: center; width: 3rem; height: 3rem; margin: 1.25rem; user-select: none; outline: none; color: var(--fg-deeper); font-family: var(--pf-font-dm-mono, "DM Mono"), ui-monospace, monospace; font-size: 1.125rem; letter-spacing: -0.04em; }
.logo span { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; border: 1.5px solid currentColor; border-radius: 9999px; opacity: 0.85; }
.nav { display: grid; grid-template-columns: auto max-content; width: 100%; padding: 2rem; }
.nav > * { margin: auto; }
.nav .right { display: grid; grid-auto-flow: column; gap: 1.2rem; align-items: center; }
.nav .right > * { margin: auto; }
.nav a { display: flex; align-items: center; cursor: pointer; color: inherit; opacity: 0.6; transition: opacity 0.2s ease; outline: none; }
.nav a:hover { opacity: 1; }
.nav svg { width: 1.2em; height: 1.2em; }
.nav .label { display: none; }
.nav .wide { display: none; }

.page { padding: 2.5rem 1.75rem; overflow-x: hidden; }

/* prose.css + markdown.css */
.prose { max-width: 65ch; margin: 0 auto; color: var(--fg); font-size: 1rem; line-height: 1.75; }
.prose p { margin: 1.25em 0; }
.prose a { color: var(--fg-deeper); font-weight: inherit; border-bottom: 1px solid rgba(125, 125, 125, 0.3); transition: border 0.3s ease-in-out; }
.prose a:hover { border-bottom-color: var(--fg); }
.prose strong { color: var(--fg-deep); font-weight: 600; }
.prose h1 { color: var(--fg-deeper); font-weight: 500; font-size: 2.25em; margin: 0 0 0.8888889em; line-height: 1.1111111; }
.prose h2 { color: var(--fg-deep); font-weight: 700; font-size: 1.5em; margin: 2em 0 1em; line-height: 1.3333333; }
.prose hr { width: 50px; margin: 2em auto; border: 0; border-top: 1px solid rgba(125, 125, 125, 0.3); }
.prose code { color: var(--fg-deep); }
.title { margin-bottom: 2rem; }
.title h1 { margin-bottom: 0; }
.subtitle { margin-top: -1.5rem !important; opacity: 0.5; font-style: italic; }

/* The inline link chips ("magic links"), each with a monogram in its own colour */
.chip { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.25rem 0.375rem; border-radius: 0.25rem; background: #8882; transform: translateY(3px); line-height: 100%; color: var(--fg-light) !important; border: 0 !important; font-family: var(--pf-font-roboto-condensed, "Roboto Condensed"), var(--pf-font-inter, "Inter"), sans-serif; transition: all 150ms; }
a.chip:hover { background: #8883; color: var(--fg) !important; }
.chip .mono { display: inline-flex; flex: none; align-items: center; justify-content: center; min-width: 1.1em; height: 1.1em; padding: 0 0.15em; white-space: nowrap; border-radius: 0.1875rem; background: oklch(0.62 0.14 var(--hue, 250)); box-shadow: inset 0 -1px 0 rgb(0 0 0 / 0.15); color: #fff; font-family: var(--pf-font-inter, "Inter"), sans-serif; font-size: 0.55em; font-weight: 700; letter-spacing: -0.02em; }
.lines .label { color: var(--fg); }

.socials { display: flex; flex-wrap: wrap; gap: 0.5rem 0.75rem; }
.socials a { display: inline-flex; align-items: center; gap: 0.25rem; border: 0; }
.socials svg { width: 1.1em; height: 1.1em; }

/* ListProjects.vue */
.projects { max-width: 75rem; margin: 0 auto; }
.group-label { position: relative; height: 4.5rem; margin-top: 1.25rem; user-select: none; pointer-events: none; }
.group-label span { position: absolute; left: -1rem; top: 0; color: transparent; font-size: 5em; font-weight: 700; line-height: 1em; -webkit-text-stroke: 1.5px #aaa; opacity: 0.35; white-space: nowrap; }
.project-grid { display: grid; grid-template-columns: 1fr; gap: 1rem; width: max-content; max-width: 125rem; margin: 0 auto; padding: 0.5rem 0; }
.item { position: relative; display: flex; align-items: center; width: 350px; max-width: 100%; padding: 0.5rem 0.875rem 0.875rem; border-radius: 6px; background: transparent; font-size: 1.1rem; opacity: 0.6; transition: 0.2s all ease-out; }
.item:hover { opacity: 1; background: #88888811; }
.item-icon { padding: 0.5rem 1.25rem 0 0; opacity: 0.5; }
.item-icon .mono { display: flex; align-items: center; justify-content: center; width: 2.25rem; height: 2.25rem; border: 1.5px solid currentColor; border-radius: 0.5rem; font-size: 0.9rem; font-weight: 700; letter-spacing: -0.03em; }
.item-body { flex: auto; min-width: 0; }
.item-name { font-weight: 400; }
.item-desc { font-size: 0.875rem; line-height: 1.25rem; opacity: 0.5; font-weight: 400; }

/* ListPosts.vue (talks and writing) */
.list { margin-top: 1rem; }
.year { position: relative; height: 5rem; user-select: none; pointer-events: none; }
.year span { position: absolute; left: -3rem; top: -2rem; color: transparent; font-size: 8em; font-weight: 700; line-height: 1; -webkit-text-stroke: 2px #aaa; opacity: 0.1; }
.post { display: block; margin: 0.5rem 0 1.5rem; font-weight: 400; border: 0 !important; opacity: 0.6; transition: 0.2s all ease-out; }
.post:hover { opacity: 1; }
.post-row { display: flex; flex-direction: column; gap: 0.5rem; }
.post-title { display: flex; gap: 0.5rem; font-size: 1.125rem; line-height: 1.2em; color: var(--fg-deeper); }
.post-title svg { align-self: center; width: 0.75rem; height: 0.75rem; opacity: 0.5; }
.post-meta { display: flex; gap: 0.5rem; align-items: center; white-space: nowrap; font-size: 0.875rem; line-height: 1.25rem; }
.post-meta svg { width: 1.1em; height: 1.1em; opacity: 0.5; }
.post-meta .when { opacity: 0.5; }
.post-meta .more { opacity: 0.4; }
.post-place { display: none; margin-top: -0.5rem; font-size: 0.875rem; opacity: 0.5; }

.foot { display: flex; flex-direction: column; gap: 0.25rem; margin: 2.5rem auto 1.5rem; }
.foot > * { font-size: 0.875rem; line-height: 1.25rem; }
.foot .credit { justify-content: flex-start; padding: 0.25rem 0 0; opacity: 0.8; }

/* NavBar's scroll-to-top button */
.to-top { position: fixed; right: 0.75rem; bottom: 0.75rem; z-index: 100; display: flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; border: 0; border-radius: 9999px; background: transparent; color: inherit; opacity: 0; pointer-events: none; cursor: pointer; transition: all 300ms; }
.to-top[data-shown="true"] { opacity: 0.3; pointer-events: auto; }
.to-top:hover { opacity: 1; background: #8883; }
.to-top svg { width: 1.2em; height: 1.2em; }

@container pf (min-width: 768px) {
  .nav .label { display: inline; }
  .nav .icon-sm { display: none; }
  .nav .wide { display: flex; }
  .project-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .post-row { flex-direction: row; align-items: center; }
  .post-meta .place-sm { display: none; }
  .post-place { display: block; }
}
@container pf (min-width: 1024px) {
  .project-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media print { .plum, .to-top, .nav .right { display: none; } }
`;

export const PROSE_CSS = templateCss(".pf-prose", css);
