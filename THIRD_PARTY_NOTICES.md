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
| Reel (`reel`) | [HamishMW/portfolio](https://github.com/HamishMW/portfolio) | (c) 2020 Hamish Williams | MIT | `b7444bc` | `src/components/portfolio/templates/reel/` | Gotham → Montserrat |
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

- **webgl-noise** (classic Perlin noise in `reel/sphere-gl.ts`, carried over from Hamish's
  shader): (c) 2011 Stefan Gustavson, (c) 2011 Ashima Arts, MIT. Text in `reel/LICENSE.txt`.
- **Feather icons** (outline social marks in `templates/icons.tsx`, as bundled by bchiang7/v4):
  (c) 2013-2017 Cole Bemis, MIT.
- **Pixel icons** (`bento/pixel-icons.tsx`) and the nine-slice frame (`bento/frame.ts`) come from
  Ladvace/astro-bento-portfolio, under its MIT licence above.
- **Radix Colors** (the Sand scale in `folio/styles.ts`, as used by samuelkraft-next):
  (c) 2022 WorkOS, MIT.
- **ArtPlum** (`prose/islands.tsx`), the braille table and footer clock (`paper/paper.tsx`,
  `paper/islands.tsx`) are ports of code from antfu/antfu.me and CaliCastle/cali.so, under their
  MIT licences above.
