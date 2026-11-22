import { templateCss } from "../css";

// Ported from ElianCodes/brutal and brutal-ui (MIT, see ./LICENSE.txt).
const css = `
:scope {
  --pink: #f9a8d4;
  --black: #000;
  --white: #fff;
  --outfit: var(--pf-font-outfit, "Outfit"), ui-sans-serif, system-ui, sans-serif;
  --serif: var(--pf-font-dm-serif, "DM Serif Display"), Georgia, serif;
  --sanchez: var(--pf-font-sanchez, "Sanchez"), ui-serif, Georgia, serif;
  --poppins: var(--pf-font-poppins, "Poppins"), ui-sans-serif, system-ui, sans-serif;
  --righteous: var(--pf-font-righteous, "Righteous"), var(--outfit);
  color-scheme: light;
  background: var(--pink);
  color: var(--black);
  font-family: var(--poppins);
  font-size: 16px;
  line-height: 1.5;
  min-height: var(--pf-screen, 100vh);
  display: flex;
  flex-direction: column;
}
:scope a { color: inherit; }
.icon { width: 24px; height: 24px; }
.head { position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; gap: 20px; padding: 24px; background: var(--white); border-bottom: 4px solid var(--black); }
.logo { font-family: var(--righteous); font-size: clamp(26px, 3.4cqi, 48px); line-height: 1; text-decoration: none; overflow-wrap: anywhere; }
.head ul { display: flex; align-items: center; gap: 28px; font-family: var(--poppins); font-size: 18px; font-weight: 500; }
.head a { text-decoration: none; }
.head a:hover { color: #15803d; text-decoration: underline; }
@media (prefers-reduced-motion: no-preference) { .head a { transition: all 150ms ease-in-out; } }
.nav-resume { border: 2px solid var(--black); padding: 4px 12px; box-shadow: 3px 3px 0 var(--black); background: #facc15; }
.head .nav-resume:hover { color: var(--black); text-decoration: none; box-shadow: 1px 1px 0 var(--black); }
.nav-icon a { display: flex; }
.main { flex: 1; display: flex; flex-direction: column; gap: 32px; padding: 24px; }
.mobile-socials { display: none; }

.card {
  background-color: var(--color);
  border-radius: 0.5rem;
  border: 3px solid var(--black);
  box-shadow: 7px 7px 0 var(--black);
  color: var(--black);
  padding: 16px;
  min-width: 0;
}
@media (prefers-reduced-motion: no-preference) { .card, .post, .btn, .pill { transition: transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease; } }
.card:hover { box-shadow: 5px 5px 0 var(--black); }
.hero { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 32px; align-items: start; }
.hero > .card { grid-column: span 2; }
.hero > .hero-card { grid-column: span 4; }
.hero[data-cards="2"] > .hero-card { grid-column: span 5; }
.hero[data-cards="2"] > .card:not(.hero-card) { grid-column: span 3; }
.hero[data-cards="1"] > .hero-card { grid-column: 1 / -1; }
.hero-card { display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
.hero-title { font-family: var(--outfit); font-weight: 400; font-size: clamp(40px, 5.4cqi, 72px); line-height: 1.05; margin-top: 16px; overflow-wrap: anywhere; }
.white { color: var(--white); }
.hero-lead { font-family: var(--outfit); font-size: clamp(22px, 2.7cqi, 40px); line-height: 1.12; }
.hero-lead.small { font-size: clamp(20px, 2.2cqi, 30px); margin-top: 8px; }
.actions { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 8px; }
.serif-title { font-family: var(--serif); font-weight: 400; font-size: clamp(30px, 3.4cqi, 60px); line-height: 1.02; margin-bottom: 24px; overflow-wrap: anywhere; }
.serif-title.big { margin-bottom: 0; }
.body-text { font-family: var(--poppins); font-size: 16px; line-height: 1.55; }
.body-text strong { font-weight: 600; background: rgba(255, 255, 255, 0.55); padding: 0 3px; }
.pills { display: flex; flex-wrap: wrap; gap: 14px; }
.pills.small { margin-top: 16px; gap: 10px; }

.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; width: fit-content;
  padding: 0.5rem 1rem; border: 2px solid var(--black); background: var(--white); color: var(--black);
  box-shadow: 5px 5px 0 var(--black); text-decoration: none; font-family: var(--sanchez); font-weight: 400; font-size: 16px; line-height: 1.2;
  overflow-wrap: anywhere;
}
.btn:hover { box-shadow: 3px 3px 0 var(--black); background: var(--hover, #facc15); }
.btn:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0 var(--black); }
.btn-sm { padding: 0.375rem 0.75rem; font-size: 14px; }
.pill {
  display: inline-flex; align-items: center; justify-content: center; border-radius: 9999px; border: 2px solid var(--black);
  background: var(--white); color: var(--black); box-shadow: 3px 3px 0 var(--black); padding: 0.25rem 0.75rem;
  font-family: var(--sanchez); font-size: 14px; line-height: 1.4; white-space: nowrap; text-decoration: none;
}
.pill:hover { box-shadow: 5px 5px 0 var(--black); background: #c084fc; }
.icon-pill { padding: 6px; }
.icon-pill .icon { width: 20px; height: 20px; }

.wide-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
.posts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 32px; align-items: stretch; }
.posts[data-count="1"] { grid-template-columns: minmax(0, 560px); }
.posts[data-count="2"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.post { display: flex; flex-direction: column; gap: 14px; background: var(--white); border: 3px solid var(--black); border-radius: 0.5rem; box-shadow: 7px 7px 0 var(--black); padding: 16px; min-width: 0; }
.post:hover { box-shadow: 5px 5px 0 var(--black); }
.post-title { font-family: var(--poppins); font-weight: 400; font-size: 20px; line-height: 1.3; overflow-wrap: anywhere; }
.cover { position: relative; min-height: 224px; border: 3px solid var(--black); border-radius: 0.5rem; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 20px; text-align: center; background-color: var(--color); background-image: radial-gradient(rgba(0, 0, 0, 0.18) 1.2px, transparent 1.6px); background-size: 14px 14px; }
.cover-mark { display: grid; place-items: center; width: 64px; height: 64px; border: 3px solid var(--black); border-radius: 50%; background: var(--white); box-shadow: 4px 4px 0 var(--black); font-family: var(--righteous); font-size: 24px; }
.cover-line { font-family: var(--outfit); font-weight: 700; font-size: 22px; line-height: 1.15; max-width: 16em; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.post-meta { font-family: var(--sanchez); font-size: 13px; }
.post-text { font-size: 16px; line-height: 1.55; }
.post-outcome { font-weight: 600; font-size: 15px; }
.post-actions { display: flex; flex-wrap: wrap; gap: 14px; justify-content: flex-end; margin-top: auto; padding-top: 8px; }
.tags p { margin-bottom: 8px; }
.tags ul, .tags-row { display: flex; flex-wrap: wrap; gap: 12px; }
.jobs { display: flex; flex-direction: column; gap: 28px; }
.job { gap: 10px; }
.job-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.job .post-title { font-family: var(--serif); font-size: clamp(24px, 2.4cqi, 32px); line-height: 1.1; }
.job-company { font-family: var(--outfit); font-size: 18px; margin-top: 4px; }
.job-company a { text-decoration: underline; text-underline-offset: 3px; }
.muted { color: #3f3f46; }
.date { flex: none; border: 2px solid var(--black); background: #facc15; padding: 2px 10px; font-family: var(--sanchez); font-size: 14px; box-shadow: 3px 3px 0 var(--black); }
.job-highlight { align-self: flex-start; font-family: var(--outfit); font-weight: 700; font-size: 15px; background: #86efac; border: 2px solid var(--black); padding: 0 8px; }
.job-lines { display: flex; flex-direction: column; gap: 6px; padding-left: 0; }
.job-lines li { position: relative; padding-left: 22px; }
.job-lines li::before { content: ""; position: absolute; left: 2px; top: 0.6em; width: 9px; height: 9px; background: var(--black); transform: rotate(45deg); }
.extras { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 32px; align-items: start; }
.extras .serif-title { font-size: clamp(28px, 2.6cqi, 40px); margin-bottom: 18px; }
.rows { display: flex; flex-direction: column; gap: 12px; }
.rows li { display: flex; flex-direction: column; background: var(--white); border: 2px solid var(--black); border-radius: 0.5rem; padding: 10px 12px; box-shadow: 3px 3px 0 var(--black); }
.row-main { font-weight: 500; line-height: 1.35; text-decoration: none; }
a.row-main { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; }
.row-sub { font-family: var(--sanchez); font-size: 13px; margin-top: 2px; }
.prose-card { columns: 2 24em; column-gap: 40px; }
.prose-card .serif-title { column-span: all; }
.prose-card .body-text + .body-text { margin-top: 12px; }
.contact { display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.foot { background: var(--black); color: var(--white); padding: 24px; font-family: var(--outfit); display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
.foot-credit { color: #93c5fd; }
.foot-credit a { color: inherit; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
.foot-credit a:hover { text-decoration: underline; }
.to-top { position: fixed; bottom: 10px; right: 30px; z-index: 50; display: flex; width: 40px; height: 40px; padding: 0; border: 1px solid var(--black); background: var(--white); color: var(--black); cursor: pointer; opacity: 0; pointer-events: none; filter: drop-shadow(7px 7px 0 var(--black)); }
.to-top[data-shown="true"] { opacity: 1; pointer-events: auto; }
.to-top:hover { filter: drop-shadow(5px 5px 0 var(--black)); }
.to-top svg { width: 100%; height: 100%; }
@media (prefers-reduced-motion: no-preference) { .to-top { transition: all 0.3s; } }

@container pf (max-width: 1100px) {
  .posts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero > .card, .hero > .hero-card, .hero[data-cards] > .card { grid-column: span 4; }
  .hero[data-cards] > .hero-card { grid-column: 1 / -1; }
}
@container pf (max-width: 760px) {
  .head { padding: 16px 20px; }
  .head .nav-text, .head .nav-icon { display: none; }
  .main { padding: 20px 16px 28px; gap: 28px; }
  .mobile-socials { display: flex; flex-wrap: wrap; gap: 12px; }
  .hero { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .hero > .card, .hero[data-cards] > .card, .hero[data-cards] > .hero-card { grid-column: 1 / -1; }
  .posts { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .extras { grid-template-columns: minmax(0, 1fr); gap: 28px; }
  .cover { min-height: 180px; }
  .posts[data-count] { grid-template-columns: minmax(0, 1fr); }
  .to-top { right: 20px; }
}
@media print {
  .to-top, .head nav { display: none; }
  .card, .post, .btn, .pill { box-shadow: none; }
}
`;

export const BRUTAL_CSS = templateCss(".pf-brutal", css);
