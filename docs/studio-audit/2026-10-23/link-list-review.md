# Link list Design review, 23 October 2026

Item 9 of the Link list clean-up: **source review completed; authenticated captures skipped**.

The repository has no saved session in `tests/studio-perf/.auth/`. The offline fake Content Lake
supports public rendering and the brand preview, not the authenticated Studio document editor.
The task prohibits touching production content. No authenticated Studio session was supplied and
no production project was opened or changed. The brand preview captures are input coverage,
not evidence that the six Design panels were inspected together.

Source review shortened the Profile, Service categories, Cards, Arrows and icons, Dividers, and
Depth and glow summaries. Conditional fields, defaults and access rules are unchanged. The frame
help now says “approved frame”, covering the already-supported SVG and raster formats.

To finish item 9, use [task 89's capture method](../2026-10-17/notes.md) with an authenticated,
non-production document containing a profile picture, service categories, links and social icons:

- Capture at 1440 × 900, agency view: `01-profile.png`, `02-service-categories.png`, `03-links.png`,
  `04-social-icons.png`, `05-dividers.png`, `06-depth-and-glow.png`. The requested Links area now
  spans **Cards** and **Arrows and icons**; capture both as `03a-cards.png` and `03b-arrows-and-icons.png`
  if they do not fit together.
- Expand one panel at a time, including its applicable Advanced fields. Repeat at 1024 × 768 for
  panels that overflow or become difficult to scan. Record the actual scheme and viewport.
- Check keyboard focus, relevant conditional controls and the combined reading length. Add any
  further copy edits only after viewing those panels together.
- Do not edit or publish production content. Do not commit browser storage, tokens or session files.

The new offline Design input cases in `/studio-brand-preview` have separate light/dark axe and
screenshot tests. Their Linux baselines must be created with **Update visual baselines**.
