# Studio audit, 17 October 2026

Task 89: a product design and usability review of the Studio, with the quick fixes made on branch
`studio-audit-quick-fixes`.

## How this audit was made

Two passes, both on 17 October 2026:

1. **Code review** of the schemas, `src/features/studio`, the desk structure, roles and custom inputs, plus the CMS
   brand kit baselines in `tests/e2e/studio-brand-visual.spec.ts-snapshots/`.
2. **Screenshots of the real Studio**: 16 PNGs in this folder, captured with Playwright at 1440 × 900 (and 1024 × 768
   for the starred screens) from the local Studio on this branch, signed in as an agency user. Screen 03 uses _Preview
   client view_. Capture notes are in `notes.md`.

The project's dataset is **empty**, so the screenshots show empty lists, new unsaved documents and a "Page not found"
preview. Six screens need content and are **not captured**: 07–09 (hero tabs), 15 (publish dialog), 16 (image upload
and crop) and 18 (Image + text design tab). Seeding demo content was stopped by a safety check. **Dark mode could not
be captured:** the Studio offers no dark scheme (finding 10).

Every finding is marked:

- **Seen**: visible in a screenshot in this folder or in the brand kit baselines.
- **Inferred**: read from code (the file is cited) but not yet seen on screen, mostly because it needs content.

## Summary

The Studio's structure is sound. The sidebar is grouped by what people do, the client sidebar is short and clear (03),
empty states are calm and readable (01, 04, 17), and the "Used on every page" banners on the settings screens (10–12)
are a good touch. The friction is in four places:

- **Colour and chrome.** The light theme uses a pale violet that fails contrast for selected items. Two different
  selection styles are in use, and Sanity's _Version_ / _Variant_ bar takes a full row on every screen, for clients
  too.
- **Misleading defaults.** On Brand colours the Primary swatch is black beside a blue hex. Start here's actions don't
  look clickable.
- **Naming.** There are four words for "more options", token jargon such as _Surface_, and raw values shown as labels
  (now fixed).
- **Two places for one thing:** gradients, parallax strength and the hero's background.

Five Small fixes are done (_Quick fixes made now_), and three more followed your decisions (issues 5, 6 and 7;
see _Decisions_). Scenario G can't be done yet because task 07 hasn't shipped.

## The ten highest-impact issues

Ranked by how often an editor meets the issue and how much it costs them each time.

| #   | Issue                                                            | Evidence        | Complexity | Everyday effect                               |
| --- | ---------------------------------------------------------------- | --------------- | ---------- | --------------------------------------------- |
| 1   | Pale violet selection fails contrast; two selection styles       | Seen (04, 10)   | M          | Every list, on every screen                   |
| 2   | Version and Variant bar on every screen, for clients too         | Seen (01–17)    | S          | 45 px and two jargon menus everywhere         |
| 3   | Brand colours: black swatch beside a blue hex; preview disagrees | Seen (10)       | S          | Wrong idea of the current primary colour      |
| 4   | Start here's actions don't look clickable                        | Seen (01)       | S–M        | Clients' first screen reads as a page of text |
| 5   | Five collapsed "more" areas with four different names            | Inferred        | S + M      | Agency hunts for options in every Design tab  |
| 6   | Background names are jargon and wrong on dark sites              | Inferred        | S          | Every section's Design tab and list subtitle  |
| 7   | Every page and post publish asks for confirmation                | Inferred        | S          | One extra click and dialog on every publish   |
| 8   | Two unrelated gradient lists, both called "Gradient"             | Inferred        | M          | Brand gradients never reach headings          |
| 9   | Clients see the Variants and Releases tools                      | Seen (03)       | S          | Two tools a client shouldn't need, in the bar |
| 10  | No dark mode in the Studio                                       | Seen (01, menu) | M          | Dark-mode users get a bright Studio           |

### 1. Pale violet selection fails contrast; two selection styles (Seen)

- **Evidence:** 04 (_Pages_ selected) and 10–12 (_Brand colours_, _Identity & search_, _Navigation_ selected) show
  white text on a pale violet fill, about 3:1 by eye against the 4.5:1 minimum. When focus moves one pane deeper, the
  parent item switches to a dusty pink tint with dark text (_Design_ in 10, _Website settings_ in 11). The active
  tool, the _Overview_ tab (01) and the _Content_ tab (05) use the same pink. So one screen shows two selection colours,
  neither of them the brand violet. The brand kit baseline
  (`studio-brand-currawong-light-desktop-linux.png`) shows the same on Primary buttons, and its "selected card" looks
  unselected.
- **Cause (code):** `src/features/studio/theme.ts` uses the dark-scheme accent (#9f80e5) for both schemes, because
  violet on ink is only 2.5:1. In light mode, white text then sits on a light violet.
- **Fix:** task 88, already written: primary and selected use the real accent (#5F2BD4) with white text in light mode,
  the "selected but not focused" state becomes a clear tint of the same violet, and neutrals come from the warm range.
  Add computed-contrast assertions to the brand kit test.
- **Effect:** selection is how editors know where they are; today it is low contrast and inconsistent on every screen.

### 2. Version and Variant bar on every screen, for clients too (Seen)

- **Evidence:** every screenshot has a second bar under the navbar: _Version: Draft_ and _Variant: All users
  (Default)_. Client view (03) and Start here (01) have it too. It comes from `beta: { variants: { enabled: true } }`
  in `sanity.config.ts`, which A/B experiments use.
- **Fix:** keep content variants for the agency, but turn the bar off for clients if Sanity allows it per user, or turn
  `variants` on only for sites with an A/B test (a site profile flag, like the other features). Needs a quick check of
  what Sanity 6 allows.
- **Effect:** 45 px less on every screen (it matters at 1024 px, see 05-1024), and clients never meet "Variant: All
  users (Default)".
- **Needs you:** do clients ever need variants?

### 3. Brand colours: black swatch beside a blue hex; preview disagrees (Seen)

- **Evidence:** 10 and 10-1024. With nothing set, the Primary swatch is **black** and the hex box shows **#3266e4** in
  grey. The swatch is the browser colour input's fallback (`value={hex ?? '#000000'}`,
  `src/features/site/components/colour-input.tsx:88`). The hex is a fixed example placeholder (line 100), not the
  site's default. In the preview above, _Primary button_ is near-black while _Primary section_ is blue.
- **Fix:** when a colour is empty, show the resolved default from `resolveDesignTokens` in both the swatch and the
  placeholder, with a "Default" label. Explain in the description that buttons use the near-black _cta_ colour until a
  Primary is set (README, Colour systems).
- **Effect:** scenario A's first decision starts from a wrong reading of the current colours.

### 4. Start here's actions don't look clickable (Seen)

- **Evidence:** 01 and 01-1024. The six actions are bold titles with grey text, with no border, icon, arrow or hover
  cue, so they read as a page of text. _Edit your website_, the action clients need most, has the same weight as
  _Help_. Below them, the empty states are good ("Nothing has been changed yet", "All good. Nothing needs your
  attention.").
- **Fix:** give each action a bordered card with an icon and a chevron (Sanity UI `Card` with `as="a"`), make _Edit
  your website_ the primary card, and keep the grid at two columns from 1024 px down. Code:
  `src/features/studio/start-here/components/start-here-tool.tsx`.
- **Effect:** the first screen a client sees after signing in.

### 5. Five collapsed "more" areas with four different names (Inferred)

- **Evidence:** in a split hero's Design tab: _More animation options_, _More edge options_, _More layout options_
  (`src/lib/sanity/schema/section-style.ts`), _More image options_ (`src/lib/sanity/schema/image-design.ts`) and
  _Advanced_ (`sectionFieldsets`, holding Proportion and the per-part animation from `hero.ts`). Links and heading
  highlights also say _Advanced_ (`link.ts`, `heading-text.ts`). The tab can show four picture grids (Background,
  Animation with up to 10 options, Bottom edge with 6, Image shape) before any collapsed area.
- **Fix:** (S) one naming rule, for example "More … options" for fine-tuning under a control and _Advanced_ only for
  the agency-only area at the end. (M) Order the tab as the page reads: Background → Bottom edge → Animation → Layout.
- **Effect:** the agency opens these on every section; the same idea under four names costs a scan each time.
- **Needs you:** which word. Screens 08 and 09 will show how long the tab really is.

### 6. Background names are jargon and wrong on dark sites (Inferred)

- **Evidence:** `SECTION_TONE_TITLES` in `src/lib/sanity/section-style-options.ts`: _Surface_, _Soft_, _Dark_,
  _Accent_. _Surface_ is the token name, not a word an editor uses. _Soft_ is described as "A light grey band"
  (`section-style.ts`) but follows Brand colours' _Alternate background_, so it is often not grey. With Brand colours
  _Appearance_ set to Dark, the inverse tone becomes the light one (`design-settings.ts`), so _Dark_ is then wrong.
  The names appear in every section's list subtitle ("Hero · Split · Surface").
- **Fix:** rename the titles only (stored values stay), for example _Page_, _Tinted_, _Contrast_, _Brand_, with
  descriptions by role. Update the README hero preset table.
- **Needs you:** the four names.

### 7. Every page and post publish asks for confirmation (Inferred)

- **Evidence:** `src/features/studio/actions/confirm-publish.tsx`: `onHandle` opens "Publish changes to …?" on every
  publish of a page or post outside a content release. The redirect offer only matters when the address changed
  (`detectAddressChange`). Screen 15 is not captured yet.
- **Fix:** publish straight away when the address hasn't changed, and keep the dialog for a first publish and for an
  address change.
- **Effect:** a client fixing a typo publishes with two clicks instead of three.
- **Needs you:** whether the "are you sure" on every publish was a deliberate safety net for clients.

### 8. Two unrelated gradient lists, both called "Gradient" (Inferred)

- **Evidence:** heading highlights offer three fixed gradients from code (`src/config/heading-gradients.ts`: _Brand to
  ink_, _Brand to green_, _Brand to red_) in a collapsed _Advanced_ inside the highlight popover
  (`src/lib/sanity/schema/heading-text.ts`). Section backgrounds offer the named gradients from Brand colours. A
  gradient the agency adds in Brand colours never reaches headings, and "Brand to green" uses the _success_ colour.
- **Fix:** headings offer _Brand to ink_ plus the Brand colours gradients (with task 79's 3:1 check per stop), or the
  lists get distinct names (_Text gradients_, _Background gradients_).
- **Needs you:** one list or two.

### 9. Clients see the Variants and Releases tools (Seen)

- **Evidence:** 03 (client view): the navbar shows _Start here_, _Presentation_, _Structure_, _Variants_ and
  _Releases_. `AGENCY_ONLY_TOOLS` in `src/features/studio/utils/tool-access.ts` hides Vision, AI settings and Content
  health only.
- **Fix:** add the variants tool to `AGENCY_ONLY_TOOLS`. Keep _Releases_ if clients schedule posts with it (README,
  Blog: "Use a content release to schedule one"), otherwise hide it too.
- **Needs you:** whether clients schedule with releases.

### 10. No dark mode in the Studio (Seen)

- **Evidence:** the user menu offers only _Sign out_, with no Appearance choice. With the browser set to dark and
  `sanityStudio:ui:colorScheme` set to `dark`, the Studio still renders `data-scheme="light"` everywhere (checked in a
  browser on 17 October). The brand kit (`studio-brand-currawong-dark-desktop-linux.png`) and `theme.ts` build a dark
  scheme that nobody can reach.
- **Fix:** find out why the scheme is locked (the legacy theme from `buildStudioTheme`, or a Sanity 6 change) and
  restore the Appearance menu, or decide the Studio is light-only and stop maintaining the dark scheme.
- **Needs you:** light-only, or dark mode back.

## Other issues

Lower impact, or waiting for screens that need content:

- **Two controls for parallax strength** (Inferred): _Parallax · Subtle / Medium / Strong_ plus an _Intensity_ that
  scales them (`section-style.ts`). On a split hero, Parallax is hidden while _Image design → Picture motion_ moves the
  same picture (`image-design.ts`, `hero.ts`). Keep one strength control; point Animation's description to Picture
  motion for split layouts.
- **Browser icon hidden inside "Identity & search"** (Seen 11, Inferred for the icon field further down): nothing in
  the sidebar says "icon", and _Business info_ is a separate top-level item. Rename the item (_Name, logo & icon_) or
  give the icon its own tab.
- **Hero list subtitle doesn't name the preset** (Inferred): "Hero · Split · Surface" for both split presets
  (`section-variant.ts`). Use the matching preset's name; `matchPreset` must move to `src/lib/sanity/schema/` first.
- **Empty settings screens say "New …"** (Seen 10–12): "New Identity & search", "New Navigation", "New Brand colours"
  read as if a second one is being created. Sanity draws this for a singleton with no document yet; seeding each
  singleton at setup (the setup wizard) avoids it.
- **"Used on one page" / "Used on 2 pages" on new, unsaved documents** (Seen 05, 17): Presentation's locations panel
  (`src/features/studio/presentation.ts`) counts where a page or post would appear before it has an address. Return no
  locations until the slug is set.
- **Section insert menu shows two rows at a time** (Seen 06): the popover is about 360 px tall with empty space below
  it, so 8 of the 21 choices (20 sections and a shared section) show and the rest need scrolling. The thumbnails also vary in weight: _Call to action
  banner_ is a solid violet block that pulls the eye. A list view exists (the icon at the right of the search box).
- **Agency view strip** (Seen 01–17): the current mode (_Agency view_) is a muted badge and the other mode is the
  coloured link, so the strip reads backwards. In client view (03) the amber strip is clear.
- **Mobile menu settings don't exist yet** (Inferred): task 07, scenario G.
- **Sanity's "What's new" card** (Seen, all) sits over the bottom of the sidebar until dismissed. It's Sanity's own UI,
  so no change is proposed.

## Scenarios A–H (estimates)

Estimates from the schema, the desk structure and the screens captured so far, **not timed with people**. A click is a
pointer action (open, choose, press); typing and scrolling are not counted. A decision is a choice between
alternatives. Counts start from the Studio home with the relevant page already created.

| Scenario                               | Path (estimate)                                                                                                                                                           | Clicks | Decisions | Likely wrong turns                                                             | Meets task 77 target?                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- | ------------------------------------------------------------------------------ | --------------------------------------------- |
| A. Primary colour, preview             | Design → Brand colours → Primary swatch → pick → check the in-form mock-up → Publish → Presentation                                                                       | 6–7    | 2         | The black swatch (issue 3); _Website settings_ sounds right; no "view on site" | Probably, once issue 3 is fixed               |
| B. Split hero with all parts           | Page → Sections → Add → Hero → preset _Split, image right_ → type eyebrow, title, description → 2 × (Add button → choose page → style) → upload image → Publish → confirm | 18–20  | 6         | Preset bar vs Design tab for layout                                            | Yes, at 6 decisions (if preset is one choice) |
| C. Gradient on three words             | Open hero → select words → _Highlight_ → _Gradient_ → close (gradient defaults to _Brand to ink_)                                                                         | 5–6    | 1–2       | Looking for the Brand colours gradient (issue 8)                               | Yes                                           |
| D. Statistics row under hero heading   | Open hero → _Extra content under the heading_ → Add → _Statistics bar_ → 3 × (Add item → value, label) → _Number format_ for $ or +                                       | 10–13  | 1–4       | Adding a separate Stats section instead; agency only (clients can't add one)   | Yes for the agency; phone layout not checked  |
| E. Hero image moves; make it stronger  | Open hero → Design → Animation → _Parallax · Subtle_. Stronger: _Parallax · Medium/Strong_ or More animation options → Intensity                                          | 3–5    | 2–3       | On Split the option isn't there (it's Picture motion); two strength controls   | Partly                                        |
| F. Wave between two coloured sections  | Open upper section → Design → Bottom edge → _Wave_                                                                                                                        | 3–4    | 1         | Looking at the lower section first                                             | Yes                                           |
| G. Mobile submenus slide in as a panel | Not possible: no Mobile menu settings yet                                                                                                                                 | –      | –         | Navigation has Header and Footer only (12)                                     | No (task 07)                                  |
| H. Browser icon from the logo          | Website settings → Identity & search → scroll to _Browser icon_ → _Use the site logo_ → copy button → crop → padding and background → Publish                             | 8–10   | 3         | Design, Business info                                                          | Yes once found; findability is the risk       |

Run task 77 with people to replace these estimates with real counts.

## Quick fixes made now

Each is its own commit on `studio-audit-quick-fixes`. None changes stored data: only titles, descriptions, option
labels, field order and preview subtitles. Screens 12 and 17 already show fixes 3 and 4.

1. **Call-to-action button style in words.** _Variant_ → **Button style**, options _Filled_ and _Outline_ (stored
   `primary`, `secondary`), with a line on when to use each; the list subtitle shows the same words. (`cta.ts`)
2. **Image side in words.** _Image left_ and _Image right_ in the hero and Image + text; Image + text gets its missing
   title and description, and its list subtitle names the side. (`hero.ts`, `media-text.ts`, new `image-side.ts`)
3. **Blog post editor: the article first.** Body moves up to follow the main image, then categories, author and date,
   matching `docs/editor-guide/write-a-blog-post.md`. The post list subtitle shows the date (as the blog formats it)
   and author instead of the URL. (`post.ts`)
4. **Navigation help.** _Footer Text_ → **Copyright line**; the header menu explains its seven-link limit; the header
   button, footer links and menu link label say where they appear. (`site-navigation.ts`, `nav-item.ts`)
5. **One name for the colour screen.** Field help, warnings and the gradient picker said _Design settings_; they now say
   **Brand colours**, as the sidebar does. (`section-style.ts`, `background-contrast.ts`, gradient picker, styleguide,
   README)

## Decisions (answered 17 October 2026)

| #   | Question                           | Answer                                                            | What happened                                                  |
| --- | ---------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Do clients need variants?          | Yes, for marketing content                                        | Variants bar and tool stay for clients (issues 2 and 9 closed) |
| 2   | Do clients schedule with Releases? | Yes                                                               | Releases stays for clients                                     |
| 3   | Dark mode?                         | Prefer dark, but offer both                                       | Task 106 (`plan-tasks.md`)                                     |
| 4   | "More options" naming              | _Advanced_ everywhere                                             | Done: _Advanced: animation / edge / layout / image_ (issue 5)  |
| 5   | Background names                   | _Page_, _Tinted_, _Contrast_, _Brand_                             | Done (issue 6)                                                 |
| 6   | Publish confirmation               | Only first publish and address changes                            | Done: `needsPublishConfirmation` (issue 7)                     |
| 7   | Heading gradients                  | Editors pick their own colours, even non-brand                    | Task 107                                                       |
| 8   | Parallax strength                  | One preset plus strength, and a direction (up, down, left, right) | Task 108, with a design for direction and a migration          |

On 4: several of these areas share one Design tab, so each leads with _Advanced_ and names what it tunes; areas that
hold one control's options stay plain _Advanced_. Dropping the qualifiers is a one-line change if you want the bare word.

## Still open

Small follow-ups (tasks 109–112 in `plan-tasks.md`): Brand colours defaults (issue 3), Start here cards (issue 4), Studio
housekeeping (Business info icon, _Identity & search_ name, `startHere` in `CLIENT_STRUCTURE_IDS`, locations only once a
slug exists, no "New …" on empty settings) and the hero subtitle from its preset. Already planned: **task 88** (theme
contrast, issue 1) and **task 07** (mobile menu, scenario G).

## Screenshots

Captured (1440 × 900, light): 01 · 02 · 03 · 04 · 05 · 06 · 10 · 11 · 12 · 13 · 14 · 17. Also at 1024 × 768: 01, 05,
10, 13 (`-1024`).

Not captured:

- **07, 08, 09, 15, 16, 18:** need a page with a hero and an Image + text section, an unpublished change and an image.
  Seed the dataset (or use one with content) and re-run the capture.
- **Dark mode (01, 05, 07, 08, 10, 13):** the Studio has no dark scheme (issue 10).
