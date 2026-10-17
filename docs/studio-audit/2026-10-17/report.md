# Studio audit, 17 October 2026

Task 89: a product design and usability review of the Studio, with the quick fixes made on branch
`studio-audit-quick-fixes`.

## Read this first: the screenshots are missing

The 18 screenshots and `notes.md` this audit was meant to review have not been captured yet, so this folder has no
PNGs. This first pass therefore reviews the Studio **from its code** (schemas, `src/features/studio`, the desk
structure, roles and custom inputs) plus the only real renders in the repo: the Linux baselines of the CMS brand kit in
`tests/e2e/studio-brand-visual.spec.ts-snapshots/`.

Every finding below is marked:

- **Seen**: visible in a rendered image in the repo (the brand kit baselines).
- **Inferred**: read from code. The cited file is what the Studio draws, but I have not seen the screen, so spacing,
  density, typography, dark mode and the 1024 px layout are not judged.

The parts of requirement 1 that need real screens (hierarchy, spacing and density, typography, consistency of the custom
inputs with Sanity's own UI, empty states) are still open. When the screenshots exist, re-run task 89 against this
report: it should confirm or drop each Inferred item and add the visual ones.

## Summary

The Studio's structure is sound. It is grouped by what people do, clients get a short sidebar, the hero opens on picture
presets and conditional fields hide well. Most of the friction is in **naming** (four words for "more options", token
jargon such as _Surface_, raw values shown as labels), **two places for one thing** (gradients, parallax strength,
the hero's background) and the **theme's primary colour**, which fails contrast on the most-used button, Publish.

Five Small fixes are done (see _Quick fixes made now_). Scenario G can't be done yet because task 07 hasn't shipped.

## The ten highest-impact issues

Ranked by how often an editor meets the issue and how much it costs them each time.

| #   | Issue                                                                  | Evidence                 | Complexity | Everyday effect                                 |
| --- | ---------------------------------------------------------------------- | ------------------------ | ---------- | ----------------------------------------------- |
| 1   | Primary buttons fail contrast; selections barely show                  | Seen                     | M          | Every screen and picker                         |
| 2   | Five collapsed "more" areas with four different names                  | Inferred                 | S + M      | Agency hunts for options in every Design tab    |
| 3   | Background names are jargon and wrong on dark sites                    | Inferred                 | S          | Every section's Design tab and list subtitle    |
| 4   | Two unrelated gradient lists, both called "Gradient"                   | Inferred                 | M          | Brand gradients never reach headings            |
| 5   | Every page and post publish asks for confirmation                      | Inferred                 | S          | One extra click and dialog on every publish     |
| 6   | Two controls for parallax strength, and a third "move the image" place | Inferred                 | M          | Wrong turns in scenario E                       |
| 7   | Browser icon hidden inside "Identity & search"                         | Inferred                 | S          | Wrong turn in scenario H                        |
| 8   | Hero list subtitle doesn't name the preset; background set in 2 places | Inferred                 | S–M        | Page lists don't say which hero is which        |
| 9   | Mobile menu settings and submenus don't exist yet                      | Inferred (task 07 to do) | L          | Scenario G impossible                           |
| 10  | Raw values and missing help in shared fields                           | Inferred                 | S          | Clients met "primary", "left" and "Footer Text" |

### 1. Primary buttons fail contrast; selections barely show (Seen)

- **Evidence:** `tests/e2e/studio-brand-visual.spec.ts-snapshots/studio-brand-currawong-light-desktop-linux.png`. The
  swatch says the accent is #5F2BD4, but _Primary_ and the kit's dialog button render pale violet with white text (about
  3:1 by eye, under the 4.5:1 minimum). The real publish dialog uses `tone="positive"` instead
  (`src/features/studio/actions/confirm-publish.tsx`), so screenshot 15 is needed to judge that one. _Default_ is a cool slate grey against a warm paper palette. The selected
  navbar tool and the _Content_ tab use a dusty pink tint. **"A selected card" looks the same as an unselected one.**
  Dark mode (`…-currawong-dark-…png`) is better: light violet with dark text.
- **Fix:** task 88, already written: map the legacy theme so primary uses the real accent fill, neutrals come from the
  warm range and selection is clearly brand-coloured; add computed-contrast assertions to the brand kit test.
- **Effect:** primary actions appear on most screens, and a selection you can't see breaks lists and pickers.

### 2. Five collapsed "more" areas with four different names (Inferred)

- **Evidence:** in a split hero's Design tab: _More animation options_, _More edge options_, _More layout options_
  (`src/lib/sanity/schema/section-style.ts`), _More image options_ (`src/lib/sanity/schema/image-design.ts`) and
  _Advanced_ (`sectionFieldsets`, holding Proportion and the per-part animation from `hero.ts`). Links and heading
  highlights also say _Advanced_ (`link.ts`, `heading-text.ts`). The tab can show four picture grids (Background,
  Animation with up to 10 options, Bottom edge with 6, Image shape) before any collapsed area.
- **Fix:** (S) one naming rule, for example "More … options" everywhere a group holds fine-tuning for the control above
  it, and _Advanced_ only for the agency-only area at the end. (M) Order the tab as the page reads: Background → Bottom
  edge → Animation → Layout, so colour and shape (decided together, see scenario F) sit next to each other.
- **Effect:** the agency opens these on every section; the same idea under four names costs a scan each time.
- **Needs you:** which word (see _Decisions_).

### 3. Background names are jargon and wrong on dark sites (Inferred)

- **Evidence:** `SECTION_TONE_TITLES` in `src/lib/sanity/section-style-options.ts`: _Surface_, _Soft_, _Dark_,
  _Accent_. _Surface_ is the token name, not a word an editor uses. _Soft_ is described as "A light grey band"
  (`section-style.ts`), but it follows Brand colours' _Alternate background_, so it is often not grey. On a site whose
  Brand colours _Appearance_ is Dark, the inverse tone swaps to light (`design-settings.ts` says so), so _Dark_ is then
  the light one. The names also appear in every section's list subtitle ("Hero · Split · Surface").
- **Fix:** rename the titles only (stored values stay): for example _Page_, _Tinted_, _Contrast_, _Brand_, with
  descriptions by role ("The opposite of the page: light text on dark, or dark on light on a dark site"). Update the
  README hero preset table.
- **Effect:** every section, every list.
- **Needs you:** the four names.

### 4. Two unrelated gradient lists, both called "Gradient" (Inferred)

- **Evidence:** heading highlights offer three fixed gradients from code (`src/config/heading-gradients.ts`: _Brand to
  ink_, _Brand to green_, _Brand to red_), in a collapsed _Advanced_ inside the highlight popover
  (`src/lib/sanity/schema/heading-text.ts`). Section backgrounds offer the named gradients from Brand colours
  (`section-style.ts`, `gradient-picker/`). A gradient the agency adds in Brand colours never appears for headings,
  and "Brand to green" uses the _success_ colour, which isn't a brand colour.
- **Fix:** headings offer _Brand to ink_ plus the Brand colours gradients (with the 3:1 large-text check per stop that
  task 79 already does), or the two lists get distinct names (_Text gradients_ and _Background gradients_).
- **Effect:** scenario C works, but not with the client's own gradient.
- **Needs you:** one list or two.

### 5. Every page and post publish asks for confirmation (Inferred)

- **Evidence:** `src/features/studio/actions/confirm-publish.tsx` wraps Publish for pages and posts in a dialog
  ("Publish changes to …?"). The redirect offer only matters when the address changed (`detectAddressChange`), but
  `onHandle` opens the dialog on every publish outside a content release.
- **Fix:** publish straight away when the address hasn't changed, and keep the dialog for a first publish and for an
  address change (where the redirect choice matters).
- **Effect:** a client fixing a typo publishes with two clicks instead of three.
- **Needs you:** whether the "are you sure" on every publish was a deliberate safety net for clients.

### 6. Two controls for parallax strength, and a third "move the image" place (Inferred)

- **Evidence:** _Animation_ offers _Parallax · Subtle_, _Medium_ and _Strong_, and _More animation options_ has an
  _Intensity_ (Subtle, Normal, Bold) that scales whichever was chosen (`section-style.ts`), giving nine combinations.
  On a split hero, the section's Parallax options are hidden (`hasPicture` in `hero.ts`) while _Image design_ →
  _Picture motion_ offers movement for the same picture (`image-design.ts`).
- **Fix:** keep one strength control. Either a single _Parallax_ preset with Intensity in More animation options (task
  77's target wording), or the three presets and no Intensity for parallax. Make the Animation description point to
  Picture motion when the layout's picture is beside the text.
- **Effect:** scenario E's "find where to make it stronger" has two answers today.
- **Needs you:** which of the two.

### 7. Browser icon hidden inside "Identity & search" (Inferred)

- **Evidence:** `browserIconField` is a field in the `siteIdentity` singleton (`src/features/site/schemas/site-identity.ts`),
  reached through Website settings → _Identity & search_ (`src/features/studio/structure.ts`). Nothing in the sidebar
  says "icon". _Business info_ (address, hours) is a separate top-level item, so there are two "about the site" places.
- **Fix:** (S) rename the item _Name, logo & icon_ or _Site identity_, with the description naming the browser icon. (M)
  Group the singleton's fields (Identity, Search & sharing, Icon) so the icon has its own tab.
- **Effect:** a one-off task, but a likely wrong turn in scenario H (Design and Business info both look plausible).

### 8. Hero list subtitle doesn't name the preset; background set in two places (Inferred)

- **Evidence:** the hero preview uses `variantSubtitle` (`src/lib/sanity/schema/section-variant.ts`), giving "Hero ·
  Split · Surface" for both split presets and "Hero · Full background · Surface" for _Centred text, no image_. The
  preset bar in the Content tab sets `style.tone`, which is also the Background picker in the Design tab (`hero.ts`).
- **Fix:** subtitle from the matching preset ("Hero · Split, image left"), falling back to layout and tone for Custom.
  `matchPreset` lives in `src/features/studio/components/preset-picker/presets.ts`; it would have to move to
  `src/lib/sanity/schema/` first, because schemas can't import from the studio feature.
- **Effect:** a page's section list says which hero it is without opening it.

### 9. Mobile menu settings and submenus don't exist yet (Inferred)

- **Evidence:** `siteNavigation` has Header and Footer tabs only and `navItem` has no children
  (`src/features/site/schemas/site-navigation.ts`, `nav-item.ts`). Task 07 is still to do in the plan.
- **Fix:** task 07 (L), already planned.
- **Effect:** scenario G fails.

### 10. Raw values and missing help in shared fields (Inferred, mostly fixed)

- **Evidence:** the call to action showed "primary"/"secondary" as options and as its list subtitle (`cta.ts`). Hero and
  Image + text showed "left"/"right" (`hero.ts`, `media-text.ts`). Navigation had an untitled _Footer Text_ and no
  help on any field. These are in every section that has buttons, and clients see them.
- **Fix:** done in this branch (quick fixes 1, 2 and 4). No raw `list: ['…']` options remain in the schemas.

## Scenarios A–H (estimates)

Estimates from the schema and the desk structure, **not timed with people**. A click is a pointer action (open, choose,
press); typing and scrolling are not counted. A decision is a choice between alternatives. Counts start from the Studio
home with the relevant page already created.

| Scenario                               | Path (estimate)                                                                                                                                                           | Clicks | Decisions | Likely wrong turns                                                           | Meets task 77 target?                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------- | ---------------------------------------------------------------------------- | --------------------------------------------- |
| A. Primary colour, preview             | Design → Brand colours → Primary swatch → pick → check the in-form mock-up → Publish → Presentation                                                                       | 6–7    | 2         | _Website settings_ sounds right; Brand colours has no "view on site" link    | Probably (under 1 min for the agency)         |
| B. Split hero with all parts           | Page → Sections → Add → Hero → preset _Split, image right_ → type eyebrow, title, description → 2 × (Add button → choose page → style) → upload image → Publish → confirm | 18–20  | 6         | Preset bar vs Design tab for layout                                          | Yes, at 6 decisions (if preset is one choice) |
| C. Gradient on three words             | Open hero → select words → _Highlight_ → _Gradient_ → close (gradient defaults to _Brand to ink_)                                                                         | 5–6    | 1–2       | Looking for the Brand colours gradient (issue 4)                             | Yes                                           |
| D. Statistics row under hero heading   | Open hero → _Extra content under the heading_ → Add → _Statistics bar_ → 3 × (Add item → value, label) → _Number format_ for $ or +                                       | 10–13  | 1–4       | Adding a separate Stats section instead; agency only (clients can't add one) | Yes for the agency; phone layout not checked  |
| E. Hero image moves; make it stronger  | Open hero → Design → Animation → _Parallax · Subtle_. Stronger: _Parallax · Medium/Strong_ or More animation options → Intensity                                          | 3–5    | 2–3       | On Split the option isn't there (it's Picture motion); two strength controls | Partly (issue 6)                              |
| F. Wave between two coloured sections  | Open upper section → Design → Bottom edge → _Wave_                                                                                                                        | 3–4    | 1         | Looking at the lower section first                                           | Yes                                           |
| G. Mobile submenus slide in as a panel | Not possible: no Mobile menu settings yet                                                                                                                                 | –      | –         | Navigation has Header and Footer only                                        | No (task 07)                                  |
| H. Browser icon from the logo          | Website settings → Identity & search → scroll to _Browser icon_ → _Use the site logo_ → copy button → crop → padding and background → Publish                             | 8–10   | 3         | Design, Business info (issue 7)                                              | Yes once found; findability is the risk       |

Run task 77 with people to replace these estimates with real counts.

## Quick fixes made now

Each is its own commit on `studio-audit-quick-fixes`. None changes stored data: only titles, descriptions, option
labels, field order and preview subtitles.

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

## More quick fixes, not made

Small and safe, but either over the five-fix limit or waiting on a decision above:

- **Icons:** _Start here_, _Business info_ and the homepage's list icon all use the Home icon (`start-here/plugin.ts`,
  `structure.ts`, `page.ts`). Give Business info its own (for example a pin or shop icon).
- **Background tone names** (issue 3), once you choose them.
- **Collapsed area names** (issue 2), once you choose the word.
- **Identity & search** title and description (issue 7).
- **Animation description** pointing to Picture motion when the layout's picture is beside the text (issue 6).
- Housekeeping: `CLIENT_STRUCTURE_IDS` lists `startHere`, which is a tool, not a desk item, so it matches nothing
  (`src/features/studio/utils/structure-access.ts`).

## Decisions for you

1. **"More options" naming (issue 2):** _More … options_ for fine-tuning under a control, with _Advanced_ kept for the
   agency-only area at the end of a tab? Or _Advanced_ everywhere?
2. **Background names (issue 3):** proposed _Page_, _Tinted_, _Contrast_, _Brand_. Your words win; they show in every
   list subtitle.
3. **Heading gradients (issue 4):** one list (Brand colours gradients offered to headings) or two named lists?
4. **Publish confirmation (issue 5):** keep it on every page and post publish, or only on first publish and address
   changes?
5. **Parallax strength (issue 6):** one _Parallax_ preset plus Intensity, or three presets and no Intensity?
6. **Site facts (issue 7):** keep _Business info_ top-level and _Identity & search_ under Website settings, or bring
   them together?

## Proposed new plan tasks

- **Studio naming pass (S):** apply decisions 1, 2 and 6 and the icon fix; update the README hero preset table and the
  editor guide.
- **Unified gradients (M):** decision 3, with contrast checks for headings on every tone.
- **Publish without a dialog when nothing risky changed (S–M):** decision 4, keeping the redirect offer.
- **One parallax strength (M):** decision 5, with a content migration only if presets are merged (Intensity values are
  stored).
- **Hero subtitle from its preset (S–M):** move `matchPreset` to `src/lib/sanity/schema/`, use it in the hero preview.
- **Design tab order (M):** Background → Bottom edge → Animation → Layout, after the naming pass.
- Already planned and confirmed by this audit: **task 88** (theme contrast, issue 1) and **task 07** (mobile menu,
  scenario G).

## Screenshots still to capture

Save as PNGs in this folder, at 1440 px in light mode; starred ones also in dark mode and at 1024 px. Add `notes.md`
with anything confusing while capturing.

01-start-here\* · 02-sidebar-agency · 03-sidebar-client · 04-page-list · 05-page-editor-content\* ·
06-section-insert-menu · 07-hero-content-tab\* · 08-hero-design-tab\* · 09-hero-advanced · 10-brand-colours\* ·
11-site-identity · 12-navigation-settings · 13-presentation-desktop\* · 14-presentation-mobile-preview ·
15-publish-dialog · 16-image-upload-and-crop · 17-blog-post-editor · 18-media-text-design-tab

Capture them from this branch (or after it merges) so 07, 11, 12, 15 and 17 show the quick fixes.
