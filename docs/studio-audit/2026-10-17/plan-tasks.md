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
