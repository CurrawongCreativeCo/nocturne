# Changelog

All notable changes to the template are recorded here, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Projects pull these releases in with
the steps in the README's [Updating from the template](README.md#updating-from-the-template).

What a version number means for a project that merges it:

- **Major**: needs a migration step (a schema change that touches existing content, a renamed file or
  env var, a changed convention). Read its _Breaking changes / migration steps_ first.
- **Minor**: new features. Existing projects keep working; the new schema types and sections are
  available but nothing is switched on in your content.
- **Patch**: fixes and dependency updates.

Every release has a _Breaking changes / migration steps_ section, even when it says "None", so you
can tell "nothing to do" from "forgot to write it". Copy the block under [Unreleased](#unreleased) when
you start a release.

## [Unreleased]

### Added

- **Video section:** _Add item → Video_ with two layouts. _Embed_ (default) is a poster and a Play button
  ("Play video: <title>") for YouTube, Vimeo or an uploaded MP4; **no third-party script, iframe or request loads until
  the click**, then one iframe (`youtube-nocookie.com`, or `player.vimeo.com` with `dnt=1`) with autoplay and a title,
  and a "Plays from YouTube/Vimeo" note. Uploaded video is a native `<video controls preload="none">` with the poster
  and an optional WebVTT captions track. _Ambient_ (uploaded MP4 only) is a muted, looping, `playsInline` background
  video with a visible Pause button (WCAG 2.2.2), the poster instead under reduced motion, and a Studio warning for
  files over 5 MB. Fields: title, description, source, address or file, poster (required), captions, shape (16:9, 4:3,
  1:1, 21:9). Address parsing is shared by validation and the page (`video-source.ts`, unit tested). The security headers
  already allow the outbound iframes (checked by `tests/e2e/video.spec.ts`). Two small client components, no Motion, loaded
  lazily so pages without a Video section download neither; the JavaScript budget is unchanged. The hero's "background video" note now points to the Ambient layout. Add the new
  section's screenshot baselines with the **Update visual baselines** workflow.
- **Animate individual parts (hero):** an agency-only switch in the hero's Design → Advanced area. Off by default; when on,
  one compact row per part the layout and content actually have (eyebrow, heading, intro text, buttons, extra content,
  picture, background picture) with an animation (Inherit, None, Fade, Rise, Reveal, Slide, Scale, and Parallax for the
  pictures) and a delay (Auto, Short, Long). Auto follows a sequence 80 ms apart. Sections declare their parts in code
  (`HERO_PARTS`, `PartSpec`); `resolvePartMotion` (`src/components/motion/part-motion.ts`, unit-tested) resolves the component
  default, then the section's animation, then the part's own choice, and ignores combinations that make no sense. The first
  section's heading and pictures never start hidden and ignore Fade, Reveal and Scale (a clip-path Reveal on the heading
  moved the Lighthouse LCP from 1.55 s to 4 s); Reveal is a `clip-path` wipe with opacity untouched. No new client
  components; `/hero-parts` joins the Lighthouse run. Content needs no migration: a hero without `partMotion` looks as
  before, except that below the first section a hero with its own entrance no longer also staggers its text on load.
- **Section animation presets:** the Animation picker is now a small library with moving previews (still under reduced
  motion): _None_, _Fade up_, _Subtle entrance_ (12 px rise), _Fade_, _Slide in_, _Staggered_, _Float_ (a picture drifts
  slowly in a loop, paused off screen) and _Parallax_ in three strengths. Level 1: sections start on a default for their kind
  (`MOTION_DEFAULTS`: content fades up, heroes and logo strips stay still). Level 3: a collapsed **More animation
  options** shows only what the chosen preset uses: intensity (Parallax), duration, delay, direction (Slide in), when it plays,
  and _Set exact values_ (duration, distance, easing, how much must be in view; validated and clamped). All presets are typed
  data in `src/components/motion/presets.ts` behind one unit-tested `resolveMotion`. The first section stays still unless
  _On load_ is chosen, and then never starts at opacity 0. Parallax travels half as far below `md`; Float runs on phones at half
  travel. Stored `reveal` is still _Fade up_ and `parallax` still the original Parallax (now _Parallax · Subtle_), so no migration
  is needed; **content with no animation stored now fades up on content sections** (it stayed still before). `Float` is a
  CSS animation with an IntersectionObserver pause, in its own lazily loaded chunk, so the home page's JavaScript does not
  grow. `SectionFrame`'s fixed `MEDIA_PARALLAX_SPEED` is gone, code that reads `sectionTraits().motion`
  now see the new preset names, and `style` gains ten `motion*` fields (run `npm run typegen`). Hero layouts share
  `HeroBackground`. See the README's "Section animation".

- **Team (Studio and site):** new `teamMember` document (name, role, square portrait with required alt text, short bio of
  up to 300 characters, rich-text bio, qualifications, public email, phone, social links, `order` and an optional page
  address) in a new `src/features/team` feature, and a **Team** section with **Grid**, **Slider** and **List** layouts that
  shows everyone in team order or the members an editor picks, in their order. The members are resolved inside the
  section's GROQ fragment (no extra request), and cards (portrait, name, role, short bio, a transform-only hover lift) are
  drawn in the pages feature. Optional profile pages at `/team/<slug>` with `Person` JSON-LD, metadata, real 404s and
  sitemap entries; the new `teamProfiles` site-profile switch (on by default) turns them off and hides their fields. The
  desk's **Team** entry is a drag-to-reorder list (with up and down buttons for keyboard and touch) that writes the
  `order` field; Presentation resolves `/team/<slug>`. `team/<anything>` is a reserved page path, but a page called `team`
  is fine. `splitSitemapRange` is replaced by `splitSitemapRanges` (any number of lists). **To adopt:** add `teamMember` to
  the Sanity webhook filter in webhook mode; a client site with its own `site.profile.ts` may add `teamProfiles: false`.
  Visual baselines for `team-grid`, `team-slider` and `team-list` need the **Update visual baselines** workflow. See the
  README's "Team".

- **Style guide (`/section-gallery`):** the section gallery is now a living style guide for client design reviews. The
  **Sections** view gets links above each section to switch its tone and layout, and a **375 / 768 / 1280 px** width
  preview built from container widths (no iframes; a small PostCSS step, `scripts/postcss-container-frames.mjs`, gives
  the stylesheet container-query copies of its responsive rules and is left out of Vercel production builds). The choices
  live in the URL. A new **Design tokens** view (`/section-gallery/tokens`) shows the colours in use with their WCAG
  contrast ratios, the type scale, spacing, radii, shadows and motion samples (still under reduced motion). It stays a 404
  in production; on Vercel preview deployments it opens with `?preview=<STYLEGUIDE_PREVIEW_TOKEN>`. Never indexed, and
  the fixture page behind it is left out of the sitemap. With nothing chosen the gallery renders as before, so the visual
  baselines are unchanged. New feature folder `src/features/styleguide`. See the README's "Style guide".

- **Gallery section (Studio and site):** up to 60 pictures (required alt text, optional caption) in a **Grid**, **Masonry**
  or **Slider** layout, with **Columns** (2–4) on the Design tab. Grid and masonry are CSS only; the slider is the shared
  `Slider`. Each thumbnail is a button ("Open image 3 of 12: …") that opens a full-screen native `<dialog>` lightbox with the
  Slider at full size, a counter, the caption, Previous and Next, arrow keys, Escape and swipe down to close, and focus
  returning to the picture that opened it. The lightbox is downloaded on first open (`next/dynamic`), so the page's initial
  JavaScript does not grow, and only the current and neighbouring full-size pictures load. New `shouldDismiss`
  (`src/components/ui/swipe-dismiss.ts`) decides whether a drag closes a panel, ready for a drawer to reuse. `Slider` gains
  optional `initialIndex`, `onIndexChange`, `dots`, `directionLock` and `ref` props (defaults unchanged). Visual baselines
  for `gallery-grid`, `gallery-grid-four`, `gallery-masonry` and `gallery-slider` need the **Update visual baselines**
  workflow.
- **Location section (Studio and site):** shows the address, opening hours, phone and email from Business info with a
  "Get directions" link (map coordinates when set, otherwise the encoded address) and either an optional map image or
  address cards. Fields: title, intro, map image, show hours, show the "Open now" badge, show phone and email and the
  directions label; agencies can offer an interactive map (Design tab → Advanced). No Google iframe, script or request
  is on the page: the optional interactive map loads only after a click, with a note that it comes from Google. Uses the
  shared `OpeningHours` and `OpenNowBadge`. Business info is resolved by the route (`getLocationBusiness`, no new query)
  and passed down as `SectionProps.business`; **projects with their own routes that render `PageView` or
  `SectionRenderer` should pass `business` too**, or Location sections render nothing there. `ctaClassName` is now
  exported from `cta-link.tsx`. Visual baselines for `location`, `location-image`, `location-interactive` and
  `location-address-only` need the **Update visual baselines** workflow.
- **Start here Studio tool:** the first screen a client sees (`src/features/studio/start-here/`), listed first for client
  roles and also available to staff. It greets the person by first name and names the site, shows shortcut cards driven
  by the site profile (Edit your website, Write a blog post, Update the team, Business info and opening hours, Help),
  the eight newest changes with who made them and when (en-AU, "2 days ago"), and up to five things to check in plain
  words (links to unpublished pages, images without descriptions, drafts waiting over seven days) using the
  content-health detectors. Help shows `help.guideUrl` and "Ask Currawong" with `help.supportEmail` and a copy button.
  New optional `OPS_NOTICES_URL` / `OPS_NOTICES_KEY` env vars add notices from the Ops dashboard through a server route,
  `/api/ops-notices` (204 when unset; the key stays on the server). `help.supportEmail` is new in `site.profile.ts`.
  `START_HERE_QUERY` is in the generated types (run `npm run typegen`).
- **Site profile:** `site.profile.ts` (a Customize file, calling `defineSiteProfile`) declares the client, tier
  (`brochure`, `content`, `commerce`, `custom`), which features the site uses (`blog`, `forms`, `newsletter`,
  `pricing`, `members`, `experiments`, `search`, `businessInfo`, `team`), the section types clients may add and
  help links. `src/config/profile.ts` holds the types, defaults, validation and `isFeatureEnabled()`, and adds
  `templateVersion`. A disabled feature controls visibility only (the schema is unchanged): its routes answer 404
  (blog and `feed.xml`, search and `/api/search`, sign-in, sign-out and `/api/auth/*`), the checkout action refuses,
  the sitemap, `robots.txt` and `llms.txt` leave posts out, the header hides search, and the Studio desk and _New
  document_ menu hide Blog, Forms, A/B tests, Stripe prices and Team. `/api/site-info` gains `tier` and `enabled`.
  Features left out of the profile stay on, so nothing changes until a site edits it.
- **Business info (Studio and site):** a new `businessInfo` singleton (sidebar → _Business info_, visible to clients)
  for Australian businesses: trading and legal name, ABN (ATO checksum, grouped as `12 345 678 901`), phone and public
  email, address (state, 4-digit postcode), time zone, opening hours (days, opens and closes with closes-after-opens
  checking), public holidays and special days, service areas, social profiles, and (agency only, under _Advanced_)
  the schema.org business type, map coordinates and price range. It is folded into `SETTINGS_QUERY` (no extra request).
  The footer gains a band with the address, ABN, a `tel:` link that also shows the number, the email and the grouped
  hours ("Mon–Fri 8:00 am – 5:30 pm") from a shared server-rendered `OpeningHours`, with a small client-only
  `OpenNowBadge` that uses the document's time zone. `SiteJsonLd` emits the chosen LocalBusiness subtype with
  `PostalAddress` (`AU`), `telephone`, `geo`, `openingHoursSpecification`, `sameAs` and `priceRange`, built by a unit-tested
  pure function. Nothing changes until the document is created. See the README's _Business info_.
- **Slider and a Testimonials slider layout (Studio and site):** an accessible touch slider (`Slider`, with
  `LazySlider` for server components) on Motion's drag: swipe or drag with elastic ends, a spring to the nearest slide
  chosen from distance and velocity (`snapIndex`, unit tested), Previous and Next, "Go to slide n" buttons and the arrow
  keys, `inert` slides out of view, carousel/slide ARIA with a polite "Slide n of N" announcement, and
  `touch-action: pan-y` so phones still scroll the page. Without JavaScript it is a horizontal scroll-snap list; it
  shifts nothing when the script takes over; reduced motion jumps instantly. Optional autoplay (off, not in the CMS)
  pauses on hover and focus and has a Pause button. The Testimonials section gains a **Layout** picker (_Grid_, the
  default and unchanged, and _Slider_ showing one, two or three quotes at a time). Existing content is unchanged and
  needs no migration; run `npm run typegen` after merging. The slider's spring costs about 22 KB gzipped if imported
  eagerly, so server components must import `LazySlider`; the home page stays at 217.3 KB (budget 220 KB). Visual
  baselines for `testimonials-slider` and `testimonials-slider-inverse` need the **Update visual baselines** workflow.
- **Hero supporting content (Studio and site):** the hero gains one approved slot, **Extra content under the heading**,
  holding a **Statistics bar**, **Badges** (one to three short labels with an optional icon) or **Logos** (up to six,
  greyscale by default), chosen from pictures in the insert menu. Full background and Split place it under the buttons,
  Editorial beside the text (under the small picture) and Image with panel inside the panel; it takes the hero's tone and
  joins the entrance after the buttons, and sits still under reduced motion. Agency staff add or remove it; clients edit
  what is in it, and see the field only once it has content. A new slot type is one schema object, one component and one
  line in `components/sections/hero/slots.tsx` (README, _Adding a hero slot_). `StatsBar` now sizes by its own width
  (container queries) so it suits any column, and its dividers are cut by an `overflow-hidden` box instead of
  first/odd rules. New shared types `badgeRow` and `logoRow`, GROQ `heroSupportingFields`, and the `fadeUpAfter` motion
  preset. The field is optional, so existing content is unchanged and needs no migration. Run `npm run typegen` after
  merging. Visual baselines for the new gallery entries (`hero-slot-*`) need the **Update visual baselines** workflow.
- **Statistics (Studio and site):** a **Stats** section (layouts _Inline_ and _Cards_; title, intro and one to six
  figures) and a compact **statistics bar** component for the hero's upcoming statistics slot. Each figure is a number
  with a label and optional prefix, suffix and decimal places, formatted on the server with `Intl.NumberFormat('en-AU')`,
  so the real figure is in the HTML without JavaScript and under reduced motion. Unless the section's Animation is _None_,
  the figures count up from 0 once when scrolled into view (a small `CountUp` island loaded only on pages that use it, so
  the home page budget is unchanged; the counting text is `aria-hidden` with a visually hidden final value, and
  `tabular-nums` with a fixed width prevents layout shift). The bar has thin dividers, takes the surrounding tone and wraps
  two by two on phones. New shared types `statItem` and `statsBar`, GROQ fragments `statItemFields` / `statsBarFields`, and
  a gallery page at `/section-gallery/stats-bar`. Existing content is unchanged and needs no migration. Run
  `npm run typegen` after merging. Visual baselines for the new gallery entries (`stats-*`) need the **Update visual
  baselines** workflow.
- **Section dividers (Studio and site):** a section can end in a shape: **Diagonal, Wave, Curve, Arch or Layered wave**,
  chosen from pictures under _Bottom edge_ in the Design tab (agency only). The section below shows through the cut,
  whether it is a flat tone, a gradient or a picture, and moves up to meet it, with its spacing adjusted automatically.
  Options: **Edge height** (Small, Medium, Large; smaller on phones), **Flip**, an **Accent line** in a brand colour and,
  for the layered wave, its **back wave colour**; a collapsed area has **Invert** and a **custom height** per screen size.
  Options that do nothing for the chosen shape are hidden and ignored. The edge belongs to the upper section, so it moves
  with it and a shared section carries its own. The shapes live in `src/components/ui/section-edges.ts` and are cut with
  `mask-image` (with the `-webkit-` prefix); browsers without mask support show a straight edge. The footer takes the
  last section's edge. New optional fields `style.edge`, `edgeHeight`, `edgeFlip`, `edgeAccent`, `edgeLayer`, `edgeInvert`
  and `edgeHeightMobile`/`Tablet`/`Desktop`; new optional `edge` group in `tokens.json` (defaults apply when it is missing).
  Existing content is unchanged and needs no migration. Run `npm run typegen` after merging. Visual baselines for the new
  gallery entries (`edge-*`) need the **Update visual baselines** workflow.
- **Section backgrounds (Studio and site):** beyond its tone, a section can have a **brand gradient** (picked from the
  gradients in Design settings) and a **background image** with an **overlay** (None, Light, Medium, Strong), all in the
  Design tab's _Background_ area. The gradient picker appears only when Design settings has gradients; the image is not
  offered for the hero, which has its own. An image on a dark tone starts at Medium, others at Light. `SectionFrame`
  draws the layers (gradient, picture, overlay) in an absolutely positioned, `aria-hidden` wrapper, so nothing shifts;
  the picture is lazy unless the section is first. Studio warns when body or secondary text may fall below 4.5:1 on the
  chosen overlay or gradient. New fields `style.gradient`, `style.image` and `style.overlay` are optional, so existing
  content is unchanged and needs no migration. Gradient slugs now come from `src/lib/color/gradients.ts`, shared by the
  design tokens and the Studio. See the README's _Section backgrounds_. Visual baselines for the new gallery entries
  (`features-grid-gradient-*`, `media-text-background-*`) need adding with the "Update visual baselines" workflow.
- **Hero presets (Studio and site):** a hero is chosen as a design. The Content tab opens with six pictures (_Full
  background image_, _Split, image right_, _Split, image left_, _Centred text, no image_, _Editorial_, _Image with
  panel_), each setting the layout, image side and background in one click, with _Full background image_ (dark) the
  default. The four layouts and their stored values are unchanged, so no migration is needed; the old Layout picker is
  hidden and the labels are now _Full background_ and _Image with panel_. _Split_ gains two agency-only options in the
  Design tab's Advanced area: _Proportion_ (50 / 50, 60 / 40 text, 40 / 60 image) and _Image shape_ (Rounded, Square
  corners, Circle, Arch). Hero pictures keep the editor's hotspot in view through `object-position`
  (`src/lib/sanity/image-focus.ts`). Layout audit fixes: _Split_'s picture is capped at 24 rem tall on tablets, and
  _Image with panel_ without a picture no longer leaves a tall empty block. The preset bar is hidden from clients and
  reads a section's own initial values when matching, so older heroes without a style show the right preset. New
  gallery entries and end-to-end tests cover every preset and shape; background video comes with task 18. See the
  README, _Hero presets_.
- **Highlighted heading words (Studio and site):** editors select words in a hero title and pick how they stand out:
  _Brand colour_, _Gradient_, _Highlight colour_ or _Underline_. A new shared type `headingText`
  (`src/lib/sanity/schema/heading-text.ts`) is a Portable Text array of one plain block whose only formatting is an
  `emphasis` annotation; the treatment is a preset picker with thumbnails, and the gradient choice sits in a collapsed
  Advanced area shown only for Gradient. `<RichHeading>` (`src/components/ui/rich-heading.tsx`) renders the right `h1`/`h2`
  with plain `<span data-emphasis>` wrappers (no `em`, `strong` or `mark`, so the accessible name is just the words;
  Visual Editing markers survive). The gradient uses `background-clip: text` with `box-decoration-break: clone`, a solid
  accent where that isn't supported and a system colour under forced colours. Studio warns above two highlighted phrases,
  past the length guidance and when a treatment is under 3:1 against the section's tone (large text; every gradient stop is
  checked). The hero uses it in every layout; `heading` is read first and the old `title` is the fallback. GROQ returns
  `heading` and `"headingPlain": pt::text(heading)`. Gradient presets live in `src/config/heading-gradients.ts`; underline
  thickness and offset and the highlight strength are the new optional `emphasis` tokens in `tokens.json`. The same type
  will follow for media + text, CTA banner and features grid titles. See the README's "Highlighting words in a heading".

- **Brand colours and gradients (Studio):** a `designSettings` singleton under Design → Brand colours (agency only, UI
  only) lets the agency set _Primary_, _Secondary_, _Highlight_ and a Light or Dark _Appearance_, with a collapsed
  _Advanced_ area for the full palette and 2–3 stop gradients. A Studio colour input (`ColourInput`) gives a picker, a
  hex field, AA pass or fail badges and "Suggest an accessible shade" (OKLCH lightness), and a mock-up previews the
  palette. `resolveDesignTokens` (pure, unit-tested) turns the settings into `:root` CSS variable overrides for only the
  roles that are set, derives text on Primary, accent text, hover colours, tints and the dark swap, adjusts derived text
  to AA and reports warnings that Studio validation shows. It is folded into `SETTINGS_QUERY` (new `designSettings`
  tag; add it to the webhook filter), rendered by `SiteShell` as one server `<style>` (nothing when unset, so the
  default is exactly `tokens.json`), and the share image uses the resolved accent. New tokens: `accent-text`,
  `accent-2`, `accent-2-ink`, `highlight`, `highlight-ink`, `cta`, `cta-ink`. New `design` and `design-visual` e2e
  projects. See the README's "Colour systems".

- **Preset picker thumbnails (Studio):** one visual language of small theme-aware SVG wireframes (4:3, readable at
  160 px) in `src/lib/sanity/schema/thumbnails/`, with a registry keyed by the values stored in
  content: the four hero layouts, the four animations (gently looping, still under reduced motion) and live tone
  swatches read from the design tokens. The insert-menu pictures in `public/section-previews/` are redrawn in the same
  language at 4:3, with a dark-mode variant. A unit test fails when a section type, variant, animation or tone has no
  thumbnail; `/studio-brand-preview` shows them all in light and dark. They replace the earlier plain pictures for the hero layouts, tones and animations in the section forms. See the README's
  "Thumbnails".

- **Section forms in three levels (Studio):** every section's form is now layout first, a short Design tab, and advanced
  options out of the way, implemented once in `sectionFields` so every section and `npm run new:section` get it. The
  **Layout** picker (`variantField`, now a preset picker with thumbnails) is first in the Content tab, and fields hide
  when the chosen layout doesn't use them (the hero's _Image_ is hidden for Editorial). The **Design** tab shows
  _Background_ (swatches drawn from `tokens.json`) and _Animation_ (pictures) with a collapsed _More layout options_ (space,
  width, alignment, anchor), and the nested "Design" box is gone (`options.frameless` plus `FramelessAwareField`). A
  collapsed _Advanced_ fieldset (`sectionFields`' `advanced` option, `sectionFieldsets`) appears only when a section
  has advanced fields. The layout picker, Design tab and Advanced are hidden from clients (UI only). No
  nonsensical combinations: Parallax is only offered where a section has a picture and Alignment is hidden where the
  layout fixes it (`rules` option; the hero's Split and Editorial), with a warning for a value left from a previous
  layout. List previews read "Hero · Split · Dark". `presetField` gained `hidden`, `fieldset`, `validation` and
  `visibleOptions`. Stored field names are unchanged: no migration, no change to the rendered site.

- **Preset picker (Studio):** one reusable input to choose by picture instead of a radio list, and a preset mode that
  sets several fields at once. `presetField` (`src/lib/sanity/schema/preset-field.ts`) makes a string field shown as a
  grid of cards; `presetsOption` puts a preset bar above an object's form. Both are activated by the existing global
  input override (`withPresetPicker`), so schemas never import Studio code. Radiogroup keyboard pattern, a collapsed
  "picture, title, Change" row, thumbnails as inline theme-aware SVG components or static files, and "Custom" when
  fields no longer match a preset. Unit tests plus an example on `/studio-brand-preview` with axe, keyboard and
  screenshot coverage. Nothing in the current sections uses it yet. See the README's "Preset picker (Studio)".

- **Navigation feedback:** a thin accent progress bar (`RouteProgress`, under 1 KB gzipped, no new dependency) for
  client-side navigations that take longer than 150 ms; instant navigations show nothing. Started by
  `onRouterTransitionStart` in `instrumentation-client.ts`, finished by a pathname or query change, with a 10 s safety
  timeout. It never animates under reduced motion. Timing logic is a unit-tested reducer; end-to-end tests cover
  fast, slow and reduced-motion navigations. See the README's "Navigation feedback".

- **Browser icon (favicon):** every site now shows Currawong's icon by default (`src/app/icon.png` 512 × 512 and
  `src/app/apple-icon.png` 180 × 180, made from the brand mark by `scripts/make-default-icons.mjs`), replacing the
  purple placeholder `icon.svg` and the generated `apple-icon.tsx`. A new _Browser icon_ setting in Website settings → Identity & search
  lets editors keep the default, upload a square PNG or SVG, or copy the site logo and crop it, with
  padding (None, Small, Medium), a background (Transparent, Light, Dark, Brand) and a preview at 16, 32 and 180 px on
  light and dark browsers. Custom icons are Sanity CDN PNGs (32, 192, 512 and 180 px) set through `metadata.icons`
  from the existing settings query, so there are no duplicate `<link rel="icon">` tags and no uploaded SVG markup in
  the page. The launch check now warns while a site still uses Currawong's default favicon and verifies a custom
  icon loads as a PNG of the right size. New `tests/e2e/browser-icon.spec.ts`. See the README's "Browser icon (favicon)".

- **Parallax:** a lightweight `Parallax` primitive (`src/components/motion/parallax.tsx`, Motion's `useScroll` and
  `useTransform`) and `ParallaxImage` for pictures. The _Parallax_ animation preset now works: the hero overlay and
  full-bleed backgrounds move behind their text, and `SectionFrame` has a `media` slot that the image + text section
  uses. Transform only, no scroll listener of our own, no layout shift, and never moved or scaled for visitors who
  ask for less motion. New `/parallax` fixture page and `tests/e2e/parallax.spec.ts`. The scroll code is a separate 6.6 KB gzipped chunk loaded only by pages that use it (the home page grows
  by 0.4 KB). See the README's "Motion".

- **Section variants:** a section can have several layouts that share one data contract. A `variant` radio field in
  the Design group (`variantField`) picks the layout; a folder holds a dispatcher (`index.tsx`, unknown values fall
  back to the first variant) and one component per variant. The hero has four: `overlay` (the previous look, still
  the default), `split` (with an image side), `editorial` (oversized type, optional small picture) and `full-bleed`
  (edge-to-edge picture, text panel bottom left). New hero fields: `eyebrow`, `secondaryImage`, `imagePosition`. The
  Studio list subtitle shows the layout ("Hero · Split"). `npm run new:section <name> -- --variants a,b,c` scaffolds
  the folder, the field and one gallery placeholder per variant; CI smoke-tests it. At most four variants per
  section. See the README's "Section variants".

- **Section style:** every page-builder section has a **Design** field group with one shared `style` object
  (`sectionStyle`): tone (surface, soft, dark, accent), spacing, width, alignment, an anchor id (unique per page, checked
  by the page's Sections field) and an animation preset (none, fade up, staggered, parallax). A new `SectionFrame`
  (`src/components/ui/section-frame.tsx`) renders each section's `<section>` from it; the style-to-class mapping is the
  unit-tested `resolveSectionStyle`. Tones recolour children through CSS variables generated into
  `tokens.generated.css`, and the focus outline switches to the light ink on the dark tones. `npm run new:section` writes
  the Design group, the `sectionStyleFields` fragment and a `SectionFrame` into new sections. The section gallery shows
  every tone and spacing on two sections. See the README's "Section style".

### Changed

- **Sitemap:** the pages count and slice queries (`PAGE_COUNT_QUERY`, `PAGE_SITEMAP_QUERY`) skip the reserved
  `section-gallery` slug, so the style guide's fixture page can never be listed. Run `npm run typegen` after merging.

- **Cursors and feedback:** every interactive control now shows the right cursor from shared CSS (`globals.css`):
  pointer for enabled controls, `not-allowed` for disabled ones. The per-component `cursor-pointer` classes are gone,
  disabled controls use the muted tokens and ignore hover, and `CtaLink` has a short hover/active transition that is
  switched off under reduced motion.

- The sections' markup moved into `SectionFrame`: the `<section>` now wraps a content container `<div>`, and the
  Testimonials band, Hero and CTA banner take their colours from the tone mechanism (the banner's own tone now colours its
  card through `data-tone`). The plan badge in the pricing table uses `bg-ink text-surface`. An empty style renders as before.

- **Studio sidebar:** regrouped by what people do: Start here (when it exists), Pages, Blog, Reusable content (Shared
  sections, Forms), Website settings, Design (hidden until it has screens) and Advanced (Redirects, A/B tests, Stripe
  prices and the catch-all list). Clients see Start here, Pages, Blog and Website settings (Identity & search,
  Navigation, Announcement bar). See the README's "Editing content".
- **Site settings split into four singletons:** `siteIdentity` (Identity & search), `siteNavigation`, `announcement`
  and `cookieBanner` replace the single `settings` document. `SETTINGS_QUERY` assembles them into the same result
  shape in one request, so components are unchanged. The webhook filter, cache tags (`TAGS`), Presentation locations,
  Content health, the SEO preview and the seed content follow.

- **Tones and buttons read the new colour roles:** primary buttons (`CtaLink` and the form, search and sign-in buttons)
  use `bg-cta text-cta-ink` and accent-coloured text uses `text-accent-text`; both default to the values they had
  (`surface-inverse`/`ink-inverse` and `accent`), so the site looks the same. The accent tone now takes its text and focus
  outline from `--tone-accent-ink` (the old rule resolved `--color-ink` to the accent itself, so text matched the
  background).

### Fixed

### Breaking changes / migration steps

**Site profile:** after merging, edit `site.profile.ts` (take the template's file, then set `client.name` and `client.slug`,
the tier, and `features: { … : false }` for what the site doesn't use). Until you do, every feature stays on and nothing
changes. The Studio's approved sections now come from the profile's `clientSections` (empty: the same default list)
instead of a `siteProfile` document, which was never part of the schema; `CLIENT_SECTIONS_QUERY` is gone.

**Business info:** run `npm run typegen` after merging (`business` is new in `SETTINGS_QUERY`), add `businessInfo` to the
webhook filter's `_type` list (README, "Live mode vs. webhook mode") so a change shows without a redeploy, and create
the document in Studio when you want it used. No migration. The e2e fixture gains a `businessInfo` document, so the
visual baselines need the "Update visual baselines" workflow.

**Highlighted heading words:** the hero gains a `heading` field next to its old `title` string, and the code reads
`heading` first, so deploying needs no migration and existing heroes look the same. Run
`migrations/hero-title-to-heading-text` on every dataset so editors see the title in the new field (dry run first; commands
in the README's "Highlighting words in a heading"); it is safe to repeat and keeps `title`. The old field is removed in a
later release. Run `npm run typegen` after merging. `tokens.json` gains an optional `emphasis` group (a file without it
gets the defaults), so run `npm run tokens`. Visual baselines gain the `hero-heading-*` gallery entries: refresh them
with the "Update visual baselines" workflow.

**Brand colours:** run `npm run typegen` after merging (`designSettings` is new in `SETTINGS_QUERY`), add
`designSettings` to the webhook filter's `_type` list (README, "Live mode vs. webhook mode") so a colour change
publishes without a redeploy, and refresh the visual baselines with the "Update visual baselines" workflow (the accent
tone's text is now correct, and the new `design-visual` screenshots need first baselines). A project with its own
primary buttons can switch them to `bg-cta text-cta-ink` to follow the Primary colour; a project that edited
`tokens.json` must add the seven new colour tokens (`npm run tokens` lists them).

**Browser icon:** `src/app/icon.svg` and `src/app/apple-icon.tsx` are deleted and `icon.png` and `apple-icon.png` added. A
project that replaced them with its own logo keeps its files (delete the template's PNGs, or keep the old `icon.svg`:
Next.js serves every file-based icon it finds, so remove whichever set you don't want), or sets the icon in Studio
instead. Run `npm run typegen` after merging (`browserIcon` is new in Site settings and `SETTINGS_QUERY`).

None required for content: sections without a style look as they did. Run `npm run typegen` after merging. If a project
has its own sections, wrap them in `SectionFrame`, add `style { ${sectionStyleFields} }` to their fragments and use
`sectionFields([...])` in their schemas (see the README's "Section style"); until then they keep working but have no
Design tab. Visual baselines gain the new `*-style-*` gallery entries: refresh them with the "Update visual baselines"
workflow.

**Section forms in three levels:** no content migration (field names are unchanged) and the rendered site is
identical. A project with its own sections adds `fieldsets: sectionFieldsets` next to `groups: sectionGroups` in each
section type (without it an Advanced fieldset has nowhere to render) and, optionally, `rules` for Parallax and
Alignment (see the README's "Section style"). A project that registered its own `form.components.field` composes
`FramelessAwareField` (`src/features/studio/components/frameless-field.tsx`) into it. Clients no longer see the Design
tab or the layout picker, and the hero's _Image side_ moved to the Content tab. Run `npm run typegen` (field order
changes only).

**Section variants:** `components/sections/hero.tsx` is now the folder `components/sections/hero/`. A project that
edited the old file merges its changes into `hero/overlay.tsx` (the same look) or `hero/hero-text.tsx` (the text shared
by every layout). Run `npm run typegen`. Existing heroes keep the overlay look; new heroes no longer store an
alignment, so the layout chooses it. Visual baselines gain the `hero-*` gallery entries: refresh them with the "Update
visual baselines" workflow.

- Run `migrations/split-site-settings` on every dataset (dry run first; commands in the README's "Sanity workflow").
  Until it has run, the site reads the old `settings` document, so the deploy and the migration can happen in either
  order. Add `siteIdentity`, `siteNavigation`, `announcement` and `cookieBanner` to the Sanity webhook's filter
  (replace `settings`) in webhook mode.

## [1.3.0] - 2026-10-14

### Added

- **Launch check and screenshot sweep.** `npm run launch:check -- <url>` checks a deployed site before go-live: HTTPS
  and redirects (HTTP, www and apex), the security headers, `/studio`, a real 404, canonical URLs, `robots.txt` and the
  sitemap (every URL returns 200, capped at 200), unique titles and descriptions, one `h1` per page, `noindex`
  leftovers, `og:image`, the placeholder favicon, template copy and localhost links, the Sanity dataset privacy and
  CORS (a manual reminder when the token can't read the list), the unsigned-webhook 401, and optional PageSpeed
  Insights (`PSI_API_KEY`). It prints pass, warning and fail lines with a fix for each, exits 1 on any failure and
  takes `--json`. `npm run launch:screens -- <url>` saves 375, 768, 1280 and 1920 px screenshots of every sitemap URL
  into `launch-screens/<date>/` (gitignored). Each check is a pure, unit-tested function in `scripts/launch-check/`.
  New step 8 in the README's deploy checklist and a _Launch check_ section.
- **Safer publishing.** Publish on pages and posts now confirms "Publish changes to <full URL>?" and, when a live
  page's slug changed, offers (ticked by default) to publish a permanent redirect from the old address. It follows the
  redirect document's rules (no duplicate source, no loop; chains only noted). Delete on pages lists the menus, pages and
  shared sections that link to the page, reusing the Content health link detection. The logic is pure and tested
  (`utils/publish-redirect.ts`, `utils/incoming-links.ts`); the actions are `actions/confirm-publish.tsx` and
  `actions/confirm-delete-page.tsx`, registered in `sanity.config.ts` beside `singletonDocumentActions`. Wrapping Sanity's
  own Publish keeps validation and the roles' action filtering working.
- **Role-aware Studio.** Agency staff (Administrator, Developer) keep the full Studio; Editors and Contributors get
  a simpler, safer one. Clients lose Vision, AI settings and Content health, and see Presentation first; the sidebar
  shows only Site settings, Pages, Blog (and Team and Business info when present); the members-only `access`
  fields, SEO _Hide from search engines_ and the _Search & AI_ and _Cookie banner_ settings groups are hidden; a
  page's slug locks once set; Delete and Duplicate are removed on pages, posts and singletons; Contributors lose
  Publish; _New document_ offers only the page templates, posts, authors and categories; and the page builder's
  _Add item_ menu lists only approved sections (a default list, or `siteProfile.clientSections` when it exists).
  Staff get an **Agency view** badge and a switch to preview the client view. These are Studio conveniences: the
  README's _Studio roles and permissions_ matrix says what Sanity itself enforces. Adds
  `docs/studio-roles-test-script.md`. Clients must hold Editor or Contributor, never Administrator.
- **Image and text guidance.** `imageField` takes `aspect`, `minWidth`, `orientation` and `preferSvg`: the
  description gains "Recommended: 2400 × 1600 px, landscape." and Studio warns (never errors) when the
  uploaded picture is too narrow or more than 15% off the target shape, in plain English. The comparison is
  the pure, tested `describeImageProblem`. Applied to hero backgrounds (2400 px wide), _Image + text_
  (1600 px, 4:3), testimonial and author portraits (800 px, square) and logos (SVG preferred). New
  `lengthWarning` helper warns when section titles and intro text exceed the design (limits in a `LIMITS`
  constant beside each section schema).
- **Studio brand preview and tests.** `/studio-brand-preview` (development and `E2E_GALLERY=1` only; `noindex`,
  reserved slug, not in the sitemap) renders Sanity UI under the Studio theme for four brands in light and dark.
  Playwright runs axe, keyboard focus, brand-accent and Linux screenshot checks against it
  (`studio-brand-preview.spec.ts`, `studio-brand-visual.spec.ts`). `StudioLogoView` renders a logo for any brand and
  scheme, `StudioLogo` is unchanged for Studio. Known colour-contrast gaps in the legacy theme are listed in the spec
  and the README. The **Update visual baselines** workflow now uploads every `*.spec.ts-snapshots` folder.
- **CMS brand system.** The Studio now has its own brand, separate from the public design tokens:
  Currawong defaults in `src/config/studio-brand/currawong.ts`, an optional per-site `studio-brand.json`
  (default `{}`) with logo files in `src/assets/brand/client/`, and `resolveStudioBrand` with the
  precedence rules (client wins; identity falls back field by field; colours as a whole set; client
  colours used for text, focus and selected states are lifted to WCAG contrast with a warning). New
  `npm run check:studio-brand`, run by CI. See the README's _CMS branding_.
- **Branded Studio.** The resolved CMS brand now themes Studio: a theme adapter
  (`src/features/studio/theme.ts`, the only file using the deprecated `buildLegacyTheme`; it falls back to
  Sanity's default theme if a future major removes it), a navbar logo with light and dark variants, the
  workspace icon (also on the sign-in screen) and the workspace title. Sanity's fonts and success, warning and
  danger colours are unchanged. A unit test fails on CSS aimed at Sanity UI internals. New
  `npm run brand-assets` generates `src/config/studio-brand/assets.generated.ts` (run by `predev` and
  `typegen`; commit it).
- `src/lib/color/`: hex <-> OKLCH conversion, WCAG contrast and lightness adjustment.

- **CMS branding works with no setup.** `studio-brand.json` ships with only a `$schema` line (still Currawong's
  branding), `studio-brand.schema.json` gives VS Code autocompletion and validation (the Ops dashboard will use
  it too), and `src/assets/brand/client/` has a README saying which logo files go there. The setup wizard asks
  nothing new; its final screen and terminal output say how to brand the CMS for a client. `$schema` is
  accepted by `npm run check:studio-brand`.

### Changed

- `src/lib/contrast.ts` moved to `src/lib/color/contrast.ts`.
- `scripts/build-tokens.mjs` shares its colour conversion with `src/lib/color/oklch.ts` (it now needs
  Node's TypeScript stripping, on by default from Node 22.18).
- The Studio logo mark takes its colours from the CMS brand, not the public `accent` token.

### Fixed

- Blog and members e2e tests look up headings and text inside `#main-content`, which removes an intermittent
  strict-mode failure on CI (React can leave a hidden streaming segment next to the revealed copy). Tests only.

### Breaking changes / migration steps

- **Add `studio-brand.json`** (`{ "$schema": "./studio-brand.schema.json" }`, or `{}`) at the repo root, with
  `studio-brand.schema.json` beside it, and merge the new `tsconfig.json` option
  `allowImportingTsExtensions`.
- **Removed `src/config/brand.ts`** (the deprecated `brandColor`, `brandColorHex` and
  `brandForegroundColor`) and the `studioBrand` export of `tokens.generated.ts`. Use `colorHex` and
  `colorOklch` for public colours; use `src/config/studio-brand/client.ts` for Studio colours. Run
  `npm run tokens`.
- The Studio logo mark is now Currawong violet (or the client's primary) instead of the public accent.
  For a site created before this release that wants the old look, set `colors.primary` in `studio-brand.json`
  to the `accent` hex from `src/styles/tokens.json`.
- **Studio roles (Sanity role change).** The Studio is now role-aware and merges through `sanity.config.ts` (it
  registers the publish and delete actions and the role-aware structure, tools and insert menu). Give agency staff
  Administrator or Developer, and give every client user **Editor or Contributor, never Administrator**, or they
  keep the full Studio. Optionally add `siteProfile.clientSections` to limit the page builder's _Add item_ menu. Walk
  through `docs/studio-roles-test-script.md` once per site.
- **Tooling.** Node 22.18 or newer is needed (`scripts/build-tokens.mjs` uses Node's TypeScript stripping). Merge
  the new `package.json` scripts, run `npm install` and `npm run typegen`, then commit the regenerated
  `src/config/studio-brand/assets.generated.ts` and `src/types/sanity.types.ts`. Merge the new
  `check:studio-brand` step in `.github/workflows/ci.yml`.
- **Visual baselines** change (new Studio brand preview snapshots): run the _Update visual baselines_ workflow
  and commit the images from every `*.spec.ts-snapshots` folder.
- No new required env vars. `PSI_API_KEY` is optional, for the PageSpeed step of `npm run launch:check`.

## [1.2.0] - 2026-10-14

### Added

- **Design tokens.** `src/styles/tokens.json` is the one file that re-skins a site: semantic colours
  (`surface`, `ink`, `accent`, `line`, `focus`, status colours), fonts, a fluid type scale, section
  spacing, widths, radii, shadows and motion. `npm run tokens` (also run by `typegen`, `build` and
  `dev`) writes `src/styles/tokens.generated.css` (Tailwind 4 `@theme` plus `:root` variables) and
  `src/config/tokens.generated.ts` (hex and oklch values, motion in seconds). CI fails when the
  generated files are stale.
- Tests: generated output matches `tokens.json`; every token pairing reaches WCAG 2.2 AA contrast
  (`src/lib/contrast.ts`); no component uses a raw palette class (`palette-ok: <reason>` is the escape hatch).
- README "Design tokens" section.
- **Motion.** `motion` (pinned) with `LazyMotion` + `m` and the `domMax` bundle loaded after first render
  (`src/components/motion/`: provider in `SiteShell`, `MotionDiv` and friends for server components, shared presets built
  on the motion tokens). ESLint bans `framer-motion` and the `motion` component from `motion/react`. `[data-reveal]`
  elements show without JavaScript and under reduced motion. The first hero fades up its description and buttons.
  The home page JavaScript budget (`JS_BUDGET_KB`) rises from 200 to 220 KB to pay for it. README "Motion" section, `motion.spec.ts`, and the e2e suite now runs with reduced motion by default.
- `npm run check:dataset` (`scripts/check-dataset.mjs`) fails when the dataset is public.
- A test that fails if a client module imports `lib/sanity/token.ts`.
- README "Dataset privacy" section and a deploy checklist step.
- **Version endpoint.** `GET /api/site-info` returns `{ templateVersion, features, commit, builtAt }` for the Ops
  dashboard: which optional features are configured (`forms`, `newsletter`, `pricing`, `members`, `analytics`,
  `sentry`, from the same env checks the features use), `VERCEL_GIT_COMMIT_SHA` and the build time. Booleans and
  public identifiers only, never an env value. It is prerendered, so it reports the environment of the last build.
- `template-version.json` (a core file) stamps the template release a site was last updated to;
  `src/config/template-version.ts` reads it. `next.config.ts` adds a `BUILT_AT` build-time value.
- Release tooling: `npm run release -- x.y.z` moves the _Unreleased_ entries into a dated section, updates the compare
  links and `template-version.json`, and prints the git commands to commit, tag and push (it never runs git).
  `npm run check:version` fails when `template-version.json` and the latest changelog heading disagree; CI runs it.

### Changed

- Every section, shared component, the header, footer, mobile menu, announcement bar, blog, forms, search, auth and
  consent views use semantic token utilities (`bg-surface`, `text-ink-muted`, `py-section`, `text-h2`, `rounded-card`)
  instead of Tailwind greys, widths and `py-24`. The defaults reproduce the previous look; see the README for the
  few places a grey step collapsed into a token.
- The Studio's name is now the CMS brand's: `studio-brand.json`, else `NEXT_PUBLIC_STUDIO_TITLE`, else
  "Currawong Creative" (it was "Content" when the variable was unset). The Studio logo no longer reads the
  public accent.
- The OG image and the Studio logo read `src/config/tokens.generated.ts`. `src/config/brand.ts` stays as a
  deprecated alias, `brand.test.ts` is replaced by the token tests, and `--color-brand`, `bg-brand` and
  `text-brand-foreground` are aliases of `accent` and `accent-ink`.
- The setup wizard creates datasets as **private**, and server-side published reads send the Viewer token
  (still through the API CDN). The fake Content Lake used by the e2e tests now refuses reads without a token.
- **Lighthouse: `/about` may take up to 3000 ms to paint its largest element (was 2500 ms); `/` stays at 2500 ms.**
  Performance, accessibility and CLS limits are the same for both pages (`lighthouserc.json` now asserts per URL).
  Reason: on a first visit, which is all Lighthouse sees, the largest element on `/about` is the cookie banner's text,
  and the banner only renders after hydration (about 2.8 s under Lighthouse's throttling). The README's _Why `/about`
  has a looser LCP limit_ explains how to tighten it again.

### Breaking changes / migration steps

- **Design tokens:** merge `src/styles/globals.css` (it now imports `tokens.generated.css`; your `--color-brand` moves
  to `accent` in `src/styles/tokens.json`), run `npm run tokens`, commit the generated files, then replace raw palette
  classes in your own sections with token utilities (`npm test` lists them). Visual baselines need refreshing.
- **Existing sites:** after deploying this change, switch the dataset to private (sanity.io/manage → API → Datasets, or
  `npx sanity dataset visibility set <dataset> private`), then run `npm run check:dataset`. Make sure
  `SANITY_API_READ_TOKEN` is set in every environment first. Sanity's Free plan only offers public datasets; check sanity.io/pricing.
- After merging, run `npm install` (adds `motion`) and `npm run typegen`, and commit the regenerated `src/types/sanity.types.ts`.
  `template-version.json` is a core file: take the template's version.

## [1.1.0] - 2026-10-14

### Added

- Content migrations and schema deploy from CI. `migrations/` holds an example `defineMigration` (a field rename,
  with a unit test) and a README on when a schema change needs a migration, how to dry-run and how to run one.
  `.github/workflows/sanity.yml` dry-runs every migration against the production dataset on pull requests that touch
  schemas or migrations (secret `SANITY_MIGRATION_READ_TOKEN`) and runs `sanity schema deploy` on push to `main`
  (secret `SANITY_DEPLOY_TOKEN`); both skip with a notice when the secret is absent. CI never runs a real migration.
  New: `migrations/**/*.test.ts` joins the unit tests.
- Generators for features, documents and singletons: `npm run new:feature`, `new:document` and `new:singleton`,
  built like `new:section` (marker comments, everything checked before writing, then ESLint, Prettier and typegen).
  They add marker comments to `eslint.config.mjs`, `sanity.config.ts`, each feature's `schemas/index.ts`,
  `src/lib/sanity/live.ts` and the studio feature's `structure.ts` and `singletons.ts`; keep them when merging.
- Section gallery and visual regression tests: `/section-gallery` (development and `E2E_GALLERY=1` only; 404
  otherwise) renders every section type and variant from the end-to-end fixtures, and
  `tests/e2e/visual.spec.ts` screenshots each on desktop and mobile against Linux baselines kept in the repo.
  `npm run test:e2e:update` refreshes them. `npm run new:section` now adds a placeholder gallery fixture
  and reminds you to add the baseline. `section-gallery` is a new reserved first slug segment.
- Optional Sentry error tracking (`@sentry/nextjs`, `src/lib/sentry`). With `SENTRY_DSN` set, server errors
  from `onRequestError` (the JSON log line stays) and browser errors from `error.tsx` and `global-error.tsx`
  are sent to Sentry with the error digest as a `digest` tag; `global-error.tsx` now also shows the
  "Reference" code. The SDK is loaded lazily and removed from the build when the DSN is unset.
  `SENTRY_AUTH_TOKEN` (with `SENTRY_ORG`, `SENTRY_PROJECT`) uploads source maps at build time. New
  variables: `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`.
  See the README's _Error tracking_.

- Newsletter signup section (`newsletterSignup`, with `src/features/forms`). Heading, text, button label and
  success message; the form reuses the contact form UI, Turnstile, validation and rate limiting with its own
  server action (`subscribeNewsletter`). The provider is chosen by `NEWSLETTER_PROVIDER` (`resend`, `loops`
  or `mailchimp`), one module each behind a shared `NewsletterProvider` interface; Mailchimp uses double
  opt-in. The answer never depends on whether the address was already subscribed. `PageView`,
  `SectionRenderer` and `SectionProps` take an optional `renderNewsletter`; `ContactForm` gains optional
  `action`, `successMessage` and `failureTitle`. New variables: `NEWSLETTER_PROVIDER`, `LOOPS_API_KEY`,
  `LOOPS_MAILING_LIST_ID`, `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `NEWSLETTER_RESEND_SEGMENT_ID`. See the
  README's _Newsletter signup_.

- Pricing table backed by Stripe prices (`src/features/pricing`, section `pricingTable`). A signed Stripe
  webhook (`/api/stripe/webhook`) mirrors prices into read-only `stripePrice` documents using a
  server-side `SANITY_WRITE_TOKEN`; editors pick prices by reference, add features per plan and
  highlight one. Amounts are formatted with `Intl.NumberFormat` (`lib/format-price.ts`). A server action
  creates a Stripe Checkout Session for the chosen, active price and redirects; success and cancel URLs
  come from `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`. New `stripePrice` tag and webhook-filter entry;
  `PageView`, `SectionRenderer` and `SectionProps` take an optional `renderCheckout`. New variables:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SANITY_WRITE_TOKEN`. In webhook mode, add `stripePrice`
  to the Sanity webhook's filter. See the README's _Pricing table_.

- Members-only pages and sections (`src/features/auth`, Auth.js / next-auth v5 with JWT sessions). A new
  `access` field (`public` | `members`) on pages and on every section, including the `new:section`
  template. Members-only content is withheld from the cached public `PAGE_QUERY` (new `$members`
  parameter) and fetched only after a gate (`MembersOnly`, inside `<Suspense>`) has seen a session;
  anonymous visitors get a sign-in prompt and none of the content. Members-only pages are `noindex` and
  left out of the sitemap, `/llms.txt` and search (so is the text of members-only sections). New
  `/sign-in`, `/sign-out` and `/api/auth` routes; `sign-in` and `sign-out` are reserved first slug
  segments. Providers (GitHub, Google) and the member allow-list (`AUTH_ALLOWED_EMAILS`) come from
  environment variables. `PageView` now needs a `renderMembersGate` prop and `getPage` a `members`
  argument. See the README's _Members-only content_. The A/B test spec now runs as its own Playwright
  project after the others, since a running experiment rewrites requests that other specs make.

- Site search (`src/features/search`): a `/search?q=` page (a plain GET form that works without
  JavaScript, results announced in a live region) and a quick search dialog opened from a new header
  link or Ctrl/Cmd+K, backed by `/api/search`. One `SEARCH_QUERY` over page titles, meta descriptions
  and rich-text / image + text bodies, cached per query text for a few minutes through the new
  `shortLivedSanityFetch` in `lib/sanity/live.ts`. `SiteHeader` and `DraftSiteHeader` take a `search`
  slot; `search` is now a reserved first slug segment. See the README's _Site search_.
- Analytics with a consent banner (`src/features/consent`). Plausible, PostHog and Google Analytics 4
  (Consent Mode v2) load via `next/script` only after the visitor accepts analytics, chosen by
  `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_POSTHOG_KEY` (`NEXT_PUBLIC_POSTHOG_HOST`) and
  `NEXT_PUBLIC_GA_ID`; with none set there is no banner. Accept all / Reject all / Choose, a _Cookie
  settings_ link in the footer, and banner text in a new Site settings → _Cookie banner_ group
  (`SETTINGS_QUERY` gained `consent`). `@vercel/analytics` (cookieless) is added to the public site.
  `SiteFooter` takes an optional `extra` slot. End-to-end tests now start as a visitor who rejected
  cookies. See the README's _Analytics and cookie consent_.

- A/B tests with Sanity content variants and the Vercel Flags SDK (`flags`). A new _A/B tests_ document
  type (name, running, control traffic, variants with traffic). While one runs, `proxy.ts` assigns each
  visitor a sticky option (cookie `ab`) and rewrites to `/ab/<code>/<path>`, a prerendered copy of the
  page per option, so published pages stay static. `<main>` carries `data-experiment` and
  `data-variant` for analytics. `ab` is now a reserved page slug. See the README's _A/B tests_.

- `/llms.txt` and an _Allow AI crawlers_ switch (Site settings → _Search & AI_, on by default). When it is
  off, `robots.txt` disallows GPTBot, ClaudeBot, Google-Extended, PerplexityBot and CCBot, and `/llms.txt`
  answers 404. `/llms.txt` lists indexable posts too. `PAGE_INDEX_QUERY` and `BLOG_INDEX_QUERY` now also return titles and descriptions. Run `npm run typegen`
  after merging.

### Changed

- The site layout's markup moved to `src/app/(site)/site-shell.tsx` (the layout now wraps it), so the A/B
  variant layout can reuse it. `src/proxy.ts` now also assigns A/B options; `cachedSanityFetch` sends
  fetches that name a variant through a client on Sanity's experimental API version.

### Breaking changes / migration steps

None required for the site to keep working; steps for what you use:

- Run `npm install` (adds `flags`, `@vercel/analytics`, `next-auth` and `@sentry/nextjs`), then `npm run typegen`.
- Add `'auth'` and `'consent'` to the `features` list in `eslint.config.mjs`.
- Rename any page whose slug is now reserved: `sign-in`, `sign-out`, `ab`, `search` or `section-gallery`.
- If you call `PageView` or `getPage` from your own routes, pass `renderMembersGate` and `members: false`.
- In webhook mode, add `"experiment"` and `"stripePrice"` to the webhook's filter.
- If you customized `src/proxy.ts` or `src/app/(site)/layout.tsx`, expect conflicts there.
- Visual tests need Linux baselines: run `npm run test:e2e:update` (Linux or Docker) and commit
  `tests/e2e/visual.spec.ts-snapshots/`. Keep your own `gallerySections` entries in the fixtures.
- Nothing new is switched on until configured: members-only content needs `AUTH_SECRET` and a provider,
  analytics needs a provider variable, A/B tests need `FLAGS_SECRET` and a running test, Sentry needs
  `SENTRY_DSN`, and migrations/schema deploy in CI need their secrets.

## [1.0.0] - 2026-10-13

First tagged release: the state of `main` when versioning began.

### Added

- Page builder on Next.js 16 (Cache Components) and Sanity Studio 6 embedded at `/studio`, with
  hero, features grid, media + text, logo cloud, testimonials, FAQ, CTA banner, rich text and form
  sections, plus `npm run new:section` to scaffold more.
- Site settings (header menu, footer, default metadata), nested pages with a page tree in Studio,
  shared sections, new-page templates and content Releases.
- One-time setup wizard (`npm run dev` in a fresh copy) that creates the Sanity project, token, CORS
  origins and starter content.
- Live and webhook modes for content updates, request-budget tooling and an Edge Config redirects
  layer synced on publish.
- SEO: sitemap (split into files of 45,000 URLs), robots, generated 1200×630 share images, Search and
  social preview in Studio, structured data (FAQPage, BreadcrumbList, Article) and IndexNow pings on
  publish.
- Blog module: post, author and category types, paginated index, categories, related posts and an
  RSS feed.
- Forms: an editor-built form section delivered by Resend, protected by Cloudflare Turnstile and a
  rate limiter, working with JavaScript off.
- Announcement bar, a personalized-content pattern, per-project Studio branding and AI-assisted
  fields (alt text, meta descriptions).
- Content health tool in Studio that lists problems across the site.
- Quality gates: strict TypeScript, ESLint with jsx-a11y strict and import-boundary rules, Prettier,
  Vitest, Playwright + axe end-to-end tests against a fake Content Lake, Lighthouse budgets, and CI
  (`check` and `e2e`) with SHA-pinned actions and grouped Dependabot updates.

### Breaking changes / migration steps

None. This is the baseline. A project created from the template before this tag has no shared
history marker to merge from; follow _Updating from the template_ in the README, which covers the
first merge (`--allow-unrelated-histories` is needed only when the project was created with GitHub's
**Use this template** button rather than a clone).

After merging, run `npm install` (dependencies changed) and `npm run typegen`, then commit the
regenerated `src/types/sanity.types.ts`.

[Unreleased]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/CurrawongCreativeCo/sanity-starter/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/CurrawongCreativeCo/sanity-starter/releases/tag/v1.0.0
