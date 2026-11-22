import { templateCss } from "../css";

// Ported from mirkoschubert/retro-os (MIT, see ./LICENSE.txt): its three eras, windows, menubar and dock.

const CSS = `
:scope {
  --bg-0: #0f1310; --bg-1: #161a16; --bg-2: #1c211d; --bg-3: #242a25; --bg-4: #2e352f;
  --line-0: #0c0d0f; --line-1: #3a423c; --line-2: #4a544c; --line-hi: #5a6168;
  --bevel-light: rgba(255, 255, 255, 0.06); --bevel-dark: rgba(0, 0, 0, 0.55);
  --text-0: #d8e0c8; --text-1: #aab09a; --text-2: #8a907f; --text-3: #767a6c;
  --accent: #a3b25a; --accent-2: #c9a64a; --accent-3: #5d8a85;
  --selection: rgba(163, 178, 90, 0.2);
  --shadow: 0 24px 60px -16px rgba(0, 0, 0, 0.7), 0 8px 16px rgba(0, 0, 0, 0.45);
  --win-shadow: 4px 4px 0 rgba(0, 0, 0, 0.6);
  --window-radius: 0px; --title-radius: 0;
  --font-display: var(--pf-font-plex-mono), "JetBrains Mono", ui-monospace, monospace;
  --font-titlebar: var(--pf-font-plex-mono), ui-monospace, monospace;
  --font-body: var(--pf-font-plex-sans), "Helvetica Neue", system-ui, sans-serif;
  --font-mono: var(--pf-font-jetbrains), ui-monospace, monospace;
  --titlebar-h: 24px; --menubar-h: 26px; --dock-h: 64px;
  position: relative;
  min-height: var(--pf-screen, 100vh);
  background:
    radial-gradient(1200px 800px at 70% 10%, rgba(255, 255, 255, 0.025), transparent 60%),
    radial-gradient(900px 700px at 10% 90%, rgba(255, 255, 255, 0.02), transparent 60%),
    var(--bg-0);
  color: var(--text-0);
  font-family: var(--font-body);
  font-size: 13.5px;
  line-height: 1.5;
}
:scope::before {
  content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4'><rect width='1' height='1' fill='white' opacity='0.03'/><rect x='2' y='2' width='1' height='1' fill='white' opacity='0.03'/></svg>");
}
:scope[data-era="atelier"] {
  --bg-0: #1a1815; --bg-1: #211e1a; --bg-2: #2a2620; --bg-3: #322e27; --bg-4: #3d382f;
  --line-1: #4a4338; --line-2: #5a5244;
  --text-0: #ece5d0; --text-1: #c8bfa6; --text-2: #9a917f; --text-3: #857c6b;
  --accent: #6a9a93; --accent-2: #c89858; --accent-3: #8b9a6d;
  --selection: rgba(106, 154, 147, 0.22);
  --win-shadow: var(--shadow);
  --window-radius: 6px; --title-radius: 6px 6px 0 0;
  --font-display: var(--pf-font-source-serif), "Iowan Old Style", Georgia, serif;
  --font-titlebar: var(--pf-font-source-serif), Georgia, serif;
  --font-body: var(--pf-font-inter), "Helvetica Neue", sans-serif;
  --titlebar-h: 28px;
}
:scope[data-era="graphite"] {
  --bg-0: #15171a; --bg-1: #1b1e22; --bg-2: #22262b; --bg-3: #2a2f35; --bg-4: #343941;
  --line-1: #3d434b; --line-2: #4a5159;
  --text-0: #e8e3d6; --text-1: #c2bdb1; --text-2: #9a968b; --text-3: #85827a;
  --accent: #d6a24a; --accent-2: #6f8a72; --accent-3: #4d8a87;
  --selection: rgba(214, 162, 74, 0.22);
  --win-shadow: var(--shadow);
  --window-radius: 4px; --title-radius: 4px 4px 0 0;
  --font-display: var(--pf-font-inter), "Helvetica Neue", system-ui, sans-serif;
  --font-titlebar: var(--pf-font-inter), system-ui, sans-serif;
  --font-body: var(--pf-font-inter), "Helvetica Neue", system-ui, sans-serif;
  --titlebar-h: 26px;
}
:scope ::selection { background: var(--selection); color: var(--text-0); }
:scope :where(a) { color: inherit; }
:scope :where(button) { color: inherit; cursor: pointer; }
:scope :where(a, button):focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.mono { font-family: var(--font-mono); }
.dim { color: var(--text-2); }

/* ---------- menubar ---------- */
.menubar {
  position: sticky; top: 0; z-index: 200;
  height: var(--menubar-h);
  display: flex; align-items: stretch;
  background: var(--bg-2);
  border-bottom: 1px solid var(--accent);
  font-family: var(--font-titlebar);
  font-size: 12px; letter-spacing: 0.01em;
  user-select: none;
}
:scope:not([data-era="workbench"]) .menubar {
  background: linear-gradient(to bottom, var(--bg-3), var(--bg-2));
  border-bottom-color: var(--line-0);
  box-shadow: 0 1px 0 var(--bevel-light) inset, 0 -1px 0 var(--bevel-dark) inset;
}
.menubar-logo { display: flex; align-items: center; padding: 0 12px 0 14px; border-right: 1px solid var(--line-1); }
.logo-mark { width: 14px; height: 14px; border: 1px solid var(--accent); display: inline-block; position: relative; flex-shrink: 0; }
.logo-mark::after { content: ""; position: absolute; inset: 3px; background: var(--accent); }
:scope[data-era="atelier"] .logo-mark, :scope[data-era="atelier"] .logo-mark::after { border-radius: 50%; }
.menu-app { position: relative; display: flex; }
.menu-item {
  display: flex; align-items: center; padding: 0 11px; height: 100%;
  color: var(--text-1); background: transparent; border: 0; outline-offset: -2px;
  font: inherit; white-space: nowrap; text-decoration: none;
}
.menu-item:hover, .menu-item[aria-expanded="true"] { background: var(--accent); color: var(--bg-0); }
.menu-item.is-app { font-weight: 600; color: var(--text-0); }
.menu-item.is-app:hover, .menu-item.is-app[aria-expanded="true"] { color: var(--bg-0); }
.menu-items { display: flex; }
.menu-spacer { flex: 1; }
.menu-status {
  display: flex; align-items: center; gap: 14px; padding: 0 14px 0 8px;
  color: var(--text-2); font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.02em; white-space: nowrap;
}
.menu-status .pill {
  display: inline-flex; align-items: center; gap: 6px; align-self: stretch; padding: 0 14px;
  border-left: 1px solid var(--line-1); border-right: 1px solid var(--line-1);
  color: var(--text-2); text-decoration: none;
}
.menu-status .pill + .pill { border-left: 0; margin-left: -14px; }
.menu-status a.pill:hover { color: var(--text-0); }
.menu-status .dot { width: 6px; height: 6px; background: var(--accent-2); border-radius: 50%; }
.menu-status .focused { max-width: 220px; overflow: hidden; text-overflow: ellipsis; }
.menu-dropdown {
  position: absolute; top: 100%; left: 0; min-width: 220px; z-index: 300;
  background: var(--bg-2); border: 1px solid var(--accent); box-shadow: var(--shadow);
  padding: 4px 0; font-size: 12px;
}
:scope:not([data-era="workbench"]) .menu-dropdown { border-color: var(--line-0); }
.menu-row {
  display: flex; align-items: center; width: 100%; padding: 5px 14px 5px 6px;
  background: transparent; border: 0; color: var(--text-1); font: inherit; text-align: left;
}
.menu-row:hover, .menu-row:focus-visible { background: var(--accent); color: var(--bg-0); outline: 0; }
.menu-check { display: inline-flex; justify-content: center; width: 18px; flex-shrink: 0; color: var(--accent); }
.menu-row:hover .menu-check, .menu-row:focus-visible .menu-check { color: var(--bg-0); }
.menu-divider { height: 1px; background: var(--line-1); margin: 4px 0; }
.menu-label { padding: 6px 14px 4px; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-3); font-family: var(--font-mono); }

/* ---------- desktop and windows ---------- */
.desktop {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px;
  padding: 28px 14px calc(var(--dock-h) + 40px);
  max-width: 1360px; margin: 0 auto;
}
.window {
  position: relative; min-width: 0;
  display: flex; flex-direction: column;
  background: var(--bg-1);
  border: 1px solid var(--accent);
  border-radius: var(--window-radius);
  box-shadow: var(--win-shadow);
  transform: translate(var(--dx, 0px), var(--dy, 0px));
  scroll-margin-top: calc(var(--menubar-h) + 16px);
}
:scope:not([data-era="workbench"]) .window { border-color: var(--line-0); box-shadow: var(--shadow), 0 0 0 1px var(--bevel-light) inset; }
:scope:not([data-era="workbench"]) .window[data-focused] { box-shadow: var(--shadow), 0 0 0 1px var(--bevel-light) inset, 0 0 0 1px var(--accent) inset; }
.window[data-state="closed"] { display: none; }
.window[data-dragging] { transition: none; cursor: grabbing; }
.titlebar {
  height: var(--titlebar-h); flex-shrink: 0;
  display: flex; align-items: center; gap: 8px; padding: 0 8px;
  background: var(--bg-3); color: var(--text-1);
  border-bottom: 1px solid var(--line-0);
  border-radius: var(--title-radius);
  font-family: var(--font-titlebar); font-size: 12px; letter-spacing: 0.01em;
  user-select: none; touch-action: pan-y;
}
.window[data-focused] .titlebar { background: var(--accent); color: var(--bg-0); font-weight: 600; }
:scope:not([data-era="workbench"]) .titlebar { background: linear-gradient(to bottom, var(--bg-2), var(--bg-1)); color: var(--text-2); font-weight: 400; }
:scope[data-era="graphite"] .window[data-focused] .titlebar { background: linear-gradient(to bottom, var(--bg-4), var(--bg-3)); color: var(--text-0); box-shadow: 0 1px 0 var(--bevel-light) inset; }
:scope[data-era="atelier"] .window[data-focused] .titlebar { background: repeating-linear-gradient(to bottom, var(--bg-4) 0 1px, var(--bg-3) 1px 2px); color: var(--text-0); }
.titlebar-title { flex: 1; min-width: 0; padding: 0 4px; font-weight: inherit; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:scope:not([data-era="workbench"]) .titlebar-title { text-align: center; padding-right: 64px; }
.win-controls { display: flex; gap: 6px; align-items: center; }
.win-btn {
  width: 14px; height: 14px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--bg-0); background: var(--bg-2); color: var(--text-0);
  border-radius: 0;
}
:scope:not([data-era="workbench"]) .win-btn { border-color: var(--line-2); color: var(--text-2); border-radius: 2px; }
:scope[data-era="atelier"] .win-btn { border-radius: 50%; }
.win-btn:hover { background: var(--accent); color: var(--bg-0); border-color: var(--accent); }
.win-btn svg { width: 8px; height: 8px; stroke-width: 2.4; }
.window-body { flex: 1; min-width: 0; background: var(--bg-1); border-radius: 0 0 var(--window-radius) var(--window-radius); }
.window[data-state="shaded"] .window-body, .window[data-state="shaded"] .resize-handle { display: none; }
.resize-handle {
  position: absolute; right: 0; bottom: 0; width: 28px; height: 28px; pointer-events: none;
  background: linear-gradient(135deg, transparent 0 57%, var(--line-2) 57% 62%, transparent 62% 68%, var(--line-2) 68% 73%, transparent 73% 79%, var(--line-2) 79% 84%, transparent 84%) no-repeat bottom right / 14px 14px;
}
.window[data-drag] .titlebar { cursor: grab; }

/* ---------- toolbar, lists and tags ---------- */
.toolbar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px;
  background: var(--bg-2); border-bottom: 1px solid var(--line-0);
  font-family: var(--font-mono); font-size: 11px; color: var(--text-2);
}
.tb-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px;
  background: var(--bg-1); border: 1px solid var(--line-1); border-radius: var(--btn-radius, 0);
  font: inherit; color: var(--text-1);
}
:scope:not([data-era="workbench"]) { --btn-radius: 2px; }
.tb-btn:hover { border-color: var(--accent); color: var(--text-0); }
.tb-btn[aria-pressed="true"] { background: var(--accent); color: var(--bg-0); border-color: var(--accent); }
.tb-btn svg { width: 14px; height: 14px; }
.tb-sep { width: 1px; height: 14px; background: var(--line-1); }
.tb-grow { flex: 1; }
.tb-search { display: inline-flex; align-items: center; gap: 6px; color: var(--text-3); }
.tb-search svg { width: 13px; height: 13px; }
.tb-search input {
  width: 180px; padding: 3px 8px; outline: 0;
  background: var(--bg-1); border: 1px solid var(--line-1); border-radius: var(--btn-radius, 0);
  color: var(--text-0); font: inherit;
}
.tb-search input:focus { border-color: var(--accent); }
.section-label { padding: 10px 14px 6px; font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--text-3); }
.list-row {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 6px 14px;
  background: transparent; border: 0; border-left: 2px solid transparent;
  color: var(--text-1); font: inherit; font-size: 12.5px; text-align: left;
}
.list-row:hover { background: var(--bg-3); color: var(--text-0); }
.list-row[aria-selected="true"] { background: var(--accent); color: var(--bg-0); }
.list-row .sq { width: 8px; height: 8px; flex-shrink: 0; background: var(--accent); }
.list-row .sq[data-kind="b"] { background: var(--accent-2); }
.list-row[aria-selected="true"] .sq { background: var(--bg-0); }
.list-row .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-row .meta { margin-left: auto; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-3); white-space: nowrap; }
.list-row[aria-selected="true"] .meta { color: var(--bg-0); opacity: 0.75; }
.tag { display: inline-block; padding: 3px 8px; font-family: var(--font-mono); font-size: 11px; color: var(--text-1); background: var(--bg-2); border: 1px solid var(--line-1); }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.kbd {
  display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 4px;
  font-family: var(--font-mono); font-size: 10.5px; color: var(--text-2);
  background: var(--bg-3); border: 1px solid var(--line-2); border-radius: 2px;
}
.empty { padding: 18px 14px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-3); }

/* ---------- welcome ---------- */
.welcome { padding: 30px 34px 34px; }
.kicker { margin-bottom: 8px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-2); }
.h-display { font-family: var(--font-display); font-weight: 600; letter-spacing: -0.005em; color: var(--text-0); }
.welcome h1 { font-size: 30px; line-height: 1.15; margin: 0 0 6px; }
.welcome .role { margin-bottom: 16px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent); }
.welcome .copy { max-width: 560px; }
.welcome .copy p { margin: 0 0 12px; font-size: 13.5px; line-height: 1.7; color: var(--text-1); }
.launcher { display: grid; grid-template-columns: 1fr; gap: 10px; max-width: 560px; margin-top: 22px; }
.launch {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px; min-width: 0;
  background: var(--bg-2); border: 1px solid var(--line-1); border-radius: var(--btn-radius, 0);
  color: var(--text-1); font: inherit; font-size: 13px; text-align: left; text-decoration: none;
}
.launch:hover { border-color: var(--accent); color: var(--text-0); }
.launch .label { flex: 1; min-width: 0; }
.launch svg { width: 14px; height: 14px; color: var(--accent); flex-shrink: 0; }
.avail { margin-top: 22px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.06em; color: var(--text-2); }
.avail a { color: var(--accent); text-decoration: none; }
.avail a:hover { text-decoration: underline; }

/* ---------- system info ---------- */
.sysinfo { padding: 28px 30px; }
.si-head { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
.portrait {
  position: relative; width: 104px; height: 130px; overflow: hidden;
  display: grid; place-items: center;
  border: 1px solid var(--line-1);
  background: repeating-linear-gradient(135deg, var(--bg-3) 0 8px, var(--bg-2) 8px 16px);
}
.portrait .initials { font-family: var(--font-display); font-size: 34px; font-weight: 600; color: var(--accent); text-shadow: 2px 2px 0 var(--bg-0); }
.portrait .ph-cap, .ph .ph-cap {
  position: absolute; left: 6px; bottom: 6px; padding: 1px 5px;
  font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--text-2);
  background: rgba(0, 0, 0, 0.4); border: 1px solid var(--line-1);
}
.identity { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.si-name { font-family: var(--font-display); font-size: 26px; font-weight: 600; line-height: 1.15; color: var(--text-0); }
.si-role { font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-2); }
.si-bio p { margin: 0 0 8px; font-size: 13.5px; line-height: 1.65; color: var(--text-1); max-width: 560px; }
.si-bio strong { font-weight: 500; color: var(--text-0); box-shadow: inset 0 -0.45em 0 var(--selection); }
.meta-grid { display: grid; grid-template-columns: 1fr; row-gap: 4px; font-size: 12.5px; }
.meta-grid dt { margin-top: 6px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-2); }
.meta-grid dd { min-width: 0; color: var(--text-1); }
.meta-grid a { color: var(--accent); text-decoration: none; font-family: var(--font-mono); }
.meta-grid a:hover { text-decoration: underline; }
.meta-grid .links { display: flex; flex-wrap: wrap; gap: 2px 14px; }
.divider { height: 1px; background: var(--line-1); margin: 22px 0; }
.si-section { margin: 18px 0; }
.si-label { margin-bottom: 8px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-2); }
.si-section .body { font-size: 13px; line-height: 1.65; color: var(--text-1); }
.now { display: grid; gap: 4px; }
.now b { font-weight: 500; color: var(--text-0); }
.stack-row + .stack-row { margin-top: 12px; }
.stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.stat { padding: 14px 16px; background: var(--bg-2); border: 1px solid var(--line-1); min-width: 0; }
.stat b { display: block; font-family: var(--font-display); font-size: 30px; font-weight: 500; line-height: 1; color: var(--accent); }
.stat span { display: block; margin-top: 6px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-2); }
.quotes { display: grid; gap: 16px; }
.quote { border-left: 3px solid var(--accent); padding-left: 14px; }
.quote p { font-family: var(--font-display); font-size: 13.5px; line-height: 1.6; color: var(--text-1); font-style: italic; }
:scope[data-era="workbench"] .quote p { font-style: normal; font-size: 12.5px; }
.quote footer { margin-top: 6px; font-family: var(--font-mono); font-size: 10.5px; color: var(--text-2); }
.si-foot { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.06em; color: var(--text-2); }

/* ---------- browsers: projects and work ---------- */
.browser { display: flex; flex-direction: column; }
.browser-main { display: flex; flex-direction: column; min-width: 0; }
.browser-side { background: var(--bg-2); border-bottom: 1px solid var(--line-0); padding: 6px 0; min-width: 0; }
.browser-pane { flex: 1; min-width: 0; padding: 20px 22px 28px; }
.detail-kicker { margin-bottom: 8px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-2); }
.detail-kicker .os { margin-left: 8px; color: var(--accent-2); }
.detail h3 { margin-bottom: 12px; font-size: 26px; line-height: 1.15; }
.detail .lede { max-width: 640px; margin-bottom: 18px; font-size: 14px; line-height: 1.65; color: var(--text-1); }
.ph {
  position: relative; height: 220px; margin-bottom: 24px; overflow: hidden;
  border: 1px solid var(--line-1);
  background: repeating-linear-gradient(135deg, var(--bg-3) 0 8px, var(--bg-2) 8px 16px);
  display: grid; place-items: center;
}
.ph .mark { font-family: var(--font-display); font-size: 72px; font-weight: 600; line-height: 1; color: var(--bg-1); -webkit-text-stroke: 1px var(--line-hi); text-shadow: 4px 4px 0 var(--bg-0); }
.ph .ph-tag { position: absolute; right: 8px; top: 8px; font-family: var(--font-mono); font-size: 10px; color: var(--text-3); }
.facts { display: grid; grid-template-columns: 1fr; row-gap: 4px; column-gap: 18px; max-width: 720px; font-size: 12.5px; }
.facts dt { margin-top: 6px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-2); }
.facts dd { color: var(--text-1); min-width: 0; }
.facts .mono { color: var(--text-2); }
.facts .links { display: flex; flex-wrap: wrap; gap: 6px 14px; }
.facts a { color: var(--accent); text-decoration: none; font-family: var(--font-mono); }
.facts a:hover { text-decoration: underline; }
.notes { margin-top: 22px; max-width: 640px; border-top: 1px solid var(--line-1); padding-top: 18px; }
.notes p { margin: 0 0 12px; font-size: 13.5px; line-height: 1.7; color: var(--text-1); }
.notes li { position: relative; margin: 0 0 8px; padding-left: 16px; font-size: 13px; line-height: 1.6; color: var(--text-1); }
.notes li::before { content: "›"; position: absolute; left: 2px; color: var(--accent); }
.grid-view { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; padding: 16px; }
.card { display: flex; flex-direction: column; padding: 0; background: var(--bg-2); border: 1px solid var(--line-1); text-align: left; font: inherit; color: inherit; }
.card:hover { border-color: var(--accent); }
.card .ph { height: 120px; margin: 0; border: 0; border-bottom: 1px solid var(--line-1); }
.card .ph .mark { font-size: 44px; }
.card .card-body, .card .card-name, .card .card-sub { display: block; }
.card .card-body { padding: 10px 12px; }
.card .card-name { font-weight: 500; color: var(--text-0); }
.card .card-sub { margin-top: 4px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-2); }
.pub-row { display: block; width: 100%; padding: 10px 14px; background: transparent; border: 0; border-bottom: 1px solid var(--line-0); border-left: 2px solid transparent; font: inherit; text-align: left; color: var(--text-1); }
.pub-row:hover { background: var(--bg-3); }
.pub-row[aria-selected="true"] { background: var(--bg-3); border-left-color: var(--accent); }
.pub-name, .pub-desc { display: block; }
.pub-meta { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); }
.pub-badge { padding: 0 5px; border: 1px solid var(--line-2); color: var(--text-2); }
.pub-row[aria-selected="true"] .pub-badge { border-color: var(--accent); color: var(--accent); }
.pub-name { margin-top: 4px; font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--text-0); }
.pub-row[aria-selected="true"] .pub-name { color: var(--accent); }
.pub-desc { margin-top: 2px; font-size: 12px; color: var(--text-2); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 16px; }
.chip { padding: 2px 8px; font-family: var(--font-mono); font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--bg-0); background: var(--accent); }
.chip.ghost { color: var(--text-2); background: transparent; border: 1px solid var(--line-2); }
.highlight { display: inline-block; margin-bottom: 14px; font-family: var(--font-display); font-size: 20px; font-weight: 600; color: var(--accent); }

/* ---------- archive ---------- */
.files { width: 100%; border-collapse: collapse; font-size: 12.5px; table-layout: fixed; }
.files th { padding: 4px 14px; text-align: left; font-family: var(--font-mono); font-size: 10px; font-weight: 400; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-3); }
.files td { padding: 6px 14px; vertical-align: top; color: var(--text-2); font-family: var(--font-mono); font-size: 11px; }
.files td.file { color: var(--text-0); font-family: var(--font-body); font-size: 12.5px; }
.files tbody tr:hover { background: var(--bg-2); }
.files .file-in { display: flex; gap: 8px; align-items: flex-start; }
.files .file-in svg { width: 12px; height: 12px; margin-top: 3px; color: var(--accent); flex-shrink: 0; }
.files a { text-decoration: none; }
.files a:hover { color: var(--accent); text-decoration: underline; }
.files .col-kind { width: 120px; }
.files .col-date { width: 110px; text-align: right; }
.files td.date { text-align: right; }
.files .col-where { width: 28%; }
.files .sub { display: block; margin-top: 2px; font-size: 11.5px; color: var(--text-2); }
.group + .group { margin-top: 6px; }
.archive { padding: 10px 0 16px; }

/* ---------- console ---------- */
.console { padding: 14px 18px 18px; background: #0c0d10; font-family: var(--font-mono); font-size: 12px; line-height: 1.6; color: var(--text-1); }
.console p { white-space: pre-wrap; }
.console .sys { color: var(--text-2); }
.console .in { color: var(--accent); }
.console .out a { color: var(--text-0); text-decoration: none; border-bottom: 1px dashed var(--line-2); }
.console .out a:hover { color: var(--accent); border-bottom-color: var(--accent); }
.console .gap { height: 0.8em; }
.console[data-wait] p { opacity: 0; }
.console .links { display: flex; flex-wrap: wrap; gap: 2px 18px; }
.cursor { display: inline-block; width: 7px; height: 13px; margin-left: 4px; vertical-align: -2px; background: var(--accent); }

/* ---------- dock ---------- */
.dock-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 150; display: flex; justify-content: center; pointer-events: none; }
.dock {
  pointer-events: auto;
  display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;
  height: var(--dock-h); padding: 8px 10px;
  background: var(--bg-2); border-top: 1px solid var(--accent);
}
:scope:not([data-era="workbench"]) .dock { background: linear-gradient(to bottom, var(--bg-3), var(--bg-2)); border-top-color: var(--line-0); }
.dock-item {
  position: relative; width: 44px; height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg-1); border: 1px solid var(--line-1); border-radius: var(--dock-radius, 0);
  color: var(--text-1);
}
:scope[data-era="graphite"] { --dock-radius: 6px; }
:scope[data-era="atelier"] { --dock-radius: 8px; }
.dock-item svg { width: 22px; height: 22px; stroke-width: 1.4; }
.dock-item:hover { border-color: var(--accent); color: var(--text-0); }
.dock-item[data-open]::after { content: ""; position: absolute; bottom: -7px; left: 50%; width: 6px; height: 2px; transform: translateX(-50%); background: var(--accent); }
:scope:not([data-era="workbench"]) .dock-item[data-open]::after { width: 4px; height: 4px; border-radius: 50%; }
.dock-tip {
  position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);
  padding: 4px 8px; white-space: nowrap; pointer-events: none; opacity: 0;
  font-family: var(--font-mono); font-size: 11px; color: var(--text-0);
  background: var(--bg-3); border: 1px solid var(--line-1); border-radius: 3px;
  transition: opacity 0.1s;
}
.dock-item:hover .dock-tip, .dock-item:focus-visible .dock-tip { opacity: 1; }
.dock-divider { width: 1px; align-self: stretch; margin: 0 4px; background: var(--line-1); }
.credit { position: relative; z-index: 1; padding: 0 20px calc(var(--dock-h) + 28px); margin-top: calc(-1 * var(--dock-h) - 12px); color: var(--text-2); font-family: var(--font-mono); font-size: 12px; }

/* ---------- boot ---------- */
.boot {
  position: fixed; inset: 0; z-index: 500;
  display: flex; align-items: center; justify-content: center;
  background: #0a0b0d; color: var(--text-0); font-family: var(--font-mono);
  pointer-events: none;
}
.boot-in { display: flex; flex-direction: column; align-items: center; gap: 24px; width: 380px; max-width: 80%; }
.boot-mark { width: 64px; height: 64px; border: 2px solid var(--accent); position: relative; }
.boot-mark::before { content: ""; position: absolute; inset: 6px; background: var(--accent); }
.boot-title { font-family: var(--font-display); font-size: 22px; font-weight: 600; letter-spacing: 0.02em; text-align: center; }
.boot-version { margin-top: 4px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-2); text-align: center; }
.boot-log { width: 100%; font-size: 11px; line-height: 1.7; color: var(--text-2); }
.boot-log .ok { color: var(--accent); }

/* ---------- wider screens ---------- */
@container pf (min-width: 560px) {
  .launcher { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .si-head { grid-template-columns: 104px minmax(0, 1fr); gap: 26px; }
  .meta-grid, .facts { grid-template-columns: 120px minmax(0, 1fr); row-gap: 6px; }
  .meta-grid dt, .facts dt { margin-top: 0; padding-top: 2px; }
  .stats[data-n="3"] { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .desktop { padding: 36px 24px calc(var(--dock-h) + 48px); }
  .dock-bar { bottom: 12px; }
  .dock { width: auto; border: 1px solid var(--accent); box-shadow: var(--win-shadow); border-radius: var(--dock-radius, 0); }
  :scope:not([data-era="workbench"]) .dock { border-color: var(--line-0); box-shadow: var(--shadow), 0 0 0 1px var(--bevel-light) inset; border-radius: calc(var(--dock-radius, 0px) + 4px); }
}
@container pf (min-width: 760px) {
  .browser-main { flex-direction: row; }
  .browser-side { width: 260px; flex-shrink: 0; border-bottom: 0; border-right: 1px solid var(--line-0); }
  .work .browser-side { width: 300px; }
  .ph { height: 260px; }
  .desktop { gap: 28px; }
}
@container pf (max-width: 759px) {
  .browser-side { max-height: 260px; overflow-y: auto; }
  .files .col-where, .files td.where { display: none; }
  .files .col-kind { width: 76px; }
  .files .col-date { width: 78px; }
}
@container pf (max-width: 520px) {
  .menu-items, .menu-status .focused, .menu-status .avail-pill { display: none; }
  .menubar-logo { padding: 0 8px; }
  .menu-status { margin-left: auto; padding-right: 8px; gap: 8px; }
  .welcome, .sysinfo { padding: 22px 18px 24px; }
  .welcome h1 { font-size: 26px; }
  .browser-pane { padding: 18px 16px 22px; }
  .files .col-kind, .files td.kind { display: none; }
  .dock { gap: 4px; padding: 8px 6px; }
  .dock-item { width: 40px; height: 40px; }
}
@container pf (max-width: 1039px) {
  .band, .col { display: contents; }
  .window[data-win="welcome"] { order: 1; }
  .window[data-win="sysinfo"] { order: 2; }
  .window[data-win="work"] { order: 3; }
  .window[data-win="projects"] { order: 4; }
  .window[data-win="archive"] { order: 5; }
  .window[data-win="console"] { order: 6; }
}
@container pf (min-width: 1040px) {
  .desktop { grid-template-columns: repeat(12, minmax(0, 1fr)); grid-auto-flow: row dense; align-items: start; gap: 30px 30px; padding: 40px 40px calc(var(--dock-h) + 56px); }
  .window { grid-column: span 12; }
  .band { grid-column: 1 / -1; display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 30px; align-items: start; }
  .col { display: flex; flex-direction: column; gap: 34px; min-width: 0; }
  .window[data-win="welcome"] { margin: 4px 0 0 6px; }
  .window[data-win="sysinfo"] { margin: 54px 0 0 -14px; }
  .window[data-win="work"] { margin: 0 0 0 28px; }
  .window[data-win="projects"] { grid-column: span 12; margin: 0 24px 0 56px; }
  .window[data-win="archive"] { grid-column: span 7; margin: 0 0 0 10px; }
  .window[data-win="console"] { grid-column: span 5; margin: 64px 8px 0 -6px; }
  .window[data-zoom] { grid-column: 1 / -1; margin: 0; --dx: 0px; --dy: 0px; }
  .band:has(.window[data-zoom]) { grid-template-columns: minmax(0, 1fr); }
}
@media (prefers-reduced-motion: no-preference) {
  .window { transition: transform 0.18s cubic-bezier(0.2, 0, 0.3, 1); }
  .window[data-opening] { animation: retro-open 0.15s cubic-bezier(0.2, 0, 0.3, 1) both; }
  .dock-item { transition: transform 0.12s ease-out, border-color 0.12s, color 0.12s; }
  .dock-item:hover { transform: translateY(-3px); }
  .cursor { animation: retro-blink 1.06s steps(1) infinite; }
  .console[data-typing] p { opacity: 0; animation: retro-line 0.01s steps(1) forwards; animation-delay: calc(var(--i) * 0.12s + 0.15s); }
  .boot { animation: retro-boot 0.45s ease-out 1.35s forwards; }
  .boot-log div { opacity: 0; animation: retro-line 0.01s steps(1) forwards; animation-delay: calc(var(--i) * 0.17s + 0.1s); }
}
@media (prefers-reduced-motion: reduce) { .boot { display: none; } }
:scope:where([data-pf-still] *, [inert] *) .boot { display: none; }
:scope:where([data-pf-still] *, [inert] *) :where(.cursor, .window, .console p) { animation: none; opacity: 1; }
@keyframes retro-open { from { opacity: 0; scale: 0.96; } to { opacity: 1; scale: 1; } }
@keyframes retro-blink { 50% { opacity: 0; } }
@keyframes retro-line { to { opacity: 1; } }
@keyframes retro-boot { to { opacity: 0; visibility: hidden; } }
@media print {
  .menubar, .dock-bar, .boot, .win-controls, .resize-handle, .toolbar { display: none; }
  .window { transform: none; box-shadow: none; break-inside: avoid; }
}
`;

export const RETRO_CSS = templateCss(".pf-retro", CSS);
