import { templateCss } from "../css";

// Ported from codewithsadee/vcard-personal-portfolio (MIT, see ./LICENSE.txt).
const css = `
:scope {
  --bg-gradient-onyx: linear-gradient(to bottom right, hsl(240, 1%, 25%) 3%, hsl(0, 0%, 19%) 97%);
  --bg-gradient-jet: linear-gradient(to bottom right, hsla(240, 1%, 18%, 0.251) 0%, hsla(240, 2%, 11%, 0) 100%), hsl(240, 2%, 13%);
  --bg-gradient-yellow-1: linear-gradient(to bottom right, hsl(45, 100%, 71%) 0%, hsla(36, 100%, 69%, 0) 50%);
  --bg-gradient-yellow-2: linear-gradient(135deg, hsla(45, 100%, 71%, 0.251) 0%, hsla(35, 100%, 68%, 0) 59.86%), hsl(240, 2%, 13%);
  --border-gradient-onyx: linear-gradient(to bottom right, hsl(0, 0%, 25%) 0%, hsla(0, 0%, 25%, 0) 50%);
  --text-gradient-yellow: linear-gradient(to right, hsl(45, 100%, 72%), hsl(35, 100%, 68%));
  --jet: hsl(0, 0%, 22%);
  --onyx: hsl(240, 1%, 17%);
  --eerie-black-1: hsl(240, 2%, 13%);
  --eerie-black-2: hsl(240, 2%, 12%);
  --smoky-black: hsl(0, 0%, 7%);
  --white-1: hsl(0, 0%, 100%);
  --white-2: hsl(0, 0%, 98%);
  --orange-yellow-crayola: hsl(45, 100%, 72%);
  --vegas-gold: hsl(45, 54%, 58%);
  --light-gray: hsl(0, 0%, 84%);
  --light-gray-70: hsla(0, 0%, 84%, 0.7);
  --fs-1: 24px; --fs-2: 18px; --fs-3: 17px; --fs-4: 16px; --fs-5: 15px; --fs-6: 14px; --fs-7: 13px; --fs-8: 11px;
  --shadow-1: -4px 8px 24px hsla(0, 0%, 0%, 0.25);
  --shadow-2: 0 16px 30px hsla(0, 0%, 0%, 0.25);
  --shadow-4: 0 25px 50px hsla(0, 0%, 0%, 0.15);
  --shadow-5: 0 24px 80px hsla(0, 0%, 0%, 0.25);
  --transition-1: 0.25s ease;
  --transition-2: 0.5s ease-in-out;
  color-scheme: dark;
  background: var(--smoky-black);
  color: var(--light-gray);
  font-family: var(--pf-font-poppins, "Poppins"), ui-sans-serif, system-ui, sans-serif;
  min-height: var(--pf-screen, 100vh);
  padding-bottom: 1px;
}
:scope a { color: inherit; text-decoration: none; }
:scope ::selection { background: var(--orange-yellow-crayola); color: var(--smoky-black); }
:scope :where(a, button):focus-visible { outline-color: var(--orange-yellow-crayola); }
:scope :where(button) { background: none; border: 0; padding: 0; cursor: pointer; color: inherit; text-align: left; }
.sidebar, .page { background: var(--eerie-black-2); border: 1px solid var(--jet); border-radius: 20px; padding: 15px; box-shadow: var(--shadow-1); z-index: 1; }
.separator { width: 100%; height: 1px; background: var(--jet); margin: 16px 0; }
.icon-box { position: relative; flex: none; background: var(--border-gradient-onyx); width: 30px; height: 30px; border-radius: 8px; display: flex; justify-content: center; align-items: center; color: var(--orange-yellow-crayola); box-shadow: var(--shadow-1); z-index: 1; }
.icon-box::before { content: ""; position: absolute; inset: 1px; background: var(--eerie-black-1); border-radius: inherit; z-index: -1; }
.icon-box svg { width: 16px; height: 16px; stroke-width: 1.8; }
@keyframes card-fade { 0% { opacity: 0; } 100% { opacity: 1; } }
@keyframes card-scale-up { 0% { transform: scale(0.5); } 100% { transform: scale(1); } }
@media (prefers-reduced-motion: no-preference) {
  .page:not([hidden]) { animation: card-fade 0.5s ease backwards; }
  .project-item:not([hidden]) { animation: card-scale-up 0.25s ease forwards; }
}
:scope:where([data-pf-still] *, [inert] *) :where(.page, .project-item) { animation: none; }
.h2, .h3, .h4, .h5 { color: var(--white-2); }
.h2 { font-size: var(--fs-1); font-weight: 600; }
.h3 { font-size: var(--fs-2); font-weight: 500; }
.h4 { font-size: var(--fs-4); font-weight: 500; }
.h5 { font-size: var(--fs-7); font-weight: 500; }
.article-title { position: relative; padding-bottom: 7px; margin-bottom: 15px; }
.article-title::after { content: ""; position: absolute; bottom: 0; left: 0; width: 30px; height: 3px; background: var(--text-gradient-yellow); border-radius: 3px; }
.content-card { position: relative; background: var(--border-gradient-onyx); padding: 15px; padding-top: 45px; border-radius: 14px; box-shadow: var(--shadow-2); z-index: 1; }
.content-card::before { content: ""; position: absolute; inset: 1px; background: var(--bg-gradient-jet); border-radius: inherit; z-index: -1; }

.main { margin: 15px 12px 75px; min-width: 259px; }
.sidebar { position: relative; margin-bottom: 15px; }
.sidebar-info { position: relative; display: flex; justify-content: flex-start; align-items: center; gap: 15px; }
.avatar-box { flex: none; display: grid; place-items: center; width: 80px; height: 80px; background: var(--bg-gradient-onyx); border-radius: 20px; box-shadow: var(--shadow-1); }
.avatar-box span { font-size: 30px; font-weight: 600; letter-spacing: -0.02em; background: var(--text-gradient-yellow); -webkit-background-clip: text; background-clip: text; color: transparent; }
.info-content { min-width: 0; }
.info-content .name { color: var(--white-2); font-size: var(--fs-3); font-weight: 500; letter-spacing: -0.25px; margin-bottom: 10px; overflow-wrap: anywhere; }
.info-content .title { color: var(--white-1); background: var(--onyx); font-size: var(--fs-8); font-weight: 300; width: max-content; max-width: 100%; padding: 3px 12px; border-radius: 8px; }
.info-more-btn { position: absolute; top: -15px; right: -15px; border-radius: 0 15px; font-size: 13px; color: var(--orange-yellow-crayola); background: var(--border-gradient-onyx); padding: 10px; box-shadow: var(--shadow-2); z-index: 1; display: flex; align-items: center; gap: 6px; }
.info-more-btn::before { content: ""; position: absolute; inset: 1px; border-radius: inherit; background: var(--bg-gradient-jet); z-index: -1; }
.info-more-btn:hover { background: var(--bg-gradient-yellow-1); }
.info-more-btn:hover::before { background: var(--bg-gradient-yellow-2); }
.info-more-btn span { display: none; font-size: var(--fs-8); }
.info-more-btn .chev { width: 16px; height: 16px; }
.info-more-btn[aria-expanded="true"] .chev { transform: rotate(180deg); }
.sidebar-more { display: grid; grid-template-rows: 0fr; opacity: 0; visibility: hidden; }
.sidebar-more > * { min-height: 0; }
.sidebar-more { overflow: hidden; }
.sidebar-more[data-open="true"] { grid-template-rows: 1fr; opacity: 1; visibility: visible; }
@media (prefers-reduced-motion: no-preference) { .sidebar-more { transition: grid-template-rows var(--transition-2), opacity var(--transition-2), visibility var(--transition-2); } }
.contacts-list { display: grid; grid-template-columns: 1fr; gap: 16px; }
.contact-item { min-width: 100%; display: flex; align-items: center; gap: 16px; }
.contact-info { min-width: 0; flex: 1; }
.contact-title { color: var(--light-gray-70); font-size: var(--fs-8); text-transform: uppercase; margin-bottom: 2px; }
.contact-info :where(.contact-link, address) { display: block; color: var(--white-2); font-size: var(--fs-7); font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contact-info a.contact-link:hover { color: var(--orange-yellow-crayola); }
.social-list { display: flex; justify-content: flex-start; align-items: center; gap: 15px; padding-bottom: 4px; padding-left: 7px; flex-wrap: wrap; }
.social-link { display: flex; color: var(--light-gray-70); }
.social-link:hover { color: var(--light-gray); }
.social-svg { width: 18px; height: 18px; }

.main-content { position: relative; }
.navbar { position: fixed; bottom: 0; left: 0; width: 100%; background: hsla(240, 1%, 17%, 0.75); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); border: 1px solid var(--jet); border-radius: 12px 12px 0 0; box-shadow: var(--shadow-2); z-index: 5; }
.navbar-list { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; padding: 0 10px; }
.navbar-link { color: var(--light-gray); font-size: var(--fs-8); padding: 20px 7px; }
@media (prefers-reduced-motion: no-preference) { .navbar-link, .filter-list button, .project-img::before, .project-item-icon-box, .tile, .clients-item { transition: all var(--transition-1); } }
.navbar-link:hover { color: var(--light-gray-70); }
.navbar-link[data-active="true"] { color: var(--orange-yellow-crayola); }

.about-text { color: var(--light-gray); font-size: var(--fs-6); font-weight: 300; line-height: 1.6; }
.about-text p { margin-bottom: 15px; }
.about-text strong { color: var(--white-2); font-weight: 500; }
.service { margin-bottom: 35px; }
.service-title, .testimonials-title, .clients-title, .skills-title, .form-title { margin-bottom: 20px; }
.service-list { display: grid; grid-template-columns: 1fr; gap: 20px; }
.service-item { position: relative; background: var(--border-gradient-onyx); padding: 20px; border-radius: 14px; box-shadow: var(--shadow-2); z-index: 1; text-align: center; }
.service-item::before { content: ""; position: absolute; inset: 1px; background: var(--bg-gradient-jet); border-radius: inherit; z-index: -1; }
.service-icon-box { display: flex; justify-content: center; margin-bottom: 10px; color: var(--orange-yellow-crayola); }
.service-icon-box svg { width: 40px; height: 40px; stroke-width: 1.4; }
.service-item-title { margin-bottom: 7px; text-transform: capitalize; }
.service-item-text { color: var(--light-gray); font-size: var(--fs-6); font-weight: 300; line-height: 1.6; }
.testimonials { margin-bottom: 30px; }
.testimonials-list { display: flex; justify-content: flex-start; align-items: stretch; gap: 15px; margin: 0 -15px; padding: 25px 15px 35px; overflow-x: auto; scroll-behavior: smooth; overscroll-behavior-inline: contain; scroll-snap-type: inline mandatory; }
.testimonials-item { min-width: 100%; scroll-snap-align: center; }
.testimonials-item .content-card { height: 100%; }
.testimonials-avatar-box { position: absolute; top: 0; left: 0; transform: translate(15px, -25px); display: grid; place-items: center; width: 60px; height: 60px; background: var(--bg-gradient-onyx); border-radius: 14px; box-shadow: var(--shadow-1); color: var(--orange-yellow-crayola); font-weight: 600; font-size: 20px; }
.testimonials-item-title { margin-bottom: 7px; display: flex; flex-direction: column; }
.testimonials-role { color: var(--light-gray-70); font-size: var(--fs-7); font-weight: 300; }
.testimonials-text { color: var(--light-gray); font-size: var(--fs-6); font-weight: 300; line-height: 1.6; }
.clients { margin-bottom: 15px; }
.clients-list { display: flex; justify-content: flex-start; align-items: center; gap: 15px; margin: 0 -15px; padding: 25px; padding-bottom: 25px; overflow-x: auto; scroll-behavior: smooth; scroll-snap-type: inline mandatory; scroll-padding-inline: 25px; }
.clients-item { min-width: 50%; scroll-snap-align: start; text-align: center; color: var(--light-gray-70); filter: grayscale(1); opacity: 0.75; font-size: 20px; line-height: 1.1; padding: 10px 4px; }
.clients-item:hover { opacity: 1; color: var(--white-2); }
.clients-item[data-style="0"] { font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; font-size: 17px; }
.clients-item[data-style="1"] { font-weight: 300; font-style: italic; letter-spacing: -0.02em; font-size: 22px; }
.clients-item[data-style="2"] { font-weight: 500; border: 1.5px solid currentColor; border-radius: 8px; padding: 8px 10px; font-size: 16px; text-transform: lowercase; }

.title-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 12px; }
.timeline { margin-bottom: 30px; }
.timeline .title-wrapper { display: flex; align-items: center; gap: 15px; margin-bottom: 25px; }
.timeline-list { font-size: var(--fs-6); margin-left: 45px; }
.timeline-item { position: relative; }
.timeline-item:not(:last-child) { margin-bottom: 20px; }
.timeline-item-title { font-size: var(--fs-6); line-height: 1.3; margin-bottom: 7px; }
.timeline-list .dates { display: block; color: var(--vegas-gold); font-weight: 400; line-height: 1.6; }
.timeline-sub { color: var(--light-gray-70); font-size: var(--fs-7); line-height: 1.5; margin-bottom: 4px; }
.timeline-item:not(:last-child)::before { content: ""; position: absolute; top: -25px; left: -30px; width: 1px; height: calc(100% + 50px); background: var(--jet); }
.timeline-item::after { content: ""; position: absolute; top: 5px; left: -33px; height: 6px; width: 6px; background: var(--text-gradient-yellow); border-radius: 50%; box-shadow: 0 0 0 4px var(--jet); }
.timeline-text { color: var(--light-gray); font-weight: 300; line-height: 1.6; }
.skills-list { padding: 20px; }
.skills-item:not(:last-child) { margin-bottom: 15px; }
.skill .title-wrapper { display: flex; align-items: center; gap: 5px; margin-bottom: 8px; }
.skill .title-wrapper data { color: var(--light-gray); font-size: var(--fs-7); font-weight: 300; }
.skill-progress-bg { background: var(--jet); width: 100%; height: 8px; border-radius: 10px; }
.skill-progress-fill { background: var(--text-gradient-yellow); height: 100%; border-radius: inherit; }
.skill-groups { display: grid; gap: 10px; }
.skills-item + .skill-groups, ul + .skill-groups { margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--jet); }
.skill-groups dt { color: var(--white-2); font-size: var(--fs-7); font-weight: 500; }
.skill-groups dd { color: var(--light-gray); font-size: var(--fs-7); font-weight: 300; line-height: 1.6; }

.filter-list { display: flex; flex-wrap: wrap; justify-content: flex-start; align-items: center; gap: 10px 25px; padding-left: 5px; margin-bottom: 25px; }
.filter-list button { color: var(--light-gray); font-size: var(--fs-5); text-transform: capitalize; }
.filter-list button:hover { color: var(--light-gray-70); }
.filter-list button[data-active="true"] { color: var(--orange-yellow-crayola); }
.project-list { display: grid; grid-template-columns: 1fr; gap: 30px; margin-bottom: 10px; }
.project-link { display: block; width: 100%; }
.project-img { position: relative; width: 100%; height: 200px; border-radius: 16px; overflow: hidden; margin-bottom: 15px; }
.project-img::before { content: ""; position: absolute; inset: 0; background: transparent; z-index: 1; }
a.project-link:hover .project-img::before { background: hsla(0, 0%, 0%, 0.5); }
.project-item-icon-box { --scale: 0.8; display: flex; background: var(--jet); color: var(--orange-yellow-crayola); position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(var(--scale)); padding: 18px; border-radius: 12px; opacity: 0; z-index: 2; }
.project-item-icon-box svg { width: 20px; height: 20px; }
a.project-link:hover .project-item-icon-box { --scale: 1; opacity: 1; }
.tile { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 6px; padding: 18px; background: radial-gradient(circle at 85% 12%, hsla(45, 100%, 72%, 0.28), transparent 46%), linear-gradient(hsla(0, 0%, 100%, 0.035) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(90deg, hsla(0, 0%, 100%, 0.035) 1px, transparent 1px) 0 0 / 20px 20px, var(--bg-gradient-jet); border: 1px solid var(--jet); border-radius: inherit; }
a.project-link:hover .tile { transform: scale(1.1); }
.tile-mark { font-size: 44px; font-weight: 600; line-height: 1; letter-spacing: -0.03em; background: var(--text-gradient-yellow); -webkit-background-clip: text; background-clip: text; color: transparent; }
.tile-line { color: var(--light-gray-70); font-size: var(--fs-7); font-weight: 300; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.project-title, .project-category { margin-left: 10px; }
.project-title { color: var(--white-2); font-size: var(--fs-5); font-weight: 400; line-height: 1.3; }
.project-category { color: var(--light-gray-70); font-size: var(--fs-6); font-weight: 300; }

.blog-posts-list { display: grid; grid-template-columns: 1fr; gap: 20px; margin-bottom: 10px; }
.blog-link { position: relative; display: block; background: var(--border-gradient-onyx); height: 100%; box-shadow: var(--shadow-4); border-radius: 16px; z-index: 1; }
.blog-link::before { content: ""; position: absolute; inset: 1px; border-radius: inherit; background: var(--eerie-black-1); z-index: -1; }
.blog-banner-box { position: relative; width: 100%; height: 160px; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px; background: var(--bg-gradient-yellow-2); }
.banner-year { font-size: 52px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; background: var(--text-gradient-yellow); -webkit-background-clip: text; background-clip: text; color: transparent; }
.banner-kind { color: var(--light-gray-70); font-size: var(--fs-8); text-transform: uppercase; letter-spacing: 0.2em; }
@media (prefers-reduced-motion: no-preference) { .banner-year { transition: transform var(--transition-1); } }
a.blog-link:hover .banner-year { transform: scale(1.1); }
.blog-content { padding: 15px; }
.blog-meta { display: flex; justify-content: flex-start; align-items: center; gap: 7px; margin-bottom: 10px; color: var(--light-gray-70); font-size: var(--fs-6); font-weight: 300; }
.blog-meta .dot { background: var(--light-gray-70); width: 4px; height: 4px; border-radius: 4px; }
.blog-item-title { margin-bottom: 10px; line-height: 1.3; }
a.blog-link:hover .blog-item-title { color: var(--orange-yellow-crayola); }
.blog-text { color: var(--light-gray); font-size: var(--fs-6); font-weight: 300; line-height: 1.6; }

.mapbox { position: relative; height: 250px; width: 100%; border-radius: 16px; margin-bottom: 30px; border: 1px solid var(--jet); overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; text-align: center; padding: 20px; background: radial-gradient(ellipse at 50% 45%, hsla(45, 100%, 72%, 0.12), transparent 60%), var(--eerie-black-1); }
.map-grid { position: absolute; inset: 0; background: radial-gradient(hsla(0, 0%, 84%, 0.16) 1px, transparent 1.5px) 0 0 / 14px 14px; -webkit-mask: radial-gradient(ellipse at 50% 50%, #000, transparent 75%); mask: radial-gradient(ellipse at 50% 50%, #000, transparent 75%); }
.map-pin { position: relative; display: flex; color: var(--orange-yellow-crayola); filter: drop-shadow(0 6px 10px hsla(45, 100%, 50%, 0.35)); }
.map-pin svg { width: 40px; height: 40px; stroke-width: 1.6; }
.map-place { position: relative; color: var(--white-2); font-size: var(--fs-2); font-weight: 500; }
.map-note { position: relative; color: var(--light-gray-70); font-size: var(--fs-6); font-weight: 300; }
.contact-form { margin-bottom: 10px; }
.form-rows { display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 25px; }
.form-input { display: flex; align-items: center; gap: 12px; color: var(--white-2); font-size: var(--fs-6); font-weight: 400; padding: 13px 20px; border: 1px solid var(--jet); border-radius: 14px; overflow-wrap: anywhere; }
.form-input svg { flex: none; width: 18px; height: 18px; color: var(--orange-yellow-crayola); }
.form-input:hover { border-color: var(--orange-yellow-crayola); }
.form-btn { position: relative; width: 100%; background: var(--border-gradient-onyx); color: var(--orange-yellow-crayola); display: flex; justify-content: center; align-items: center; gap: 10px; padding: 13px 20px; border-radius: 14px; font-size: var(--fs-6); text-transform: capitalize; box-shadow: var(--shadow-1); z-index: 1; }
.form-btn::before { content: ""; position: absolute; inset: 1px; background: var(--bg-gradient-jet); border-radius: inherit; z-index: -1; }
.form-btn svg { width: 16px; height: 16px; }
.form-btn:hover { background: var(--bg-gradient-yellow-1); }
.form-btn:hover::before { background: var(--bg-gradient-yellow-2); }
.form-btn.small { width: max-content; padding: 9px 14px; font-size: var(--fs-7); }
.credit { color: var(--light-gray-70); padding-bottom: 96px; }

@container pf (min-width: 450px) {
  .clients-item { min-width: calc(33.33% - 10px); }
}
@container pf (min-width: 580px) {
  .main, .credit { --fs-1: 32px; --fs-2: 24px; --fs-3: 26px; --fs-4: 18px; --fs-6: 15px; --fs-7: 15px; --fs-8: 12px; }
  .sidebar, .page { width: 520px; margin-inline: auto; padding: 30px; }
  .article-title { font-weight: 600; padding-bottom: 15px; }
  .article-title::after { width: 40px; height: 5px; }
  .icon-box { width: 48px; height: 48px; border-radius: 12px; }
  .icon-box svg { width: 18px; height: 18px; }
  .main { margin-top: 60px; margin-bottom: 100px; }
  .sidebar { margin-bottom: 30px; }
  .sidebar-info { gap: 25px; }
  .avatar-box { width: 120px; height: 120px; }
  .avatar-box span { font-size: 44px; }
  .info-more-btn { top: -30px; right: -30px; padding: 10px 15px; }
  .info-more-btn span { display: block; }
  .navbar { border-radius: 20px 20px 0 0; }
  .navbar-list { gap: 20px; }
  .navbar-link { font-size: 14px; }
  .service-item { display: flex; justify-content: flex-start; align-items: flex-start; gap: 18px; padding: 30px; text-align: left; }
  .service-icon-box { margin-bottom: 0; margin-top: 5px; }
  .testimonials-list { gap: 30px; margin: 0 -30px; padding: 30px 30px 35px; }
  .content-card { padding: 30px; padding-top: 25px; }
  .testimonials-avatar-box { transform: translate(30px, -30px); width: 80px; height: 80px; border-radius: 20px; font-size: 26px; }
  .testimonials-item-title { margin-bottom: 10px; margin-left: 95px; }
  .clients-list { gap: 50px; margin: 0 -30px; padding: 45px; scroll-padding-inline: 45px; }
  .clients-item { min-width: calc(33.33% - 35px); }
  .timeline-list { margin-left: 65px; }
  .timeline-item:not(:last-child)::before { left: -40px; }
  .timeline-item::after { height: 8px; width: 8px; left: -43px; }
  .mapbox { height: 300px; border-radius: 18px; }
  .form-rows { gap: 30px; margin-bottom: 30px; }
  .form-btn { padding: 16px 20px; }
}
@container pf (min-width: 768px) {
  .sidebar, .page { width: 700px; }
  .contacts-list { grid-template-columns: 1fr 1fr; gap: 30px 15px; }
  .navbar-link { font-size: 15px; }
  .article-title { padding-bottom: 20px; }
  .project-list, .blog-posts-list, .form-rows { grid-template-columns: 1fr 1fr; }
  .form-btn:not(.small) { width: max-content; margin-left: auto; }
}
@container pf (min-width: 1024px) {
  .sidebar, .page { width: 950px; box-shadow: var(--shadow-5); }
  .main { margin-bottom: 60px; }
  .main-content { width: max-content; max-width: 100%; margin: auto; }
  .navbar { position: absolute; bottom: auto; top: 0; left: auto; right: 0; width: max-content; border-radius: 0 20px; padding: 0 20px; box-shadow: none; }
  .navbar-list { gap: 30px; padding: 0 20px; }
  .navbar-link { font-weight: 500; }
  .service-list { grid-template-columns: 1fr 1fr; gap: 20px 25px; }
  .testimonials-item { min-width: calc(50% - 15px); }
  .clients-item { min-width: calc(25% - 38px); }
  .project-list { grid-template-columns: repeat(3, 1fr); }
  .credit { padding-bottom: 40px; }
}
@container pf (min-width: 1250px) {
  .sidebar, .page { width: auto; }
  .page { min-height: 100%; }
  .main { max-width: 1200px; margin-inline: auto; display: flex; justify-content: center; align-items: stretch; gap: 25px; }
  .main-content { min-width: 75%; width: 75%; margin: 0; }
  .sidebar { position: sticky; top: 60px; max-height: max-content; height: 100%; margin-bottom: 0; padding-top: 60px; z-index: 1; }
  .sidebar-info { flex-direction: column; }
  .avatar-box { width: 150px; height: 150px; border-radius: 30px; }
  .avatar-box span { font-size: 56px; }
  .info-content .name { white-space: normal; text-align: center; }
  .info-content .title { margin: auto; }
  .info-more-btn { display: none; }
  .sidebar-more { opacity: 1; visibility: visible; grid-template-rows: 1fr; }
  .contacts-list { grid-template-columns: 1fr; }
}
@media print {
  .navbar, .info-more-btn { display: none; }
  .page[hidden] { display: block; }
  .sidebar-more { opacity: 1; visibility: visible; grid-template-rows: 1fr; }
}
`;

export const CARD_CSS = templateCss(".pf-card", css);
