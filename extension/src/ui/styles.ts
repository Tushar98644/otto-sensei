// The app's tokens (src/app/globals.css), inside the shadow root so the page's CSS can't reach them.
export const STYLES = `
:host { all: initial; }
*, *::before, *::after { box-sizing: border-box; }
.root {
  --paper: #fbfcfa; --surface: #ffffff; --mist: #eef3ef; --mist-strong: #e1e9e3; --border: #dbe4de;
  --border-control: #c9d4cd; --border-control-hover: #aebdb4; --surface-hover: #f5f8f6;
  --ink: #12241d; --muted: #475850; --subtle: #5b6b63;
  --forest: #0e3b2e; --forest-top: #164a3a; --forest-hover: #165140; --forest-hover-top: #1d5c48; --forest-edge: #072319;
  --lavender: #ebe5ff; --accent: #6d4fe8; --highlight: #e6dcff;
  --pass: #1e7b46; --pass-soft: #e9f5ed; --pass-ink: #17613a;
  --warn: #9a6700; --warn-soft: #fbf3dd; --warn-ink: #7a5100;
  --fail: #b42318; --fail-soft: #fdeeec; --fail-ink: #9b1c13;
  --sans: "Inter", "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  position: fixed; right: 20px; bottom: var(--otto-bottom, 20px); z-index: 2147483646;
  display: flex; flex-direction: column; align-items: flex-end;
  font: 400 13px/18px var(--sans); color: var(--ink); letter-spacing: 0;
  -webkit-font-smoothing: antialiased; text-align: left;
}
.root.framed { position: absolute; top: 12px; bottom: auto; }
p, ul, h1, h2, h3, section { margin: 0; }
button, select { font: inherit; color: inherit; }
button { cursor: pointer; }
:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
a { color: var(--ink); text-decoration: underline; text-decoration-color: #7b8a82; text-underline-offset: 3px; }
a:hover { text-decoration-color: var(--ink); }

.card {
  width: 332px; max-width: calc(100vw - 40px); background: var(--surface); border-radius: 18px;
  box-shadow: 0 16px 40px -14px rgb(18 36 29 / 0.3), 0 2px 6px -2px rgb(18 36 29 / 0.1), 0 0 0 1px rgb(18 36 29 / 0.07);
  overflow: hidden; animation: rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  display: flex; flex-direction: column; max-height: calc(100vh - var(--otto-bottom, 20px) - 24px);
}
.root.framed .card { max-height: none; }
.card.open { width: 384px; }
.head { display: flex; align-items: center; gap: 10px; padding: 12px 10px 0 14px; }
.mark {
  flex: none; width: 34px; height: 34px; border-radius: 999px; background: var(--surface);
  box-shadow: 0 0 0 1px var(--border); display: grid; place-items: center;
}
.meta { flex: 1; min-width: 0; font-size: 12px; line-height: 16px; color: var(--subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta b { color: var(--ink); font-weight: 600; }
.icon-btn {
  flex: none; width: 30px; height: 30px; border: 0; border-radius: 9px; background: transparent; color: var(--muted);
  display: grid; place-items: center; transition: background 150ms ease-out, color 150ms ease-out;
}
.icon-btn:hover { background: rgb(18 36 29 / 0.06); color: var(--ink); }
.body { flex: 0 1 auto; min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 10px 16px 16px; display: flex; flex-direction: column; gap: 14px; }
.body > * { flex: none; }

.role { font-size: 15px; line-height: 20px; font-weight: 600; color: var(--ink); text-wrap: pretty; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.where { margin-top: 2px; font-size: 12.5px; line-height: 17px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.message { font-size: 14px; line-height: 20px; color: var(--ink); text-wrap: pretty; }

.score { display: flex; align-items: baseline; gap: 8px; }
.num { font: 600 30px/1 var(--sans); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; color: var(--ink); }
.of { font-size: 13px; color: var(--muted); }
.of b { color: var(--ink); font-weight: 500; }
.meter { display: flex; gap: 3px; margin-top: 8px; }
.meter i { flex: 1; height: 6px; border-radius: 3px; background: var(--mist-strong); }
.meter i.on { background: var(--forest); }
.meter.bar { height: 6px; border-radius: 3px; background: var(--mist-strong); overflow: hidden; display: block; }
.meter.bar span { display: block; height: 100%; border-radius: 3px; background: var(--forest); }
.missing { margin-top: 6px; color: var(--muted); }
.missing mark { background: var(--highlight); color: var(--ink); border-radius: 3px; padding: 0 3px; font-weight: 500; }

.verdict { display: flex; gap: 8px; align-items: flex-start; border-radius: 12px; font-weight: 500; }
.verdict svg { flex: none; margin-top: 1px; }
.verdict.ok { color: var(--ink); }
.verdict.ok svg { color: var(--pass); }
.verdict.check { background: var(--warn-soft); color: var(--warn-ink); padding: 8px 10px; }
.verdict.check svg { color: var(--warn); }
.verdict.blocked { background: var(--fail-soft); color: var(--fail-ink); padding: 8px 10px; }
.verdict.blocked svg { color: var(--fail); }
.verdict.none { color: var(--muted); font-weight: 400; }

.actions { display: flex; gap: 8px; }
.btn {
  position: relative; flex: 1; min-width: 0; height: 36px; padding: 0 8px; border-radius: 11px; border: 1px solid transparent;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; font-weight: 500;
  white-space: nowrap; transition: transform 150ms ease-out, background 150ms ease-out, border-color 150ms ease-out;
}
.btn:active:not(:disabled) { transform: translateY(1px); }
.btn:disabled { cursor: default; }
.btn.primary {
  color: #fff; border-color: var(--forest-edge); background: linear-gradient(to bottom, var(--forest-top), var(--forest));
  box-shadow: 0 1px 2px 0 rgb(7 35 25 / 0.22), 0 2px 5px -2px rgb(7 35 25 / 0.2), inset 0 1px 0 rgb(255 255 255 / 0.12);
}
.btn.primary:hover:not(:disabled) { background: linear-gradient(to bottom, var(--forest-hover-top), var(--forest-hover)); }
.btn.secondary { color: var(--ink); background: var(--surface); border-color: var(--border-control); box-shadow: 0 1px 2px 0 rgb(18 36 29 / 0.07); }
.btn.secondary:hover:not(:disabled) { background: var(--surface-hover); border-color: var(--border-control-hover); }
.btn.done { color: var(--ink); background: var(--lavender); border-color: transparent; box-shadow: none; }
.btn .dot { width: 6px; height: 6px; border-radius: 999px; background: var(--accent); }
.btn[aria-busy="true"] { color: transparent; }
.btn[aria-busy="true"]::after {
  content: ""; position: absolute; width: 14px; height: 14px; border-radius: 999px;
  border: 2px solid currentColor; border-color: var(--spin, #fff) transparent var(--spin, #fff) var(--spin, #fff); animation: spin 700ms linear infinite;
}
.btn.secondary[aria-busy="true"] { --spin: var(--ink); }
.pro { font-size: 10px; line-height: 14px; font-weight: 700; letter-spacing: 0.04em; color: #fff; background: var(--forest); border-radius: 4px; padding: 0 4px; }
.note { font-size: 12px; line-height: 17px; color: var(--muted); text-wrap: pretty; }
.note.error { color: var(--fail-ink); }
.saved-line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); }

.details { flex: 1; min-height: 0; border-top: 1px solid var(--border); overflow: auto; padding: 14px 16px 4px; display: flex; flex-direction: column; gap: 16px; overscroll-behavior: contain; }
.eyebrow { font-size: 11px; line-height: 16px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--subtle); margin-bottom: 4px; }
.rows { list-style: none; margin: 0; padding: 0; }
.rows li { display: flex; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
.rows li:last-child { border-bottom: 0; }
.rows svg { flex: none; margin-top: 1px; }
.rows .shown svg { color: var(--pass); }
.rows .listed svg { color: var(--warn); }
.rows .missing-row svg { color: var(--subtle); }
.term { font-weight: 500; }
.tag { margin-left: 6px; font-size: 11px; color: var(--subtle); }
.quote { margin-top: 2px; font-size: 12px; line-height: 16px; color: var(--subtle); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.pill { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-size: 11px; font-weight: 600; margin-right: 6px; }
.pill.ok { background: var(--pass-soft); color: var(--pass-ink); }
.pill.check { background: var(--warn-soft); color: var(--warn-ink); }
.pill.blocked { background: var(--fail-soft); color: var(--fail-ink); }
.field { display: flex; flex-direction: column; gap: 6px; }
.field select {
  height: 36px; border-radius: 10px; border: 1px solid #7b8a82; background: var(--surface); padding: 0 10px; color: var(--ink);
}
.foot { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0 12px; font-size: 12px; color: var(--muted); }
.body > .link-btn { align-self: flex-start; }
.link-btn { border: 0; background: none; padding: 0; color: var(--muted); text-decoration: underline; text-decoration-color: #aebdb4; text-underline-offset: 3px; }
.link-btn:hover { color: var(--ink); }

.mini {
  position: relative; width: 52px; height: 52px; border: 0; border-radius: 999px; background: var(--surface);
  display: grid; place-items: center; animation: rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
  box-shadow: 0 12px 28px -12px rgb(18 36 29 / 0.35), 0 2px 6px -2px rgb(18 36 29 / 0.12), 0 0 0 1px rgb(18 36 29 / 0.07);
}
.mini .status { position: absolute; top: 3px; right: 3px; width: 12px; height: 12px; border-radius: 999px; border: 2px solid var(--surface); background: var(--subtle); }
.mini .status.ok { background: var(--pass); }
.mini .status.check { background: var(--warn); }
.mini .status.blocked { background: var(--fail); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

.fill { display: flex; flex-direction: column; gap: 8px; }
.btn.wide { flex: none; width: 100%; height: 40px; font-size: 14px; }
.btn.small { flex: none; height: 30px; padding: 0 10px; font-size: 12.5px; gap: 4px; }
.note.strong { color: var(--ink); font-weight: 500; }
.note svg { vertical-align: -2px; color: var(--subtle); }
.filled { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 12px; background: var(--mist); }
.done-line { display: flex; gap: 8px; align-items: flex-start; font-weight: 500; color: var(--ink); }
.done-line svg { flex: none; margin-top: 1px; color: var(--pass); }
.done-line b { font-weight: 600; overflow-wrap: anywhere; }
.links { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; }
.asks, .draft, .answers { display: flex; flex-direction: column; gap: 10px; }
.asks { padding: 12px; border-radius: 12px; border: 1px solid var(--border); }
.ask { display: flex; flex-direction: column; gap: 5px; min-width: 0; border: 0; margin: 0; padding: 0; }
.ask-label { font-size: 12.5px; line-height: 17px; font-weight: 500; color: var(--ink); text-wrap: pretty; padding: 0; }
.ask input, .ask select, .ask textarea, .draft textarea, .pay input, .pay select, .rights-row select {
  font: inherit; font-size: 13px; color: var(--ink); background: var(--surface); border: 1px solid #7b8a82; border-radius: 9px;
  height: 34px; padding: 0 10px; min-width: 0; width: 100%;
}
.ask input:focus, .ask select:focus, .draft textarea:focus, .pay input:focus, .pay select:focus, .rights-row select:focus { outline: 2px solid var(--ink); outline-offset: 1px; }
.ask fieldset, fieldset.ask { max-height: 220px; overflow: auto; }
.check { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--ink); }
.check input { width: 16px; height: 16px; margin: 0; accent-color: var(--forest); }
.pay { display: grid; grid-template-columns: 1fr 74px 92px; gap: 6px; }
.rights-row { display: grid; grid-template-columns: 1fr 104px 118px; gap: 6px; align-items: center; font-size: 12.5px; margin-top: 4px; }
.rights-row select { height: 30px; padding: 0 6px; font-size: 12px; }
.draft { padding: 12px; border-radius: 12px; border: 1px solid var(--border); background: var(--surface); }
.draft-q { font-size: 12.5px; line-height: 17px; color: var(--muted); border-left: 3px solid var(--highlight); padding-left: 8px; text-wrap: pretty; }
.draft textarea { height: auto; min-height: 150px; padding: 8px 10px; line-height: 19px; resize: vertical; }
.drafting { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--muted); }
.spinner { flex: none; width: 14px; height: 14px; border-radius: 999px; border: 2px solid var(--mist-strong); border-top-color: var(--forest); animation: spin 700ms linear infinite; }
.answers { padding-bottom: 12px; }
.answers > .actions { position: sticky; bottom: -4px; background: var(--surface); padding: 8px 0; }
.toast {
  width: 360px; max-width: calc(100vw - 40px); margin-bottom: 10px; display: flex; align-items: center; gap: 10px;
  padding: 10px 10px 10px 12px; border-radius: 14px; background: var(--surface); color: var(--ink);
  box-shadow: 0 16px 40px -14px rgb(18 36 29 / 0.3), 0 2px 6px -2px rgb(18 36 29 / 0.1), 0 0 0 1px rgb(18 36 29 / 0.07);
  animation: rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.toast > p { flex: 1; min-width: 0; }
.toast.error { color: var(--fail-ink); }
.toast-icon { flex: none; width: 30px; height: 30px; border-radius: 9px; display: grid; place-items: center; background: var(--pass-soft); color: var(--pass); }
.toast-text { flex: 1; min-width: 0; }
.toast-text b { font-weight: 600; }
.toast-text .note { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.otto-eyes { transform-box: fill-box; transform-origin: center; animation: blink 7s infinite; }
@keyframes rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
@keyframes blink { 0%, 95%, 100% { transform: scaleY(1); } 97% { transform: scaleY(0.1); } }
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } }
`;
