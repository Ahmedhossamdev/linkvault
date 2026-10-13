# LinkVault identity

## Idea

A folded page with a bookmark-shaped opening: something worth keeping, and a place to return to. This is a reading-library identity, not a lock, bank vault, or LinkedIn integration badge.

Name: LinkVault. Tagline: **Give ‘read later’ a home.**

The voice is useful, calm, and lightly self-aware. "Will I read them all? Let's not make promises." No grand claims about productivity or account safety.

## Assets

- `extension/icons/icon.svg`: square browser-icon master, charcoal tile and paper page.
- `extension/icons/icon-{16,32,48,128}.png`: browser and toolbar exports.
- `extension/icons/mark-light.svg` and `mark-dark.svg`: transparent page marks for the dashboard and other layouts.
- `brand/wordmark-light.svg` and `wordmark-dark.svg`: transparent horizontal lockups.
- `brand/wordmark-light.png` and `wordmark-dark.png`: fixed-render lockups for README and sharing.
- `brand/launch-card.svg` and `launch-card.png`: 1200 x 630 announcement artwork with no private chat data or unverified release claims.

The SVGs are deliberately constructed vector artwork. They contain no generated textures, external images, or font downloads. Wordmarks use live serif text: render with a suitable installed font or use the PNG exports for a fixed appearance.

## Palette

| Role | Color | Use |
| --- | --- | --- |
| Paper | `#faf7ef` | Light background and reversed page |
| Ink | `#292820` | Mark, wordmark, and icon tile |
| Rust | `#b0573b` | Fold on light surfaces |
| Soft rust | `#cf896d` | Fold on dark surfaces |
| Quiet text | `#6d675d` | Secondary light-mode text |
| Rule | `#dcd5c8` | Light separators |

Rust is a small identifying detail, not a reason to recolor every interface control. Functional statuses keep their own colors.

### Editorial interface palette (0.4.0)

The reading interface pairs paper panels with forest ink and restrained rust accents. The logo palette above stays unchanged.

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#f3eee3` | `#191e1b` |
| Paper panel | `#fffdf7` | `#252d28` |
| Heading | `#24392d` | `#f8f1e4` |
| Accent | `#93432e` | `#e5a68a` |
| Read badge | `#e4efdf` | `#2d4437` |
| Reading badge | `#f5e7d5` | `#49382a` |

Site marks use local domain initials or short labels, not downloaded favicons or third-party logos. Serif titles provide the editorial character; URLs and controls stay compact and readable.

## Typography and spacing

Use Georgia or an available traditional serif for the name and editorial titles. Use the existing system sans-serif for controls and supporting text. Avoid remote font dependencies. Preserve the wordmark's capital L and V.

Leave at least one quarter of the mark's width as space around it. Do not stretch, rotate, add shadows, or place it inside another detailed symbol. Use the simplified square icon at toolbar sizes, not the full wordmark. Keep the bookmark cutout clear; do not fill it or add text inside it.

Use the dark mark on paper surfaces and the paper mark on dark surfaces. The square icon has its own charcoal tile and works against either surface. No gradients or illustrations are needed for the identity to work.

## Re-export

Run `sh scripts/export-brand.sh` from the repository root. This development-only task requires `rsvg-convert` (librsvg). It creates PNG files from the SVG sources; using the extension requires neither librsvg nor this script.

Inspect the actual toolbar sizes and launch card after editing the sources. The automated icon tests check dimensions and packaged paths, not artistic quality or live browser appearance. See the manual release checklist for browser testing.

Artwork is covered by the project's MIT license. The name and mark have not undergone trademark clearance.
