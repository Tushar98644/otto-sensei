# Otto Sensei: design language

How every screen looks. This replaces the "Design direction" section of ARCHITECTURE.md; the rest of that file (stack, contracts, ownership, accessibility, no new packages) still applies. The owner picked three references: **Wispr Flow** (big Garamond headline with an italic second line on pale cream, tiny gray all-caps label, dark "live" pills), **Jack & Jill** (paper and stone surfaces, borderless white cards, black pills, a small ink character beside a first-person message) and **Tally** (loose ink doodles, one bright accent used only for tiny strokes).

**In one line: white paper, mint mist, forest-green actions, and Otto's violet pencil.** (Theme changed 2026-11-07 from cream + orange, which looked too close to Claude's brand.)

1. Depth comes from the shade of a surface, never from borders or shadows. Two physical things are the exception: keys (buttons) get an edge and a small shadow, and paper (resume thumbnails) rests with a soft one.
2. Ink and forest do the work. Violet is a pencil mark: at most two per screen.
3. Otto is the face of the product: he appears where the product does a job for you, doing that job. Never decoration without a job. (Owner's call, 2026-11-08; it replaces "Show the product, not the mascot".)
4. Otto is drawn, not stamped: thin sepia lines, flat fills, no sticker effects, no endless motion.
5. Plain words, short lines, no proof we don't have.

## 1. Color

Tokens live in `@theme` as 6-digit hex (tokens.test.ts only parses hex). oklch is for reference.

| Token | Hex | oklch | Use |
|---|---|---|---|
| `background` | `#fbfcfa` | | Paper (near-white, green hint): marketing pages, login. Also `themeColor` in layout.tsx |
| `surface` | `#ffffff` | 100% 0 0 | Cards, studio sheets, dialogs, product windows |
| `surface-muted` | `#eef3ef` | | Mist (called "stone" below): panels behind product moments, the studio and dashboard canvas, quiet pills |
| `surface-strong` | `#e1e9e3` | | Hover and pressed on the mist, toggle tracks, skeletons. Only `ink` or `muted` text on it |
| `border` | `#dbe4de` | | Hairline: list dividers, window bars, the header edge. Rare |
| `border-strong` | `#7b8a82` | | Form-field outlines and resume-line rules (3:1) |
| `ink` | `#12241d` | | Text, doodles, focus ring |
| `primary` / `primary-hover` | `#0e3b2e` / `#165140` | | Forest: primary pills, the Pro mark, the current step, progress bars, avatars. White text only |
| `lavender` | `#ebe5ff` | | Live pills (ink text, violet dot) |
| `primary-top` / `primary-hover-top` / `primary-edge` | `#164a3a` / `#1d5c48` / `#072319` | | The forest key's top tone, its hover top tone and its 1px edge (section 4, Buttons) |
| `fail-top` | `#c22d20` | | The danger key's top tone |
| `border-control` / `-hover` | `#c9d4cd` / `#aebdb4` | | Hairline of white keys and the studio's resume switcher |
| `surface-hover` | `#f5f8f6` | | Hover fill of white keys |
| `muted` | `#475850` | | Secondary text |
| `subtle` | `#5b6b63` | | Eyebrows, meta lines, placeholders |
| `accent` | `#6d4fe8` | | Otto's violet pencil. Strokes and dots only. Violet, not green, so it never reads as a pass |
| `highlight` | `#e6dcff` | | Lavender highlighter marks and `::selection` |
| `pass` / `-soft` / `-ink` | `#1e7b46` / `#e9f5ed` / `#17613a` | unchanged | Status |
| `warn` / `-soft` / `-ink` | `#9a6700` / `#fbf3dd` / `#7a5100` | unchanged | Status |
| `fail` / `-soft` / `-ink` | `#b42318` / `#fdeeec` / `#9b1c13` | unchanged | Status |
| `otter` / `otter-light` | `#7a5135` / `#f3e4cf` | unchanged | Must equal `fur` / `cream` in mascot/palette.ts |

`accent-hover`, `accent-soft` and `accent-ink` stay deleted: the accent never carries text or fills.

Shadows: `--shadow-card` for product windows. `--shadow-float` for dialogs, popovers, menus, toasts, the sticky step bar and the tilted resume card. `--shadow-control` (white keys, the selected segment of a toggle), `--shadow-key` plus `--inset-shadow-key` (forest and red keys; `--inset-shadow-pressed` while pressed), and `--shadow-page` / `--shadow-page-lift` (a resume sheet resting, and lifted on hover). Fonts `--font-page-sans|serif|mono` are the PDF's standard fonts, for thumbnails only.

**Accent budget: at most 2 violet marks visible on any screen.** The only allowed uses: (1) the squiggle under one word of the hero headline, (2) the loose circle around the "0" in the download moment, (3) the 6px dot in a live pill, (4) Otto's line head in an Otto note (`OttoMark tone="line"`). Never violet: text, links, buttons, icons, checkmarks, borders, focus rings, backgrounds, selected states.

**Status stays quiet.** Always an icon plus a word, never color alone. Problems get a soft fill; passes get none, so they recede. Never tint a whole card or row with a status color. Alerts keep their soft fill but lose their border.

**Contrast (enforced by tokens.test.ts):** ink 7:1+ on paper, white, mist and mist-strong; muted and subtle 4.5:1+ on paper, white and mist (subtle 4.55:1 on mist-strong, so avoid it there); white on forest 12.5:1; ink on lavender and highlight 4.5:1+; violet dot on lavender 4.37:1; accent and border-strong 3:1+ on paper, white and mist.

## 2. Type

```ts
// layout.tsx: Inter stays; EB Garamond replaces Bricolage Grotesque.
import { EB_Garamond, Inter } from "next/font/google";
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
// Regular weight plus a true italic, for the one phrase per heading that gets a voice.
const garamond = EB_Garamond({ subsets: ["latin"], style: ["normal", "italic"], display: "swap", variable: "--font-garamond" });
```

In globals.css: `--font-display: var(--font-garamond), ui-serif, Georgia, serif;`. `--font-sans` is unchanged, and mono stays the system stack (parsed text only). Why EB Garamond: it is a free Garamond with a real italic, the closest match to Wispr. Instrument Serif is skipped on purpose because it is now the stock font of AI-built landing pages. Newsreader is the fallback if Garamond ever feels too bookish.

| Role | Classes | Phone → desktop |
|---|---|---|
| Display (hero h1) | `font-display font-normal tracking-tight text-5xl/none sm:text-7xl/none lg:text-8xl/none` | 48 → 72 → 96px, line-height 1, -0.025em |
| Section title (h2) | `font-display font-normal tracking-tight text-4xl/10 sm:text-5xl/13` | 36/40 → 48/52px |
| Small display | `font-display font-normal text-3xl/9 sm:text-4xl/10` | 30 → 36px: plan names, "won't do" rows, big numbers |
| FAQ question | `font-display font-normal text-2xl/8` | 24px |
| Wordmark | `font-display font-medium text-2xl/none tracking-tight` | 24px, the only weight-500 serif |
| Lead | `text-lg/7 sm:text-xl/8 text-muted` | 18 → 20px |
| h3 | `text-lg/7 font-medium tracking-tight` (Inter) | 18px |
| h4, UI titles | `text-base/6 font-semibold`; dialog title `text-lg/7 font-semibold` | 16 / 18px |
| Body | marketing `text-base/7`, UI `text-sm/6` | 16 / 14px (fields stay 16px on phones) |
| Eyebrow (tiny gray caps) | `text-xs/4 font-medium uppercase tracking-widest text-subtle` | 12px, 0.1em |
| Meta | `text-sm/5 text-subtle`; dense rows `text-xs/5` | 14 / 12px |
| Mono | `font-mono text-xs/6 sm:text-sm/7` | 12 → 14px |

- Serif only for the roles above (all 24px or larger), always weight 400 except the wordmark; never in buttons, fields, eyebrows, chips or body text. Serif numbers get `lining-nums tabular-nums` so prices never use old-style figures.
- Base layer: `h1, h2` get the serif and `font-weight: 400`; `h3, h4` stay Inter. Drop `font-display` from CardTitle, EmptyState, SectionCard, EntryShell, Dialog, the account pages and prose-otto's h3/h4.
- Italic: display serif only, one phrase per heading, at most 3 on a page (the hero's second line counts). Keep `text-wrap: balance` on h1/h2, `text-pretty` on paragraphs; sentence case everywhere, capitals only from the eyebrow style.

## 3. Space and layout

- Spacing: gaps, margins and section or card padding use Tailwind steps 1, 2, 3, 4, 6, 8, 10, 12, 16, 24, 32 (4px each). Inside controls (buttons, chips, fields) any step is fine, half steps included.
- Radii: pills, chips and avatars `rounded-full`; fields `rounded-xl`; cards and sheets `rounded-2xl`; panels and dialogs `rounded-3xl`.
- Widths: `container-page` (72rem) for the page; hero copy `max-w-3xl` centered; section headers `max-w-2xl`; paragraphs `max-w-prose`; studio Upload, Fix and Tailor `max-w-3xl`; Recruiter view and Download use the full container.
- Rhythm: sections `py-24 sm:py-32`, header to content `mt-12 sm:mt-16`. One paper background for the whole page: no white bands, no `tone="raised"`, no `border-y` between sections.
- Alignment: the hero and the final CTA are centered; every other section is left-aligned (`SectionHeader` defaults to `align="start"`). No centered paragraph runs past 2 lines.
- Captions under product moments: `mt-6 grid gap-2 sm:grid-cols-2`, title (`text-lg font-medium`) on the left, `text-muted` text on the right.

## 4. Components

### Buttons (`ui/button.tsx`)

**Keys, not pills.** Buttons are rounded rectangles with the fields' radius (`rounded-xl`, `rounded-lg` at `sm`), so a search box and the button beside it line up, and pills stay free to mean status (badges, chips, live pills). Every variant keeps a 1px border (transparent where none is drawn), so all of them are the same height. Studied from Linear, Geist, Stripe and Raycast: tasteful depth, no gloss, no glow.

| Variant | Look | Use |
|---|---|---|
| `primary` | Forest, `bg-linear-to-b from-primary-top to-primary`, `border-primary-edge`, `shadow-key inset-shadow-key` (a hairline of light inside the top edge). Hover: `from-primary-hover-top to-primary-hover`. Press: `translate-y-px`, flat fill, `shadow-none inset-shadow-pressed` | The main action of a view, one per area |
| `secondary` (= `outline`) | `bg-surface border-border-control shadow-control`; hover `bg-surface-hover border-border-control-hover`; press `translate-y-px bg-surface-muted` | A second action, on white and on the mist alike |
| `ghost` | `border-transparent`, hover `bg-ink/6`, press `bg-ink/10`, `aria-expanded:bg-ink/6` | Row tools, toolbars, menu triggers, "Keep it" |
| `danger` | The forest key's build in red (`from-fail-top to-fail`, `border-fail-ink`) | Delete, after a confirm |
| `link` | Ink text, `decoration-border-strong`, no border | Inline links |

The tone shift is the only gradient in the app and stays one step wide: any wider turns glossy. Sizes: `sm` `h-9 px-3` (44px on touch screens), `md` `h-11 px-4`, `lg` `h-12 px-5` with `size-5` icons, `icon` `size-11`, `icon-sm` `size-9` (44px on touch). Disabled forest keys go flat (`bg-surface-strong text-muted`, no edge or shadow) so they never look available; the others fade to 45%. Loading: a spinner takes the icon's place, the label stays, the key keeps its color (`aria-busy` skips the disabled look). Focus everywhere: the global 2px ink outline, offset 2px. Icons: lucide, `size-4` (`size-5` at `lg`), `strokeWidth` 1.75 from the base layer, `text-muted` beside ink text. A trailing arrow only on buttons that take you somewhere. Icon-only buttons always get an `aria-label`.

### Menus (`ui/menu.tsx`)

A WAI-ARIA menu button on the native popover (top layer, light dismiss, focus back to the trigger). Panel `rounded-xl bg-surface p-1.5 shadow-float ring-1 ring-ink/6`, `min-w-56`; items `min-h-10 rounded-lg px-2.5 text-sm`, a `size-4 text-muted` icon, an optional gray description line, hover `bg-ink/5`, keyboard focus an inset 2px ink outline. Arrow keys, Home and End move; ArrowDown/Up on the trigger opens at the first/last item; Tab closes and moves on. Separators `-mx-1.5 my-1.5 h-px bg-border`. Danger items `text-fail-ink` with a `text-fail` icon and `hover:bg-fail-soft`. Radio items (`checked`) show an ink check on the right. It opens upward when there's no room below. Use it for "New resume" (Upload a file, Start from scratch, Try a sample: the one "new" control on every page), a card's overflow menu, sort order and the sidebar's account row. The studio's `Popover` gets the same panel.

### Surfaces

| Name | Classes | Where |
|---|---|---|
| Panel | `rounded-3xl bg-surface-muted p-3 sm:p-6 lg:p-10` | Behind product moments, pricing plans, account, the final CTA |
| Card | `rounded-2xl bg-surface p-4 sm:p-6`, no border, no shadow | Only on a panel or the stone canvas |
| Sheet | `rounded-2xl bg-surface p-4 sm:p-8` | Studio sections |
| Window | Card plus a bar `flex h-10 items-center gap-2 border-b border-border px-4` (three `size-2.5 rounded-full bg-surface-strong` dots, file name `text-xs text-subtle`, meta on the right), plus `shadow-card` | Product mock-ups |
| Row list | `divide-y divide-border border-y border-border` | FAQ, checks, plan features, recent resumes, start options |

White never sits straight on paper (1.07:1 is invisible): put it on a panel, or use a row list. Never put a card inside a card. `ui/card.tsx` drops its border and shadow; `CardTitle` becomes Inter `text-lg/7 font-medium`.

### Fields

- Field (`controlClasses`): `h-11 rounded-xl border border-border-strong bg-surface px-3.5 placeholder:text-subtle focus-visible:border-ink focus-visible:ring-3 focus-visible:ring-ink/15 aria-invalid:border-fail aria-invalid:focus-visible:ring-fail/15`.
- Line field (new optional `Textarea variant="line"`, resume lines only): `rounded-none border-0 border-b border-border-strong bg-transparent px-0 py-2.5 focus-visible:border-ink focus-visible:shadow-[inset_0_-1px_0_var(--color-ink)]`. The inset shadow thickens the rule to 2px on focus without moving the text (no utility does this).
- Checkboxes and radios `accent-ink`. Segmented toggle (tabs, page size, format picker, library filters, phone tabs): track `rounded-xl bg-surface-muted p-1` (`bg-surface-strong` on the mist canvas), items `rounded-lg h-9`, selected `bg-surface text-ink shadow-control ring-1 ring-ink/5`.
- Search field: an `Input` with a `Search` icon at `left-3.5`, `pl-10`, our own labelled clear button (the browser's is hidden), Escape clears.
- Dropzone: `rounded-2xl border-2 border-dashed border-border-strong bg-surface`, an ink `FileUp` icon with no tile; while dragging `border-ink bg-surface-muted`.

### Badges and status chips (`ui/badge.tsx`, `ui/status.tsx`)

Base: `inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium`, with **no ring**.

| Variant | Look |
|---|---|
| `neutral` | `bg-surface-muted text-muted` |
| `pass` | No fill: `text-muted` with `CircleCheck` in `text-pass` |
| `warn` | `bg-warn-soft text-warn-ink`, triangle in `text-warn` |
| `fail` | `bg-fail-soft text-fail-ink`, `CircleX` in `text-fail` |
| `ink` (replaces `accent`) | `bg-ink text-white`: the Pro plan mark |

### Folder card (`ui/folder-card.tsx`)

Everything in the signed-in app is a document, so cards are folders: a labelled tab (`h-8 rounded-t-xl px-3.5`, eyebrow type) on a white body with a square top-left corner. Tab tones: `plain` (white tab, `text-subtle`), `lavender` (ink on lavender: the **Tailored** mark, and "Start here"), `forest` (white on forest: the format in use). Used for document cards, action cards, "At a glance", the format gallery and empty starts. On the mist canvas only.

### Document card (`dashboard/resume-card.tsx`, `resume-grid.tsx`)

```text
 [ UPLOADED ]                       <- tab: where it came from (Uploaded, Tailored, Sample, From scratch)
 +----------------------------------+
 | +- well: bg-surface-muted -----+ |  <- h-44 sm:h-48, rounded-xl, inside p-2
 | |    +------------------+      | |
 | |    | ResumeThumbnail  |      | |  <- px-8 pt-6, shadow-page; lifts 4px with shadow-page-lift on hover
 | +----+------------------+------+ |     (the well's edge cuts the sheet, like paper in a folder)
 |  Title (text-base font-medium)   |
 |  Modern · Edited 3 hours ago     |  <- text-sm text-subtle
 |  [briefcase] Lead Designer · X   |  <- tailored only, when the title doesn't already say it
 |  ↳ Made from Amara Okafor        |  <- tailored only: jumps to (and focuses) the base card
 |  (! 1 line to improve) (1 tailored copy)
 |  [Open]                     [...] |  <- primary sm + ghost icon-sm menu, pinned to the bottom
 +----------------------------------+
```

Grid `gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3`, the same on the home page (newest 3 by last edit) and in the library. The overflow menu holds Tailor to a job, Download PDF, Rename (dialog, `cleanTitle`), Duplicate (`duplicateResume`: "<title> (copy)" on top, the open resume stays open) and Delete (the confirm dialog). The sheet opens the resume for the mouse; keyboards use Open.

### Resume thumbnail (`dashboard/resume-thumbnail.tsx`, `stand-in.ts`)

Page 1 as a tiny HTML page: the PDF's own model (`buildPdfModel`) and its own theme objects (`components/pdf/templates/*.ts`, translated by `pdfStyleToCss`), laid out at 1px per point on a 612px Letter page and scaled by the `page-miniature` utility (`scale: tan(atan2(100cqw, 612px))` inside an `@container`, `aspect-17/22`). **Resume cards draw the resume itself**, exactly as page 1 of the PDF prints it (hidden items left out), so people recognise each version at a glance. Decorative art (the home page action scenes) passes `standIn` instead: the sample person (Jordan Ellis) in the resume's own layout, because those scenes end up in screenshots. An empty resume gets faint placeholder bars. Decorative (`aria-hidden`).

### Library (`dashboard/resumes-page.tsx`, `library-toolbar.tsx`, `library.ts`)

Header: h1 "Resumes", a fact line ("7 resumes, 1 tailored to a job. Kept in this browser and backed up to your account."), the New resume menu on the right. Toolbar (one row from `xl`, stacked below): filter segments All, Uploaded, Tailored, Samples, From scratch with counts (`aria-pressed`; empty sources hide unless picked; on phones the strip scrolls inside itself), then search ("Search by name or company": title, person, companies, the tailored job; every word, any order, accents ignored) and a sort menu (Last edited, Name). A polite live region says "3 resumes shown of 7". States: loading (skeleton folders), empty (full-body Otto reading, "Your resumes will live here", Upload / Start from scratch / Try a sample), no results (an OttoNote with "Show all resumes").

### Sidebar and phone bar (`dashboard/sidebar.tsx`, `mobile-bar.tsx`)

`w-60`, on the mist with a hairline right edge: serif wordmark, the New resume menu full width, nav items `h-9 rounded-lg` (current: white, `shadow-control ring-1 ring-ink/5`, ink icon; Resumes shows its count), then at the bottom the plan slip (white, `ring-1 ring-ink/5`: PLAN eyebrow, plan badge, two compact meters, a secondary "Upgrade to Pro") and the account row (avatar, email, a chevron; it opens the account menu upward). Phones: a 56px bar with the wordmark and avatar menu, then the sections as one segmented strip.

### Dialogs (`ui/dialog.tsx`)

Panel `rounded-3xl bg-surface p-6 sm:p-8 shadow-float` with no border. Title Inter `text-lg/7 font-semibold`, description `text-sm/6 text-muted`, backdrop ink at 40%. The `illustration` slot takes an `OttoNote`, never a full-body Otto. The one exception in a dialog's body is the small working Otto (`OttoWorking size="sm"`, 64px) while the dialog waits on the AI; the dialog keeps its own layout around him. Footer: the main action last (primary), the rest ghost. Toasts and popovers get the same no-border, `shadow-float` treatment. Every toast leads with Otto's color head in the same round avatar as a small Otto note (`size-7`, head `size-5`); a success or error icon (`size-4`) sits beside the title, so status is still an icon plus a word.

### Otto note (new `mascot/otto-note.tsx`)

Jack & Jill's agent message: a small drawn head, a gray meta line, a first-person message. No bubble, border, tail or fill.

```tsx
<div className="flex items-center gap-3">  {/* centred on name + message (owner, 2026-11-08); actions go below, indented pl-12 (pl-10 small) */}
  <span className="flex size-9 items-center justify-center rounded-full bg-surface ring-1 ring-border"><OttoMark className="size-7" /></span>  {/* changed 2026-11-07: owner found the line sketch "not proper"; notes use the color head in an avatar */}
  <div className="min-w-0">
    <p className="text-sm/5 text-subtle"><span className="font-medium text-ink">Otto</span> · read 1 page, 97 words</p>
    <p className="mt-1 text-base/7 text-pretty text-ink">Nothing's broken. 1 small thing could be better.</p>
  </div>
</div>
```

Props: `message`, `meta?` (facts only: counts, file type, pages; leave it out when there are none), `children?` (actions, `mt-3 flex flex-wrap gap-2`), `live?` (polite live region on the message), `size?: "sm" | "md"` (`sm` = `size-6` head and a `text-sm/6` message). It replaces `OttoSays` in every studio step, the fix, sign-in and upgrade dialogs, and the line-fixer moment. `SpeechBubble` loses its border and tail (`rounded-2xl bg-surface-muted px-4 py-3`) and is kept only for the user's reply in that moment.

### Live pill (new `ui/live-pill.tsx`)

Wispr's "Saved name" pill: a change shown where it happens.
`inline-flex h-8 items-center gap-2 rounded-full bg-ink px-3.5 text-sm font-medium text-white animate-pop`, led by a `size-1.5 rounded-full bg-accent` dot, or a white `Spinner` (`size-3.5`) while work runs. `role="status"`. At most 4 words naming what changed: "Reading your file", "Skills mixed into jobs", "Line updated", "Added 3 keywords", "0 problems now", "Copied". Pinned to the thing that changed (a window corner, the end of the changed line), never a screen corner (toasts keep that job). One at a time; finished states fade after 2.5s. Never for errors: use `Alert`.

### Highlighter (new `@utility highlighter` in globals.css)

```css
/* A marker stroke over most of the line height, so it reads as a pen mark, not a box. */
@utility highlighter {
  background-color: transparent;
  background-image: linear-gradient(transparent 15%, var(--color-highlight) 15%, var(--color-highlight) 90%, transparent 90%);
  background-repeat: no-repeat;
  background-size: 100% 100%;
  box-decoration-break: clone;
  border-radius: 0.125rem;
  padding-inline: 0.125rem;
}
```

Use it as `<mark className="highlighter text-ink">`. It marks exactly what the software got wrong or what just changed, at most 3 per window, never on headings. A caption or a live pill names the problem; the color never carries meaning on its own. Optional paint-on: `animate-highlight-in` (`from { background-size: 0% 100% }`, 300ms, once).

### Doodles (new `src/components/doodles/`, owned by the mascot task)

Tally-style ink sketches. Inline SVG, `aria-hidden`, `fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"`, ink at 1.75px unless noted. These starting paths were rendered and checked; redraw any that look mechanical, and never generate them with AI.

```text
Squiggle     viewBox 0 0 218 14, kept in shape (never stretched), 2.5px, text-accent. Nine humps of
             uneven height that lean right and narrow toward the end, then a stroke that overshoots
             and hooks back; the path lives in doodles.tsx. A perfect sine reads as CSS wavy text.
Arrow        viewBox 0 0 96 64
             M8 12C34 6 62 18 78 46M65 41C70 43 74 45 78 47C79 42 80 37 81 33
Bubble       viewBox 0 0 72 56, filled with the surface under it, inner mark "?" | "!" | three short lines
             M18 40C7 34 6 18 19 10C31 3 51 4 61 13C70 22 66 35 54 41C45 46 33 46 25 43C21 47 16 50 10 52C13 48 15 45 18 40Z
             "?": M33 21C33 15 43 15 43 21C43 26 38 26 38 31M38 36.5V37
Dashes       viewBox 0 0 32 32    M6 22L2 26M14 14L12 4M22 20L30 16
LooseCircle  viewBox 0 0 120 48, 2px, text-accent
             M62 6C30 4 6 12 6 25C6 38 34 44 64 43C94 42 115 33 113 21C111 10 86 4 58 7C50 8 44 10 40 12
```

Budget: the hero gets at most 3 (the squiggle plus 2 ink doodles), any other marketing section at most 1, and the studio, dialogs, account and legal pages none. Never over text or controls. Hidden on phones (`max-sm:hidden`) except the squiggle. Optional draw-on: `pathLength={1} strokeDasharray={1}` plus `animate-draw` (`from { stroke-dashoffset: 1 }`, 700ms, once); drop it if Safari draws it wrong together with `non-scaling-stroke`.

## 5. Otto

**Drawing** (`mascot/palette.ts`, `otto-body.tsx`, `otto-face.tsx`):

| Part | Now | New |
|---|---|---|
| Outline (`line`, `OUTLINE.strokeWidth`) | `#2F1C12`, 3 | `#3E2A1E` (sepia ink), 2.25 |
| Limb outline (`drawLimb`) | width + 6 | width + 4.5 |
| Glasses | `#2A1B14`, 2.6, white lens at 20% | `line` color, 2, no lens fill |
| Lens glints, nose shine, second eye shine | on | removed |
| Blush, ground shadow (`drawShadow`) | on | removed |
| Whiskers / tuft | 1.5 at 70% / 2.6 | 1.25 at 50% / 2 |
| Feet | `furShade` plus outline | `furShade`, no outline |

Fills stay flat (`fur`, `cream`, `furShade`). No gradients, white keylines, drop shadows or halos. Where two shapes meet (ear into head, arm into body), let one line stop short instead of outlining both: that small gap is what makes him look drawn.

| Form | Size | Where | Limit |
|---|---|---|---|
| Full body `Otto` | 96-160px | Empty states, success moments (export check passed, Pro active), 404, final CTA, OG image, apple icon | 1 per screen; never in step headers or dialogs |
| Lively `Otto` | 100px | The three action cards on the dashboard home, one pose each (read, point, think), on a mist stage with the paper he works on | Dashboard home only |
| Working Otto (`mascot/otto-working.tsx`, new 2026-11-08) | 96px in a page (`md`), 64px in dialogs and small panels (`sm`) | Every AI wait, in place of the bare spinner or skeleton, with one plain status line ("Otto is reading the job post."): reading an upload (dropzone, stacked), reading a job link, tailoring, the line fix and its "Update suggestion", writing a line for a requirement, summary help, cover letter, answer, interview prep, Build with Otto draft, GitHub lookup and draft. Pose by job: `read` (import, job, tailor), `think` (fix, line, summary, letter, answer, draft), `point` (interview prep, GitHub). Lively, `aria-hidden`; the line is a `role="status"` region that is in the page from the start and filled when he appears | Appears only after 400ms, so quick answers never flash him; his box is held meanwhile so nothing jumps. Counts as the screen's full-body Otto only while he is visible; one wait at a time |
| Loading screen (`mascot/otto-loading-screen.tsx`, new 2026-11-08) | 128px phone, 144px desktop, `read`, lively | Full viewport on the paper background (`fixed inset-0 z-50 bg-background`): Otto, "Please wait, we're setting things up" in small display serif, and a muted line saying what is really happening ("Opening your dashboard", "Loading your resumes", "Signing you in", "Setting up your Pro plan"). For app-level moments only: `dashboard/loading.tsx` and `studio/loading.tsx`, the first load of the dashboard and the studio (this browser's copy plus the first read of the account's resumes, capped at 6s), the sign-in return on /login, and the checkout return while the plan activates (the first 10s of plan checks; after that the page's "Finishing your upgrade" note takes over). One screen serves every request (`LoadingScreenHost` in the root layout), so a hand-off from /login to the dashboard never blinks | Shows after 400ms, stays at least 600ms, then fades out over 250ms (`motion-safe` only; reduced motion just disappears). No progress bar or percentages. While it covers the app, the app root is `aria-busy` and `inert`, and first-run tours wait. Waits inside a page keep their skeletons or the working Otto |
| How it works steps (landing, new 2026-11-08) | 64px, lively, each on its own `delay` | Beside each step's name in its caption: Upload `read`, Recruiter view `point`, Fix lines `think`, Tailor `read`, Free PDF `cheer` | One per step; the steps sit at least a panel apart |
| Pricing (new 2026-11-08) | 96px `point`, blink only | Beside the Monthly / Yearly / Weekly switch, pointing at it (hidden on phones, where there's no room beside it), plus a small Otto note under the plans: "Plans change how much I help each month, never what I will or won't do." | The page's one full-body Otto |
| Success cheer (`mascot/otto-cheer.tsx`, new 2026-11-08) | 96px `cheer`, `animate-pop` once, then still (no blink) | Right after: a tailored copy is made (the Download step it opens, beside the step's note); interview prep is made (beside the page title); a job is marked applied with the card's one-click shortcut (in that card's picture well, library only: the home page's action cards already have Otto at work) | One per screen: only the latest marked card cheers, and Undo takes him away |
| Otto notes, new 2026-11-08 | `OttoNote` | Formats page (a fact-only tip: "Not sure? Classic suits any job. Compact fits a long career on one page."); near a usage limit (80% or more of a meter): the sidebar's plan slip (its three meters, above the existing upgrade button; not on the account page) and the account usage card (every meter, with the existing "Upgrade to" link): "Uh-oh, 8 of 10 tailored versions used. They reset on the 1st." | Words follow the worried pose; the head itself doesn't change |
| `OttoMark` in a toast (new 2026-11-08) | `size-5` head in a `size-7` round avatar | The start of every toast, undo toasts included | |
| `OttoMark` on the share page (new 2026-11-08) | 24px | The public resume's quiet footer: "Made with Otto Sensei", one link to the home page | |
| Email head (new 2026-11-08) | `public/email/otto-head.png`, 96px drawn, shown at 48px | Top of every email: the follow-up reminder (`OTTO_HEAD_EMAIL_PATH` on the app's base URL) and the sign-in code (SETUP.md 6e, `{{ .SiteURL }}`). A PNG because email apps don't show inline SVG; alt "Otto". Rendered once from the color `OttoMark` in the note avatar (white disc, `border` ring); render it again if the head ever changes | |
| `peek` pose (new) | 64px phone, 104px desktop | Hero: head and paws over the top edge of the parsed-text window | Hero only |
| `OttoMark tone="color"` | 28-32px | Logo, favicon (`icon.svg` takes the new `line` color) | Next to the wordmark |
| `OttoMark tone="line"` | 20-24px, `text-ink` | Inside buttons only ("Fix with Otto") | Otto notes use the color head in a round avatar instead (2026-11-07) |

**Otter, not bear.** A round head with round, high ears reads as a teddy bear at 28-64px. Otto's head is wide and flat (about 1.5 times as wide as tall, widest low at the cheeks), his ears are small, low on the sides of the head and set half outside it, and a big two-lobed muzzle pad reaches down to the chin. The glasses' arms run back toward the ears. Reading eyes are round pupils low in the lenses, with no lids: half-closed lids read as sleepy or annoyed. Line gaps: the head line opens at the crown under the tuft, each ear's outline stops short before it meets the head line, and arms that hang along the body lose their inner edge near the shoulder (`drawLimb(..., fromBody)`), while raised arms keep the full outline. The color head (`OttoMark`, `icon.svg`) and the line head follow the same build.

`peek` draws the head, glasses and both paws (`drawPaw`), with reading eyes looking down; no body, no tail. Add it to `OTTO_POSES`; `drawOtto` skips the tail and body for it. The line head uses a 64-unit box, strokes 2.75 (3.5 at 24px or less), whiskers 1.5 at 70%, and was sketch-checked at 24-128px:

```text
head     M15.5 22.8C20.5 20.2 26 19 32.5 19C47.5 19 59.5 26 59.5 38C59.5 50 47.5 57 32 57C16.5 57 4.5 50 4.5 38.5C4.5 35.5 5.2 33 6.5 31
ears     M4.6 28C2.6 25.2 3.8 21 7.6 20.5C10 20.2 11.8 21 12.8 22.3  M51.5 22.4C52.6 20.6 54.8 19.7 57 20.3C60.4 21.2 61.6 24.9 60.6 27.8
glasses  circles at (21,34) and (43,34), r 7; bridge M28 33.5Q32 31.5 36 33.5
pad      M32 45C28 41.5 19 42 18.5 47.5C18 52.5 25.5 54 32 50.5C38.5 54 46 52.5 45.5 47.5C45 42 36 41.5 32 45
whiskers M18.5 46.5L9.5 45M19 50L10.5 52.5M45.5 46.5L54.5 45M45 50L53.5 52.5
filled   eyes at (21,34.8) and (43,34.8), r 2.1; nose M28.5 44C28.5 41.6 35.5 41.6 35.5 44C35.5 46 33.2 47.3 32 47.3C30.8 47.3 28.5 46 28.5 44Z
```

**Motion**

- Idle is a blink, nothing else: `otto-blink 6s ease-in-out infinite`, on full-body and peek Otto only. Delete `otto-bob`. `otto-wave` plays twice, then rests (`2.8s ease-in-out 2`), only where he greets.
- **Otto at work (the owner's calls, 2026-11-07 and 2026-11-08).** On the dashboard home action cards, and now also wherever he is working: the working Otto during AI waits, the loading screen, and the How it works steps on the landing page. There, and nowhere else, idle motion goes past the blink: `<Otto lively>` gives his pose a slow loop on the parts it uses (`read`: lifts his page and nods, `otto-page`/`otto-nod` 7s; `point`: nudges his arm twice, `otto-point` 6.2s; `think`: taps his chin and tilts his head, `otto-chin`/`otto-tilt` 8.4s), and a livelier take of the same motion, once, while his card (`group/otto`) is hovered or focused (`*-lively`). The paper moves on the same clock: a highlighter band reads down the page (`scene-scan`), the missing keyword turns into one he has just after he points (`scene-keyword-in/out`), the format pages float (`scene-float`). Each card sets its own `--otto-delay` (-1s, -3.4s, -5.8s; the blink reads it too), so the three never move together. Small amplitude, ease-in-out, translate/rotate/opacity only, all behind `motion-safe:`.
- Hero entrance: `otto-peek` (`from { opacity: 0; translate: 0 30% }`, 600ms, 300ms delay, once). Success: `animate-pop` once, then still. In work screens (studio, dialogs) OttoMark never moves, and a full-body Otto in an empty state only blinks; the working Otto moves only while the AI works, and goes when it's done. The loading screen fades in (`fade-in`) and out (`fade-out`, 250ms, ends invisible).
- Reduced motion: the global rule already ends every animation on its last frame, so keyframes define only `from` and the resting pose is the end state. No blink, peek, draw-on or pop; live pills just appear. Spinners are the only loop left (the existing rule keeps them turning, slower).

## 6. Homepage

Order: Hero with the recruiter-view moment → How it works → What Otto won't do → Pricing → Before you start (FAQ) → Final CTA. Removed: the separate RecruiterDemo section (it moves into the hero), the 5 step cards, the icon tiles, the hero's second button and Otto's hello bubble. LineFixerExample becomes step 3 of How it works.

```text
 [mark] Otto Sensei   How it works   Pricing                     Sign in  ( Check my resume )
                                  FREE RESUME CHECKER
                                   See your resume
                                the way recruiters do.            <- italic, squiggle under "recruiters"
                 Upload your file and see what hiring software reads.
                   Otto helps you fix weak lines. Downloads are free.
                                ( Check my resume  -> )
                                   No signup needed.
 +- panel, rounded-3xl, mt-16 -----------------------------------------------------------+
 |  WHAT YOU SEE                                 WHAT HIRING SOFTWARE READS   Otto peeks  |
 |  +- window: maya-chen.pdf -----------+  arrow  +- window: maya-chen.pdf ---+  over     |
 |  | designed two-column resume,       |  --->   | Maya Chen                 |  this     |
 |  | -rotate-1, shadow-float           |   (?)   | [Figma] Senior Product... |  edge     |
 |  +-----------------------------------+         | ...  (o Skills mixed into jobs)       |
 |                                                 +---------------------------+          |
 +---------------------------------------------------------------------------------------+
   Example resume. Columns look sharp to people; software reads straight across them.
```

**Hero**

- Header: sticky, `h-16 bg-background border-b border-border`; nav `text-sm text-muted hover:text-ink`; CTA `primary sm`. No accent color.
- Headline: two blocks, `See your resume` and `<em className="block">the way recruiters do.</em>`; `BRAND.tagline` stays for metadata. Squiggle: `<span className="relative whitespace-nowrap">` around "recruiters", with the SVG `absolute inset-x-0 top-4/5 h-auto w-full` (its height follows the word's width, so it scales with the headline). Spacing: hero `pt-12`; eyebrow, then h1 `mt-4`; lead `mx-auto mt-8 max-w-2xl text-balance`, one sentence group per line from `sm` (two `sm:block` spans); CTA `mt-8` (`primary lg`); gray line `mt-3 text-sm text-subtle`; panel `mt-10`, `lg:pt-8`, so the three highlighted lines sit above 900px at 1440 wide.
- Windows: `grid gap-6 lg:grid-cols-2 lg:gap-12`, each under an eyebrow. The resume mock goes ink and gray (role `text-muted`, icons and bullets `text-subtle`). The parsed text is mono, with `highlighter` on the column words and the broken icon characters; this replaces the red and amber segments and their legend. Live pill at the parsed window's bottom-right (`absolute -bottom-4 right-6`).
- On screen: accent = squiggle + pill dot. Ink doodles = the arrow between the windows and a "?" bubble by the parsed window. Otto = `peek`, paws over the parsed window's top edge, `z-10`.
- Motion, once on load: parsed lines `animate-fade-in` 60ms apart, then the highlights paint, then the pill pops (about 1.2s in all). Below the hero, nothing moves except the small Otto at work beside each How it works step (section 5).
- Phone (360px): eyebrow, h1 (48px, 3 lines), lead, full-width CTA, gray line, then the panel (`p-3`) with only the parsed window, a 64px peek Otto and the pill. The resume window and the ink doodles are hidden.

**How it works:** eyebrow "HOW IT WORKS", h2 "From old file to clean PDF", lead "Five steps. Stop after any of them." Desktop `grid gap-12 lg:grid-cols-3`: on the left a `lg:sticky lg:top-24` numbered list of the 5 steps (number `tabular-nums text-subtle`; the step whose moment crosses the middle of the screen gets `aria-current="step"`, `text-ink font-medium`, the rest `text-muted`, color only, no motion); on the right (`lg:col-span-2 space-y-24`) one panel, window and caption per moment. **1 Upload**: a finished moment, never a fake drop box: a Window "maya-chen.pdf · PDF · 1 page" with three mono lines, each a shade lighter, and a live pill "Reading your file". **2 Recruiter view**: the checks as a row list with status chips. **3 Fix lines**: the weak line with a warn chip, an Otto note asking "How much did followers grow?", the user's reply (ink bubble, white text, right-aligned), the new line with a pass chip and a live pill "Line updated". **4 Tailor**: the job title and keyword chips (have: `bg-surface-muted` with a check; missing: `border border-dashed border-border-strong` with a plus and "Add if true"). **5 Download**: "Before: 4 problems" next to "After: 0", the 0 circled by the accent LooseCircle. On phones the list hides and each moment gets an eyebrow such as "STEP 3 · FIX LINES". Each caption's name has a 64px lively Otto doing that step beside it (section 5).

**What Otto won't do:** h2 on the left, then a row list; each row is `grid gap-2 py-8 sm:grid-cols-2`, with a small-display serif claim on the left and a `text-muted` reason on the right: "Make up a score." · "Invent your numbers." · "Charge you to download." · "Keep your file." Reasons come from the current WhyDifferent and FAQ copy, and every claim must stay true of the product.

**Pricing:** h2 "Free for the basics. *Pro for a busy job hunt.*" A panel holds two cards (`PLANS_PANEL_CLASSES`: `grid gap-3 rounded-3xl bg-surface-muted p-3 sm:p-6 md:grid-cols-2`); from `md` each card is `md:row-span-4 md:grid md:grid-rows-subgrid md:gap-0` over the rows name, summary, price and button, features, so both buttons line up even when a summary wraps. Keep summaries to one line anyway. A closing "(fair use)" never breaks across lines. Each card: plan name in small display, summary `text-muted`, price `text-2xl font-semibold lining-nums tabular-nums` with "/month" in `text-muted`, then the button (Pro `primary`, Free `secondary`) with a gray line under it ("Cancel anytime from your account" / "No card needed"), then `border-t border-border pt-6` and the list with ink `Check` icons. Pro's list starts with "Everything in Free, plus:". Pro gets an `ink` badge, not an accent border. On /pricing only: Otto (`point`, 96px) beside the billing switch and a small Otto note under the plans (section 5); the homepage teaser stays without him.

**Before you start (FAQ):** `lg:grid-cols-3`, h2 on the left, a row list on the right (`lg:col-span-2`). Each `<summary>` is a FAQ-question serif line with a `Plus` icon that turns 45° when open; the answer is `pb-6 text-base/7 text-muted max-w-prose`.

**Final CTA:** a panel, `px-6 py-16 text-center sm:py-24`: full-body Otto (`read`, 144px, blink only), h2 "See what the software sees.", a `primary lg` CTA, and the gray line "Checking and PDFs are free. Pro is for more help from Otto."

## 7. Studio

- Canvas: `bg-surface-muted` for the whole studio (`studio/layout.tsx` also sets `viewport.themeColor` to `#eef3ef`). The top bar sits on stone with no border. Each step's content sits on white sheets.
- Stepper: circles `size-6 rounded-full text-xs font-medium tabular-nums`; current `bg-ink text-white`; done `bg-surface text-ink` with a check; upcoming `inset-ring inset-ring-border-strong text-muted`. Steps you can't open yet keep `disabled` but never fade (no opacity): "Skipped" is information, in `text-subtle`. Connectors `h-px bg-border`. The current label is `text-ink font-medium`, the others `text-muted`.
- Step header: an `OttoNote` (`md`), `mt-8 mb-6`, never a full-body Otto. Fix lines puts the totals in the meta line: "Otto · 5 lines · 2 need work · 3 with numbers" (SummaryBar goes away).
- Sticky step bar: `rounded-2xl bg-surface p-1.5 shadow-float ring-1 ring-ink/5`, right-aligned: ghost "Skip to download", then primary "Next: Tailor to a job ->".

**Fix lines editor**

- One sheet per section. Header row: chevron (ghost icon), title `text-base font-semibold`, count `text-sm text-subtle`, status chip. The move buttons on the right are `opacity-0 group-hover/section:opacity-100 group-focus-within/section:opacity-100 pointer-coarse:opacity-100`, so nothing shifts.
- Entries (jobs, schools, projects, skill groups, certifications) are not cards; they are split by `mt-6 border-t border-border pt-6`. Entry header: title `text-base font-medium`, a meta line "Acme Payments · Jan 2021 - now" and a `ghost sm` "Edit details". The details form folds away once the entry is filled (a job's title and company, a certification's name, a skill group's skills) and stays open for new or empty entries; opening it focuses the first field. A skill group folds only its name: its skills stay in view like a job's lines, with the "Skills" label for screen readers only. A certification folds all of its fields under "Marketing Skills Academy · 2021".
- "What you did" is an eyebrow, and the lines below it are a ruled list:

```text
li.group/line
+- div.flex.items-start.gap-3.border-b   <- the rule is on the row (ink, 2px on focus-within), so a chip
|  |                                       that wraps under the words on phones stays in its own row
|  +- Textarea variant="line"   "Built ETL pipelines in Python and PostgreSQL"   (no border of its own)
|  +- chip (shrink-0 mt-2)      warn "Add a number"   or quiet pass "Looks good"
+- div.sr-only.group-focus-within/line:not-sr-only      <- tools, shown on focus
   +- div.flex.items-center.gap-1.pt-2                 <- spacing here: not-sr-only resets padding
      tip "Add a number: how many, how much, or how fast?"  (text-sm/6 text-muted, "+1 more")
      ghost sm [OttoMark line, text-ink, size-5] "Fix with Otto"   ml-auto: ghost icons up / down / delete
```

- Tools show on focus, not hover: a row that grows under the pointer makes the whole list jump. They stay focusable and in the accessibility tree (`sr-only`, not `hidden`), so the existing "focus the next line's delete button" flow keeps working.
- Chip label per `LintIssueId`: stock-phrase "Stock phrase", no-number "Add a number", weak-start "Weak start", first-person "Drop I and my", too-long "Too long", too-short "Too short", passive "Passive", vague "Vague", duplicate "Repeated". High severity = warn chip, low = neutral chip, no issues = quiet pass chip. With 2 or more issues, show the top one and "+1". The full messages stay the line's `aria-describedby`.
- "Add a line": `ghost sm` with `Plus`, `text-muted hover:text-ink`.

**Fix dialog:** an OttoNote ("Otto · 1 question"), your line read-only on `rounded-xl bg-surface-muted px-4 py-3` with `highlighter` on each `issue.match`, the answer field, and the new line with a pass chip. Footer: ghost "Keep mine", primary "Use this line".

**Other steps:** *Upload*: the dropzone, then "Start from scratch" and "Try a sample" as a row list with chevrons (no cards, no tiles). *Recruiter view*: the checks as a row list on a sheet (left), "What hiring software reads" as a Window (right) with "PDF · 1 page · 97 words" in the bar; highlight only U+FFFD characters, the one thing we can point at for sure, and never fake marks. *Tailor*: the homepage chip styles. *Download*: the preview Window plus a side sheet (segmented page size, primary "Download PDF", secondary "Check my new PDF", ghost "Copy plain text"); after the check, a live pill "0 problems now" and a full-body cheering Otto (96px, pops once) as the success moment. Arriving from "Create tailored version", the same cheering Otto stands beside the step's note, once. *Account*: one panel holding white cards. *Login*: the form sits straight on paper, with no card.

## 8. Copy

- Say what happens in the user's words ("see what hiring software reads"), not product talk ("ATS optimization"). Headlines 12 words at most, leads 2 lines at most on desktop, one idea per sentence.
- Titles are claims or plain names, not labels: "What Otto won't do", not "Honest by design".
- Cut: actually, simply, just, seamless, powerful, effortless, unlock, supercharge, AI-powered, magic. Digits for numbers, `$` for prices, no exclamation marks (Otto may use one on a success).
- Otto speaks in the first person, 18 words at most (lines.test.ts), about facts in the user's own file. Meta lines state facts, never praise.
- No proof we don't have: no testimonials, logos, user counts, ratings or "trusted by".

| Where | Before | After |
|---|---|---|
| Hero lead | Find out what hiring software actually reads from your file. Otto helps you fix it, and PDF downloads are always free. | Upload your file and see what hiring software reads. Otto helps you fix weak lines. Downloads are free. |
| Hero Otto | Bubble: "Hi, I'm Otto. I read resumes the way hiring software does." | Live pill on the demo: "Skills mixed into jobs" |
| Why section | Honest by design. No fake scores, no invented achievements, and no catch at the end. | What Otto won't do. Make up a score. Invent your numbers. Charge you to download. |
| Demo intro | Columns and icons look sharp to people. Hiring software reads straight across the page, so it gets something like this. | Columns look sharp to people. Software reads straight across them. |
| Final CTA | Ready to see what recruiters see? Upload your resume and get your recruiter view right away. It's free, and you don't need an account. | See what the software sees. Free, and no account needed. |

## 9. Don't

- Violet (accent) buttons, text, links, icons, checkmarks, tiles, borders, rings or fills.
- Borders around cards or sections, a card inside a card, a shadow on a card that sits on a panel.
- White bands between sections, or the same centered eyebrow, title and subline stack over and over.
- Icon-tile feature grids and "Step 1...5" cards.
- A full-body Otto in step headers or dialogs (except the small working Otto during an AI wait), or two full-body Ottos on one screen (the dashboard home's three action cards are the owner's exception).
- Endless motion: bob, looping waves, pulsing dots, marquees, scroll-triggered effects below the hero. (Only exception: "Otto at work", section 5.)
- Otto as decoration without a job, or a fake progress bar or percentage on a wait.
- Gradients, glows, glass, sparkle or magic-wand icons, emoji in the UI. (Only exception: the one-step tone shift of forest and red keys.)
- Real names, emails, phones or companies in decorative art (home page scenes): it shows the sample person. Resume cards show the real resume.
- Bold or all-caps serif, italic sans, serif under 24px.
- Doodles in the studio, dialogs, account or legal pages, or on top of text.
- New fonts or packages, raw hex in components, AI-generated art for Otto or the doodles.

## 10. Where it lands

| Files (owner) | Change |
|---|---|
| `globals.css`, `layout.tsx` (ui-kit) | Section 1 tokens; Garamond; base h1/h2 serif 400 and h3/h4 Inter; ink focus ring; `::selection` in highlight; `highlighter` utility; `shadow-float`; animations (blink 6s, wave x2, `otto-peek`, `draw`, `highlight-in`, no `otto-bob`); prose-otto links in ink, serif h1/h2 at 400; `themeColor` `#fbfcfa` |
| `ui/*` (ui-kit) | Keys (section 4, Buttons) and `menu.tsx`; borderless cards, dialogs and toasts; quiet chips (`ink` replaces `accent`); ink focus on fields; `Textarea variant="line"`; progress fill `bg-ink` on `bg-surface-strong`; new `live-pill.tsx` and `eyebrow.tsx` |
| `mascot/*` (mascot) | Quiet drawing, `peek` pose, motion rules, `otto-note.tsx`, borderless `SpeechBubble`; new `src/components/doodles/**`; OG image on paper with ink text and the bundled font |
| `site/*` (marketing) | `OttoMark tone?: "color" \| "line"` (optional, default `"color"`), serif wordmark, header, footer |
| `(marketing)/**` (marketing, account-ui) | Homepage per section 6; `Section` drops `tone`; `SectionHeader` starts left; pricing, login and account per section 7 |
| `studio/**` (studio tasks) | Stone canvas, stepper, OttoNote headers, sheets, ruled lines, folding entry details |
| Tests (ui-kit) | `tokens.test.ts`: the required list (drop the three accent tokens, add `surface-strong` and `highlight`), PAIRS per section 1, the font regex (`--font-garamond`), animation names. `styles.test.ts`: the CLASSES list, `--color-accent: #d9621a`, `--font-display: var(--font-garamond)`, focus ring `var(--color-ink)` |

To find leftovers, run `grep -rln "accent" src --include="*.tsx"` (37 files today). Every hit becomes ink, muted, or goes away, unless it is on the accent list in section 1.
