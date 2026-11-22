import { templateCss } from "../css";

// Ported from Cveinnt/LiveTerm (MIT, see ./LICENSE.txt): its Gruvbox light and Nord dark colours.
const css = `
:scope {
  --bg: #fbf1c9;
  --fg: #3c3836;
  --yellow: #d79921;
  --green: #98971a;
  --gray: #7c6f64;
  --blue: #458588;
  --red: #ca2124;
  color-scheme: light;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--pf-font-fira-code, "Fira Code"), "Hack", ui-monospace, Menlo, monospace;
  font-variant-ligatures: none;
  font-size: 16px;
  line-height: 1.3;
  padding: 8px;
  min-height: var(--pf-screen, 100vh);
}
@media (prefers-color-scheme: dark) {
  :scope:not([data-theme="light"]) { --bg: #2e3440; --fg: #e5e9f0; --yellow: #5e81ac; --green: #a3be8c; --gray: #88c0d0; --blue: #ebcb8b; --red: #bf616a; color-scheme: dark; }
}
:scope[data-theme="dark"] { --bg: #2e3440; --fg: #e5e9f0; --yellow: #5e81ac; --green: #a3be8c; --gray: #88c0d0; --blue: #ebcb8b; --red: #bf616a; color-scheme: dark; }
:scope ::selection { background: var(--yellow); color: var(--bg); }
.frame { border: 2px solid var(--yellow); border-radius: 4px; padding: 32px; min-height: calc(var(--pf-screen, 100vh) - 16px); }
:scope[data-cleared] .transcript { display: none; }
.yellow, .head { color: var(--yellow); }
.green { color: var(--green); }
.gray { color: var(--gray); }
.link { color: var(--blue); text-decoration: underline; text-underline-offset: 2px; }
.link:hover { color: var(--yellow); }
.ps1 { flex: none; white-space: pre; }
.user { color: var(--yellow); }
.host { color: var(--green); }
.line { display: flex; min-height: 1.3em; }
.cmd { white-space: pre; }
.out { white-space: pre-wrap; margin: 4px 0 18px; overflow-wrap: anywhere; }
.entry.first .out { margin-top: 0; }
.item + .item { margin-top: 14px; }
.item > p:first-child { display: flex; flex-wrap: wrap; column-gap: 0; }
.right { margin-left: auto; padding-left: 3ch; }
.indent { padding-left: 2ch; }
.bullet { padding-left: 4ch; text-indent: -2ch; }
.bullet::before { content: "- "; color: var(--gray); }
.defs { position: absolute; width: 0; height: 0; overflow: hidden; }
.banner { display: block; width: min(100%, calc(var(--cols) * 9.6px)); height: auto; margin: 6px 0 10px; }
.banner .fill { fill: var(--fg); }
.shade-dot { fill: var(--fg); opacity: 0.7; }
.big-name { font-size: 2.6em; line-height: 1.1; font-weight: 700; color: var(--yellow); margin: 6px 0 10px; }
.fetch { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 12px 4ch; }
.globe { flex: none; width: min(100%, 355px); height: auto; margin-top: 2px; }
.dense-dot { fill: var(--fg); }
.globe .fill { fill: var(--fg); }
.globe .screen { fill: var(--fg); font-family: inherit; white-space: pre; }
.fetch-info { min-width: 0; flex: 1 1 260px; line-height: 1.45; }
.with-icon { display: flex; align-items: center; gap: 1ch; }
.icon { width: 0.95em; height: 0.95em; flex: none; color: var(--gray); }
.run { background: none; border: 0; padding: 0; margin: 0; font: inherit; color: inherit; cursor: pointer; text-decoration: underline dotted var(--gray); text-underline-offset: 3px; }
.run:hover { color: var(--yellow); }
.prompt { margin-top: 2px; }
.prompt label { flex: none; }
.input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; padding: 0; font: inherit; color: var(--green); caret-color: var(--fg); }
.input[data-ok="false"] { color: var(--red); }
.input:focus-visible { outline: 0; }
.input:placeholder-shown:not(:focus) { background: linear-gradient(var(--fg), var(--fg)) 0 50% / 0.62em 1.15em no-repeat; }
@keyframes terminal-blink { 50% { background-size: 0 0; } }
@media (prefers-reduced-motion: no-preference) {
  .input:placeholder-shown:not(:focus) { animation: terminal-blink 1.1s steps(1) infinite; }
  .entry[data-reveal] .cmd { display: inline-block; overflow: hidden; vertical-align: bottom; max-width: calc(var(--n) * 1ch + 1px); transition: max-width calc(var(--n) * 55ms) steps(var(--n)); }
  .entry[data-shown="false"] .cmd { max-width: 0; }
  .entry[data-reveal] .out { transition: opacity 0.25s ease calc(var(--n) * 55ms + 120ms); }
  .entry[data-shown="false"] .out { opacity: 0; }
}
:scope:where([data-pf-still] *, [inert] *) .input { animation: none; }
.foot { margin-top: 26px; color: var(--gray); }
.foot-credit a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
.foot-credit :where(a, span) { display: inline-flex; align-items: center; gap: 6px; vertical-align: middle; }
@container pf (max-width: 640px) {
  :scope { font-size: 13px; padding: 6px; }
  .frame { padding: 16px 12px; }
  .right { margin-left: 0; padding-left: 0; flex-basis: 100%; }
  .fetch { flex-direction: column; }
}
@media print {
  .prompt, .run { display: none; }
}
`;

export const TERMINAL_CSS = templateCss(".pf-terminal", css);
