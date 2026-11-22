import { templateCss } from "../css";

// Ported from pipozzz/starring (MIT, see ./LICENSE.txt): the scroll story in its Acid theme.

const CSS = `
:scope {
  --bg: #0a0a0a; --fg: #f2f0e9; --muted: #8a877e; --line: #2a2926;
  --accent: #d4ff00; --accent-ink: #0a0a0a; --redact: #f2f0e9;
  --display: var(--pf-font-anton), Impact, "Arial Narrow", sans-serif;
  --body: var(--pf-font-space-grotesk), system-ui, sans-serif;
  --mono: var(--pf-font-jetbrains), ui-monospace, monospace;
  --gutter: clamp(16px, 4cqi, 56px);
  --vh: var(--pf-screen, 100vh);
  position: relative;
  background: var(--bg); color: var(--fg);
  font-family: var(--body); font-size: 18px; line-height: 1.5;
  color-scheme: dark;
}
:scope ::selection { background: var(--accent); color: var(--accent-ink); }
:scope :where(a) { color: inherit; }
:scope :where(a, button):focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.display { font-family: var(--display); font-weight: 400; text-transform: uppercase; line-height: 0.86; letter-spacing: -0.01em; }
.mono { font-family: var(--mono); font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; }
.muted { color: var(--muted); }
.accent { color: var(--accent); }
.tag { display: inline-block; padding: 2px 8px; border: 1px solid currentColor; font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; line-height: 1.5; }
.tag.solid { background: var(--accent); color: var(--accent-ink); border-color: var(--accent); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.progress { position: fixed; inset: 0 0 auto 0; height: 4px; z-index: 50; background: var(--accent); transform-origin: 0 50%; transform: scaleX(var(--p, 0)); pointer-events: none; }

/* ---------- hero ---------- */
.hero { min-height: var(--vh); padding: 24px var(--gutter) 40px; display: grid; grid-template-rows: auto 1fr auto; gap: 24px; }
.hero-top { display: flex; gap: 12px 24px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
.hero-top a { text-decoration: none; color: var(--accent); }
.hero-top a:hover { text-decoration: underline; }
.hero-main { align-self: center; min-width: 0; }
.hero-name { font-size: clamp(48px, min(19cqi, calc(180cqi / var(--chars, 8)), calc(var(--vh) * 0.3)), 320px); line-height: 0.95; overflow-wrap: break-word; }
.hero-name .line { display: block; }
.hero-bottom { display: grid; grid-template-columns: 1fr 1fr auto; gap: 24px; align-items: end; }
.hero-role { font-size: clamp(20px, 2.4cqi, 32px); font-weight: 700; line-height: 1.2; }
.hero-tag { font-size: 18px; max-width: 42ch; }

/* ---------- acts ---------- */
.act { min-height: var(--vh); padding: calc(var(--vh) * 0.18) var(--gutter); border-top: 1px solid var(--line); position: relative; }
.act-label { display: flex; gap: 16px; align-items: baseline; margin-bottom: calc(var(--vh) * 0.06); font-weight: 400; }
.act-label .num { color: var(--accent); }
.stats { display: grid; grid-template-columns: repeat(var(--n, 4), minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); }
.stat { background: var(--bg); padding: 32px 24px; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.stat b { font-size: clamp(44px, 6cqi, 112px); font-weight: 400; overflow-wrap: anywhere; }
.iceberg { margin: calc(var(--vh) * 0.12) 0 0; font-size: clamp(22px, 3cqi, 40px); max-width: 24ch; font-weight: 500; line-height: 1.25; }
.iceberg .display { font-size: 2.6em; display: block; margin-bottom: 0.1em; }

.act-studios { padding-left: 0; padding-right: 0; }
.act-studios .act-label, .studio-list { padding: 0 var(--gutter); }
.marquee { overflow: hidden; border-block: 1px solid var(--line); padding: calc(var(--vh) * 0.02) 0; }
.marquee-track { display: flex; width: max-content; font-size: clamp(56px, 10cqi, 160px); }
.studio { padding-right: 0.4em; white-space: nowrap; }
.studio .star { display: inline-block; color: var(--accent); width: 0.62em; height: 0.62em; margin-left: 0.4em; vertical-align: 0.08em; }
.studio-list { margin-top: calc(var(--vh) * 0.08); }
.studio-list li { display: grid; grid-template-columns: 2fr 1fr 8em; gap: 16px; align-items: center; padding: 18px 0; border-bottom: 1px solid var(--line); font-size: clamp(18px, 2cqi, 26px); }
.studio-list li > :last-child { justify-self: end; }
.studio-list a { text-decoration: none; }
.studio-list a:hover { color: var(--accent); }

.tl-item { display: grid; grid-template-columns: minmax(180px, 30%) 1fr; gap: 32px; padding: calc(var(--vh) * 0.06) 0; border-bottom: 1px solid var(--line); }
.tl-year { font-size: clamp(56px, 8cqi, 120px); position: sticky; top: calc(var(--vh) * 0.1); align-self: start; }
.tl-year span { font-size: 0.4em; }
.tl-body { display: grid; gap: 12px; max-width: 62ch; min-width: 0; }
.tl-body h3 { font-size: clamp(22px, 2.4cqi, 32px); line-height: 1.2; font-weight: 700; }
.tl-body h3 .muted { font-weight: 500; }
.tl-hit { font-family: var(--display); font-size: clamp(26px, 3cqi, 44px); line-height: 1; color: var(--accent); text-transform: uppercase; }
.tl-lines { display: grid; gap: 6px; font-size: 16px; color: var(--muted); }
.tl-lines li { padding-left: 18px; position: relative; }
.tl-lines li::before { content: "—"; position: absolute; left: 0; color: var(--accent); }

.projects { display: grid; gap: calc(var(--vh) * 0.04); }
.project { border: 1px solid var(--line); padding: clamp(24px, 4cqi, 56px); display: grid; gap: 18px; min-height: calc(var(--vh) * 0.7); align-content: center; position: relative; min-width: 0; }
.project.vis-private { background: linear-gradient(90deg, var(--bg) 35%, transparent 80%), repeating-linear-gradient(135deg, transparent 0 22px, color-mix(in srgb, var(--fg) 5%, transparent) 22px 44px); }
.project-meta { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; }
.project-title { font-size: clamp(36px, 6cqi, 96px); max-width: 16ch; line-height: 1.02; letter-spacing: 0.01em; text-wrap: balance; overflow-wrap: break-word; }
.project-blurb { font-size: clamp(18px, 1.8cqi, 24px); max-width: 52ch; }
.impact { display: flex; flex-wrap: wrap; gap: 8px 32px; }
.impact li { font-size: clamp(26px, 3.2cqi, 48px); line-height: 1; color: var(--accent); }
.project-links { display: flex; gap: 24px; flex-wrap: wrap; }
.project-link { color: var(--accent); }
.more-work { margin-top: calc(var(--vh) * 0.08); }

.rows li { display: grid; grid-template-columns: 9em 1fr auto; gap: 24px; align-items: baseline; padding: 22px 0; border-bottom: 1px solid var(--line); }
.rows .tag { justify-self: start; }
.rows h3 { font-size: clamp(22px, 2.6cqi, 38px); line-height: 1.15; font-weight: 500; min-width: 0; }
.rows h3 a { text-decoration: none; }
.rows h3 a:hover { color: var(--accent); }
.rows .note { display: block; margin-top: 6px; font-size: 16px; color: var(--muted); font-weight: 400; line-height: 1.45; }

.awards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 16px; }
.award { border: 1px solid var(--line); padding: 28px; display: grid; gap: 10px; align-content: start; min-width: 0; }
.award-mark .star { width: 28px; height: 28px; display: block; color: var(--accent); }
.award h3 { font-size: clamp(30px, 3.6cqi, 56px); line-height: 1; overflow-wrap: break-word; }
.award h3 a { text-decoration: none; }
.award h3 a:hover { color: var(--accent); }
.certs { margin-top: calc(var(--vh) * 0.08); display: grid; gap: 16px; }
.certs li { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: baseline; padding: 14px 0; border-bottom: 1px solid var(--line); }
.cert-name { font-size: clamp(18px, 2cqi, 26px); font-weight: 600; }

.oss-lede { max-width: 40ch; font-size: clamp(16px, 1.6cqi, 22px); margin-bottom: calc(var(--vh) * 0.05); }
.oss { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 16px; }
.oss li { display: grid; grid-template-columns: 56px 1fr; gap: 18px; align-items: start; padding: 22px; border: 1px solid var(--line); }
.oss-logo { width: 56px; height: 56px; display: grid; place-items: center; border-radius: 12px; background: var(--line); font-size: 28px; color: var(--accent); }
.oss-body { display: grid; gap: 6px; min-width: 0; }
.oss-repo { text-transform: none; letter-spacing: 0; overflow-wrap: anywhere; }
.oss-repo a { text-decoration: none; }
.oss h3 { font-size: clamp(20px, 2.2cqi, 30px); line-height: 1.15; font-weight: 500; overflow-wrap: break-word; }
.oss a:hover { color: var(--accent); }

.big { font-size: clamp(48px, 9cqi, 150px); line-height: 0.95; margin-bottom: calc(var(--vh) * 0.04); }
.big span { font-size: 0.3em; }
.heat { display: grid; grid-template-columns: repeat(var(--weeks, 12), minmax(0, 1fr)); gap: 3px; max-width: 720px; }
.heat i { aspect-ratio: 1 / 1.6; background: var(--line); }
.heat .l1 { background: color-mix(in srgb, var(--accent) 25%, var(--bg)); }
.heat .l2 { background: color-mix(in srgb, var(--accent) 50%, var(--bg)); }
.heat .l3 { background: color-mix(in srgb, var(--accent) 75%, var(--bg)); }
.heat .l4 { background: var(--accent); }
.heat-note { margin-top: 12px; }
.platforms { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px; margin-top: calc(var(--vh) * 0.08); }
.platforms li { display: grid; gap: 4px; border-top: 4px solid var(--accent); padding-top: 16px; }
.platforms .display { font-size: 64px; }

.edu-skills { display: grid; grid-template-columns: 1fr 1fr; gap: 8cqi; }
.edu { display: grid; gap: 40px; align-content: start; }
.edu h3 { font-size: clamp(24px, 2.6cqi, 36px); line-height: 1.1; margin: 6px 0; font-weight: 700; }
.edu a { text-decoration: none; }
.edu a:hover { color: var(--accent); }
.skills { display: grid; gap: 32px; align-content: start; }
.skill-items { font-size: clamp(22px, 2.4cqi, 34px); font-weight: 500; line-height: 1.25; }

.interests { display: flex; flex-wrap: wrap; gap: 4cqi 6cqi; align-items: baseline; }
.interests li { display: grid; gap: 4px; max-width: 100%; }
.interest-name { font-size: clamp(36px, 5.5cqi, 96px); line-height: 0.9; overflow-wrap: anywhere; }
.interests li:nth-child(even) .interest-name { color: var(--accent); }
.soon { display: grid; gap: 28px; }
.soon li { display: grid; gap: 6px; }
.soon .what { font-size: clamp(26px, 3.4cqi, 52px); line-height: 1.1; font-weight: 500; text-wrap: balance; }

.quotes { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); gap: 6cqi; }
.quote { display: grid; gap: 14px; align-content: start; }
.quote-mark { font-size: clamp(72px, 8cqi, 128px); line-height: 0.7; height: 0.32em; }
.quote blockquote { font-size: clamp(20px, 2.4cqi, 32px); line-height: 1.3; font-weight: 500; text-wrap: pretty; }
.quote figcaption a { color: var(--accent); }

.credits { min-height: var(--vh); padding: calc(var(--vh) * 0.18) var(--gutter); border-top: 1px solid var(--line); display: grid; place-content: center; text-align: center; gap: 32px; }
.credits h2 { font-size: clamp(44px, min(10cqi, calc(200cqi / var(--chars, 8))), 180px); line-height: 0.95; text-wrap: balance; overflow-wrap: break-word; }
.credits ul { display: flex; flex-wrap: wrap; gap: 12px 24px; justify-content: center; }
.credits a { color: var(--accent); }
.credits .credit { padding: 0; }

@container pf (max-width: 760px) {
  .rows li { grid-template-columns: 1fr; gap: 8px; }
  .hero-bottom { grid-template-columns: 1fr; }
  .stats { grid-template-columns: 1fr 1fr; }
  .tl-item { grid-template-columns: 1fr; gap: 12px; }
  .tl-year { position: static; }
  .studio-list li { grid-template-columns: 1fr auto; }
  .studio-list li .muted { display: none; }
  .edu-skills { grid-template-columns: 1fr; }
  .platforms .display { font-size: 48px; }
  .project.vis-private { background: linear-gradient(90deg, var(--bg) 78%, transparent 100%), repeating-linear-gradient(135deg, transparent 0 14px, color-mix(in srgb, var(--fg) 6%, transparent) 14px 28px); }
}
@media (prefers-reduced-motion: no-preference) {
  .reveal { transition: opacity 0.9s cubic-bezier(0.2, 0.7, 0, 1), transform 0.9s cubic-bezier(0.2, 0.7, 0, 1); }
  .reveal[data-shown="false"] { opacity: 0; transform: translateY(48px); }
  .marquee-track { animation: st-slide 40s linear infinite; }
  .scroll-cue { animation: st-bob 2s ease-in-out infinite; }
  .hero-name .line { animation: st-rise 1.1s cubic-bezier(0.2, 0.7, 0, 1) both; }
  .hero-name .line + .line { animation-delay: 0.12s; }
}
:scope:where([data-pf-still] *, [inert] *) :where(.marquee-track, .scroll-cue, .hero-name .line) { animation: none; }
:scope:where([data-pf-still] *, [inert] *) .progress { display: none; }
@keyframes st-rise { from { transform: translateY(40%); opacity: 0; } }
@keyframes st-bob { 50% { transform: translateY(6px); } }
@keyframes st-slide { to { transform: translateX(-50%); } }
@media print {
  .progress, .marquee { display: none; }
  .act, .hero, .credits, .project { min-height: 0; }
}
`;

export const STARRING_CSS = templateCss(".pf-starring", CSS);
