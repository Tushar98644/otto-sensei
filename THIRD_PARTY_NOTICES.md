# Third-party notices

Code and designs from other projects that ship in this app, with their licences. Each portfolio
template folder also keeps the original copyright and licence text in its own `LICENSE.txt`.

## Portfolio templates

Each template rebuilds a real, MIT-licensed portfolio for our users' data. We reuse the
original's layout, styles and interaction code; never its owner's text, photos, project images,
logos or paid fonts. Every published page prints "Design based on <author>'s <work> (MIT)" with a
link to the original.

| Template | Based on | Copyright | Licence | Source commit | Code here | Font swaps |
|---|---|---|---|---|---|---|
| Navy (`navy`) | [bchiang7/v4](https://github.com/bchiang7/v4) | (c) 2018 Brittany Chiang | MIT | `539cef0` | `src/components/portfolio/templates/navy/` | Calibre → Inter, SF Mono → Fira Code |
| Dock (`dock`) | [dillionverma/portfolio](https://github.com/dillionverma/portfolio) (magicui) | (c) 2024 Dillion Verma | MIT | `5ef12e4` | `src/components/portfolio/templates/dock/` | none (Geist, as the original) |
| Reel (`reel`) | [HamishMW/portfolio](https://github.com/HamishMW/portfolio) | (c) 2020 Hamish Williams | MIT | `b7444bc` | `src/components/portfolio/templates/reel/` | Gotham → Montserrat; IPA Gothic (decoder glyphs) → the system's Japanese face |
| Bento (`bento`) | [Ladvace/astro-bento-portfolio](https://github.com/Ladvace/astro-bento-portfolio) | (c) 2024 Gianmarco Cavallo and others | MIT | `4b74318` | `src/components/portfolio/templates/bento/` | Satoshi, Cabinet Grotesk → Figtree |
| CV (`cv`) | [BartoszJarocki/cv](https://github.com/BartoszJarocki/cv) | (c) 2023 Bartosz Jarocki | MIT | `8faa527` | `src/components/portfolio/templates/cv/` | none (Geist Mono, Geist Pixel, as the original) |
| Prose (`prose`) | [antfu/antfu.me](https://github.com/antfu/antfu.me) | (c) 2020-2021 Anthony Fu | MIT (code only) | `0be14a9` | `src/components/portfolio/templates/prose/` | none (Inter, DM Mono, Roboto Condensed, as the original) |
| Folio (`folio`) | [samuelkraft/samuelkraft-next](https://github.com/samuelkraft/samuelkraft-next) | (c) 2021 Samuel Kraft | MIT | `cd73594` | `src/components/portfolio/templates/folio/` | none (Inter, as the original) |
| Paper (`paper`) | [CaliCastle/cali.so](https://github.com/CaliCastle/cali.so) | (c) 2022-2026 Cali Castle | MIT (application code only) | `653615f` | `src/components/portfolio/templates/paper/` | none (Geist, Geist Mono, as the original) |

Two of these sites license only their code under MIT. antfu.me's words and pictures are CC
BY-NC-SA 4.0, and cali.so's licence excludes Cali Castle's writing, photos, artwork, name,
likeness, branding and third-party covers. Prose and Paper take layout, styles and interaction code
only; none of that content is copied, and neither page uses either person's logo or mark.

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
- **Radix Colors** (the Sand scale in `folio/styles.ts`, as used by samuelkraft-next):
  (c) 2022 WorkOS, MIT.
- **ArtPlum** (`prose/islands.tsx`), the braille table and footer clock (`paper/paper.tsx`,
  `paper/islands.tsx`) are ports of code from antfu/antfu.me and CaliCastle/cali.so, under their
  MIT licences above.

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
