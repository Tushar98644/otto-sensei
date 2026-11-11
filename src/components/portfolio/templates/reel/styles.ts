import { scopeCss, templateCss } from "../css";

// HamishMW/portfolio's styles (MIT, see ./LICENSE.txt), rule for rule, with CSS-module nesting
// written out flat and class names carrying their module's name. Changes:
// - his viewport media queries are container queries on the page's box, so a preview column gets
//   the phone layout; 100vh is one screen of that box (--pf-screen) and 100vw is its width;
// - Gotham (paid) is Montserrat, and IPA Gothic falls back to the system's Japanese face.
// Our additions sit at the end: WebGL still frames, the extra sections, per-project pages.

const MONTSERRAT = `var(--pf-font-montserrat, "Montserrat")`;

const css = `
:scope {
  --black: oklch(0% 0 0);
  --white: oklch(100% 0 0);
  --bezierFastoutSlowin: cubic-bezier(0.4, 0.0, 0.2, 1);
  --durationXS: 200ms;
  --durationS: 300ms;
  --durationM: 400ms;
  --durationL: 600ms;
  --durationXL: 800ms;
  --systemFontStack: system-ui, -apple-system, BlinkMacSystemFont, San Francisco, Roboto, Segoe UI, Ubuntu, Helvetica Neue, sans-serif;
  --fontStack: ${MONTSERRAT}, var(--systemFontStack);
  --japaneseFontStack: IPA Gothic, ヒラギノ角ゴ Pro W3, Hiragino Kaku Gothic Pro, Hiragino Sans, Osaka, メイリオ, Meiryo, Segoe UI, sans-serif;
  --fontWeightRegular: 400;
  --fontWeightMedium: 500;
  --fontWeightBold: 700;
  --lineHeightTitle: 1.1;
  --lineHeightBody: 1.6;
  --zIndex0: 0;
  --zIndex1: 4;
  --zIndex2: 8;
  --zIndex3: 16;
  --zIndex4: 32;
  --zIndex5: 64;
  --screen: var(--pf-screen, 100vh);
  position: relative;
  isolation: isolate;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  font-family: var(--fontStack);
  font-weight: var(--fontWeightRegular);
  background-color: var(--background);
  transition: var(--durationM) ease;
  transition-property: background, opacity;
  color: var(--textBody);
  width: 100%;
  overflow-wrap: normal;
  line-height: normal;
}
:scope[data-theme="dark"] {
  --background: oklch(17.76% 0 0);
  --backgroundLight: oklch(21.78% 0 0);
  --primary: oklch(84.42% 0.19 202.24);
  --accent: oklch(84.42% 0.19 202.24);
  --error: oklch(65.91% 0.249 13.76);
  --text: var(--white);
  --textTitle: var(--text);
  --textBody: color-mix(in lab, var(--text) 80%, transparent);
  --textLight: color-mix(in lab, var(--text) 60%, transparent);
  color-scheme: dark;
}
:scope[data-theme="light"] {
  --background: oklch(96.12% 0 0);
  --backgroundLight: var(--white);
  --primary: var(--black);
  --accent: oklch(84.42% 0.19 202.24);
  --error: oklch(63.17% 0.259 25.41);
  --text: var(--black);
  --textTitle: color-mix(in lab, var(--text) 90%, transparent);
  --textBody: color-mix(in lab, var(--text) 75%, transparent);
  --textLight: color-mix(in lab, var(--text) 55%, transparent);
  color-scheme: light;
}

/* Size tokens (theme.js), by the page's width */
.shell {
  --fontSizeH0: 8.75rem;
  --fontSizeH1: 6.25rem;
  --fontSizeH2: 3.625rem;
  --fontSizeH3: 2.375rem;
  --fontSizeH4: 1.75rem;
  --fontSizeH5: 1.5rem;
  --fontSizeBodyXL: 1.375rem;
  --fontSizeBodyL: 1.25rem;
  --fontSizeBodyM: 1.125rem;
  --fontSizeBodyS: 1rem;
  --fontSizeBodyXS: 0.875rem;
  --maxWidthS: 540px;
  --maxWidthM: 720px;
  --maxWidthL: 1096px;
  --maxWidthXL: 1680px;
  --spaceOuter: 64px;
  --spaceXS: 4px;
  --spaceS: 8px;
  --spaceM: 16px;
  --spaceL: 24px;
  --spaceXL: 32px;
  --space2XL: 48px;
  --space3XL: 64px;
  --space4XL: 96px;
  --space5XL: 128px;
  position: relative;
  width: 100%;
}
@container pf (max-width: 2080px) {
  .shell { --fontSizeH0: 7.5rem; --fontSizeH1: 5rem; }
}
@container pf (max-width: 1680px) {
  .shell { --maxWidthS: 480px; --maxWidthM: 640px; --maxWidthL: 1000px; --maxWidthXL: 1100px; --spaceOuter: 48px; --fontSizeH0: 6.25rem; --fontSizeH1: 4.375rem; --fontSizeH2: 3.125rem; --fontSizeH3: 2.25rem; --fontSizeH4: 1.625rem; --fontSizeH5: 1.375rem; }
}
@container pf (max-width: 1040px) {
  .shell { --fontSizeH0: 5rem; --fontSizeH1: 3.75rem; --fontSizeH2: 3rem; --fontSizeH3: 2rem; --fontSizeH4: 1.5rem; --fontSizeH5: 1.25rem; }
}
@container pf (max-width: 696px) {
  .shell { --spaceOuter: 24px; --fontSizeH0: 3.5rem; --fontSizeH1: 2.5rem; --fontSizeH2: 2.125rem; --fontSizeH3: 1.75rem; --fontSizeH4: 1.375rem; --fontSizeH5: 1.125rem; --fontSizeBodyL: 1.0625rem; --fontSizeBodyM: 1rem; --fontSizeBodyS: 0.875rem; }
}
@container pf (max-width: 400px) {
  .shell { --spaceOuter: 16px; --fontSizeH0: 2.625rem; --fontSizeH1: 2.375rem; --fontSizeH2: 1.75rem; --fontSizeH3: 1.5rem; --fontSizeH4: 1.25rem; }
}

/* reset.module.css, global.module.css */
:where(*, *::before, *::after) { box-sizing: border-box; margin: 0; min-width: 0; }
:where(input, textarea, select, button) { font: inherit; color: inherit; border: 0; padding: 0; background-color: transparent; border-radius: 0; appearance: none; }
:where(button, a) { touch-action: manipulation; }
:where(svg, img, picture, video, iframe, canvas) { display: block; }
:any-link { text-decoration: none; color: inherit; }
ul { padding: 0; }
::selection { background: var(--accent); color: var(--black); }
:focus { outline: 4px solid var(--text); outline-offset: 4px; }
:focus:not(:focus-visible) { outline: none; }
.screen-ruler { position: absolute; top: 0; left: 0; width: 0; height: var(--screen); pointer-events: none; visibility: hidden; }
.sprites { position: absolute; width: 0; height: 0; overflow: hidden; }
.home { position: relative; width: 100%; overflow-x: clip; }

/* components/visually-hidden */
.visually-hidden { border: 0; clip: rect(0 0 0 0); height: 1px; width: 1px; margin: -1px; padding: 0; overflow: hidden; position: absolute; white-space: nowrap; word-wrap: normal; }

/* components/heading */
.heading { line-height: var(--lineHeightTitle); color: var(--textTitle); font-weight: var(--fontWeightMedium); }
.heading[data-level="0"] { letter-spacing: -0.05em; font-size: var(--fontSizeH0); }
.heading[data-level="1"] { letter-spacing: -0.05em; font-size: var(--fontSizeH1); }
.heading[data-level="2"] { font-size: var(--fontSizeH2); letter-spacing: -0.04em; }
.heading[data-level="3"] { font-size: var(--fontSizeH3); letter-spacing: -0.02em; }
.heading[data-level="4"] { font-size: var(--fontSizeH4); letter-spacing: -0.01em; }
.heading[data-level="5"] { font-size: var(--fontSizeH5); }

/* components/text */
.text { line-height: var(--lineHeightBody); color: var(--textBody); }
.text[data-size="s"] { font-size: var(--fontSizeBodyS); }
.text[data-size="m"] { font-size: var(--fontSizeBodyM); }
.text[data-size="l"] { font-size: var(--fontSizeBodyL); }
.text[data-size="xl"] { font-size: var(--fontSizeBodyXL); }
.text[data-align="center"] { text-align: center; }
.text[data-weight="medium"] { font-weight: var(--fontWeightMedium); }
.text[data-secondary="true"] { color: var(--textLight); }
.text .mark { color: var(--textTitle); }

/* components/link */
.link {
  --lineStrokeWidth: 2px;
  --linkColor: var(--primary);
  --lineOpacity: 30%;
  --filledLineGradient: linear-gradient(var(--linkColor), var(--linkColor));
  --unfilledLineGradient: linear-gradient(color-mix(in lab, var(--linkColor) var(--lineOpacity), transparent), color-mix(in lab, var(--linkColor) var(--lineOpacity), transparent));
  cursor: pointer;
  display: inline;
  color: var(--linkColor);
  background: var(--filledLineGradient) no-repeat 100% 100% / 0 var(--lineStrokeWidth), var(--unfilledLineGradient) no-repeat 0 100% / 100% var(--lineStrokeWidth);
  padding-bottom: var(--lineStrokeWidth);
}
.link:hover, .link:focus { background: var(--filledLineGradient) no-repeat 0 100% / 100% var(--lineStrokeWidth), var(--unfilledLineGradient) no-repeat 0 100% / 100% var(--lineStrokeWidth); }
@media (prefers-reduced-motion: no-preference) {
  .link { transition-duration: var(--durationM); transition-timing-function: var(--bezierFastoutSlowin); transition-property: background-size; }
}
.link[data-secondary="true"] { --linkColor: var(--text); }

/* components/icon */
.icon { fill: currentColor; }

/* components/button */
.button {
  --buttonSize: 3.5rem;
  --buttonFontSize: 1.125rem;
  --buttonFocusWidth: 4px;
  --buttonPadding: 0 var(--spaceL);
  --buttonTextColor: var(--background);
  --buttonTextOpacity: 1;
  height: var(--buttonSize);
  padding: var(--buttonPadding);
  cursor: pointer;
  transition-property: opacity, color, background;
  transition-duration: var(--durationS);
  transition-timing-function: var(--bezierFastoutSlowin);
  display: inline-flex;
  align-items: center;
  color: var(--buttonTextColor);
  position: relative;
  isolation: isolate;
}
.button:active { transition-duration: calc(var(--durationXS) / 2); }
.button::after {
  content: "";
  transition-property: opacity, color, background;
  transition-duration: var(--durationM);
  transition-timing-function: var(--bezierFastoutSlowin);
  background: var(--primary);
  position: absolute;
  inset: 0;
  z-index: -1;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}
@media (prefers-reduced-motion: no-preference) {
  .button { transition-property: transform, opacity, color, background; }
  .button:hover { transform: scale(1.05); }
  .button:active { transform: scale(1); }
}
.button[data-secondary="true"] { --buttonSpace: 10px; --buttonTextColor: var(--primary); background: none; padding-left: var(--buttonSpace); padding-right: var(--buttonSpace); position: relative; left: calc(var(--buttonSpace) * -1); height: 2rem; }
.button[data-secondary="true"]::after { content: ""; height: 2rem; position: absolute; inset: 0; background-color: color-mix(in lab, var(--primary) 20%, transparent); transform: scale3d(0, 1, 1); transform-origin: right; clip-path: none; }
.button[data-secondary="true"]:hover { transform: none; background: transparent; }
.button[data-secondary="true"]:hover::after { transform: scale3d(1, 1, 1); transform-origin: left; }
.button[data-secondary="true"][data-icon="chevron-right"] { padding-left: calc(var(--buttonSpace) / 2); }
@media (prefers-reduced-motion: no-preference) {
  .button[data-secondary="true"]::after { transition: transform var(--durationM) var(--bezierFastoutSlowin); }
}
.button[data-icon-only="true"] { --buttonPadding: 0; --buttonTextColor: var(--textBody); width: var(--buttonSize); align-items: center; justify-content: center; padding: 0; }
.button[data-icon-only="true"]:hover { transform: none; }
.button[data-icon-only="true"]::after { background: color-mix(in lab, var(--text) 0%, transparent); }
.button[data-icon-only="true"]:hover::after { background: color-mix(in lab, var(--text) 10%, transparent); }
.button-text { font-size: var(--buttonFontSize); font-weight: var(--fontWeightMedium); opacity: var(--buttonTextOpacity); position: relative; line-height: 1; flex: 1 1 auto; display: flex; align-items: center; justify-content: center; transition: opacity var(--durationM) var(--bezierFastoutSlowin); }
.button-icon { transition-property: opacity, fill; transition-duration: var(--durationS); transition-timing-function: var(--bezierFastoutSlowin); }
@media (prefers-reduced-motion: no-preference) {
  .button-icon { transition-property: transform, opacity, fill; }
  .button:hover .button-icon[data-shift="true"] { transform: translate3d(var(--spaceXS), 0, 0); }
}
.button-icon[data-start="true"] { margin-right: var(--spaceS); }
.button-icon[data-end="true"] { margin-left: var(--spaceS); }

/* components/divider */
.divider { position: relative; width: var(--lineWidth, 100%); height: var(--lineHeight, 2px); }
.divider-line { width: 100%; height: 100%; background-color: var(--primary); opacity: 1; transition-property: opacity; transition-duration: var(--durationL); transition-timing-function: var(--bezierFastoutSlowin); transition-delay: var(--collapseDelay); transform-origin: left center; transform: scaleX(1); }
.divider-line[data-collapsed="true"] { opacity: 0; transform: scaleX(0); }
.divider-notch { background-color: var(--primary); position: absolute; transition-property: opacity; transition-duration: var(--durationL); transition-timing-function: var(--bezierFastoutSlowin); transition-delay: var(--collapseDelay); opacity: 1; clip-path: polygon(0 -1px, 100% -1px, calc(100% - 10px) 100%, 10px 100%); width: var(--notchWidth); height: var(--notchHeight); top: var(--lineHeight, 2px); }
.divider-notch[data-collapsed="true"] { opacity: 0; clip-path: polygon(0 -1px, 0 -1px, 10px 100%, 10px 100%); }
@media (prefers-reduced-motion: no-preference) {
  .divider-line { transition-property: transform, opacity; }
  .divider-notch { transition-property: clip-path, opacity; }
}

/* components/loader */
.loader { display: grid; grid-template-columns: 100%; width: 32px; height: 4px; background: color-mix(in lab, currentColor 20%, transparent); }
.loader[data-center="true"] { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.loader-text { color: inherit; font-weight: var(--fontWeightMedium); }
.loader-span { grid-area: 1 / 1; background: currentColor; animation: reel-loader 0.7s var(--bezierFastoutSlowin) infinite; transform: scaleX(0); transform-origin: left; }

/* components/decoder-text */
.decoder::after { content: "_"; visibility: hidden; }
.decoder-glyph { opacity: 0.8; font-weight: var(--fontWeightRegular); font-family: var(--japaneseFontStack); line-height: 0; }
.decoder-value { opacity: 1; }

/* components/section */
.section { padding-right: var(--space5XL); padding-left: calc(var(--space4XL) * 2); }
.section:focus { outline: none; }
@container pf (min-width: 2080px) { .section { padding-left: var(--space5XL); } }
@container pf (max-width: 1040px) { .section { padding-left: calc(var(--space4XL) + var(--space3XL)); } }
@container pf (max-width: 696px) { .section { padding-right: var(--spaceL); padding-left: var(--spaceL); } }
@container pf (max-width: 696px) { .section { padding-left: var(--spaceOuter); padding-right: var(--spaceOuter); } }
@media (max-height: 696px) { .section { padding-left: var(--spaceOuter); padding-right: var(--spaceOuter); } }
@media (max-height: 420px) { @container pf (max-width: 820px) { .section { padding-left: var(--space4XL); padding-right: var(--space4XL); } } }

/* components/monogram */
.monogram { fill: var(--textTitle); transition: fill var(--durationL) ease; }
.monogram-text { font-family: var(--fontStack); font-weight: var(--fontWeightBold); font-size: 31px; letter-spacing: -0.04em; }
.monogram-highlight { fill: var(--accent); opacity: 0; transform: scale3d(1, 0, 1); transform-origin: top; transition: opacity 0.1s ease var(--durationM); }
@media (prefers-reduced-motion: no-preference) {
  .monogram-highlight { transition: transform var(--durationM) var(--bezierFastoutSlowin), opacity 0.1s ease var(--durationM); }
}
:is(a:hover, .monogram:hover) .monogram-highlight { opacity: 1; transform: scale3d(1, 1, 1); transform-origin: bottom; transition: opacity 0.1s ease; }
@media (prefers-reduced-motion: no-preference) {
  :is(a:hover, .monogram:hover) .monogram-highlight { transition: transform var(--durationM) var(--bezierFastoutSlowin), opacity 0.1s ease; }
}

/* layouts/navbar */
.navbar { --headerNavFontSize: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 0; width: var(--space2XL); position: fixed; top: var(--spaceOuter); left: var(--spaceOuter); bottom: var(--spaceOuter); z-index: var(--zIndex4); isolation: isolate; }
@container pf (max-width: 696px) { .navbar { --headerNavFontSize: 1.375rem; bottom: auto; } }
@media (max-height: 696px) { .navbar { bottom: auto; } }
.navbar-logo { display: flex; position: relative; padding: var(--spaceS) var(--spaceS) var(--spaceL); z-index: var(--zIndex2); }
@container pf (max-width: 696px) { .navbar-logo { padding-bottom: var(--spaceS); } }
.navbar-nav { display: flex; flex-direction: column; justify-content: space-between; align-items: center; flex: 1 1 auto; max-width: var(--space2XL); }
@container pf (max-width: 696px) { .navbar-nav { display: none; } }
@media (max-height: 696px) { .navbar-nav { display: none; } }
.navbar-nav-list { transform: rotate(180deg); display: flex; flex-direction: row-reverse; position: relative; writing-mode: vertical-lr; }
.navbar-nav-link { padding: var(--spaceM); color: color-mix(in lab, var(--text) 80%, transparent); font-weight: var(--fontWeightMedium); font-size: var(--headerNavFontSize); text-decoration: none; position: relative; transition: color var(--durationS) ease 0.1s; line-height: 1; display: inline-flex; align-items: center; }
.navbar-nav-link:hover, .navbar-nav-link:active, .navbar-nav-link[aria-current="page"] { color: var(--textBody); }
.navbar-nav-link::after { content: ""; position: absolute; inset-inline-start: var(--spaceS); inset-inline-end: var(--spaceS); block-size: 4px; background: var(--accent); transform: scaleY(0) translateZ(0); transform-origin: bottom; }
@media (prefers-reduced-motion: no-preference) { .navbar-nav-link::after { transition: transform var(--durationM) var(--bezierFastoutSlowin); } }
.navbar-nav-link:hover::after, .navbar-nav-link:active::after, .navbar-nav-link[aria-current="page"]::after { transform: scaleY(1) translateZ(0); transform-origin: top; }
.navbar-nav-icons { display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: var(--zIndex2); }
@container pf (max-width: 696px) { .navbar-nav-icons { flex-direction: row; position: absolute; bottom: var(--spaceXL); left: var(--spaceXL); } }
@media (max-height: 696px) { .navbar-nav-icons { flex-direction: row; position: absolute; bottom: var(--spaceXL); left: var(--spaceXL); } }
@media (max-height: 420px) { @container pf (max-width: 820px) { .navbar-nav-icons { left: var(--spaceL); transform: none; flex-direction: column; align-items: center; justify-content: center; } } }
.navbar-nav-icon-link { display: flex; align-items: center; justify-content: center; padding: var(--spaceS); width: var(--space2XL); height: var(--space2XL); color: var(--textLight); transition: color var(--durationM) var(--bezierFastoutSlowin); }
.navbar-nav-icon-link:hover, .navbar-nav-icon-link:active { color: var(--accent); }
.navbar-nav-icon { fill: currentColor; transition: fill var(--durationM) ease; }
.navbar-nav-icon-outline { width: 24px; height: 24px; }
.navbar-mobile-nav { --backdrop: blur(24px) saturate(120%); position: fixed; inset: 0; background: color-mix(in lab, var(--background) 70%, transparent); transform: translate3d(0, -100%, 0); transition-property: background; transition-duration: var(--durationL); transition-timing-function: var(--bezierFastoutSlowin); display: none; flex-direction: column; align-items: center; justify-content: center; -webkit-backdrop-filter: var(--backdrop); backdrop-filter: var(--backdrop); }
@container pf (max-width: 696px) { .navbar-mobile-nav { display: flex; } }
@media (max-height: 696px) { .navbar-mobile-nav { display: flex; } }
@media (prefers-reduced-motion: no-preference) { .navbar-mobile-nav { transition-property: transform, background; } }
.navbar-mobile-nav[data-visible="true"] { transform: none; }
.navbar-mobile-nav-link { width: 100%; font-size: var(--headerNavFontSize); text-align: center; text-decoration: none; color: var(--textBody); padding: var(--spaceL); opacity: 0; transition-property: opacity; transition-duration: var(--durationS); transition-timing-function: var(--bezierFastoutSlowin); transition-delay: var(--transitionDelay); position: relative; top: calc(var(--spaceM) * -1); }
@media (prefers-reduced-motion: no-preference) { .navbar-mobile-nav-link { transition-property: transform, opacity; transform: translate3d(0, calc(var(--spaceXL) * -1), 0); } }
@media (max-height: 420px) { @container pf (max-width: 820px) { .navbar-mobile-nav-link { top: auto; } } }
@container pf (max-width: 400px) { .navbar-mobile-nav-link { --headerNavFontSize: 1.125rem; } }
@media (max-height: 360px) { .navbar-mobile-nav-link { --headerNavFontSize: 1.125rem; } }
.navbar-mobile-nav-link::after { content: ""; position: absolute; top: 50%; right: var(--space3XL); left: var(--space3XL); height: 4px; background: var(--accent); transform: scaleX(0) translateY(-1px); transform-origin: right; }
@media (prefers-reduced-motion: no-preference) { .navbar-mobile-nav-link::after { transition: transform var(--durationM) var(--bezierFastoutSlowin); } }
.navbar-mobile-nav-link:hover::after, .navbar-mobile-nav-link:active::after, .navbar-mobile-nav-link:focus::after { transform: scaleX(1) translateY(-1px); transform-origin: left; }
.navbar-mobile-nav-link[data-visible="true"] { opacity: 1; transform: none; }

/* layouts/navbar/theme-toggle */
.theme-toggle { --offset: 6px; --inset: calc(var(--spaceOuter) - var(--offset)); position: fixed; z-index: var(--zIndex4); top: var(--inset); right: var(--inset); transform: translate3d(0, 0, 0); }
@container pf (max-width: 696px) { .theme-toggle:not([data-mobile="true"]) { display: none; } }
@media (max-height: 696px) { .theme-toggle:not([data-mobile="true"]) { display: none; } }
.theme-toggle[data-mobile="true"] { --offset: var(--spaceXS); --inset: calc(var(--spaceXL) - var(--offset)); top: unset; bottom: var(--inset); margin-top: 0; margin-right: 0; }
.theme-toggle-circle { fill: currentColor; transform: scale(0.6); transform-origin: center; }
.theme-toggle-circle[data-mask="true"] { fill: white; }
.theme-toggle-mask { fill: black; transform: translate3d(100%, -100%, 0); }
.theme-toggle-path { stroke: currentColor; fill: none; stroke-linecap: round; stroke-width: 3; stroke-dasharray: 7 7; stroke-dashoffset: 0; opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .theme-toggle-circle { transition-property: transform, fill; transition-duration: var(--durationL); transition-delay: 0s; transition-timing-function: var(--bezierFastoutSlowin); }
  .theme-toggle-mask { transition: transform var(--durationL) var(--bezierFastoutSlowin); transition-delay: 0s; }
  .theme-toggle-path { transition-property: stroke-dashoffset, opacity; transition-duration: var(--durationL); transition-timing-function: var(--bezierFastoutSlowin); transition-delay: 0.3s; }
}
:scope[data-theme="dark"] .theme-toggle-circle { transform: none; }
:scope[data-theme="dark"] .theme-toggle-mask { transform: none; }
:scope[data-theme="dark"] .theme-toggle-path { stroke-dashoffset: 7; opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  :scope[data-theme="dark"] .theme-toggle-circle { transition-delay: 0.3s; }
  :scope[data-theme="dark"] .theme-toggle-mask { transition-delay: 0.3s; }
  :scope[data-theme="dark"] .theme-toggle-path { transition-delay: 0s; }
}

/* layouts/navbar/nav-toggle */
.nav-toggle { --offset: var(--spaceXS); --inset: calc(var(--spaceOuter) - var(--offset)); position: fixed; top: var(--inset); right: var(--inset); z-index: var(--zIndex4); display: none; }
@container pf (max-width: 696px) { .nav-toggle { display: flex; } }
@media (max-height: 696px) { .nav-toggle { display: flex; } }
.nav-toggle-inner { display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; }
.nav-toggle-icon { --iconSize: var(--spaceXL); position: absolute; transition-property: opacity, fill; transition-duration: var(--durationM); transition-timing-function: var(--bezierFastoutSlowin); opacity: 1; transform: rotate(0deg); fill: var(--textBody); width: var(--iconSize); height: var(--iconSize); }
@media (prefers-reduced-motion: no-preference) { .nav-toggle-icon { transition-delay: 0.1s; transition-property: opacity, transform, fill; } }
.nav-toggle-icon[data-open="true"] { opacity: 0; }
@media (prefers-reduced-motion: no-preference) { .nav-toggle-icon[data-open="true"] { transition-delay: 0s; transform: rotate(45deg); } }
.nav-toggle-icon[data-close="true"] { opacity: 0; }
@media (prefers-reduced-motion: no-preference) { .nav-toggle-icon[data-close="true"] { transition-delay: 0s; transform: rotate(-45deg); } }
.nav-toggle-icon[data-open="true"][data-close="true"] { opacity: 1; }
@media (prefers-reduced-motion: no-preference) { .nav-toggle-icon[data-open="true"][data-close="true"] { transition-delay: 0.1s; transform: rotate(0deg); } }

/* routes/home/intro */
.intro { height: var(--screen); display: flex; align-items: center; justify-content: center; flex-direction: column; }
.intro-text { max-width: 1024px; width: 100%; position: relative; top: calc(var(--spaceL) * -1); }
@container pf (max-width: 2080px) { .intro-text { max-width: 920px; } }
@container pf (max-width: 1680px) { .intro-text { max-width: 780px; } }
@container pf (max-width: 696px) { .intro-text { top: calc(var(--space3XL) * -1); } }
@container pf (max-width: 400px) { .intro-text { top: calc(var(--spaceXL) * -1); } }
@media (max-height: 420px) { @container pf (max-width: 820px) { .intro-text { top: calc(var(--spaceM) * -1); } } }
.intro-name { text-transform: uppercase; font-size: 1.5rem; letter-spacing: 0.3em; color: var(--textLight); margin-bottom: var(--space2XL); margin-top: 0; font-weight: var(--fontWeightMedium); line-height: 1; opacity: 0; transition: opacity var(--durationL) var(--bezierFastoutSlowin) 0.2s; }
@container pf (max-width: 1680px) { .intro-name { font-size: 1.375rem; margin-bottom: var(--spaceXL); } }
@container pf (max-width: 1040px) { .intro-name { font-size: 1.125rem; } }
@container pf (max-width: 696px) { .intro-name { margin-bottom: var(--spaceL); letter-spacing: 0.2em; white-space: nowrap; overflow: hidden; } }
@media (max-height: 420px) { @container pf (max-width: 820px) { .intro-name { margin-bottom: var(--spaceXL); } } }
.intro-name[data-visible="true"] { opacity: 1; }
/* intro.module.css is unlayered in the original, so it beats the heading component */
.heading.intro-title { letter-spacing: -0.03em; font-size: calc(var(--fontSizeH0) * var(--title-scale, 1)); }
.intro-row { display: flex; flex-direction: row; align-items: center; position: relative; }
.intro-row[data-hidden="true"] { opacity: 0; }
.intro-word { position: relative; display: flex; flex-shrink: 0; align-items: center; line-height: 1; animation-duration: 1.5s; animation-delay: var(--delay); animation-fill-mode: forwards; animation-timing-function: var(--bezierFastoutSlowin); color: color-mix(in lab, var(--text) 0%, transparent); transition: opacity 0.5s ease var(--durationM); isolation: isolate; }
.intro-word::after { content: ""; background: var(--accent); animation-duration: 1.5s; animation-delay: var(--delay); animation-fill-mode: forwards; animation-timing-function: var(--bezierFastoutSlowin); transform-origin: left; transform: scale3d(0, 1, 1); position: absolute; inset: 0 -0.02em 0 0; z-index: var(--zIndex1); will-change: transform; }
.intro-word[data-plus="true"]::before { content: "+"; margin-right: 10px; opacity: 0.4; }
.intro-word[data-status="entering"] { animation-name: reel-intro-text-reveal; }
@media (prefers-reduced-motion: no-preference) { .intro-word[data-status="entering"]::after { animation-name: reel-reveal; } }
.intro-word[data-status="entered"] { color: var(--textTitle); }
.intro-word[data-status="entered"]::after { opacity: 1; transform: scale3d(0, 0, 1); transform-origin: right; }
.intro-word[data-status="exiting"] { color: var(--textTitle); opacity: 0; position: absolute; top: 0; z-index: var(--zIndex0); }
.intro-line { content: ""; height: 2px; background: color-mix(in lab, var(--text) 30%, transparent); width: 120%; display: flex; margin-left: 20px; animation-duration: 0.8s; animation-delay: 1s; animation-fill-mode: forwards; animation-timing-function: var(--bezierFastoutSlowin); transform-origin: left; opacity: 0; position: relative; top: 0.05em; }
.intro-line[data-status="entering"] { animation-name: reel-fade-in; }
@media (prefers-reduced-motion: no-preference) { .intro-line[data-status="entering"] { animation-name: reel-intro-line; } }
.intro-line[data-status="entered"] { transform: scaleX(1); opacity: 1; }
.intro-scroll { border: 2px solid color-mix(in lab, var(--text) 40%, transparent); border-radius: 20px; width: 26px; height: 38px; position: fixed; bottom: 64px; transition-property: opacity; transition-duration: var(--durationL); transition-timing-function: ease; opacity: 0; }
.intro-scroll::before { content: ""; height: 7px; width: 2px; background: color-mix(in lab, var(--text) 40%, transparent); border-radius: 4px; position: absolute; top: 6px; left: 50%; transform: translateX(-1px); }
@media (prefers-reduced-motion: no-preference) {
  .intro-scroll { transition-property: opacity, transform; }
  .intro-scroll::before { animation: reel-intro-scroll 2s ease infinite; }
}
.intro-scroll[data-status="entered"] { opacity: 1; }
.intro-scroll[data-hidden="true"] { opacity: 0; }
@media (prefers-reduced-motion: no-preference) { .intro-scroll[data-hidden="true"] { transform: translate3d(0, 20px, 0); } }
@media (pointer: coarse) { .intro-scroll { display: none; } }
.intro-scroll:focus-visible { opacity: 1; }
.intro-mscroll { position: fixed; bottom: 0; opacity: 0; animation-duration: 1.5s; animation-iteration-count: infinite; transition-property: opacity; transition-timing-function: cubic-bezier(0.8, 0.1, 0.27, 1); transition-duration: var(--durationM); padding: 20px; }
@media (prefers-reduced-motion: no-preference) { .intro-mscroll { animation-name: reel-intro-mscroll; transition-property: opacity, transform; transform: translate3d(0, 20px, 0); } }
.intro-mscroll[data-status="entered"] { opacity: 1; }
.intro-mscroll[data-hidden="true"] { opacity: 0; transform: none; }
@media (pointer: fine) { .intro-mscroll { display: none; } }
.intro-mscroll svg { stroke: color-mix(in lab, var(--text) 50%, transparent); }
.intro-mscroll:focus-visible { opacity: 1; }

/* routes/home/displacement-sphere */
.sphere-canvas { position: absolute; width: 100%; inset: 0; opacity: 0; transition-property: opacity; transition-duration: 3s; transition-timing-function: var(--bezierFastoutSlowin); }
.sphere-canvas[data-visible="true"] { opacity: 1; }

/* routes/home/project-summary */
.summary { height: var(--screen); width: 100%; max-height: 1080px; padding-bottom: var(--spaceL); margin: 120px 0; position: relative; display: flex; align-items: center; justify-content: center; }
@container pf (max-width: 2080px) { .summary { margin: var(--space2XL) 0; } }
@container pf (max-width: 1040px) { .summary { height: auto; margin: var(--space3XL) 0; } }
@container pf (max-width: 696px) { .summary { padding-bottom: var(--space4XL); margin-bottom: 0; } }
.summary[data-first="true"] { margin-top: 0; }
.summary-content { --textColumnWidth: 36%; width: 100%; max-width: var(--maxWidthL); align-items: center; justify-content: center; display: grid; grid-template-columns: var(--textColumnWidth) 1fr; grid-column-gap: var(--space2XL); }
.summary[data-alternate="true"] .summary-content { grid-template-columns: 1fr var(--textColumnWidth); }
@container pf (max-width: 1680px) { .summary-content { --textColumnWidth: 40%; } }
@container pf (max-width: 1040px) {
  .summary[data-alternate="true"] .summary-content { grid-template-columns: 100%; }
  .summary-content { grid-template-columns: 100%; flex-direction: column-reverse; height: auto; }
}
.summary-details { z-index: var(--zIndex1); position: relative; }
@container pf (max-width: 1040px) { .summary-details { flex: 0 0 auto; max-width: 410px; grid-row: 2; grid-column: 1; justify-self: center; } }
.summary-preview { position: relative; display: flex; align-items: center; justify-self: center; justify-content: center; height: 100%; width: 100%; }
@container pf (max-width: 1040px) { .summary-preview { grid-row: 1; grid-column: 1; } }
.summary-model { --width: 180%; --aspectRatio: 12 / 10; min-width: var(--width); aspect-ratio: var(--aspectRatio); display: grid; position: relative; }
.summary-model[data-device="laptop"] { top: 6%; left: 14%; }
@container pf (max-width: 2080px) { .summary-model[data-device="laptop"] { --width: 180%; } }
@container pf (max-width: 1040px) { .summary-model[data-device="laptop"] { --width: 140%; top: 10%; left: 0; } }
.summary-model[data-device="phone"] { --width: 116%; --aspectRatio: 7 / 10; top: 5%; left: -10%; }
@container pf (max-width: 2080px) { .summary-model[data-device="phone"] { --width: 108%; left: 0; } }
@container pf (max-width: 1040px) { .summary-model[data-device="phone"] { --width: 108%; left: 0; max-height: 60vh; } }
@container pf (max-width: 696px) { .summary-model[data-device="phone"] { --width: 108%; left: 0; max-height: none; } }
.summary-loader { opacity: 0; transition: opacity 400ms ease 1000ms; }
.summary-loader[data-visible="true"] { opacity: 1; }
.summary-svg { opacity: 0; transition: opacity 1200ms ease 1400ms; fill: var(--textTitle); }
.summary-svg[data-visible="true"] { opacity: var(--opacity); }
.summary-svg[data-device="laptop"] { position: absolute; width: 100%; right: -36%; bottom: 24%; transform: translateY(50%); }
@container pf (max-width: 1040px) { .summary-svg[data-device="laptop"] { width: 80%; right: -10%; bottom: 18%; } }
@container pf (max-width: 696px) { .summary-svg[data-device="laptop"] { right: 0; } }
.summary-svg[data-device="phone"] { position: absolute; bottom: 23%; transform: translateY(50%); width: 100%; transition-delay: 800ms; }
@container pf (max-width: 1040px) { .summary-svg[data-device="phone"] { width: 80%; bottom: 23%; } }
.summary-index { position: relative; display: grid; grid-template-columns: 90px 1fr; gap: var(--spaceM); align-items: center; margin-bottom: var(--spaceXL); }
.summary-index-number { font-size: var(--fontSizeBodyS); font-weight: var(--fontWeightMedium); color: var(--primary); opacity: 0; transition-property: opacity; transition-timing-function: var(--bezierFastoutSlowin); transition-duration: var(--durationM); transition-delay: 1.3s; }
@media (prefers-reduced-motion: no-preference) { .summary-index-number { transition-property: transform, opacity; transform: translateX(calc(var(--spaceM) * -1)); } }
.summary-index-number[data-visible="true"] { transform: translateX(0); opacity: 1; }
.summary-title { margin-bottom: var(--spaceL); transition-property: opacity; transition-timing-function: var(--bezierFastoutSlowin); transition-duration: var(--durationXL); transition-delay: var(--durationM); opacity: 0; }
.summary-description { margin-bottom: var(--spaceXL); transition-property: opacity; transition-timing-function: var(--bezierFastoutSlowin); transition-duration: var(--durationXL); transition-delay: var(--durationL); opacity: 0; }
.summary-button { transition-property: opacity; transition-timing-function: var(--bezierFastoutSlowin); transition-duration: var(--durationXL); transition-delay: var(--durationXL); transform: translate3d(0, var(--spaceL), 0); opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .summary-title, .summary-description { transition-property: transform, opacity; transform: translate3d(0, var(--spaceL), 0); }
  .summary-button { transition-property: transform, opacity; transform: translate3d(0, var(--spaceL), 0); }
}
.summary-title[data-visible="true"], .summary-description[data-visible="true"], .summary-button[data-visible="true"] { transform: none; opacity: 1; }

/* components/model */
.model { position: relative; opacity: 0; }
.model[data-loaded="true"] { animation: reel-fade-in 1s ease forwards var(--delay); }
.model-canvas { position: absolute; inset: 0; }

/* routes/home/profile */
.profile { width: 100%; min-height: var(--screen); margin-top: 60px; margin-bottom: 40px; padding-top: 60px; padding-bottom: 40px; display: flex; justify-content: center; }
@container pf (max-width: 1040px) { .profile { padding-top: 50px; padding-right: 80px; padding-left: 160px; height: auto; margin-top: 40px; margin-bottom: 20px; } }
@container pf (max-width: 696px) { .profile { margin-top: 0; padding-top: var(--space4XL); overflow-x: hidden; } }
@container pf (max-width: 696px) { .profile { padding-right: var(--spaceOuter); padding-left: var(--spaceOuter); } }
@media (max-height: 696px) { .profile { padding-right: var(--spaceOuter); padding-left: var(--spaceOuter); } }
@media (max-height: 420px) { @container pf (max-width: 820px) { .profile { padding-right: var(--space4XL); padding-left: var(--space4XL); } } }
.profile-content { display: grid; grid-template-columns: 1fr 50%; grid-column-gap: var(--space2XL); max-width: var(--maxWidthL); width: 100%; }
@container pf (max-width: 1040px) { .profile-content { max-width: 600px; grid-template-columns: 100%; } }
.profile-column { position: relative; display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 40px; transform: translate3d(0, 0, 0); }
.profile-title { white-space: nowrap; margin-bottom: var(--spaceL); opacity: 0; transition: opacity var(--durationXL) ease var(--durationM); }
.profile-title[data-visible="true"] { opacity: 1; }
.profile-description { margin-bottom: var(--spaceXL); opacity: 0; transition: opacity var(--durationXL) ease var(--durationL); }
.profile-description[data-visible="true"] { opacity: 1; }
.profile-tag { margin-top: 220px; margin-bottom: 40px; display: grid; grid-template-columns: var(--space4XL) 1fr; gap: 12px; align-items: center; }
@container pf (max-width: 1040px) { .profile-tag { margin-top: 30px; } }
.profile-tag-text { font-size: var(--fontSizeBodyS); font-weight: var(--fontWeightMedium); color: var(--primary); opacity: 0; transition-property: opacity; transition-timing-function: var(--bezierFastoutSlowin); transition-duration: var(--durationM); transition-delay: 1.3s; }
@media (prefers-reduced-motion: no-preference) { .profile-tag-text { transition-property: opacity, transform; transform: translate3d(calc(var(--spaceM) * -1), 0, 0); } }
.profile-tag-text[data-visible="true"] { transform: none; opacity: 1; }
.profile-image { position: relative; width: 100%; }
.profile-svg { position: absolute; right: 0; bottom: 0; transform: translate3d(50%, -20%, 0); height: 100%; z-index: var(--zIndex3); opacity: 0; transition: opacity var(--durationM) ease var(--durationL); fill: var(--textTitle); }
.profile-svg[data-visible="true"] { opacity: 1; }
.profile-button { opacity: 0; transition: opacity var(--durationXL) ease var(--durationL); }
.profile-button[data-visible="true"] { transform: none; opacity: 1; }

/* components/image */
.image { position: relative; transform: translate3d(0, 0, 0); display: grid; grid-template-columns: 100%; isolation: isolate; }
.image[data-reveal="true"] { --revealDuration: 1.8s; transition: box-shadow var(--durationL) ease calc(var(--revealDuration) / 2); }
.image[data-reveal="true"]:not([data-visible="true"]) { box-shadow: none; }
.image[data-reveal="true"]::before { content: ""; background-color: var(--accent); position: absolute; inset: 0; transform: scale3d(0, 1, 1); transform-origin: left; will-change: transform; z-index: var(--zIndex2); }
@media (prefers-reduced-motion: no-preference) { .image[data-reveal="true"][data-visible="true"]::before { animation: reel-reveal var(--revealDuration) var(--bezierFastoutSlowin) var(--delay); } }
.image-wrapper { opacity: 0; transition: none; transform: none; position: relative; display: grid; grid-template-columns: 100%; }
.image-wrapper[data-reveal="true"] { opacity: 0; transition: opacity var(--durationM) ease var(--delay); }
@media (prefers-reduced-motion: reduce) { .image-wrapper[data-reveal="true"] { transition-delay: calc(var(--delay) - 1s); } }
.image-wrapper[data-visible="true"] { opacity: 1; }
.image-wrapper > .drawn-screen { display: block; width: 100%; height: auto; grid-column: 1; grid-row: 1; box-shadow: 0 0 0 1px color-mix(in lab, var(--text) 12%, transparent); }
/* The portrait tile where his photo goes: the initials under the sphere's cyan, on a fine grid,
   with the notched divider and a caption at the foot */
.image-initials { position: relative; display: grid; place-items: center; aspect-ratio: 3 / 4; overflow: hidden; background: radial-gradient(circle at 88% 6%, color-mix(in lab, var(--accent) 30%, transparent), transparent 58%), radial-gradient(circle at 10% 100%, color-mix(in lab, var(--accent) 12%, transparent), transparent 50%), var(--backgroundLight); color: var(--textTitle); }
.image-initials::before { content: ""; position: absolute; inset: 0; background: linear-gradient(color-mix(in lab, var(--text) 7%, transparent) 1px, transparent 1px) 0 0 / 100% 32px, linear-gradient(90deg, color-mix(in lab, var(--text) 7%, transparent) 1px, transparent 1px) 0 0 / 32px 100%; -webkit-mask-image: linear-gradient(to bottom, #000, transparent 85%); mask-image: linear-gradient(to bottom, #000, transparent 85%); }
.image-initials-text { position: relative; font-size: calc(var(--fontSizeH0) * 1.25); font-weight: var(--fontWeightMedium); letter-spacing: -0.06em; line-height: 1; }
.image-initials-caption { position: absolute; left: var(--spaceL); right: var(--spaceL); bottom: var(--spaceL); padding-top: var(--spaceM); border-top: 2px solid var(--accent); color: var(--textLight); font-size: var(--fontSizeBodyS); font-weight: var(--fontWeightMedium); }
.image-initials-caption::before { content: ""; position: absolute; top: 0; left: 0; width: 64px; height: 8px; background: var(--accent); clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 100%, 10px 100%); }

/* components/footer */
.footer { --lineHeightBody: 1.1; display: flex; flex-wrap: wrap; align-items: baseline; justify-content: center; width: 100%; padding: var(--space3XL) var(--spaceL); z-index: var(--zIndex2); position: relative; color: var(--textLight); }
.footer-date { padding-right: var(--spaceXS); display: inline-flex; }
.footer .credit { flex-basis: 100%; padding: var(--spaceM) 0 0; font-size: var(--fontSizeBodyXS); }

/* global.module.css keyframes and the modules' own */
@keyframes reel-fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes reel-reveal { 0% { transform: scale3d(0, 1, 1); transform-origin: left; } 50% { transform: scale3d(1, 1, 1); transform-origin: left; } 51% { transform: scale3d(1, 1, 1); transform-origin: right; } 100% { transform: scale3d(0, 1, 1); transform-origin: right; } }
@keyframes reel-intro-text-reveal { 0% { color: color-mix(in lab, var(--text) 0%, transparent); } 50% { color: color-mix(in lab, var(--text) 0%, transparent); } 60% { color: var(--textTitle); } 100% { color: var(--textTitle); } }
@keyframes reel-intro-line { 0% { transform: scaleX(0); opacity: 1; } 100% { transform: scaleX(1); opacity: 1; } }
@keyframes reel-intro-scroll { 0% { transform: translate3d(-1px, 0, 0); opacity: 0; } 20% { transform: translate3d(-1px, 0, 0); opacity: 1; } 100% { transform: translate3d(-1px, 8px, 0); opacity: 0; } }
@keyframes reel-intro-mscroll { 0% { transform: translateY(0); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0); } }
@keyframes reel-loader { 0% { transform: scaleX(0); transform-origin: left; } 50% { transform: scaleX(1); transform-origin: left; } 51% { transform: scaleX(1); transform-origin: right; } 100% { transform: scaleX(0); transform-origin: right; } }
@keyframes reel-project-fade-slide { 0% { opacity: 0; transform: translate3d(0, var(--space3XL), 0); } 100% { opacity: 1; transform: translate3d(0, 0, 0); } }

/* ---- Ours ---- */

/* Still frames: the sphere at its first frame and the devices at rest, rendered from the same
   scenes, for template cards, the editor's preview, no WebGL, and no JavaScript. */
.sphere-still { position: absolute; top: 0; left: 0; width: 100%; height: calc(var(--screen) * 1.3); overflow: hidden; pointer-events: none; display: none; opacity: 0; transition: opacity 3s var(--bezierFastoutSlowin); }
.sphere-still[data-visible="true"] { opacity: 1; }
.sphere-still-image { --H: calc(var(--screen) * 1.3); position: absolute; left: calc(50% - 0.205982 * var(--H)); top: calc(-0.83656 * var(--H)); width: calc(1.59904 * var(--H)); height: calc(1.68077 * var(--H)); background: url(/portfolio-templates/reel/sphere-dark.webp) center / 100% 100% no-repeat; }
:scope[data-theme="light"] .sphere-still-image { background-image: url(/portfolio-templates/reel/sphere-light.webp); }
@container pf (max-width: 1040px) { .sphere-still-image { left: calc(50% - 0.281467 * var(--H)); top: calc(-0.798817 * var(--H)); } }
@container pf (max-width: 696px) { .sphere-still-image { left: calc(50% - 0.356952 * var(--H)); top: calc(-0.723333 * var(--H)); } }
:scope:is([data-mode="lite"], [data-mode="still"]) .sphere-still, .sphere-still[data-failed="true"] { display: block; }

.still { position: absolute; inset: 0; display: none; opacity: 0; transition: opacity 1s ease var(--delay); }
.still[data-visible="true"] { opacity: 1; }
:scope:is([data-mode="lite"], [data-mode="still"]) .still, .summary-model[data-failed="true"] .still { display: block; }
.still-frame { position: absolute; inset: 0; background: center / 100% 100% no-repeat; pointer-events: none; }
.still-frame[data-device="laptop"] { background-image: url(/portfolio-templates/reel/laptop.webp); }
.still-frame[data-device="phone-back"] { background-image: url(/portfolio-templates/reel/phone-back.webp); }
.still-frame[data-device="phone-front"] { background-image: url(/portfolio-templates/reel/phone-front.webp); }
.still-screen { position: absolute; overflow: hidden; background: #1f2025; filter: brightness(0.894); }
.still-screen[data-device="laptop"] { left: 23.8%; top: 18.522%; width: 52.4%; height: 39.473%; }
.still-screen[data-device="phone-back"] { left: 20.833%; top: 8.542%; width: 35.166%; height: 53.184%; }
.still-screen[data-device="phone-front"] { left: 43.839%; top: 29.629%; width: 36.117%; height: 54.623%; }
.still-screen > svg { display: block; width: 100%; height: 100%; }
.drawn-screen text { font-family: var(--fontStack); }
:scope[data-mode="still"] *, :scope[data-mode="still"] *::before, :scope[data-mode="still"] *::after { transition: none !important; animation-delay: 0s !important; animation-duration: 0s !important; }

/* Extra sections in his language: the profile's notched tag over a table (components/table) */
.extra { display: flex; justify-content: center; padding-top: var(--space3XL); padding-bottom: var(--space3XL); }
.extra-content { width: 100%; max-width: var(--maxWidthL); }
.extra-tag { display: grid; grid-template-columns: var(--space4XL) 1fr; gap: 12px; align-items: center; margin-bottom: var(--space2XL); }
.extra-title { margin-bottom: var(--spaceXL); opacity: 0; transition: opacity var(--durationXL) ease var(--durationM); }
.extra-table { width: 100%; border-collapse: collapse; opacity: 0; transition: opacity var(--durationXL) ease var(--durationL); }
.extra[data-visible="true"] :is(.extra-title, .extra-table) { opacity: 1; }
.extra-row { --rowBorder: 1px solid color-mix(in lab, var(--text) 20%, transparent); border-top: var(--rowBorder); }
.extra-row:last-child { border-bottom: var(--rowBorder); }
.extra-cell { padding: var(--spaceM) var(--spaceXL) var(--spaceM) 0; vertical-align: baseline; text-align: left; }
.extra-cell:last-child { padding-right: 0; }
.extra-cell[data-kind="index"] { width: 90px; color: var(--primary); font-size: var(--fontSizeBodyS); font-weight: var(--fontWeightMedium); }
.extra-cell[data-kind="date"] { white-space: nowrap; text-align: right; }
.extra-name { color: var(--textTitle); font-size: var(--fontSizeBodyL); font-weight: var(--fontWeightMedium); line-height: var(--lineHeightTitle); }
.extra-cell .text { display: block; margin-top: var(--spaceXS); }
@container pf (max-width: 696px) {
  .extra-cell[data-kind="index"] { width: 48px; }
  .extra-cell[data-kind="date"] { display: block; padding-top: 0; text-align: left; }
  .extra-row { display: grid; }
}

/* layouts/project: a project's own page, opened in place with :target */
.project { display: none; position: fixed; inset: 0; z-index: var(--zIndex3); overflow-y: auto; overscroll-behavior: contain; background: var(--background); container: pf / inline-size; }
.project:target { display: block; }
.project-header { padding-top: calc(var(--space5XL) + var(--space3XL)); padding-bottom: 0; display: flex; justify-content: center; }
@container pf (max-width: 1680px) { .project-header { padding-top: var(--space5XL); padding-bottom: var(--space2XL); } }
@container pf (max-width: 1040px) { .project-header { padding-top: var(--space4XL); padding-bottom: 0; } }
@container pf (max-width: 696px) { .project-header { padding-top: var(--space5XL); padding-bottom: var(--spaceXL); } }
.project-header-content { position: relative; display: grid; grid-template-columns: 1fr 300px; gap: var(--space4XL); max-width: var(--maxWidthL); width: 100%; }
@container pf (max-width: 2080px) { .project-header-content { grid-template-columns: 1fr 400px; } }
@container pf (max-width: 1680px) { .project-header-content { gap: var(--space3XL); } }
@container pf (max-width: 1200px) { .project-header-content { grid-template-columns: 1fr 200px; gap: var(--space2XL); } }
@container pf (max-width: 1040px) { .project-header-content { grid-template-columns: 100%; gap: var(--spaceXL); } }
.project-details { position: relative; }
.project-details:only-child { grid-column: 1 / span 2; }
@container pf (max-width: 1040px) { .project-details:only-child { grid-column: 1; } }
.project-title { margin-bottom: 0.5em; }
.project-description { padding-bottom: var(--spaceL); }
.project-link { padding-left: var(--spaceXS); }
@media (prefers-reduced-motion: no-preference) {
  .project:target :is(.project-title, .project-description, .project-link) { opacity: 0; animation: reel-project-fade-slide 1.4s var(--bezierFastoutSlowin) var(--initDelay) forwards; }
  .project:target .project-description { animation-delay: calc(var(--initDelay) + 100ms); }
  .project:target .project-link { animation-delay: calc(var(--initDelay) + 200ms); }
  .project:target .project-meta-item { opacity: 0; animation: reel-project-fade-slide 1.5s var(--bezierFastoutSlowin) var(--delay) forwards; }
}
.project-meta { list-style-type: none; margin: 0; padding: 0; margin-top: var(--spaceM); }
@container pf (max-width: 1680px) { .project-meta { margin-top: 0; } }
@container pf (max-width: 1040px) { .project-meta { margin-top: var(--spaceL); } }
.project-meta-item { padding: var(--spaceL) 0; font-size: var(--fontSizeBodyS); font-weight: var(--fontWeightRegular); border-top: 1px solid color-mix(in lab, var(--text) 20%, transparent); }
@container pf (max-width: 696px) { .project-meta-item { padding: var(--spaceM) 0; } }
.project-meta-item:last-child { border-bottom: 1px solid color-mix(in lab, var(--text) 20%, transparent); }
.project-section { width: 100%; position: relative; display: grid; place-content: stretch; }
.project-section-inner { --sectionPadding: calc(var(--space5XL) + var(--space3XL)); grid-area: 1 / 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: var(--sectionPadding); padding-bottom: var(--sectionPadding); position: relative; }
@container pf (max-width: 1680px) { .project-section-inner { --sectionPadding: var(--space5XL); } }
@container pf (max-width: 1040px) { .project-section-inner { --sectionPadding: var(--space3XL); height: auto; } }
@container pf (max-width: 696px) { .project-section-inner { --sectionPadding: var(--space2XL); } }
.project-section-content { max-width: var(--maxWidthL); width: 100%; display: grid; gap: var(--space4XL); }
@container pf (max-width: 1680px) { .project-section-content { gap: var(--space3XL); } }
.project-image { position: relative; display: grid; transform: translate3d(0, 0, 0); max-width: 100%; width: 100%; }
.project-text-row { align-self: center; justify-self: center; text-align: left; position: relative; display: flex; flex-direction: column; align-items: flex-start; max-width: var(--maxWidthM); }
.project-section-heading { margin-bottom: 0.6em; }
.project-section-text + .project-section-text { margin-top: var(--spaceL); }
`;

export const REEL_CSS = templateCss(".pf-reel", css);

// Readers without JavaScript get the finished page instead of the original's hidden first frame:
// everything shown, the decoded names as plain text, the still frames in place of WebGL.
export const REEL_NOSCRIPT_CSS = scopeCss(
  ".pf-reel",
  `
[data-visible="false"], [data-status="exited"] { opacity: 1 !important; transform: none !important; }
.intro-word { color: var(--textTitle) !important; }
.divider-line { opacity: 1 !important; transform: none !important; }
.divider-notch { opacity: 1 !important; clip-path: polygon(0 -1px, 100% -1px, calc(100% - 10px) 100%, 10px 100%) !important; }
.decoder-label { position: static; width: auto; height: auto; margin: 0; clip: auto; overflow: visible; white-space: normal; }
.sphere-still, .still { display: block !important; opacity: 1 !important; }
.summary-loader, .navbar-mobile-nav, .nav-toggle { display: none !important; }
`,
);
