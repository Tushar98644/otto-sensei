# Third-party notices

Code and designs from other projects that ship in this app, with their licences. Each portfolio
template folder also keeps the original copyright and licence text in its own `LICENSE.txt`.

## Portfolio templates

Each template rebuilds a real, MIT-licensed portfolio for our users' data. We reuse the
original's layout, styles and interaction code; never its owner's text, photos, project images,
logos or paid fonts. MIT asks for the notice to travel with the code, which this file and each
folder's `LICENSE.txt` do; published pages carry no credit line (owner, 2026-11-11).

| Template | Based on | Copyright | Licence | Source commit | Code here | Font swaps |
|---|---|---|---|---|---|---|
| Navy (`navy`) | [bchiang7/v4](https://github.com/bchiang7/v4) | (c) 2018 Brittany Chiang | MIT | `539cef0` | `src/components/portfolio/templates/navy/` | Calibre → Inter, SF Mono → Fira Code |
| Dock (`dock`) | [dillionverma/portfolio](https://github.com/dillionverma/portfolio) (magicui) | (c) 2024 Dillion Verma | MIT | `5ef12e4` | `src/components/portfolio/templates/dock/` | none (Geist, as the original) |
| Reel (`reel`) | [HamishMW/portfolio](https://github.com/HamishMW/portfolio) | (c) 2020 Hamish Williams | MIT | `b7444bc` | `src/components/portfolio/templates/reel/` | Gotham → Montserrat; IPA Gothic (decoder glyphs) → the system's Japanese face |
| Bento (`bento`) | [Ladvace/astro-bento-portfolio](https://github.com/Ladvace/astro-bento-portfolio) | (c) 2024 Gianmarco Cavallo and others | MIT | `4b74318` | `src/components/portfolio/templates/bento/` | Satoshi, Cabinet Grotesk → Figtree |
| Blueprint (`cv`) | [ncdai/chanhdai.com](https://github.com/ncdai/chanhdai.com) | (c) 2026 Chánh Đại | MIT (name and logo excluded) | `e812f32` | `src/components/portfolio/templates/cv/` | Paper Mono → Geist Mono; ChanhDai Notes (handwriting) → Caveat |
| Prose (`prose`) | [antfu/antfu.me](https://github.com/antfu/antfu.me) | (c) 2020-2021 Anthony Fu | MIT (code only) | `0be14a9` | `src/components/portfolio/templates/prose/` | none (Inter, DM Mono, Roboto Condensed, as the original) |
| Notes (`folio`) | [alanagoyal/alanagoyal](https://github.com/alanagoyal/alanagoyal) (its Notes app) | (c) 2024 Alana Goyal | MIT | `0ae715e` | `src/components/portfolio/templates/folio/` | none (the system font, as the original; Inter where there is no San Francisco) |
| Sketchbook (`paper`) | [umutxyp/Personal-Website](https://github.com/umutxyp/Personal-Website) | (c) 2026 umutxyp | MIT | `5f8f26a` | `src/components/portfolio/templates/paper/` | none (Gochi Hand, Shantell Sans, as the original) |
| Gazette (`gazette`) | [JoaccoG/portfolio-v2](https://github.com/JoaccoG/portfolio-v2) ("The Daily Godoy") | (c) 2026 Joaquín Godoy | MIT | `3f9e968` | `src/components/portfolio/templates/gazette/` | none (UnifrakturMaguntia, Abril Fatface, Old Standard TT, Caveat, as the original); its subset ornament font → small inline SVG marks |
| Terminal (`terminal`) | [Cveinnt/LiveTerm](https://github.com/Cveinnt/LiveTerm) | (c) 2022 Vincent Wu | MIT | `2e2c2d8` | `src/components/portfolio/templates/terminal/` | Hack Nerd Font → Fira Code |
| Brutal (`brutal`) | [ElianCodes/brutal](https://github.com/ElianCodes/brutal) and [ElianCodes/brutal-ui](https://github.com/ElianCodes/brutal-ui) | (c) 2023 Elian Van Cutsem | MIT | `fe01084`, brutal-ui `717d020` | `src/components/portfolio/templates/brutal/` | none (Outfit, DM Serif Display, Sanchez, Poppins, Righteous, as the original) |
| Card (`card`) | [codewithsadee/vcard-personal-portfolio](https://github.com/codewithsadee/vcard-personal-portfolio) | (c) 2022 codewithsadee | MIT | `927f09a` | `src/components/portfolio/templates/card/` | none (Poppins, as the original) |
| Retro (`retro`) | [mirkoschubert/retro-os](https://github.com/mirkoschubert/retro-os) | (c) 2026 Mirko Schubert | MIT | `de99063` | `src/components/portfolio/templates/retro/` | none (IBM Plex Mono, IBM Plex Sans, JetBrains Mono, Source Serif 4, Inter, as the original's three eras) |
| Headliner (`starring`) | [pipozzz/starring](https://github.com/pipozzz/starring) (its Acid theme) | (c) 2026 Peter Gonda and Starring contributors | MIT | `c051934` | `src/components/portfolio/templates/starring/` | none (Anton, Space Grotesk, JetBrains Mono, as the original) |
| Bubblegum (`bubble`) | [Nuu-maan/portfolio-template](https://github.com/Nuu-maan/portfolio-template) | (c) 2026 Numan Khan | MIT | `3fe06e3` | `src/components/portfolio/templates/bubble/` | none (Lilita One, Sora, as the original) |

Some of these sites license only their code under MIT. antfu.me's words and pictures are CC
BY-NC-SA 4.0, and chanhdai.com's trademark policy keeps Chánh Đại's name and logo out of its MIT
grant. Prose and Blueprint take layout, styles and interaction code only; none of that content is
copied, and neither page uses either person's logo or mark (Blueprint draws the user's own initials
where the original draws its logo).

## Other code inside the templates

- **webgl-noise** (classic Perlin noise in `reel/gl/sphere-shaders.ts`, Hamish's shader as is):
  (c) 2011 Stefan Gustavson, (c) 2011 Ashima Arts, MIT. Text in `reel/LICENSE.txt`.
- **Reel's 3D assets** (`public/portfolio-templates/reel/`): Hamish's MacBook and iPhone models
  (`*.glb`, made in Blender, unchanged) and the still frames rendered from them and from his
  sphere (`*.webp`) are from HamishMW/portfolio `b7444bc`, under its MIT licence above. The
  katakana outlines and icons in `reel/sprites.tsx` are his SVG sprites, same licence.
- **three.js** r161 (`three@0.161.0`, the version the original pins; Reel's sphere and device
  models): (c) 2010-2024 three.js authors, MIT. Loaded only where Reel draws in 3D.
- **Draco decoder** (`public/portfolio-templates/reel/draco/`, copied from three.js
  `examples/jsm/libs/draco/gltf`; decodes the device models): (c) Google, Apache License 2.0, full
  text beside it in `LICENSE`.
- **Feather icons** (outline social marks in `templates/icons.tsx`, as bundled by bchiang7/v4):
  (c) 2013-2017 Cole Bemis, MIT.
- **Pixel icons** (`bento/pixel-icons.tsx`) and the nine-slice frame (`bento/frame.ts`) come from
  Ladvace/astro-bento-portfolio, under its MIT licence above.
- **ArtPlum** (`prose/islands.tsx`) is a port of code from antfu/antfu.me, under its MIT licence
  above.
- **Terminal's sumfetch globe** (`terminal/ascii.ts`): LiveTerm's own text-art logo, drawn as SVG
  cells, under its MIT licence above. The block-letter banner font is our own.
- **Gazette, Brutal and Card** draw no pictures from their originals: the Daily Godoy's engraved
  portrait and paper tiles, Brutal's sample images and vCard's memoji avatars, photographs and
  client logos are left out; initials, gradients and drawn tiles stand in.
- **Bubblegum's mascots** (`bubble/mascots.tsx`: the bean, daisy, globe, gloves, clouds, stars
  and flowers): Nuu-maan/portfolio-template `3fe06e3`'s own SVG drawings, under its MIT licence
  above, drawn once per page as symbols.
- **Retro and Headliner** draw no pictures and no marks from their originals: no portraits,
  covers or photos (Retro's placeholders show initials and monograms), no RetroOS name (the
  menubar shows the owner's first name), and no Starring logo or star mark (a plain five-point
  star stands in).
- **Sketchbook's fox world** (`public/portfolio-templates/paper/`): the scenes, strips, plants and
  ground that umutxyp/Personal-Website `5f8f26a` paints with its `scripts/paint.py`, under its MIT
  licence above; the fox, gulls and other animals in them are PhyloPic silhouettes under CC0 1.0 or
  the Public Domain Mark (listed in that repo's `scripts/silhouettes/CREDITS.md`). Each picture
  gains one rule that holds it still, and `world-0-still.svg` is the scene for still cards.

## PDF resume formats

Each PDF format (`src/components/pdf/templates/`) rebuilds the look of a published resume layout
in our own React code, for the user's own content. No LaTeX, Typst or template code is copied,
and none of their sample text, names or images; the layouts are credited here because the designs
are followed closely.

| Format | Design followed | Copyright | Licence | Source |
|---|---|---|---|---|
| Developer (`developer`) | Jake's Resume | (c) 2020 Jake Gutierrez | MIT | [jakegut/resume](https://github.com/jakegut/resume) |
| Minimal (`minimal`) | RenderCV "engineeringresumes" theme | (c) 2023 to present Sina Atalay and individual contributors | MIT | [rendercv/rendercv](https://github.com/rendercv/rendercv) |
| Modern (`modern`) | Awesome-CV | Claud D. Park (Byungjin Park), author | LPPL 1.3c | [posquit0/Awesome-CV](https://github.com/posquit0/Awesome-CV) |
| Executive (`executive`) | moderncv, "banking" style | (c) 2006-2015 Xavier Danaux, 2020-2026 moderncv maintainers | LPPL 1.3c | [moderncv/moderncv](https://github.com/moderncv/moderncv) |

Classic follows the layout conventions in public university career-office resume guides, and
Compact the business-school "resume book" format; neither copies a document, and neither format's
name or copy mentions a school.

## PDF fonts

Bundled in `public/fonts/pdf/` with each project's licence file beside it, and embedded (as
subsets) in the PDFs users download. All files are unmodified upstream releases.

| Family | Files | Copyright | Licence | Source |
|---|---|---|---|---|
| Carlito 1.104 | `carlito/Carlito-{Regular,Bold,Italic}.ttf` | (c) 2013 The Carlito Project Authors | SIL OFL 1.1 (`OFL.txt`) | [google/fonts](https://github.com/google/fonts/tree/main/ofl/carlito) |
| Tinos 1.340 | `tinos/Tinos-{Regular,Bold,Italic}.ttf` | (c) 2026 The Tinos Project Authors | SIL OFL 1.1 (`OFL.txt`) | [google/fonts](https://github.com/google/fonts/tree/main/ofl/tinos) |
| CMU Serif 0.7.0 (Computer Modern Unicode) | `cmu-serif/cmun{rm,bx,ti}.ttf` | (c) 2003-2009 Andrey V. Panov, from Donald E. Knuth's Computer Modern and others | SIL OFL 1.1 (`OFL.txt`) | [cm-unicode on SourceForge](https://sourceforge.net/projects/cm-unicode/) |
| TeX Gyre Pagella 2.501 | `tex-gyre-pagella/texgyrepagella-{regular,bold,italic}.otf` | (c) 2006-2018 B. Jackowski, J. M. Nowacki and others (GUST e-foundry) | GUST Font License, i.e. LPPL 1.3c (`GUST-FONT-LICENSE.txt`, `LPPL-1.3c.txt`) | [CTAN tex-gyre](https://ctan.org/pkg/tex-gyre) |
| Roboto 3.016 | `roboto/Roboto-{Light,Regular,Bold,Italic}.ttf` | (c) 2011 The Roboto Project Authors | SIL OFL 1.1 (`OFL.txt`) | [googlefonts/roboto-3-classic](https://github.com/googlefonts/roboto-3-classic) |
| Source Sans 3 3.052 | `source-sans-3/SourceSans3-{Light,LightIt,Regular,Bold}.ttf` | (c) 2010-2024 Adobe, Reserved Font Name "Source" | SIL OFL 1.1 (`LICENSE.md`) | [adobe-fonts/source-sans](https://github.com/adobe-fonts/source-sans) |
| Charis 7.000 | `charis/Charis-{Regular,Bold,Italic}.ttf` | (c) 1997-2025 SIL Global, Reserved Font Names "Charis" and "SIL" | SIL OFL 1.1 (`OFL.txt`) | [software.sil.org/charis](https://software.sil.org/charis/) |

## Occupation data

The Jobs tab reads every job title (and the titles on a resume) as an occupation, using a lookup
built by `scripts/occupations-build.ts` into `src/lib/job-feed/occupations/data.json`. It ships
only in server code; the browser sees an occupation's name, never the lookup.

| Data | Version | Owner | Licence | Source |
|---|---|---|---|---|
| O*NET® Database: Occupation Data, Job Titles, Sample of Reported Titles, Related Occupations, Job Zones | 31.0 (August 2026) | U.S. Department of Labor, Employment and Training Administration (USDOL/ETA) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [onetcenter.org/database.html](https://www.onetcenter.org/database.html) |
| ESCO to O*NET-SOC 2019 crosswalk (`ESCO_to_ONET-SOC.xlsx`) | As downloaded 2026-11-10 | USDOL/ETA ("Crosswalk Files"), built with the European Commission's ESCO team | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | [onetcenter.org/crosswalks.html](https://www.onetcenter.org/crosswalks.html#esco) |
| ESCO occupations (English preferred and alternative labels) | v1.2.1 | European Commission | Free reuse for any purpose under Commission Decision 2011/833/EU, with the statement below | [ESCO API](https://ec.europa.eu/esco/api), [reuse terms](https://esco.ec.europa.eu/en/about-esco/faq) |

Credit lines, as each licence asks (shown in the app under the occupation search on the Jobs tab):

> This page includes information from the O*NET 31.0 Database by the U.S. Department of Labor,
> Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is
> a trademark of USDOL/ETA. Otto has modified all or some of this information. USDOL/ETA has not
> approved, endorsed, or tested these modifications.

> This service uses the ESCO classification of the European Commission.

What Otto changed (both licences ask for changes to be marked):

- Titles and labels are reduced to lookup keys: lower case, accents and punctuation removed,
  British spellings turned into US ones, plurals made singular.
- A name O*NET or ESCO gives to occupations in different fields is dropped ("Lab Technician"),
  or kept for the one that uses it most; single generic words ("Manager", "Engineer") and
  initials that are also places ("PA") are never keys; names that add nothing over a shorter one
  for the same occupation are left out.
- ESCO labels are attached to O*NET occupations through the crosswalk; ESCO's own occupations,
  skills and hierarchy are not used.
- Occupation names are shortened to one role in plain words ("Registered Nurse" for "Registered
  Nurses"; "Truck Driver (heavy goods)" for "Heavy and Tractor-Trailer Truck Drivers").
- Our own names for about 800 startup, office and frontline titles (`tech.ts`) are checked first,
  and two roles O*NET has no occupation for are added: Product Manager (`11-X101.00`) and
  Customer Success Manager (`41-X101.00`).
- Only O*NET's closest ten Related Occupations per occupation are kept ("Primary-Short" and
  "Primary-Long").

## Job title model

Job titles are compared by meaning with JobBERT-v2. The model runs only in the daily jobs workflow
on GitHub's runner (`scripts/title-vectors.py`), never in the app. The app ships two things derived
from it: `src/lib/job-feed/occupations/vectors.json` (one vector per occupation, made from the
occupation names above) and `scripts/title-vectors.basis` (the fixed 256-dimension basis the stored
vectors use).

| Model | Version | Owner | Licence | Source |
|---|---|---|---|---|
| JobBERT-v2 | Revision `a480476` (dense "anchor" layer) | TechWolf | MIT | [huggingface.co/TechWolf/JobBERT-v2](https://huggingface.co/TechWolf/JobBERT-v2) |
| JobBERT-v2 ONNX build (int8, tokenizer) | Revision `c684fd6` | ONNX Community | MIT | [huggingface.co/onnx-community/JobBERT-v2-ONNX](https://huggingface.co/onnx-community/JobBERT-v2-ONNX) |
