import { templateCss } from "../css";

// Ported from HamishMW/portfolio (MIT, see ./LICENSE.txt): theme-provider/theme.js tokens,
// global.module.css, routes/home/{intro,project-summary,profile}.module.css, layouts/navbar,
// layouts/project and components/{button,divider,heading,text,footer}. The custom media
// (laptop 1680, tablet 1040, mobile 696, mobileS 400) became container queries on .shell.
// Gotham (paid) is swapped for Montserrat. The 3D device models are CSS laptop and phone frames.
const css = `
:scope {
  --black: oklch(0% 0 0);
  --white: oklch(100% 0 0);
  --background: oklch(17.76% 0 0);
  --backgroundLight: oklch(21.78% 0 0);
  --primary: oklch(84.42% 0.19 202.24);
  --accent: oklch(84.42% 0.19 202.24);
  --text: var(--white);
  --textTitle: var(--text);
  --textBody: color-mix(in lab, var(--text) 80%, transparent);
  --textLight: color-mix(in lab, var(--text) 60%, transparent);
  --bezier: cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  isolation: isolate;
  background: var(--background);
  color: var(--textBody);
  font-family: var(--pf-font-montserrat, "Montserrat"), system-ui, -apple-system, "Segoe UI", sans-serif;
  font-size: 18px;
  line-height: 1.6;
  overflow-wrap: break-word;
  overflow-x: clip;
  transition: background 0.4s ease;
}
:scope[data-theme="light"] {
  --background: oklch(96.12% 0 0);
  --backgroundLight: var(--white);
  --primary: var(--black);
  --text: var(--black);
  --textTitle: color-mix(in lab, var(--text) 90%, transparent);
  --textBody: color-mix(in lab, var(--text) 75%, transparent);
  --textLight: color-mix(in lab, var(--text) 55%, transparent);
}
a { color: inherit; }
::selection { background: var(--accent); color: var(--black); }
.visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.shell {
  --fontSizeH0: 100px; --fontSizeH1: 70px; --fontSizeH2: 50px; --fontSizeH3: 36px; --fontSizeH4: 26px; --fontSizeH5: 22px;
  --fontSizeBodyXL: 22px; --fontSizeBodyL: 20px; --fontSizeBodyM: 18px; --fontSizeBodyS: 16px; --fontSizeBodyXS: 14px;
  --maxWidthS: 480px; --maxWidthM: 640px; --maxWidthL: 1000px;
  --spaceOuter: 48px; --spaceXS: 4px; --spaceS: 8px; --spaceM: 16px; --spaceL: 24px; --spaceXL: 32px;
  --space2XL: 48px; --space3XL: 64px; --space4XL: 96px; --space5XL: 128px;
  position: relative;
}
.heading { color: var(--textTitle); line-height: 1.1; font-weight: 500; }
.h0 { font-size: calc(var(--fontSizeH0) * var(--title-scale, 1)); letter-spacing: -0.03em; }
.h2 { font-size: var(--fontSizeH2); letter-spacing: -0.04em; }
.h3 { font-size: var(--fontSizeH3); letter-spacing: -0.02em; }
.text { color: var(--textBody); line-height: 1.6; }
.text.s { font-size: var(--fontSizeBodyS); }
.text.m { font-size: var(--fontSizeBodyM); }
.text.l { font-size: var(--fontSizeBodyL); }
.text.xl { font-size: var(--fontSizeBodyXL); }
.text a, .link { color: var(--primary); text-decoration: underline; text-decoration-color: color-mix(in lab, var(--primary) 40%, transparent); text-underline-offset: 0.2em; transition: text-decoration-color 0.3s; }
.text a:hover, .link:hover { text-decoration-color: var(--primary); }
.mark { color: var(--textTitle); }
.section { padding-right: var(--space5XL); padding-left: calc(var(--space4XL) * 2); }

/* Buttons (components/button) */
.button { --buttonSize: 56px; position: relative; isolation: isolate; display: inline-flex; align-items: center; gap: 8px; height: var(--buttonSize); padding: 0 var(--spaceL); color: var(--background); font-size: 18px; font-weight: 500; line-height: 1; text-decoration: none; cursor: pointer; transition: transform 0.3s var(--bezier), opacity 0.3s, color 0.3s; }
.button::after { content: ""; position: absolute; inset: 0; z-index: -1; background: var(--primary); clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%); transition: background 0.4s var(--bezier); }
.button svg { width: 18px; height: 18px; transition: transform 0.4s var(--bezier); }
@media (prefers-reduced-motion: no-preference) {
  .button:hover { transform: scale(1.05); }
  .button:hover svg { transform: translateX(2px); }
}
.button.secondary { --space: 10px; height: 32px; padding: 0 var(--space); left: calc(var(--space) * -1); color: var(--primary); background: none; }
.button.secondary::after { background: color-mix(in lab, var(--primary) 20%, transparent); transform: scale3d(0, 1, 1); transform-origin: right; clip-path: none; transition: transform 0.4s var(--bezier); }
.button.secondary:hover { transform: none; }
.button.secondary:hover::after { transform: scale3d(1, 1, 1); transform-origin: left; }

/* Divider with notch (components/divider) */
.divider { position: relative; width: 100%; height: 2px; }
.divider .line { width: 100%; height: 100%; background: var(--primary); transform-origin: left center; transition: transform 0.6s var(--bezier) 1s, opacity 0.6s var(--bezier) 1s; }
.divider .notch { position: absolute; top: 2px; width: 64px; height: 8px; background: var(--primary); clip-path: polygon(0 -1px, 100% -1px, calc(100% - 10px) 100%, 10px 100%); transition: clip-path 0.6s var(--bezier) 1.16s, opacity 0.6s var(--bezier) 1.16s; }

/* Navbar (layouts/navbar) */
.navbar { position: fixed; top: var(--spaceOuter); left: var(--spaceOuter); bottom: var(--spaceOuter); z-index: 32; display: flex; flex-direction: column; align-items: center; width: var(--space2XL); isolation: isolate; }
.monogram { display: flex; position: relative; padding: var(--spaceS) var(--spaceS) var(--spaceL); z-index: 8; color: var(--textTitle); text-decoration: none; }
.monogram svg { width: 32px; height: 32px; }
.monogram text { fill: currentColor; font-weight: 700; font-size: 26px; letter-spacing: -0.04em; }
.monogram:hover { color: var(--accent); }
.nav { display: flex; flex-direction: column; justify-content: space-between; align-items: center; flex: 1 1 auto; max-width: var(--space2XL); }
.nav-list { display: flex; flex-direction: row-reverse; position: relative; writing-mode: vertical-lr; transform: rotate(180deg); }
.nav-link { position: relative; display: inline-flex; align-items: center; padding: var(--spaceM); color: color-mix(in lab, var(--text) 80%, transparent); font-size: 16px; font-weight: 500; line-height: 1; text-decoration: none; transition: color 0.3s ease 0.1s; }
.nav-link:hover { color: var(--textBody); }
.nav-link::after { content: ""; position: absolute; inset-inline: var(--spaceS); block-size: 4px; inset-block-end: 0; background: var(--accent); transform: scaleY(0); transform-origin: bottom; transition: transform 0.4s var(--bezier); }
.nav-link:hover::after { transform: scaleY(1); transform-origin: top; }
.nav-icons { display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; z-index: 8; }
.nav-icon { display: flex; align-items: center; justify-content: center; width: var(--space2XL); height: var(--space2XL); padding: var(--spaceS); color: var(--textLight); transition: color 0.4s var(--bezier); }
.nav-icon:hover { color: var(--accent); }
.nav-icon svg { width: 20px; height: 20px; }
.theme-toggle { position: fixed; top: calc(var(--spaceOuter) - 8px); right: calc(var(--spaceOuter) - 8px); z-index: 64; display: flex; align-items: center; justify-content: center; width: var(--space2XL); height: var(--space2XL); border: 0; background: none; color: var(--textTitle); cursor: pointer; }
.theme-toggle svg { width: 38px; height: 38px; }
.theme-toggle .circle { fill: currentColor; transform-origin: center; transition: transform 0.4s var(--bezier); }
.theme-toggle .cut { transition: transform 0.4s var(--bezier); }
.theme-toggle .rays { stroke: currentColor; stroke-width: 2; stroke-linecap: round; opacity: 0; transform-origin: center; transform: scale(0.6); transition: opacity 0.4s, transform 0.4s var(--bezier); }
:scope[data-theme="light"] .theme-toggle .cut { transform: translate(10px, -10px); }
:scope[data-theme="light"] .theme-toggle .circle { transform: scale(0.6); }
:scope[data-theme="light"] .theme-toggle .rays { opacity: 1; transform: scale(1); }
.nav-toggle { display: none; }
.mobile-nav { display: none; }

/* Intro (routes/home/intro) */
.intro { position: relative; height: var(--pf-screen, 100vh); min-height: 560px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.sphere { position: absolute; top: 0; left: 0; width: 100%; height: 130%; opacity: 0; transition: opacity 3s var(--bezier); pointer-events: none; }
.sphere[data-visible="true"] { opacity: 1; }
.sphere-still { position: absolute; top: -16%; right: -12%; width: min(80cqi, 900px); aspect-ratio: 1; border-radius: 50%; pointer-events: none; opacity: 0.85; background: radial-gradient(circle at 38% 34%, color-mix(in lab, var(--accent) 55%, transparent), transparent 48%), radial-gradient(circle at 62% 70%, oklch(55% 0.13 300 / 0.55), transparent 52%), radial-gradient(circle at 50% 50%, oklch(30% 0.03 250 / 0.9), transparent 70%); filter: blur(2px); transition: opacity 3s var(--bezier); }
.intro:has(.sphere[data-visible="true"]) .sphere-still { opacity: 0; }
.intro-text { position: relative; top: calc(var(--spaceL) * -1); width: 100%; max-width: 780px; }
.name { margin-bottom: var(--spaceXL); color: var(--textLight); font-size: 22px; font-weight: 500; letter-spacing: 0.3em; line-height: 1; text-transform: uppercase; }
@media (prefers-reduced-motion: no-preference) { .name { animation: reel-fade 0.6s var(--bezier) 0.2s both; } }
.decoder .glyph { opacity: 0.8; font-weight: 400; font-family: "IPA Gothic", "Hiragino Kaku Gothic Pro", "Hiragino Sans", Meiryo, sans-serif; line-height: 0; }
.title { display: block; }
.row { display: flex; flex-direction: row; align-items: center; position: relative; }
.word { position: relative; display: flex; flex-shrink: 0; align-items: center; white-space: nowrap; line-height: 1; isolation: isolate; color: var(--textTitle); transition: opacity 0.5s ease 0.4s; }
.word::after { content: ""; position: absolute; inset: 0 -0.02em 0 0; z-index: 4; background: var(--accent); transform: scale3d(0, 1, 1); transform-origin: left; }
.word[data-plus="true"]::before { content: "+"; margin-right: 10px; opacity: 0.4; }
.word[data-status="exiting"] { position: absolute; top: 0; z-index: 0; opacity: 0; }
@media (prefers-reduced-motion: no-preference) {
  .word[data-status="entering"] { animation: reel-text-reveal 1.5s var(--bezier) var(--delay, 0ms) forwards; color: color-mix(in lab, var(--text) 0%, transparent); }
  .word[data-status="entering"]::after { animation: reel-reveal 1.5s var(--bezier) var(--delay, 0ms) forwards; }
  .line { animation: reel-line 0.8s var(--bezier) 1s both; }
}
.line { display: flex; position: relative; top: 0.05em; width: 120%; min-width: 24px; height: 2px; margin-left: 20px; background: color-mix(in lab, var(--text) 30%, transparent); transform-origin: left; }
.scroll-indicator { position: absolute; bottom: 64px; left: 50%; width: 26px; height: 38px; margin-left: -13px; border: 2px solid color-mix(in lab, var(--text) 40%, transparent); border-radius: 20px; }
.scroll-indicator::before { content: ""; position: absolute; top: 6px; left: 50%; width: 2px; height: 7px; border-radius: 4px; background: color-mix(in lab, var(--text) 40%, transparent); transform: translateX(-1px); }
@media (prefers-reduced-motion: no-preference) { .scroll-indicator::before { animation: reel-scroll 2s ease infinite; } }
@media (pointer: coarse) { .scroll-indicator { display: none; } }
@keyframes reel-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes reel-reveal { 0% { transform: scale3d(0, 1, 1); transform-origin: left; } 50% { transform: scale3d(1, 1, 1); transform-origin: left; } 51% { transform: scale3d(1, 1, 1); transform-origin: right; } 100% { transform: scale3d(0, 1, 1); transform-origin: right; } }
@keyframes reel-text-reveal { 0%, 50% { color: color-mix(in lab, var(--text) 0%, transparent); } 60%, 100% { color: var(--textTitle); } }
@keyframes reel-line { from { transform: scaleX(0); opacity: 1; } to { transform: scaleX(1); opacity: 1; } }
@keyframes reel-scroll { 0% { transform: translate3d(-1px, 0, 0); opacity: 0; } 20% { transform: translate3d(-1px, 0, 0); opacity: 1; } 100% { transform: translate3d(-1px, 8px, 0); opacity: 0; } }

/* Project summaries (routes/home/project-summary) */
.summary { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; height: var(--pf-screen, 100vh); max-height: 1080px; min-height: 640px; margin: 48px 0; padding-bottom: var(--spaceL); }
.summary.first { margin-top: 0; }
.summary-content { --textColumnWidth: 40%; display: grid; grid-template-columns: var(--textColumnWidth) 1fr; column-gap: var(--space2XL); align-items: center; justify-content: center; width: 100%; max-width: var(--maxWidthL); }
.summary.alt .summary-content { grid-template-columns: 1fr var(--textColumnWidth); }
.details { position: relative; z-index: 4; }
.index { position: relative; display: grid; grid-template-columns: 90px 1fr; gap: var(--spaceM); align-items: center; margin-bottom: var(--spaceXL); }
.index-number { color: var(--primary); font-size: var(--fontSizeBodyS); font-weight: 500; transition: opacity 0.4s var(--bezier) 1.3s, transform 0.4s var(--bezier) 1.3s; }
.summary .heading { margin-bottom: var(--spaceL); transition: opacity 0.8s var(--bezier) 0.4s, transform 0.8s var(--bezier) 0.4s; }
.summary .description { margin-bottom: var(--spaceXL); transition: opacity 0.8s var(--bezier) 0.6s, transform 0.8s var(--bezier) 0.6s; }
.summary .cta { transition: opacity 0.8s var(--bezier) 0.8s, transform 0.8s var(--bezier) 0.8s; }
.summary .tags { margin: calc(var(--spaceL) * -0.5) 0 var(--spaceXL); color: var(--textLight); font-size: var(--fontSizeBodyXS); }
.preview { position: relative; container: reelpv / inline-size; display: flex; align-items: center; justify-content: center; justify-self: center; width: 100%; height: 100%; }
.devices { position: relative; width: 100%; transition: opacity 0.8s var(--bezier) 0.7s, transform 0.8s var(--bezier) 0.7s; }
.katakana { position: absolute; z-index: 2; bottom: 0; right: -24%; width: 100%; color: var(--textTitle); transform: translateY(45%); font-family: "Hiragino Kaku Gothic StdN", "Hiragino Sans", "Yu Gothic", Meiryo, "Noto Sans JP", sans-serif; font-size: calc(100cqi / 6.2); font-weight: 900; line-height: 1; letter-spacing: -0.02em; white-space: nowrap; pointer-events: none; transition: opacity 1.2s ease 1.4s; }
:scope[data-theme="light"] .katakana { opacity: 0.7; }
.devices[data-device="phone"] .katakana { z-index: 1; right: auto; left: 0; bottom: 23%; transform: translateY(50%); }
.summary.alt .devices[data-device="laptop"] .katakana { right: auto; left: -24%; }

/* CSS stand-ins for the original's 3D laptop and phone models */
.laptop { position: relative; z-index: 1; width: 112%; margin-left: 10%; }
.summary.alt .laptop { margin-left: -22%; }
.laptop-screen { position: relative; padding: 2.4% 2.4% 3.2%; border-radius: 18px 18px 4px 4px; background: #121316; box-shadow: inset 0 0 0 1px #2c2d33, 0 30px 60px -20px rgb(0 0 0 / 0.6); }
.laptop-screen::before { content: ""; position: absolute; top: 1.1%; left: 50%; width: 6px; height: 6px; border-radius: 50%; background: #2a2b30; transform: translateX(-50%); }
.screen { position: relative; overflow: hidden; aspect-ratio: 16 / 10; border-radius: 3px; background: var(--backgroundLight); }
.screen img, .screen video { width: 100%; height: 100%; object-fit: cover; object-position: top; display: block; }
.laptop-base { position: relative; height: 0; padding-bottom: 3.6%; margin: 0 -9%; border-radius: 0 0 16px 16px; background: linear-gradient(#3a3b41, #1b1c20 60%, #0f1013); }
.laptop-base::before { content: ""; position: absolute; top: 0; left: 50%; width: 16%; height: 38%; border-radius: 0 0 10px 10px; background: #0d0e10; transform: translateX(-50%); }
.phones { position: relative; display: flex; justify-content: center; align-items: flex-start; gap: 0; padding: 4% 0 10%; }
.phone { position: relative; width: 42%; padding: 2.6%; border-radius: 13% / 6.2%; background: #121316; box-shadow: inset 0 0 0 2px #2c2d33, 0 30px 60px -20px rgb(0 0 0 / 0.7); }
.phone .screen { aspect-ratio: 9 / 19.5; border-radius: 10% / 4.6%; }
.phone::before { content: ""; position: absolute; z-index: 2; top: 4.2%; left: 50%; width: 30%; height: 3.4%; border-radius: 99px; background: #121316; transform: translateX(-50%); }
.phones .phone:nth-child(1) { transform: translate(8%, -6%); }
.phones .phone:nth-child(2) { transform: translate(-8%, 22%); z-index: 2; }
.phones .phone:only-child { transform: none; width: 50%; z-index: 2; }
.plain { position: relative; z-index: 1; overflow: hidden; border-radius: 4px; }
.plain img { width: 100%; height: auto; display: block; }
.blank-screen { position: absolute; inset: 0; display: grid; place-items: center; padding: 8%; background: radial-gradient(circle at 30% 20%, color-mix(in lab, var(--accent) 35%, transparent), transparent 55%), var(--backgroundLight); color: var(--textTitle); font-size: clamp(18px, 3cqi, 40px); font-weight: 700; letter-spacing: -0.03em; text-align: center; }

/* Scroll-in states, set by RevealOnScroll on [data-reveal] sections */
[data-shown="false"] .divider .line { opacity: 0; transform: scaleX(0); }
[data-shown="false"] .divider .notch { opacity: 0; clip-path: polygon(0 -1px, 0 -1px, 10px 100%, 10px 100%); }
[data-shown="false"] .index-number { opacity: 0; transform: translateX(-16px); }
[data-shown="false"] :is(.heading, .description, .cta, .devices) { opacity: 0; transform: translate3d(0, 24px, 0); }
[data-shown="false"] .katakana { opacity: 0; }
[data-shown="false"] :is(.profile-text, .profile-tag-text) { opacity: 0; }
[data-shown="false"] .profile-frame::after { transform: scale3d(0, 1, 1); }
[data-shown="false"] .profile-image img, [data-shown="false"] .profile-image .initials { opacity: 0; }
@media (prefers-reduced-motion: reduce) { [data-shown] * { transition: none !important; } }

/* More projects */
.more { display: flex; justify-content: center; padding-top: var(--space3XL); padding-bottom: var(--space3XL); }
.more-inner { width: 100%; max-width: var(--maxWidthL); }
.more-list { display: grid; gap: var(--spaceXL); margin-top: var(--space2XL); }
.more-item { display: grid; grid-template-columns: 90px 1fr; gap: var(--spaceM); align-items: baseline; }
.more-item .index-number { transition: none; }
.more-item h3 { color: var(--textTitle); font-size: var(--fontSizeH5); font-weight: 500; line-height: 1.2; }
.more-item p { margin-top: var(--spaceS); }

/* Profile (routes/home/profile) */
.profile { display: flex; justify-content: center; width: 100%; min-height: var(--pf-screen, 100vh); margin-top: 60px; margin-bottom: 40px; padding-top: 60px; padding-bottom: 40px; }
.profile-content { display: grid; grid-template-columns: 1fr 50%; column-gap: var(--space2XL); width: 100%; max-width: var(--maxWidthL); }
.profile-column { position: relative; display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 40px; }
.profile-title { white-space: nowrap; margin-bottom: var(--spaceL); }
.profile-text { margin-bottom: var(--spaceXL); transition: opacity 0.8s ease 0.6s; }
.profile-tag { display: grid; grid-template-columns: var(--space4XL) 1fr; gap: 12px; align-items: center; width: 100%; margin-top: 220px; margin-bottom: 40px; }
.profile-tag-text { color: var(--primary); font-size: var(--fontSizeBodyS); font-weight: 500; transition: opacity 0.4s var(--bezier) 1.3s; }
.profile-image { position: relative; width: 100%; }
.profile-frame { position: relative; overflow: hidden; }
.profile-image img, .profile-image .initials { display: block; width: 100%; aspect-ratio: 3 / 4; object-fit: cover; transition: opacity 0.1s linear 0.6s; }
.profile-image .initials { display: grid; place-items: center; background: var(--backgroundLight); color: var(--textTitle); font-size: 120px; font-weight: 700; letter-spacing: -0.05em; }
.profile-frame::after { content: ""; position: absolute; inset: 0; background: var(--accent); transform: scale3d(0, 1, 1); transform-origin: left; pointer-events: none; }
@media (prefers-reduced-motion: no-preference) { [data-shown="true"] .profile-frame::after { animation: reel-reveal 1.2s var(--bezier) 0.1s; } }
.katakana-v { position: absolute; right: 0; bottom: 0; z-index: 16; height: 100%; color: var(--textTitle); font-family: "Hiragino Kaku Gothic StdN", "Hiragino Sans", "Yu Gothic", Meiryo, "Noto Sans JP", sans-serif; font-size: clamp(48px, 7cqi, 110px); font-weight: 900; line-height: 1; writing-mode: vertical-rl; transform: translate3d(50%, -20%, 0); pointer-events: none; white-space: nowrap; overflow: hidden; }

/* Project detail page (layouts/project), opened in place with :target */
.detail { display: none; position: fixed; inset: 0; z-index: 128; overflow-y: auto; overscroll-behavior: contain; background: var(--background); }
.detail:target { display: block; }
@media (prefers-reduced-motion: no-preference) { .detail:target { animation: reel-fade 0.6s var(--bezier); } }
.detail-close { position: fixed; top: calc(var(--spaceOuter) - 8px); right: calc(var(--spaceOuter) + 48px); z-index: 2; display: flex; align-items: center; gap: 8px; height: 48px; padding: 0 var(--spaceM); color: var(--textTitle); font-size: 16px; font-weight: 500; text-decoration: none; }
.detail-close:hover { color: var(--accent); }
.detail-header { display: flex; justify-content: center; padding-top: calc(var(--space5XL) + var(--space3XL)); padding-bottom: var(--space3XL); }
.detail-header-content { display: grid; grid-template-columns: 1fr 300px; gap: var(--space2XL); width: 100%; max-width: var(--maxWidthL); }
.detail-title { margin-bottom: var(--spaceL); }
.detail-description { margin-bottom: var(--spaceXL); }
.meta { list-style: none; margin-top: var(--spaceS); }
.meta-item { padding: var(--spaceL) 0; border-top: 1px solid color-mix(in lab, var(--text) 20%, transparent); color: var(--textLight); font-size: var(--fontSizeBodyM); }
.meta-item:last-child { border-bottom: 1px solid color-mix(in lab, var(--text) 20%, transparent); }
.detail-images { display: grid; gap: var(--space3XL); justify-items: center; padding-bottom: var(--space4XL); }
.detail-image { width: 100%; max-width: 1100px; }
.detail-image img { width: 100%; height: auto; display: block; }
.detail-section { display: flex; justify-content: center; padding-bottom: var(--space4XL); }
.detail-section-inner { width: 100%; max-width: var(--maxWidthM); display: grid; gap: var(--spaceL); }

/* Footer (components/footer) */
.footer { position: relative; z-index: 8; display: flex; flex-direction: column; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: var(--space3XL) var(--spaceL); color: var(--textLight); font-size: var(--fontSizeBodyS); line-height: 1.1; text-align: center; }
.footer .design-credit { opacity: 1; font-size: 14px; }
.footer .credit { padding: 4px 0 0; }

@container pf (max-width: 1040px) {
  .shell { --fontSizeH0: 80px; --fontSizeH1: 60px; --fontSizeH2: 48px; --fontSizeH3: 32px; --fontSizeH4: 24px; --fontSizeH5: 20px; }
  .section { padding-left: calc(var(--space4XL) + var(--space3XL)); }
  .name { font-size: 18px; }
  .summary { height: auto; min-height: 0; margin: var(--space3XL) 0; }
  .summary-content, .summary.alt .summary-content { grid-template-columns: 100%; }
  .details { grid-row: 2; grid-column: 1; justify-self: center; max-width: 410px; }
  .preview { grid-row: 1; }
  .laptop, .summary.alt .laptop { width: 100%; margin: 0; }
  .preview { margin-bottom: var(--space3XL); }
  .katakana, .summary.alt .devices[data-device="laptop"] .katakana { right: -10%; left: auto; font-size: calc(80cqi / 6.2); }
  .profile { padding-right: 80px; padding-left: 160px; margin-top: 40px; margin-bottom: 20px; padding-top: 50px; min-height: 0; }
  .profile-content { max-width: 600px; grid-template-columns: 100%; }
  .profile-tag { margin-top: 30px; }
  .detail-header-content { grid-template-columns: 100%; }
}
@container pf (max-width: 696px) {
  .shell { --spaceOuter: 24px; --fontSizeH0: 56px; --fontSizeH1: 40px; --fontSizeH2: 34px; --fontSizeH3: 28px; --fontSizeH4: 22px; --fontSizeH5: 18px; --fontSizeBodyL: 17px; --fontSizeBodyM: 16px; --fontSizeBodyS: 14px; }
  .section, .profile { padding-left: var(--spaceOuter); padding-right: var(--spaceOuter); }
  .navbar { bottom: auto; }
  .nav { display: none; }
  .intro-text { top: calc(var(--space3XL) * -1); }
  .name { margin-bottom: var(--spaceL); letter-spacing: 0.2em; white-space: nowrap; overflow: hidden; }
  .summary { padding-bottom: var(--space4XL); margin-bottom: 0; }
  .profile { margin-top: 0; padding-top: var(--space4XL); overflow-x: clip; }
  .nav-toggle { display: flex; position: fixed; top: calc(var(--spaceOuter) - 8px); right: calc(var(--spaceOuter) - 8px); z-index: 64; align-items: center; justify-content: center; width: 48px; height: 48px; border: 0; background: none; color: var(--textTitle); cursor: pointer; }
  .nav-toggle-inner { position: relative; display: grid; gap: 6px; width: 26px; }
  .nav-toggle-inner span { display: block; height: 2px; background: currentColor; transition: transform 0.4s var(--bezier), opacity 0.4s; }
  .nav-toggle[aria-expanded="true"] .nav-toggle-inner span:nth-child(1) { transform: translateY(8px) rotate(45deg); }
  .nav-toggle[aria-expanded="true"] .nav-toggle-inner span:nth-child(2) { opacity: 0; }
  .nav-toggle[aria-expanded="true"] .nav-toggle-inner span:nth-child(3) { transform: translateY(-8px) rotate(-45deg); }
  .theme-toggle { display: none; top: auto; bottom: var(--spaceL); right: var(--spaceL); }
  .shell:has(.nav-toggle[aria-expanded="true"]) .theme-toggle { display: flex; }
  .mobile-nav { position: fixed; inset: 0; z-index: 48; display: flex; flex-direction: column; align-items: center; justify-content: center; background: color-mix(in lab, var(--background) 70%, transparent); backdrop-filter: blur(24px) saturate(120%); -webkit-backdrop-filter: blur(24px) saturate(120%); transform: translate3d(0, -100%, 0); transition: transform 0.6s var(--bezier); }
  .mobile-nav[data-visible="true"] { transform: none; }
  .mobile-nav-link { position: relative; width: 100%; padding: var(--spaceL); color: var(--textBody); font-size: 22px; text-align: center; text-decoration: none; opacity: 0; transform: translate3d(0, -32px, 0); transition: opacity 0.3s var(--bezier) var(--transition-delay), transform 0.3s var(--bezier) var(--transition-delay); }
  .mobile-nav-link[data-visible="true"] { opacity: 1; transform: none; }
  .katakana-v { display: none; }
  .laptop-screen { border-radius: 10px 10px 3px 3px; }
}
@container pf (max-width: 400px) {
  .shell { --spaceOuter: 16px; --fontSizeH0: 42px; --fontSizeH1: 38px; --fontSizeH2: 28px; --fontSizeH3: 24px; --fontSizeH4: 20px; }
}
`;

export const REEL_CSS = templateCss(".pf-reel", css);
