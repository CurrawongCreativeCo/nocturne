# New plan tasks from the Studio audit

Ready to paste into Claude Code, with the project context from the build plan on top. Numbers follow the plan's last task
(105). Decisions are the ones answered on 17 October 2026 (`report.md`, _Decisions_).

## 106. Studio dark mode, with light as an option

```text
TASK
Give the Studio a working dark scheme and an Appearance choice (System, Light, Dark), so editors who prefer dark get it,
without losing light.

EVIDENCE (docs/studio-audit/2026-10-17/report.md, issue 10)
- The user menu offers only "Sign out"; Sanity's Appearance section (System / Light / Dark) is missing.
- With the browser in dark mode and localStorage `sanityStudio:ui:colorScheme` set to `dark`, the Studio still renders
  `data-scheme="light"` everywhere (checked 17 October 2026 on the local Studio).
- src/features/studio/theme.ts builds both schemes with buildLegacyTheme, and the brand kit baselines
  (tests/e2e/studio-brand-visual.spec.ts-snapshots/*-dark-*.png) show a dark scheme that the real Studio never uses.

REQUIREMENTS
1. Find why the scheme is locked to light. Candidates, in order: how Sanity 6 treats a legacy theme (buildLegacyTheme)
   for colour schemes; the custom navbar (src/features/studio/components/role-navbar.tsx) and whether it still renders the
   default user menu with its Appearance section; NextStudio in next-sanity 13 (src/app/studio/[[...tool]]/page.tsx) and
   any scheme it passes. Read the Sanity 6 changelog for colour scheme changes. Write the cause in the PR.
2. Restore the Appearance choice with System as the default (it follows the device). Do not force a scheme in code.
3. The dark scheme must meet the same contrast rules as light (task 88's assertions in
   tests/e2e/studio-brand-visual.spec.ts): text 4.5:1, focus ring 3:1, for every brand case. Coordinate with task 88 if it
   has not merged: both change theme.ts.
4. Keep theming in theme.ts only; no CSS overrides of Sanity UI internals (no-ui-overrides.test.ts).
5. Check the custom inputs in dark mode (preset picker, gradient picker, slot input, Start here, Brand colours preview,
   browser icon input, QR dialog): no hard-coded light colours. The Brand colours preview keeps the site's own colours on
   purpose.
6. README "CMS branding": how editors switch Appearance, and that both schemes are tested.

DEFINITION OF DONE
- Default: the Studio follows the device's scheme. Presets: System, Light, Dark in the user menu. Advanced: none.

ACCEPTANCE
- `npm run check` and `npm run test:e2e` pass. Screenshots 01, 05, 10 and 13 captured in dark mode for the audit folder.
```

## 107. Custom colours for heading gradients

```text
TASK
Let editors choose the colours of a heading's gradient themselves, any colours they like, alongside the brand gradients,
with a contrast warning instead of a restriction.

TODAY
The heading highlight (src/lib/sanity/schema/heading-text.ts, `emphasis` annotation) offers three fixed gradients from
code (src/config/heading-gradients.ts: Brand to ink, Brand to green, Brand to red) in a collapsed Advanced area. Section
backgrounds use the named gradients from Design → Brand colours instead, so a client's own gradient never reaches
headings (report issue 8).

REQUIREMENTS
1. The Gradient choice in the highlight popover becomes one picker: the Brand colours gradients (by name, as the
   section picker shows them), then "Brand to ink", then **Custom**. Keep the stored values of today's three presets
   working, so no content changes; hide Brand to green and Brand to red from new choices (they use the success and
   danger colours).
2. Custom shows two or three colour inputs, reusing the Brand colours input (src/features/site/components/colour-input.tsx:
   swatch plus hex), and an angle under Advanced (default 90, left to right). Any colour is allowed. Store validated
   six-digit hex strings and an integer angle on the annotation; typegen and update the heading fragments.
3. Contrast: check every stop against the section's background (the tone, after Brand colours) at 3:1, the large-text
   threshold, with the shared colour helpers in src/lib/color. Show a warning, never an error, plus "Suggest an
   accessible shade" (OKLCH lightness, as Brand colours does).
4. Rendering: RichHeading (src/components/ui/rich-heading.tsx) builds the gradient from validated hex and angle only (no
   free CSS from content). Keep the forced-colors and no-background-clip fallbacks and box-decoration-break: clone.
5. Who sees it: the same people who can highlight words today. Note in the README that custom colours bypass the brand
   palette on purpose.
6. Tests: unit tests for validation, the CSS built from stops, contrast warnings; e2e for a custom gradient heading (one
   h1, right accessible name, axe); a section-gallery fixture; visual baseline at phone width.

DEFINITION OF DONE
- Default: Brand to ink, unchanged. Presets: the brand gradients by name. Advanced: Custom colours and angle.

ACCEPTANCE
- `npm run check` and `npm run test:e2e` pass.
```

## 108. Parallax: one preset, with strength and direction

```text
TASK
Replace the three Parallax presets with one, and give it a Strength and a Direction (down, up, left, right) under
Advanced: animation.

TODAY
- The Animation picker (src/lib/sanity/schema/section-style.ts) offers Parallax · Subtle, Medium and Strong
  (`parallax`, `parallaxMedium`, `parallaxStrong`), and Advanced: animation has an Intensity (Subtle, Normal, Bold) that
  multiplies them (INTENSITY_FACTOR in src/components/motion/presets.ts), so nine combinations and two ways to make it
  stronger.
- Parallax only moves vertically: the speed's sign is the direction (src/components/motion/parallax.tsx), and
  ParallaxImage scales the picture by 1 + 2 × amount × factor so no edge shows.
- Image design's Picture motion already says "Down (drifts with the scroll)" and "Up (moves against the scroll)"
  (IMAGE_DIRECTION_TITLES in src/lib/sanity/image-design-options.ts).

DESIGN
1. Animation picker: one "Parallax" picture, stored as `parallax`.
2. Advanced: animation, shown only for Parallax:
   - Strength: Subtle (default, today's Parallax · Subtle), Medium, Strong. Same speeds as today's presets
     (PARALLAX_SPEEDS), so existing pages look the same. A new field (for example `parallaxStrength`), so Intensity keeps
     its meaning for Float.
   - Direction, as four small pictures with arrows (preset picker, task 74): Down (default, drifts with the scroll:
     today's behaviour), Up (moves against the scroll), Left, Right. Use the same words and order as Image design's
     Picture motion.
3. Horizontal travel: Parallax gets an axis. For x, the travel is a share of the element's width instead of its height;
   the uniform scale ParallaxImage already applies (1 + 2 × amount × factor) covers it, because the overflow on each side
   is the same share of the width. Halve horizontal travel below `md`. Transform only, no layout, CLS unchanged.
4. Image design's Picture motion gains Left and Right with the same rule, so the two parallax controls speak the same
   language. The hero's per-part `parallax` (PART_PRESETS) uses the section's direction.

MIGRATION
- `parallaxMedium` becomes `parallax` with Strength Medium, `parallaxStrong` becomes Strong. Fold an old Intensity on a
  parallax section into the nearest Strength by resulting speed (unit-test the table). An idempotent defineMigration with
  the CI dry run (migrations/README.md). The site keeps reading the old values until the migration has run.

REQUIREMENTS
- Pure planning stays in presets.ts with unit tests (speeds, axis and sign for each direction, clamping).
- Reduced motion: still nothing moves. Memory test: no new listeners.
- E2E (tests/e2e/parallax.spec.ts): left and right change translateX, up and down change translateY; reduced motion has
  no transform. Gallery fixtures for each direction; visual baselines stay the same for existing content.
- README Section animation: the one preset, Strength, Direction, and the migration step in CHANGELOG.

DEFINITION OF DONE
- Default: Parallax drifts down with the scroll, subtly, exactly as today. Presets: Strength and Direction pictures.
  Advanced: exact values, as today.

ACCEPTANCE
- `npm run check` and `npm run test:e2e` pass, JavaScript budget unchanged.
```

## Smaller follow-ups

Each is Small; they can go in one task or be done one at a time.

- **109. Brand colours defaults:** with a colour empty, show the resolved default in the swatch and placeholder, labelled
  Default (report issue 3, `colour-input.tsx:88` and `:100`).
- **110. Start here cards:** bordered Sanity UI cards with an icon and chevron; _Edit your website_ as the primary card
  (issue 4).
- **111. Studio housekeeping:** a separate icon for Business info; _Identity & search_ renamed to name the browser icon;
  `startHere` removed from `CLIENT_STRUCTURE_IDS`; Presentation locations only once a slug exists; empty singletons
  created at setup so settings screens don't say "New …".
- **112. Hero subtitle from its preset:** move `matchPreset` to `src/lib/sanity/schema/` and show "Hero · Split, image
  left".
- Already planned: **task 88** (theme contrast, issue 1) and **task 07** (mobile menu, scenario G).

## 113. Link list: Glass rows (icon and thumbnail together, frosted glass)

Added 17 October 2026 from a client mock-up (Living Prana link page), reviewed against the code. Its background half is
task 114.

```text
TASK
Add a "Glass rows" look to the Link list: each row shows [flush thumbnail] [round icon badge] [title and description]
[round arrow badge] on a frosted-glass card, so a Link page can sit over a full-page photo. Everything is chosen in
Studio; nothing is specific to one client.

REFERENCE
[Attach the mock-up image, or save it as docs/mockups/link-page-glass-rows.png and mention it here.]

TODAY (verify in the code)
- src/features/pages/schemas/sections/link-list.ts: four layouts (LINK_LIST_VARIANTS: stacked "Minimal", cards,
  editorial, compact), the maximum a section may have, and five presets (LINK_LIST_PRESETS). Image-focused is a preset
  of Cards (cards plus thumbnailSize "large"), not a fifth layout.
- A link shows an icon or a thumbnail, never both: usesIcon and usesThumbnail decide which fields show, and the
  thumbnail's description says "Shown instead of the icon". Components are in
  src/features/pages/components/sections/link-list/ (stacked, cards, editorial, compact, link-list-parts with LinkVisual
  and ArrowIcon).
- Icons: BADGE_ICONS in src/lib/sanity/badge-icons.ts (8) drawn in src/components/ui/badge-icon.tsx;
  badge-icon.test.tsx fails until both exist. Badge rows (the hero slot) use the same set.
- buttonFeedback (src/components/ui/cta-link.tsx) is the shared hover and press feedback.

REQUIREMENTS
1. Layout: make Glass rows a sixth preset, not a fifth layout. Preferred: a preset of Minimal (stacked) that sets a
   new `rowStyle: 'glass'` field (default `solid`, so existing content renders exactly as today), with stacked.tsx
   drawing the glass row structure when it is set. If that makes stacked.tsx hard to follow, stop and tell me before
   adding a fifth layout (it breaks the four-layout rule in the README).
2. Row, left to right: a flush thumbnail filling the row's height on the left (rounded on the outer corners only),
   a round icon badge, the title and description, and an optional round arrow badge on the right (reuse ArrowIcon;
   aria-hidden). The whole row is one link: one Tab stop per row.
3. In Glass rows, icon and thumbnail can be used together: extend usesIcon and usesThumbnail, and make the field
   descriptions true for each layout ("Shown instead of the icon" only where that is still the case). Other layouts
   keep today's either/or.
4. New line icons in the shared set (1.5 px stroke, currentColor, 24 × 24 viewBox, matching the existing drawings),
   with generic titles because badge rows use the same list: hands with a leaf ("Care"), sunburst ("Sun"), overlapping
   circles ("Community"), person ("Person"), map pin ("Location"), envelope ("Email"), calendar ("Calendar") and phone
   ("Phone"). Add each to BADGE_ICONS and badge-icon.tsx; keep badge-icon.test.tsx passing.
5. Phones first: at 375 px the thumbnail is about 30% of the row, text wraps cleanly and each row is at least 44 px
   tall.

GLASS
6. Tokens, not hex: add glass tokens to src/styles/tokens.json and the generator, derived from the page colour so they
   follow Brand colours, Appearance (light or dark) and the section's background tone, for example
   `color-mix(in oklch, var(--color-surface) 70%, transparent)` for the surface, a light 1 px border and a soft shadow.
7. `backdrop-filter: blur(12–16px)`, with `@supports not (backdrop-filter: blur(1px))` and
   `@media (prefers-reduced-transparency: reduce)` both switching to a near-opaque surface.
8. Contrast: the photo behind is unknown, so measure the worst case, as the section background check does
   (src/lib/color/background-contrast.ts: the glass laid over pure black and pure white). Title and description must
   reach 4.5:1 at the default. Add Glass strength (Light, Medium, Strong) as presets, Medium by default, and warn in
   Studio when the chosen strength can fail.
9. Hover and focus: buttonFeedback plus a border change; the focus ring stays as globals.css draws it.
10. No client JavaScript: CSS and server components only. The home page budget has no headroom
    (tests/e2e/performance.spec.ts); if anything needs JavaScript, stop and tell me.

STUDIO COPY
Plain Australian English for agency staff and clients: no CSS terms in labels or descriptions.

TESTS
- Unit: the preset table includes Glass rows; field visibility per layout; icon list and drawing parity; the glass
  contrast check at each strength.
- E2E and visual: a Link page fixture with Glass rows over a background photo (task 114's options if merged, otherwise
  today's section Background image), at 375, 768 and 1280 px, with Brand colours Appearance Light and Dark. axe on
  the page; one Tab stop per row; the page renders fully without JavaScript. Run `rm -rf .next` after fixture edits.
  New baselines need the "Update visual baselines" workflow (Linux only).
- performance.spec passes; report the home page bytes before and after (expected: unchanged).

DEFINITION OF DONE (three levels)
- Default: existing link lists look exactly as they do today.
- Presets: Glass rows in the preset bar; Glass strength Light, Medium or Strong.
- Advanced: none needed.

ACCEPTANCE
- `npm run check` and `npm run test:e2e` pass. README "Link list" and CHANGELOG Unreleased updated. Leave the Link page
  template's default unchanged. PR summary with screenshots (glass over a photo, and at 375 px).
```

## 114. Section backgrounds: position, size, pattern, opacity and wash

Added 17 October 2026, the background half of the Living Prana request. It extends the shared section background from
task 82, so every section gains it, not only the Link list.

```text
TASK
Give the section Background image positioning, sizing, tiling, opacity and a light or dark wash, and let a section on a
minimal page fill the screen, so a Link page can have a full-page photo or a faint pattern at the bottom.

TODAY (verify in the code)
- Every section's Design tab (agency only) has Background, Gradient, Background image and Overlay
  (src/lib/sanity/schema/section-style.ts). The image covers the section, positioned by its hotspot.
- src/components/ui/section-background.tsx renders it as an absolutely positioned layer inside the `relative isolate`
  section (SanityImage fill, object-fit cover, hotspot object-position, lazy unless the first section), then the overlay
  in the tone's own colour at SECTION_OVERLAY_OPACITY (Light 45%, Medium 70%, Strong 88%).
- Image URLs use `.auto('format')` (src/lib/sanity/image.ts), which keeps transparency (WebP and AVIF have alpha). Check
  it with a transparent PNG and an SVG.
- Contrast warnings: src/lib/color/background-contrast.ts.
- No section can fill the viewport height today.

REQUIREMENTS
1. New Background image options, shown only with an image, in an "Advanced: background" area (the naming rule in
   README "Section forms"):
   - Size (presets): Fill the section (cover, today's default), Show the whole picture (contain), Actual size (no
     scaling, for small patterns).
   - Position, shown only for Show the whole picture and Actual size (Fill the section keeps using the hotspot):
     vertical Top / Middle / Bottom and horizontal Left / Centre / Right.
   - Repeat, shown only for Actual size: No repeat (default), Repeat across, Repeat down, Tile. Tiling uses a CSS
     background-image layer (SanityImage can't tile); every other mode keeps SanityImage.
   - Strength (presets): Full (default), Soft (60%), Faint (30%); an exact percentage under Advanced.
   - Overlay colour: Background colour (today's behaviour, the default), Light wash, Dark wash, using the existing
     Overlay strengths. Text colours still follow the tone; extend the contrast check to the wash colours and the image
     strength.
   - Stays put while scrolling (Advanced, off by default): a fixed layer clipped to the section (`clip-path: inset(0)`
     with a position: fixed image), because background-attachment: fixed doesn't apply to an image element. Desktop
     only, off under prefers-reduced-motion. Measure the scrolling cost; if it janks, drop the option and say so.
2. Fill the screen: a "Fill the screen" option on a section (or automatically for a single-section minimal page; choose
   and justify) giving `min-h-dvh`, so a Link page's background covers the whole viewport. Prefer this section-level
   change over a page-level background, and say why in the PR.
3. Map every choice to a fixed lookup of Tailwind classes or CSS variables in a pure, unit-tested function in
   src/components/ui/section-style.ts (no class names built from strings). For example Bottom + Centre gives
   `object-position: 50% 100%`.
4. Hide what doesn't apply and keep stale values visible with a warning, as the existing alignment and parallax rules do
   (src/lib/sanity/schema/section-form.ts). The hero keeps its own image and doesn't get these options.
5. GROQ: add the fields to sectionStyleFields in src/lib/sanity/fragments.ts with explicit paths (the fake Content
   Lake's groq-js rejects `..`); run typegen with the e2etest1 project id (not .env) and commit the types.
6. Loading: decorative, so alt="" (as today); lazy unless the section is first, where it is the likely LCP and keeps
   preload. Check LCP with Lighthouse on a fixture whose first section has a full-screen background.

TESTS
- Unit: all nine positions, each size, repeat, strength and wash; field visibility; contrast with each wash.
- E2E and visual: a Link page fixture with a full-screen photo, and one with a faint transparent pattern at the bottom
  (Actual size, Bottom + Centre, Faint) that is not cropped, at 375, 768 and 1280 px. axe; no JavaScript added;
  CLS unchanged. Run `rm -rf .next` after fixture edits; new baselines need the "Update visual baselines" workflow.

DEFINITION OF DONE (three levels)
- Default: existing backgrounds look exactly as today (Fill the section, hotspot, Full, Background colour overlay).
- Presets: Size, Strength and Overlay colour as named choices.
- Advanced: position, repeat, exact strength and Stays put while scrolling, each shown only where it applies.

ACCEPTANCE
- `npm run check`, `npm run test:e2e` and `npm run test:lighthouse` pass. README "Section backgrounds" and CHANGELOG
  Unreleased updated.
```
