import { templateCss } from "../css";

// Ported from bchiang7/v4 (MIT, see ./LICENSE.txt).
const css = `
:scope {
  --dark-navy: #020c1b;
  --navy: #0a192f;
  --light-navy: #112240;
  --lightest-navy: #233554;
  --navy-shadow: rgba(2, 12, 27, 0.7);
  --dark-slate: #495670;
  --slate: #8892b0;
  --light-slate: #a8b2d1;
  --lightest-slate: #ccd6f6;
  --white: #e6f1ff;
  --green: #64ffda;
  --green-tint: rgba(100, 255, 218, 0.1);
  --font-sans: var(--pf-font-inter, "Inter"), "San Francisco", "SF Pro Text", -apple-system, system-ui, sans-serif;
  --font-mono: var(--pf-font-fira-code, "Fira Code"), "Fira Mono", "Roboto Mono", monospace;
  --fz-xxs: 12px;
  --fz-xs: 13px;
  --fz-sm: 14px;
  --fz-md: 16px;
  --fz-lg: 18px;
  --fz-xl: 20px;
  --fz-xxl: 22px;
  --fz-heading: 32px;
  --border-radius: 4px;
  --nav-height: 100px;
  --nav-scroll-height: 70px;
  --tab-height: 42px;
  --tab-width: 120px;
  --easing: cubic-bezier(0.645, 0.045, 0.355, 1);
  --transition: all 0.25s cubic-bezier(0.645, 0.045, 0.355, 1);
  --hamburger-width: 30px;
  position: relative;
  isolation: isolate;
  width: 100%;
  background-color: var(--navy);
  color: var(--slate);
  font-family: var(--font-sans);
  font-size: var(--fz-xl);
  line-height: 1.3;
  overflow-wrap: break-word;
  /* Calibre has a smaller x-height than Inter; this keeps Inter's text the size v4's reads at. */
  font-size-adjust: 0.49;
}
:where(.hero h1, .links, .sidebar, .side-email, .skills-list, .tab, .range, .project-overline, .project-tech-list, .card .tech, .btn, .btn-small, .btn-big, .overline, .credit) { font-size-adjust: none; }
::selection { background-color: var(--lightest-navy); color: var(--lightest-slate); }
:where(a, button):focus-visible { outline: 2px dashed var(--green); outline-offset: 3px; }
svg { width: 100%; height: 100%; fill: currentColor; vertical-align: middle; }
svg.lucide, svg[fill="none"] { fill: none; }
a { display: inline-block; text-decoration: none; text-decoration-skip-ink: auto; color: inherit; position: relative; transition: var(--transition); }
a:hover, a:focus-visible { color: var(--green); }
button { cursor: pointer; border: 0; border-radius: 0; background: none; color: inherit; }
h1, h2, h3, h4 { margin: 0 0 10px 0; font-weight: 600; color: var(--lightest-slate); line-height: 1.1; }
p { margin: 0 0 15px 0; }
p:last-child, p:last-of-type { margin: 0; }

.inline-link, p > a { display: inline-block; position: relative; color: var(--green); transition: var(--transition); }
.inline-link::after, p > a::after { content: ""; display: block; width: 0; height: 1px; position: relative; bottom: 0.37em; background-color: var(--green); opacity: 0.5; transition: var(--transition); }
.inline-link:hover::after, .inline-link:focus-visible::after, p > a:hover::after { width: 100%; }
.hl { color: var(--green); }

.skip { position: absolute; top: auto; left: -999px; width: 1px; height: 1px; overflow: hidden; z-index: -99; color: var(--green); border: 1px solid var(--green); border-radius: var(--border-radius); font-family: var(--font-mono); font-size: var(--fz-xs); padding: 1.25rem 1.75rem; }
.skip:focus { background-color: var(--green); color: var(--navy); top: 0; left: 0; width: auto; height: auto; overflow: auto; z-index: 99; }

/* Buttons (mixins.button, smallButton, bigButton) */
.btn, .btn-small, .btn-big { display: inline-block; color: var(--green); background-color: transparent; border: 1px solid var(--green); border-radius: var(--border-radius); font-family: var(--font-mono); line-height: 1; text-decoration: none; transition: var(--transition); }
.btn { font-size: var(--fz-xs); padding: 1.25rem 1.75rem; }
.btn-small { font-size: var(--fz-xs); padding: 0.75rem 1rem; }
.btn-big { font-size: var(--fz-sm); padding: 1.25rem 1.75rem; }
.btn:hover, .btn:focus-visible, .btn-big:hover, .btn-big:focus-visible { outline: none; box-shadow: 4px 4px 0 0 var(--green); transform: translate(-5px, -5px); color: var(--green); }
.btn-small:hover, .btn-small:focus-visible { outline: none; box-shadow: 3px 3px 0 0 var(--green); transform: translate(-4px, -4px); color: var(--green); }

/* Header (src/components/nav.js) */
.nav { display: flex; justify-content: space-between; align-items: center; position: fixed; top: 0; left: 0; z-index: 11; padding: 0 50px; width: 100%; height: var(--nav-height); background-color: rgba(10, 25, 47, 0.85); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: var(--transition); }
.nav nav { display: flex; justify-content: space-between; align-items: center; position: relative; width: 100%; color: var(--lightest-slate); font-family: var(--font-mono); counter-reset: item 0; z-index: 12; }
.logo { display: flex; justify-content: center; align-items: center; }
.logo a { color: var(--green); width: 42px; height: 42px; position: relative; z-index: 1; }
.logo .hex-container { position: absolute; top: 0; left: 0; z-index: -1; width: 100%; height: 100%; transition: var(--transition); }
.logo .logo-container { position: relative; z-index: 1; display: block; width: 100%; height: 100%; }
.logo .logo-container svg { fill: none; user-select: none; transition: var(--transition); }
.logo .logo-container polygon { fill: var(--navy); }
.logo .logo-container text { fill: currentColor; stroke: none; font-family: var(--font-sans); font-weight: 600; font-size: 40px; }
.logo a:hover, .logo a:focus-visible { outline: 0; transform: translate(-4px, -4px); }
.logo a:hover .hex-container, .logo a:focus-visible .hex-container { transform: translate(4px, 3px); }
.links { display: flex; align-items: center; }
.links ol { display: flex; justify-content: space-between; align-items: center; padding: 0; margin: 0; list-style: none; }
.links li { margin: 0 5px; position: relative; counter-increment: item 1; font-size: var(--fz-xs); }
.links li a { padding: 10px; }
.links li a::before { content: "0" counter(item) "."; margin-right: 5px; color: var(--green); font-size: var(--fz-xxs); text-align: right; }
.links .btn-small { margin-left: 15px; }
@media (prefers-reduced-motion: no-preference) {
  .nav[data-top="false"][data-direction="up"] { height: var(--nav-scroll-height); transform: translateY(0px); box-shadow: 0 10px 30px -10px var(--navy-shadow); }
  .nav[data-top="false"][data-direction="down"] { height: var(--nav-scroll-height); transform: translateY(calc(var(--nav-scroll-height) * -1)); box-shadow: 0 10px 30px -10px var(--navy-shadow); }
  .logo { animation: navy-fade 300ms var(--easing) 100ms both; }
  .links li, .links .resume { animation: navy-fadedown 300ms var(--easing) both; animation-delay: calc(100ms + var(--i, 0) * 100ms); }
  .side { animation: navy-fade 300ms var(--easing) 1200ms both; }
  .hero > * { animation: navy-fadeup 300ms var(--easing) both; animation-delay: calc(500ms + var(--i, 0) * 100ms); }
}
@keyframes navy-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes navy-fadeup { from { opacity: 0.01; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes navy-fadedown { from { opacity: 0.01; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }

/* Mobile menu (src/components/menu.js) */
.menu { display: none; }
.ham { display: none; position: relative; z-index: 10; margin-right: -15px; padding: 15px; border: 0; background-color: transparent; color: inherit; text-transform: none; transition-timing-function: linear; transition-duration: 0.15s; transition-property: opacity, filter; }
.ham-box { display: inline-block; position: relative; width: var(--hamburger-width); height: 24px; }
.ham-box-inner { position: absolute; top: 50%; right: 0; width: var(--hamburger-width); height: 2px; border-radius: var(--border-radius); background-color: var(--green); transition-duration: 0.22s; transition-property: transform; transition-delay: 0s; transform: rotate(0deg); transition-timing-function: cubic-bezier(0.55, 0.055, 0.675, 0.19); }
.ham-box-inner::before, .ham-box-inner::after { content: ""; display: block; position: absolute; left: auto; right: 0; width: var(--hamburger-width); height: 2px; border-radius: 4px; background-color: var(--green); transition-timing-function: ease; transition-duration: 0.15s; transition-property: transform; }
.ham-box-inner::before { width: 120%; top: -10px; opacity: 1; transition: top 0.1s ease-in 0.25s, opacity 0.1s ease-in; }
.ham-box-inner::after { width: 80%; bottom: -10px; transform: rotate(0); transition: bottom 0.1s ease-in 0.25s, transform 0.22s cubic-bezier(0.55, 0.055, 0.675, 0.19); }
.ham[aria-expanded="true"] .ham-box-inner { transition-delay: 0.12s; transform: rotate(225deg); transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1); }
.ham[aria-expanded="true"] .ham-box-inner::before { width: 100%; top: 0; opacity: 0; transition: top 0.1s ease-out, opacity 0.1s ease-out 0.12s; }
.ham[aria-expanded="true"] .ham-box-inner::after { width: 100%; bottom: 0; transform: rotate(-90deg); transition: bottom 0.1s ease-out, transform 0.22s cubic-bezier(0.215, 0.61, 0.355, 1) 0.12s; }
.sidebar { display: none; }
.sidebar nav { display: flex; justify-content: space-between; align-items: center; width: 100%; flex-direction: column; color: var(--lightest-slate); font-family: var(--font-mono); text-align: center; counter-reset: item 0; }
.sidebar ol { padding: 0; margin: 0; list-style: none; width: 100%; }
.sidebar li { position: relative; margin: 0 auto 20px; counter-increment: item 1; font-size: clamp(var(--fz-sm), 4cqi, var(--fz-lg)); }
.sidebar li::before { content: "0" counter(item) "."; display: block; margin-bottom: 5px; color: var(--green); font-size: var(--fz-sm); }
.sidebar li a { width: 100%; padding: 3px 20px 20px; }
:scope[data-menu="open"] .content { filter: blur(5px) brightness(0.7); transition: var(--transition); pointer-events: none; user-select: none; }

/* Fixed side elements (side.js, social.js, email.js) */
.side { width: 40px; position: fixed; bottom: 0; z-index: 10; color: var(--light-slate); }
.side-left { left: 40px; right: auto; }
.side-right { left: auto; right: 40px; }
.side-list { display: flex; flex-direction: column; align-items: center; margin: 0; padding: 0; list-style: none; }
.side-list::after, .side-email::after { content: ""; display: block; width: 1px; height: 90px; margin: 0 auto; background-color: var(--light-slate); }
.side-list li:last-of-type { margin-bottom: 20px; }
.side-list a { padding: 10px; }
.side-list a:hover, .side-list a:focus-visible, .side-email a:hover, .side-email a:focus-visible { transform: translateY(-3px); }
.side-list svg { width: 20px; height: 20px; display: block; }
.side-email { display: flex; flex-direction: column; align-items: center; position: relative; }
.side-email a { margin: 20px auto; padding: 10px; font-family: var(--font-mono); font-size: var(--fz-xxs); line-height: var(--fz-lg); letter-spacing: 0.1em; writing-mode: vertical-rl; }

/* Page body */
.main { margin: 0 auto; width: 100%; max-width: 1600px; min-height: 100vh; padding: 0 150px; counter-reset: section; }
section { margin: 0 auto; padding: 100px 0; max-width: 1000px; }
.big-heading { margin: 0; font-size: clamp(40px, 8cqi, 80px); }
.numbered-heading { display: flex; align-items: center; position: relative; margin: 10px 0 40px; width: 100%; font-size: clamp(26px, 5cqi, var(--fz-heading)); white-space: nowrap; }
.numbered-heading::before { position: relative; bottom: 4px; counter-increment: section; content: "0" counter(section) "."; margin-right: 10px; color: var(--green); font-family: var(--font-mono); font-size: clamp(var(--fz-md), 3cqi, var(--fz-xl)); font-weight: 400; }
.numbered-heading::after { content: ""; display: block; position: relative; top: -5px; width: 300px; height: 1px; margin-left: 20px; background-color: var(--lightest-navy); }

/* Hero (sections/hero.js) */
.hero { display: flex; justify-content: center; flex-direction: column; align-items: flex-start; min-height: var(--pf-screen, 100vh); padding: 0; }
.hero h1 { margin: 0 0 30px 4px; color: var(--green); font-family: var(--font-mono); font-size: clamp(var(--fz-sm), 5cqi, var(--fz-md)); font-weight: 400; }
.hero h3 { margin-top: 5px; color: var(--slate); line-height: 0.9; }
.hero p { margin: 20px 0 0; max-width: 540px; }
.hero .btn-big { margin-top: 50px; }

/* About (sections/about.js) */
.about { max-width: 900px; }
.about .inner { display: grid; grid-template-columns: 3fr 2fr; gap: 50px; }
.skills-list { display: grid; grid-template-columns: repeat(2, minmax(140px, 200px)); gap: 0 10px; padding: 0; margin: 20px 0 0 0; overflow: hidden; list-style: none; }
.skills-list li { position: relative; margin-bottom: 10px; padding-left: 20px; font-family: var(--font-mono); font-size: var(--fz-xs); }
.skills-list li::before { content: "▹"; position: absolute; left: 0; color: var(--green); font-size: var(--fz-sm); line-height: 12px; }
.pic { position: relative; max-width: 300px; }
.pic .wrapper { box-shadow: 0 10px 30px -15px var(--navy-shadow); transition: var(--transition); display: block; position: relative; width: 100%; border-radius: var(--border-radius); background-color: var(--green); }
.pic .wrapper:hover { outline: 0; transform: translate(-4px, -4px); box-shadow: 0 20px 30px -15px var(--navy-shadow); }
.pic .wrapper:hover::after { transform: translate(8px, 8px); }
/* The initials on a blueprint grid, where v4 has its tinted photo */
.pic .initials { display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: var(--border-radius); background: linear-gradient(var(--lightest-navy) 1px, transparent 1px) 0 0 / 100% 12.5%, linear-gradient(90deg, var(--lightest-navy) 1px, transparent 1px) 0 0 / 12.5% 100%, radial-gradient(circle at 30% 25%, var(--lightest-navy), var(--light-navy) 70%); color: var(--green); font-family: var(--font-mono); font-size: 84px; letter-spacing: -0.04em; text-shadow: 0 0 40px var(--green-tint); mix-blend-mode: normal; }
.pic .wrapper::before, .pic .wrapper::after { content: ""; display: block; position: absolute; width: 100%; height: 100%; border-radius: var(--border-radius); transition: var(--transition); }
.pic .wrapper::before { top: 0; left: 0; background-color: var(--navy); mix-blend-mode: screen; }
.pic .wrapper::after { border: 2px solid var(--green); top: 14px; left: 14px; z-index: -1; }
.pic .wrapper:has(.initials)::before { display: none; }

/* Jobs (sections/jobs.js) */
.jobs { max-width: 700px; }
.jobs .inner { display: flex; min-height: 340px; }
.tablist { position: relative; z-index: 3; flex: none; width: max-content; max-width: 240px; padding: 0; margin: 0; list-style: none; }
/* v4's company names fit one line; a longer one wraps instead of squeezing the panel beside it. */
.tab { display: flex; align-items: center; width: 100%; min-height: var(--tab-height); padding: 8px 20px 10px; border-left: 2px solid var(--lightest-navy); background-color: transparent; color: var(--slate); font-family: var(--font-mono); font-size: var(--fz-xs); text-align: left; transition: var(--transition); }
.tab[aria-selected="true"] { color: var(--green); }
.tab:hover, .tab:focus-visible { background-color: var(--light-navy); color: var(--green); }
.highlight { position: absolute; top: 0; left: 0; z-index: 10; width: 2px; height: var(--hl-h, var(--tab-height)); border-radius: var(--border-radius); background: var(--green); transform: translateY(var(--hl-y, calc(var(--active, 0) * var(--tab-height)))); transition: transform 0.25s cubic-bezier(0.645, 0.045, 0.355, 1), height 0.25s cubic-bezier(0.645, 0.045, 0.355, 1), width 0.25s cubic-bezier(0.645, 0.045, 0.355, 1); transition-delay: 0.1s; }
.panels { position: relative; width: 100%; margin-left: 20px; }
.panel { width: 100%; height: auto; padding: 10px 5px; }
.panel[hidden] { display: none; }
@media (prefers-reduced-motion: no-preference) { .panel:not([hidden]) { animation: navy-fade 300ms var(--easing); } }
.panel h3 { margin-bottom: 2px; font-size: var(--fz-xxl); font-weight: 500; line-height: 1.3; }
.panel h3 .company { color: var(--green); }
.panel .range { margin-bottom: 25px; color: var(--light-slate); font-family: var(--font-mono); font-size: var(--fz-xs); }
.fancy-list { padding: 0; margin: 0; list-style: none; font-size: var(--fz-lg); }
.fancy-list li { position: relative; padding-left: 30px; margin-bottom: 10px; }
.fancy-list li::before { content: "▹"; position: absolute; left: 0; color: var(--green); }

/* Featured projects (sections/featured.js) */
.featured-list { padding: 0; margin: 0; list-style: none; }
.featured-list a { position: relative; z-index: 1; }
.project { position: relative; display: grid; gap: 10px; grid-template-columns: repeat(12, 1fr); align-items: center; }
.project:not(:last-of-type) { margin-bottom: 100px; }
.project:nth-of-type(odd) .project-content { grid-column: 7 / -1; text-align: right; }
.project:nth-of-type(odd) .project-tech-list { justify-content: flex-end; }
.project:nth-of-type(odd) .project-tech-list li { margin: 0 0 5px 20px; }
.project:nth-of-type(odd) .project-links { justify-content: flex-end; margin-left: 0; margin-right: -10px; }
.project:nth-of-type(odd) .project-image { grid-column: 1 / 8; }
.project-content { position: relative; grid-column: 1 / 7; grid-row: 1 / -1; }
.project-overline { margin: 10px 0; color: var(--green); font-family: var(--font-mono); font-size: var(--fz-xs); font-weight: 400; }
.project-title { position: relative; z-index: 2; color: var(--lightest-slate); font-size: clamp(24px, 5cqi, 28px); margin: 0 0 20px; }
.project-description { box-shadow: 0 10px 30px -15px var(--navy-shadow); transition: var(--transition); position: relative; z-index: 2; padding: 25px; border-radius: var(--border-radius); background-color: var(--light-navy); color: var(--light-slate); font-size: var(--fz-lg); }
.project-description:hover { box-shadow: 0 20px 30px -15px var(--navy-shadow); }
.project-description strong { color: var(--white); font-weight: normal; }
.project-tech-list { display: flex; flex-wrap: wrap; position: relative; z-index: 2; margin: 25px 0 10px; padding: 0; list-style: none; }
.project-tech-list li { margin: 0 20px 5px 0; color: var(--light-slate); font-family: var(--font-mono); font-size: var(--fz-xs); white-space: nowrap; }
.project-links { display: flex; align-items: center; position: relative; margin-top: 10px; margin-left: -10px; color: var(--lightest-slate); }
.project-links a { display: flex; justify-content: center; align-items: center; padding: 10px; }
.project-links a svg { width: 20px; height: 20px; }
.project-links a.external svg { width: 22px; height: 22px; margin-top: -4px; }
.project-image { box-shadow: 0 10px 30px -15px var(--navy-shadow); transition: var(--transition); grid-column: 6 / -1; grid-row: 1 / -1; position: relative; z-index: 1; }
.project-image:hover { box-shadow: 0 20px 30px -15px var(--navy-shadow); }
.project-image a, .project-image .frame { display: block; width: 100%; height: 100%; background-color: var(--green); border-radius: var(--border-radius); vertical-align: middle; }
.project-image a:hover, .project-image a:focus-visible { background: transparent; outline: 0; }
.project-image a:hover::before, .project-image a:focus-visible::before, .project-image a:hover .img, .project-image a:focus-visible .img { background: transparent; filter: none; }
.project-image a::before, .project-image .frame::before { content: ""; position: absolute; width: 100%; height: 100%; inset: 0; z-index: 3; transition: var(--transition); background-color: var(--navy); mix-blend-mode: screen; }
.project-image .img { display: block; width: 100%; aspect-ratio: 16 / 10; object-fit: cover; object-position: top; border-radius: var(--border-radius); mix-blend-mode: multiply; filter: grayscale(100%) contrast(1) brightness(90%); }
.code-screen text { font-family: var(--font-mono); }

/* Other projects (sections/projects.js) */
.others { display: flex; flex-direction: column; align-items: center; }
.others > h2 { font-size: clamp(24px, 5cqi, var(--fz-heading)); }
.others.numbered { align-items: stretch; }
.projects-grid { padding: 0; margin: 50px 0 0; list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px; position: relative; width: 100%; }
.others.numbered .projects-grid { margin-top: 0; }
.projects-grid:not([data-more="true"]) > li:nth-child(n + 7) { display: none; }
.card { position: relative; cursor: default; transition: var(--transition); }
@media (prefers-reduced-motion: no-preference) { .card:hover .card-inner, .card:focus-within .card-inner { transform: translateY(-7px); } }
.card a { position: relative; z-index: 1; }
.card-inner { box-shadow: 0 10px 30px -15px var(--navy-shadow); display: flex; justify-content: space-between; flex-direction: column; align-items: flex-start; position: relative; height: 100%; padding: 2rem 1.75rem; border-radius: var(--border-radius); background-color: var(--light-navy); transition: var(--transition); overflow: auto; }
.card:hover .card-inner { box-shadow: 0 20px 30px -15px var(--navy-shadow); }
.card-inner > header { width: 100%; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 35px; }
.card-top .folder { color: var(--green); }
.card-top .folder svg { width: 40px; height: 40px; display: block; }
.card-top .project-links { margin: 0 -10px 0 0; color: var(--light-slate); }
.card-top .project-links a { padding: 5px 7px; }
.card-title { margin: 0 0 10px; color: var(--lightest-slate); font-size: var(--fz-xxl); }
.card-title a { position: static; }
.card-title a::before { content: ""; display: block; position: absolute; z-index: 0; width: 100%; height: 100%; top: 0; left: 0; }
.card-description { color: var(--light-slate); font-size: 17px; }
.card .tech { display: flex; align-items: flex-end; flex-grow: 1; flex-wrap: wrap; padding: 0; margin: 20px 0 0 0; list-style: none; }
.card .tech li { font-family: var(--font-mono); font-size: var(--fz-xxs); line-height: 1.75; }
.card .tech li:not(:last-of-type) { margin-right: 15px; }
.more-button { margin: 80px auto 0; }

/* Contact (sections/contact.js) */
.contact { max-width: 600px; margin: 0 auto 100px; text-align: center; }
.contact .overline { display: block; margin-bottom: 20px; color: var(--green); font-family: var(--font-mono); font-size: var(--fz-md); font-weight: 400; }
.contact .overline::before { bottom: 0; font-size: var(--fz-sm); }
.contact .overline::after { display: none; }
.contact .title { font-size: clamp(40px, 5cqi, 60px); }
.contact .btn-big { margin-top: 50px; }

/* Scroll reveals (utils/sr.js: 20px up, 500ms) */
[data-reveal] { transition: opacity 500ms var(--easing), transform 500ms var(--easing); }
[data-reveal][data-shown="false"] { opacity: 0; transform: translateY(20px); }

/* Footer (src/components/footer.js) */
.footer { display: flex; justify-content: center; align-items: center; flex-direction: column; height: auto; min-height: 70px; padding: 15px; text-align: center; gap: 4px; }
/* Without a credit line the footer only holds the phone layout's social links. */
.footer:not(:has(.credit)) { display: none; }
.footer-social { display: none; width: 100%; max-width: 270px; margin: 0 auto 10px; color: var(--light-slate); }
.footer-social ul { display: flex; justify-content: space-between; align-items: center; padding: 0; margin: 0; list-style: none; }
.footer-social a { padding: 10px; }
.footer-social svg { width: 20px; height: 20px; display: block; }
.credit { color: var(--light-slate); font-family: var(--font-mono); font-size: var(--fz-xxs); line-height: 1.6; opacity: 1; }
.credit { padding: 6px 0 0; }
.credit a { padding: 6px; }
.credit a:hover { color: var(--green); }

@container pf (max-width: 1080px) {
  .nav { padding: 0 40px; }
  .side-left { left: 20px; }
  .side-right { right: 20px; }
  .main { padding: 0 100px; }
  .numbered-heading::after { width: 200px; }
  .project-content { grid-column: 1 / 9; }
  .project:nth-of-type(odd) .project-content { grid-column: 5 / -1; }
  .projects-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
}
@container pf (max-width: 768px) {
  .nav { padding: 0 25px; }
  .links, .side { display: none; }
  .menu { display: block; }
  .ham { display: flex; justify-content: center; align-items: center; }
  .sidebar { display: flex; justify-content: center; align-items: center; position: fixed; top: 0; bottom: 0; right: 0; padding: 50px 10px; width: min(75cqi, 400px); height: 100vh; outline: 0; background-color: var(--light-navy); box-shadow: -10px 0px 30px -15px var(--navy-shadow); z-index: 9; transform: translateX(100cqi); visibility: hidden; transition: var(--transition); }
  .sidebar[data-open="true"] { transform: translateX(0); visibility: visible; }
  .main { padding: 0 50px; }
  section { padding: 80px 0; }
  .numbered-heading::after { width: 100%; }
  .about .inner { display: block; }
  .pic { margin: 50px auto 0; width: 70%; }
  .tab { padding: 8px 15px 10px; }
  .project { box-shadow: 0 10px 30px -15px var(--navy-shadow); }
  .project:not(:last-of-type) { margin-bottom: 70px; }
  .project-content, .project:nth-of-type(odd) .project-content { display: flex; flex-direction: column; justify-content: center; height: 100%; grid-column: 1 / -1; padding: 40px 40px 30px; z-index: 5; text-align: left; }
  .project:nth-of-type(odd) .project-tech-list, .project:nth-of-type(odd) .project-links { justify-content: flex-start; }
  .project:nth-of-type(odd) .project-tech-list li { margin: 0 10px 5px 0; }
  .project:nth-of-type(odd) .project-links { margin-left: -10px; margin-right: 0; }
  .project-title { position: static; color: var(--white); margin: 0 0 10px; }
  .project-title a { position: static; }
  .project-title a::before { content: ""; display: block; position: absolute; z-index: 0; width: 100%; height: 100%; top: 0; left: 0; }
  .project-description { padding: 20px 0; background-color: transparent; box-shadow: none; }
  .project-description:hover { box-shadow: none; }
  .project-tech-list { margin: 10px 0; }
  .project-tech-list li { margin: 0 10px 5px 0; color: var(--lightest-slate); }
  .project-image, .project:nth-of-type(odd) .project-image { grid-column: 1 / -1; height: 100%; opacity: 0.25; overflow: hidden; }
  .project-image a, .project-image .frame { position: absolute; inset: 0; }
  .project-image .img { object-fit: cover; width: 100%; height: 100%; aspect-ratio: auto; filter: grayscale(100%) contrast(1) brightness(50%); }
  .contact { margin: 0 auto 50px; }
  .footer-social { display: block; }
  .footer:not(:has(.credit)) { display: flex; }
}
@container pf (max-width: 600px) {
  .numbered-heading::after { margin-left: 10px; }
  .jobs .inner { display: block; min-height: 0; }
  .tablist { display: flex; overflow-x: auto; width: calc(100% + 100px); padding-left: 50px; margin-left: -50px; margin-bottom: 30px; }
  .tablist li:first-of-type { margin-left: 50px; }
  .tablist li:last-of-type { padding-right: 50px; }
  .tablist { max-width: none; }
  .tab { display: flex; flex: none; justify-content: center; align-items: center; width: auto; min-width: var(--tab-width); height: var(--tab-height); padding: 0 15px; border-left: 0; border-bottom: 2px solid var(--lightest-navy); text-align: center; white-space: nowrap; }
  .highlight { top: auto; bottom: 0; width: var(--hl-w, 100%); max-width: var(--hl-w, var(--tab-width)); height: 2px; margin-left: 50px; transform: translateX(var(--hl-x, calc(var(--active, 0) * var(--tab-width)))); }
  .panels { margin-left: 0; }
}
@container pf (max-width: 480px) {
  .content { font-size: var(--fz-lg); }
  .main { padding: 0 25px; }
  section { padding: 60px 0; }
  .hero h1 { margin: 0 0 20px 2px; }
  .numbered-heading::before { margin-bottom: -3px; margin-right: 5px; }
  .tablist { width: calc(100% + 50px); padding-left: 25px; margin-left: -25px; }
  .tablist li:first-of-type { margin-left: 25px; }
  .tablist li:last-of-type { padding-right: 25px; }
  .highlight { margin-left: 25px; }
  .project:not(:last-of-type) { margin-bottom: 30px; }
  .project-content, .project:nth-of-type(odd) .project-content { padding: 30px 25px 20px; }
}
`;

export const NAVY_CSS = templateCss(".pf-navy", css);
