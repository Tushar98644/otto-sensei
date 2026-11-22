import { templateCss } from "../css";

// Ported from JoaccoG/portfolio-v2 (MIT, see ./LICENSE.txt). The baked paper tiles are redrawn
// as gradients, so the page loads no pictures.
const css = `
:scope {
  --ink: #1c1710;
  --ink-soft: #3a3222;
  --ink-faint: rgba(28, 23, 16, 0.55);
  --rule: rgba(28, 23, 16, 0.32);
  --paper: #f2ead8;
  --paper-plate: #e4d8be;
  --ground: #0f0c08;
  --cream: #efe6d2;
  --acc: #b4342a;
  --fNP: var(--pf-font-unifraktur, "UnifrakturMaguntia"), "Old English Text MT", Didot, serif;
  --fHD: var(--pf-font-abril, "Abril Fatface"), Didot, "Bodoni MT", serif;
  --fBD: var(--pf-font-old-standard, "Old Standard TT"), Georgia, serif;
  --fPen: var(--pf-font-caveat, "Caveat"), cursive;
  --pad-x: clamp(16px, 3.6cqi, 56px);
  color-scheme: light;
  background: var(--ground);
  color: var(--ink);
  font-family: var(--fBD);
  font-size: 15px;
  line-height: 1.6;
  padding: clamp(6px, 1.2cqi, 18px) clamp(4px, 1.6cqi, 26px);
  min-height: var(--pf-screen, 100vh);
}
:scope a { color: inherit; }
:scope svg { display: inline-block; vertical-align: middle; }
.sheet {
  position: relative;
  max-width: 1560px;
  margin: 0 auto;
  background-color: var(--paper);
  background-image:
    radial-gradient(rgba(28, 23, 16, 0.075) 0.6px, transparent 0.9px),
    radial-gradient(ellipse 42% 30% at 18% 22%, rgba(196, 176, 134, 0.28), transparent 70%),
    radial-gradient(ellipse 36% 26% at 78% 14%, rgba(255, 250, 236, 0.5), transparent 70%),
    radial-gradient(ellipse 50% 32% at 64% 58%, rgba(190, 168, 124, 0.22), transparent 72%),
    radial-gradient(ellipse 40% 30% at 24% 82%, rgba(255, 250, 236, 0.4), transparent 70%),
    linear-gradient(90deg, rgba(150, 128, 88, 0.3), transparent 6%, transparent 94%, rgba(150, 128, 88, 0.3));
  background-size: 3px 3px, auto, auto, auto, auto, auto;
  box-shadow: 0 0 0 1px rgba(255, 250, 236, 0.2), 0 30px 80px rgba(0, 0, 0, 0.6), inset 0 0 120px rgba(120, 96, 56, 0.28);
  overflow: hidden;
}
.sheet::before, .sheet::after {
  content: ""; position: absolute; top: 0; bottom: 0; width: 6px; pointer-events: none;
  background: repeating-linear-gradient(180deg, transparent 0 46px, var(--paper) 46px 52px, transparent 52px 98px);
  opacity: 0.8;
}
.sheet::before { left: -3px; }
.sheet::after { right: -3px; }

.dot { color: var(--acc); }
.kicker { color: var(--acc); font-size: 10.5px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; }
.star { width: 0.75em; height: 0.75em; fill: var(--acc); }
.hand { width: 1.5em; height: 0.85em; fill: currentColor; stroke: currentColor; stroke-width: 1.05; stroke-linecap: round; stroke-linejoin: round; color: var(--acc); }
.fleuron { width: 1em; height: 1em; fill: var(--acc); stroke: var(--acc); stroke-width: 0.6; }
.caret { width: 9px; height: 7px; fill: var(--acc); }

.ticker { overflow: hidden; border-bottom: 1px solid var(--rule); white-space: nowrap; font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; padding: 7px 0 6px; color: var(--ink-soft); }
.ticker-track { display: inline-flex; }
.ticker-run { display: inline-flex; flex: none; }
.ticker-item { display: inline-flex; align-items: center; gap: 18px; padding-right: 18px; }
@keyframes gazette-ticker { to { transform: translateX(-50%); } }
@keyframes gazette-rise { from { transform: translateY(110%); opacity: 0; } }
@keyframes gazette-ink { from { opacity: 0; filter: blur(3px); transform: scale(1.02); } }
@media (prefers-reduced-motion: no-preference) {
  .ticker-track { animation: gazette-ticker 90s linear infinite; }
  .ticker:hover .ticker-track { animation-play-state: paused; }
  .rise { animation: gazette-rise 0.7s cubic-bezier(0.19, 1, 0.22, 1) both; }
  .r2 { animation-delay: 0.06s; }
  .r3 { animation-delay: 0.12s; }
  .np-word { display: inline-block; animation: gazette-ink 0.9s cubic-bezier(0.19, 1, 0.22, 1) both; }
  .w2 { animation-delay: 0.12s; }
  .w3 { animation-delay: 0.24s; }
  [data-reveal] { transition: opacity 0.7s ease, transform 0.7s cubic-bezier(0.19, 1, 0.22, 1); }
  [data-reveal][data-shown="false"] { opacity: 0; transform: translateY(18px); }
}
:scope:where([data-pf-still] *, [inert] *) :where(.ticker-track, .rise, .np-word) { animation: none; }

.mast { padding: 18px var(--pad-x) 0; }
.top { display: grid; grid-template-columns: 1fr auto 1fr; align-items: baseline; font-size: 10.5px; letter-spacing: 0.2em; text-transform: uppercase; overflow: hidden; }
.top .motto { font-style: italic; letter-spacing: 0.04em; text-transform: none; font-size: 12px; }
.top .price { justify-self: end; }
.plate-row { display: grid; grid-template-columns: 150px minmax(0, 1fr) 150px; align-items: center; gap: 16px; padding: 14px 0 18px; }
.ear { display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; line-height: 1.45; }
.ear-label { font-weight: 700; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; }
.ear-text { font-style: italic; color: var(--ink-soft); }
.press { align-items: flex-end; text-align: right; }
.seal { width: 84px; height: 84px; }
.seal-ring { fill: var(--paper); stroke: var(--acc); stroke-width: 1.3; }
.seal-inner { fill: none; stroke: rgba(28, 23, 16, 0.4); stroke-width: 0.8; }
.seal-arc { font-family: var(--fBD); font-size: 7.2px; letter-spacing: 1.6px; fill: var(--acc); text-transform: uppercase; }
.seal-mono { font-family: var(--fNP); font-size: 15px; fill: var(--acc); }
.seal-est { font-family: var(--fBD); font-size: 5.4px; letter-spacing: 1px; fill: var(--ink-soft); text-transform: uppercase; }
.nameplate {
  font-family: var(--fNP); font-weight: 400; text-align: center; line-height: 1.02; color: var(--ink);
  font-size: clamp(34px, min(9.6cqi, calc((100cqi - 380px) / (var(--chars) * 0.56))), 150px);
  text-wrap: balance;
}
.fleuron-l, .fleuron-r { width: 0.17em; height: 0.17em; margin: 0 0.12em; vertical-align: 0.35em; fill: var(--acc); }
.folio { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; border-top: 3px double var(--ink-soft); border-bottom: 3px double var(--ink-soft); padding: 9px 10px; font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; }
.folio-place { text-align: center; }
.folio-link { justify-self: end; display: inline-flex; align-items: center; gap: 6px; color: var(--acc); text-decoration: none; border-bottom: 1px solid currentColor; }

.front { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 0 40px; padding: 22px var(--pad-x) 10px; }
.story { min-width: 0; }
.headline { font-family: var(--fHD); font-size: clamp(42px, 7.2cqi, 116px); line-height: 0.94; text-transform: uppercase; letter-spacing: -0.005em; margin-top: 14px; text-wrap: balance; overflow-wrap: break-word; }
.headline[data-long] { font-size: clamp(34px, 5cqi, 80px); }
.dek { font-style: italic; font-size: clamp(17px, 1.6cqi, 21px); line-height: 1.55; margin-top: 22px; color: var(--ink); max-width: 46em; }
.byline { margin-top: 16px; padding: 7px 0; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; }
.body[data-cols="2"] { columns: 2 18em; column-gap: 28px; column-rule: 1px solid var(--rule); }
.body { max-width: 52em; margin-top: 16px; text-align: justify; hyphens: auto; font-size: 15.5px; line-height: 1.72; }
.body p + p { margin-top: 0.8em; }
.body em { font-style: italic; }
.lead-para::first-letter { font-family: var(--fHD); float: left; font-size: 3.9em; line-height: 0.82; padding: 0.06em 0.08em 0 0; color: var(--ink); }
.closer { font-style: normal; }
.closer span { letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.85em; }

.rail { border-left: 1px solid var(--rule); padding-left: 24px; display: flex; flex-direction: column; gap: 18px; }
.portrait { display: flex; flex-direction: column; gap: 8px; }
.engraving {
  position: relative; aspect-ratio: 1 / 1.08; display: grid; place-items: center; overflow: hidden;
  border: 2px solid #a8916a; box-shadow: inset 0 0 0 5px var(--paper-plate), inset 0 0 0 6px rgba(58, 50, 34, 0.35);
  background:
    repeating-linear-gradient(118deg, rgba(58, 50, 34, 0.17) 0 1px, transparent 1px 4px),
    repeating-linear-gradient(28deg, rgba(58, 50, 34, 0.08) 0 1px, transparent 1px 5px),
    radial-gradient(ellipse 60% 56% at 50% 46%, #f3e7cc, #d9c6a0 70%, #b89b6c);
}
.engraving::after { content: ""; position: absolute; inset: 14%; border: 1px solid rgba(58, 50, 34, 0.3); border-radius: 50%; }
.engraving span { position: relative; z-index: 1; font-family: var(--fNP); font-size: clamp(72px, 9cqi, 128px); color: var(--ink-soft); line-height: 1; text-shadow: 1px 1px 0 rgba(255, 250, 236, 0.6); }
.portrait figcaption { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; text-align: center; line-height: 1.5; }
.portrait figcaption em { text-transform: none; letter-spacing: 0.02em; font-size: 11px; }
.box { border: 2px solid #a59a82; box-shadow: inset 0 0 0 4px var(--paper), inset 0 0 0 5px rgba(28, 23, 16, 0.3); background: rgba(255, 250, 238, 0.35); padding: 14px 16px 12px; }
.box-title { text-align: center; font-weight: 700; font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; padding-bottom: 8px; border-bottom: 3px solid rgba(28, 23, 16, 0.5); margin-bottom: 6px; }
.index li { border-bottom: 1px solid var(--rule); }
.index li:last-child { border-bottom: 0; }
.index a { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 2px; font-style: italic; font-size: 13.5px; text-decoration: none; }
.index a:hover span { text-decoration: underline; }
.almanac > div { padding: 6px 0; border-bottom: 1px solid var(--rule); }
.almanac dt { font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; }
.almanac dd, .almanac .value { color: var(--acc); font-size: 10.5px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.almanac dd.plain { color: var(--ink); font-weight: 400; font-style: italic; font-size: 13.5px; letter-spacing: 0; text-transform: none; line-height: 1.45; }
.strip { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; align-items: start; margin-top: 28px; }
.box-foot { text-align: center; font-style: italic; font-size: 12px; padding-top: 8px; }
.notices li { font-style: italic; font-size: 13px; line-height: 1.5; padding: 6px 0; }
.notices b { font-style: normal; color: var(--acc); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
.cue { grid-column: 1 / -1; justify-self: center; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 26px 0 18px; font-size: 10.5px; letter-spacing: 0.24em; text-transform: uppercase; text-decoration: none; }

.band { display: grid; grid-template-columns: auto auto 1fr auto; align-items: center; gap: 22px; border-top: 1px solid var(--ink-soft); border-bottom: 3px double var(--ink-soft); background: rgba(255, 250, 236, 0.4); padding-right: var(--pad-x); font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; }
.band-tab { background: var(--ink); color: var(--paper); font-family: var(--fHD); font-size: 15px; letter-spacing: 0.04em; padding: 9px 32px 8px var(--pad-x); }
.band-note { text-align: center; font-style: italic; text-transform: none; letter-spacing: 0.02em; font-size: 11px; color: var(--ink-soft); }
.section { scroll-margin-top: 12px; }
.inner { padding: 22px var(--pad-x) 40px; }
.sec-head { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; margin-bottom: 26px; }
.sec-head.left { text-align: left; align-items: flex-start; }
.sec-title { font-family: var(--fHD); font-size: clamp(34px, 5cqi, 72px); line-height: 0.98; text-transform: uppercase; text-wrap: balance; }
.sec-title.left { text-align: left; }
.sec-line { font-style: italic; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; }
.rule-title { display: flex; align-items: center; gap: 14px; font-weight: 700; font-size: 10.5px; letter-spacing: 0.24em; text-transform: uppercase; margin-bottom: 14px; }
.rule-title::before, .rule-title::after { content: ""; flex: 1; border-top: 3px double var(--rule); }

.story .figures { margin: 26px 0 0; }
.figures { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); border-top: 2px solid var(--ink-soft); border-bottom: 1px solid var(--rule); margin-bottom: 30px; }
.figures > div { display: flex; flex-direction: column-reverse; gap: 4px; padding: 16px 18px; border-left: 1px solid var(--rule); }
.figures > div:first-child { border-left: 0; }
.figures dd { font-family: var(--fHD); font-size: clamp(40px, 4.4cqi, 64px); line-height: 1; }
.figures dt { font-style: italic; font-size: 13.5px; line-height: 1.4; }
.testimony { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
.quote { position: relative; padding: 18px 18px 14px; border-top: 3px double var(--ink-soft); }
.quote-no { position: absolute; top: -4px; right: 6px; font-family: var(--fHD); font-size: 56px; line-height: 1; color: rgba(28, 23, 16, 0.12); }
.quote blockquote { font-size: 17px; line-height: 1.55; font-style: italic; }
.quote figcaption { margin-top: 10px; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; }
.quote figcaption em { text-transform: none; letter-spacing: 0.02em; font-size: 12px; }
.quote figcaption a { text-decoration: none; font-weight: 700; }

.advert { position: relative; border: 2px solid #a59a82; box-shadow: inset 0 0 0 4px var(--cream), inset 0 0 0 5px rgba(28, 23, 16, 0.32), 3px 4px 0 rgba(28, 23, 16, 0.12); background: var(--cream); padding: 14px 18px 16px; text-align: center; }
.advert.wide { margin: 8px var(--pad-x) 34px; padding: 22px 24px 20px; }
.advert-label { font-size: 9.5px; letter-spacing: 0.24em; text-transform: uppercase; }
.advert-title { font-family: var(--fHD); font-size: 21px; line-height: 1.12; text-transform: uppercase; margin-top: 6px; }
.advert-title em { font-style: normal; color: var(--acc); }
.advert-title.big { font-size: clamp(28px, 3.8cqi, 52px); }
.advert-line { font-style: italic; font-size: 13.5px; line-height: 1.5; margin-top: 6px; }
.advert-foot { color: var(--acc); font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase; margin-top: 12px; }
.btns { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.btns.center { justify-content: center; }
.btn { display: inline-flex; align-items: center; gap: 9px; border: 1px solid var(--ink); padding: 10px 16px 9px; font-size: 10.5px; letter-spacing: 0.22em; text-transform: uppercase; text-decoration: none; background: transparent; cursor: pointer; list-style: none; }
.btn::-webkit-details-marker { display: none; }
@media (prefers-reduced-motion: no-preference) { .btn { transition: background 0.2s ease, color 0.2s ease; } }
.btn:hover { background: var(--ink); color: var(--paper); }

.plates { display: flex; flex-direction: column; }
.plate { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 34px; align-items: center; padding: 28px 0; border-top: 1px solid var(--rule); }
.plate:last-child { border-bottom: 1px solid var(--rule); }
.plate.flip .plate-art { order: 2; }
.plate-art {
  position: relative; aspect-ratio: 16 / 10; overflow: hidden; color: #f4ecda; display: flex; flex-direction: column; justify-content: center; padding: 8% 7%;
  background-color: var(--plate);
  box-shadow: 0 0 0 1px rgba(28, 23, 16, 0.6), 4px 5px 0 rgba(28, 23, 16, 0.14);
}
.plate-art::before { content: ""; position: absolute; inset: 0; pointer-events: none; opacity: 0.8; }
.plate-art[data-pattern="ring"]::before { background: radial-gradient(rgba(214, 228, 240, 0.55) 0.8px, transparent 1.2px) 0 0 / 5px 5px; -webkit-mask: radial-gradient(circle at var(--x) var(--y), transparent 16%, #000 20%, #000 34%, transparent 46%); mask: radial-gradient(circle at var(--x) var(--y), transparent 16%, #000 20%, #000 34%, transparent 46%); }
.plate-art[data-pattern="hatch"]::before { background: repeating-linear-gradient(135deg, rgba(240, 228, 200, 0.16) 0 1px, transparent 1px 6px); -webkit-mask: radial-gradient(ellipse at var(--x) var(--y), #000, transparent 62%); mask: radial-gradient(ellipse at var(--x) var(--y), #000, transparent 62%); }
.plate-art[data-pattern="grid"]::before { background: linear-gradient(rgba(240, 228, 200, 0.12) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgba(240, 228, 200, 0.12) 1px, transparent 1px) 0 0 / 22px 22px; -webkit-mask: radial-gradient(ellipse at var(--x) var(--y), #000 10%, transparent 70%); mask: radial-gradient(ellipse at var(--x) var(--y), #000 10%, transparent 70%); }
.plate-no { position: absolute; top: 0; left: 10px; background: var(--ink); color: var(--paper); font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; padding: 4px 9px; }
.plate-name { position: relative; font-family: var(--fHD); font-size: clamp(30px, 4.4cqi, 66px); line-height: 0.92; text-transform: uppercase; overflow-wrap: anywhere; max-width: 90%; }
.plate-line { position: relative; margin-top: 12px; max-width: 26em; font-size: 12px; line-height: 1.5; color: rgba(244, 236, 218, 0.65); }
.stamp { position: absolute; right: 6%; bottom: 9%; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 12px; border: 2px solid rgba(244, 236, 218, 0.8); outline: 1px solid rgba(244, 236, 218, 0.5); outline-offset: 3px; transform: rotate(-7deg); color: #f4ecda; }
.stamp b { font-family: var(--fHD); font-weight: 400; font-size: clamp(13px, 1.3cqi, 18px); text-transform: uppercase; letter-spacing: 0.04em; }
.stamp small { font-size: 8px; letter-spacing: 0.2em; text-transform: uppercase; }
.plate-text { min-width: 0; }
.plate-title { font-family: var(--fHD); font-size: clamp(34px, 3.8cqi, 58px); line-height: 0.98; text-transform: uppercase; margin-top: 10px; overflow-wrap: anywhere; }
.plate-dek { font-style: italic; font-size: 17px; line-height: 1.55; margin-top: 12px; }
.composed { margin-top: 12px; font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; }
.outcome { margin-top: 6px; color: var(--acc); font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
.account { margin-top: 10px; }
.account > summary { display: inline-flex; }
.account[open] > summary { background: var(--ink); color: var(--paper); }
.account-body { margin-top: 14px; padding: 14px 0 0; border-top: 3px double var(--rule); columns: 2 16em; column-gap: 24px; text-align: justify; hyphens: auto; }
.account-body p + p { margin-top: 0.7em; }
.also { margin-top: 34px; }
.also ul { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0 30px; }
.also li { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--rule); }
.also-no { flex: none; width: 52px; color: var(--acc); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding-top: 6px; }
.also h3 { font-family: var(--fHD); font-size: 22px; line-height: 1.15; }
.also h3 a { text-decoration: none; }
.also h3 a:hover { text-decoration: underline; }
.also p { font-style: italic; font-size: 14px; line-height: 1.5; margin-top: 2px; }

.split { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 40px; }
.split.wide-left { grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); }
.split > :last-child { border-left: 1px solid var(--rule); padding-left: 28px; }
.col-dek { font-style: italic; font-size: 17px; line-height: 1.55; margin-top: 16px; max-width: 28em; }
.col-lists { display: flex; flex-direction: column; gap: 26px; }
.list-title { font-weight: 700; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; padding-bottom: 7px; border-bottom: 1px solid var(--ink-soft); }
.col-list li { display: flex; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--rule); }
.numeral { flex: none; width: 34px; font-size: 11px; color: var(--ink-faint); padding-top: 5px; }
.col-list h3 { font-family: var(--fHD); font-size: 19px; line-height: 1.25; }
.col-list h3 a { text-decoration: none; }
.col-list h3 a:hover { text-decoration: underline; }
.meta { font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 3px; color: var(--ink-soft); }

.appts { border-top: 1px solid var(--rule); }
.appt { display: grid; grid-template-columns: 130px minmax(0, 1fr); gap: 20px; padding: 16px 0; border-bottom: 1px solid var(--rule); }
.appt-date { font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; padding-top: 7px; }
.appt-date.now { color: var(--acc); }
.appt-role { font-family: var(--fHD); font-size: clamp(20px, 2cqi, 26px); line-height: 1.2; }
.appt-role a { text-decoration: none; }
.appt-role a:hover { text-decoration: underline; }
.appt-meta { color: var(--acc); font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 3px; }
.appt-line { font-style: italic; font-size: 14.5px; line-height: 1.5; margin-top: 4px; }
.appt-notes { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; line-height: 1.55; }
.appt-notes li { padding-left: 18px; position: relative; }
.appt-notes li::before { content: "—"; position: absolute; left: 0; color: var(--ink-faint); }
.adverts { display: flex; flex-direction: column; gap: 18px; padding-top: 6px; }

.postcard { position: relative; max-width: 760px; margin: 0 auto; background: #f5eddc; border: 1px solid rgba(28, 23, 16, 0.35); box-shadow: inset 0 0 0 6px #f5eddc, inset 0 0 0 7px rgba(28, 23, 16, 0.4), 6px 8px 0 rgba(28, 23, 16, 0.1), 0 18px 40px rgba(60, 40, 10, 0.18); padding: 26px 30px 22px; transform: rotate(-0.6deg); }
.pc-title { text-align: center; font-family: var(--fHD); font-size: 26px; letter-spacing: 0.06em; text-transform: uppercase; }
.pc-sub { text-align: center; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 2px; }
.pc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 26px; margin-top: 22px; }
.pc-message { border-right: 1px solid var(--rule); padding-right: 22px; }
.pc-label { font-weight: 700; font-size: 9.5px; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 10px; }
.pc-label:first-child { margin-top: 0; }
.pc-lines { font-family: var(--fPen); font-size: 22px; line-height: 36px; color: var(--ink-soft); padding-top: 4px; background: repeating-linear-gradient(transparent 0 35px, var(--rule) 35px 36px); min-height: 148px; }
.pc-address { position: relative; padding-right: 86px; }
.pc-to { font-family: var(--fPen); font-size: 21px; line-height: 1.35; border-bottom: 1px solid var(--rule); padding: 2px 0 4px; }
.pc-wires { display: flex; flex-direction: column; }
.pc-wires a { display: block; font-family: var(--fPen); font-size: 19px; line-height: 1.5; border-bottom: 1px solid var(--rule); text-decoration: none; overflow-wrap: anywhere; }
.pc-wires a:hover { color: var(--acc); }
.pc-stamp { position: absolute; top: 0; right: 0; width: 70px; height: 78px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 1.5px dashed var(--acc); outline: 1px solid var(--acc); outline-offset: 3px; color: var(--acc); text-align: center; }
.pc-stamp b { font-size: 12px; }
.pc-stamp small { font-size: 7px; letter-spacing: 0.14em; text-transform: uppercase; line-height: 1.3; }
.pc-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 22px; font-style: italic; font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; }
.classifieds { margin-top: 44px; }
.classifieds ul { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; }
.classifieds li { font-size: 13px; line-height: 1.55; padding: 6px 18px 10px; border-left: 1px solid var(--rule); }
.classifieds li:nth-child(4n + 1) { border-left: 0; padding-left: 0; }
.classifieds b { color: var(--acc); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; font-size: 11.5px; }

.finale { padding: 10px var(--pad-x) 26px; text-align: center; border-top: 1px solid var(--rule); }
.finale-name { overflow: hidden; height: 0.6em; font-family: var(--fHD); font-size: clamp(80px, min(24cqi, calc(150cqi / var(--len))), 340px); line-height: 0.82; text-transform: uppercase; letter-spacing: -0.01em; border-bottom: 2px solid var(--ink-soft); white-space: nowrap; }
.finale-name span { display: block; }
.colophon { margin-top: 10px; font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase; }
.colophon .fleuron { width: 12px; height: 12px; vertical-align: -2px; }
.finale .credit { padding-bottom: 6px; padding-top: 14px; font-style: italic; }

@container pf (max-width: 1000px) {
  .front { grid-template-columns: minmax(0, 1fr) 250px; gap: 0 26px; }
  .plate-row { grid-template-columns: 110px minmax(0, 1fr) 110px; }
  .classifieds ul { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .classifieds li:nth-child(4n + 1) { border-left: 1px solid var(--rule); padding-left: 18px; }
  .classifieds li:nth-child(2n + 1) { border-left: 0; padding-left: 0; }
}
@container pf (max-width: 760px) {
  :scope { font-size: 15px; }
  .top { grid-template-columns: 1fr 1fr; }
  .top .motto { display: none; }
  .plate-row { grid-template-columns: minmax(0, 1fr); padding: 10px 0 12px; }
  .ear { display: none; }
  .nameplate { font-size: clamp(30px, calc((100cqi - 40px) / (var(--chars) * 0.47)), 76px); }
  .folio { grid-template-columns: 1fr; text-align: center; gap: 4px; font-size: 9.5px; }
  .folio-link { justify-self: center; }
  .front { grid-template-columns: minmax(0, 1fr); }
  .rail { border-left: 0; padding-left: 0; margin-top: 26px; display: grid; grid-template-columns: minmax(0, 1fr); }
  .strip { grid-template-columns: minmax(0, 1fr); }
  .portrait { max-width: 300px; justify-self: center; width: 100%; }
  .body { columns: 1; }
  .band { grid-template-columns: auto 1fr auto; gap: 12px; font-size: 9.5px; }
  .band-note { display: none; }
  .band-tab { padding: 8px 16px 7px var(--pad-x); font-size: 13px; }
  .plate, .split, .split.wide-left { grid-template-columns: minmax(0, 1fr); gap: 20px; }
  .plate.flip .plate-art { order: 0; }
  .split > :last-child { border-left: 0; padding-left: 0; }
  .account-body { columns: 1; }
  .appt { grid-template-columns: minmax(0, 1fr); gap: 4px; }
  .appt-date { padding-top: 0; }
  .postcard { padding: 22px 18px 18px; transform: none; }
  .pc-grid { grid-template-columns: minmax(0, 1fr); gap: 18px; }
  .pc-message { border-right: 0; padding-right: 0; }
  .pc-foot { flex-direction: column; align-items: stretch; }
  .classifieds ul { grid-template-columns: minmax(0, 1fr); }
  .classifieds li, .classifieds li:nth-child(4n + 1) { border-left: 0; padding-left: 0; border-bottom: 1px solid var(--rule); }
  .finale-name { font-size: clamp(56px, min(26cqi, calc(150cqi / var(--len))), 200px); }
}
@media print {
  :scope { background: #fff; padding: 0; }
  .sheet { box-shadow: none; background: #fff; }
  .ticker { display: none; }
}
`;

export const GAZETTE_CSS = templateCss(".pf-gazette", css);
