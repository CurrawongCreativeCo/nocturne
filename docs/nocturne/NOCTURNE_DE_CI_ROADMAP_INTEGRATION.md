# Design Engine and Content Intelligence — Roadmap Integration Proposal (Document E4)

**Status:** revision **r2**, **approved by the owner on 26 October 2026** (R2-1 to R2-6, E-A3, E-A9, and E-A10 subject to validation). Version 20 is built and validated in [`e-canonical-patch/`](./e-canonical-patch/README.md), and is published from a fresh session.

- The canonical Currawong Build Plan is **unchanged**: version 19, artifact version `1792925278-5621`, 214 tasks, 14 stages.
- Its progress database has 111 done, 2 doing (170 and 188), 100 to do and 1 skipped.

**Companion documents:**

- [E1, Design Engine](./NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md);
- [E2, Content Intelligence](./NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md);
- [E3, product architecture](./NOCTURNE_PRODUCT_ARCHITECTURE.md).

**The proposal, in numbers (r2):**

- **15 new tasks (215–229)**, in the new stages DE and CI, plus 227 in stage F;
- **8 existing tasks re-staged**, with IDs, statuses and notes kept;
- **21 existing tasks given additions;**
- **8 dependency changes;**
- nothing deleted or renumbered.

The records in Appendix 1 were re-validated against the live plan's schema: unique IDs, valid stage, workstream, context and size values, every dependency present, and no cycles in the merged graph.

## 0. What changed in r2

| Refinement                    | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Where                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1. Contrast and publishing    | <ul><li>Errors only on Brand colours (its own document), and only for explicitly chosen pairs.</li><li>Section-level problems are warnings with render-time fallbacks, so content publishing is never blocked.</li><li>Proposals split design from content.</li><li>Over pictures and video: a guaranteed bound or "check visually", never a claimed measurement.</li></ul>                                                                                                                   | E1 §5, §6.2; tasks 216, 218, 220                        |
| 2. Glass panels               | <ul><li>Glass works over solid backgrounds too: a translucent tint with no blur, and exact contrast.</li><li>Blur (frosted) only where something varied is behind it.</li><li>Reduced transparency and more contrast render solid.</li></ul>                                                                                                                                                                                                                                                  | E1 DE-6; task 218                                       |
| 3. Stable entities            | <ul><li>Persistent entities are keyed by Sanity document id, so they survive slug changes. Page nodes stay URL-keyed.</li><li>Typed, provenance-based parity replaces literal string matching.</li><li>Contradiction checks and the deny list stay.</li></ul>                                                                                                                                                                                                                                 | E2 §3.2, §3.5; task 222 (188 merges as the first layer) |
| 4. AI-search intelligence     | <ul><li>Rewritten from official sources: Google's generative AI report (impressions only, no documented API), the Search generative AI control, Bing AI Performance (citations, no API), and the OpenAI, Anthropic and Perplexity crawler documentation.</li><li>Readiness is kept separate from observed visibility.</li><li>Crawler controls split training from search (**new task 228**).</li><li>A separate, gated evidence spike (**new task 229**) instead of expanding 226.</li></ul> | E2 §8; tasks 223, 226, 228, 229                         |
| 5. Settings and configuration | <ul><li>A Settings and Configuration Manager milestone (**MS**) in stage FX.</li><li>A template feature configuration registry first (**new task 227**), separate from the design manifest.</li><li>Its Foundation tasks are specified once task 201 exists.</li></ul>                                                                                                                                                                                                                        | E3 §9; tasks 227, 208, 209                              |

---

## 1. Approved, and what still needs a decision

**Approved by you (26 October 2026):**

- E-A1 (semantic references and inheritance);
- E-A2 (families with typed slots, with no `look` field);
- E-A5 (the generated manifest);
- E-A6 (validated, draft-only proposals);
- E-A7 (one structured-data architecture);
- E-A8 (evidence-backed findings, no scores);
- independent client sites with Foundation orchestrating (E3);
- the DE and CI milestones.

**Remaining decisions:**

| ID    | Decision                                                                                                                                                                                                                                                                                                                             | Replaces           |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| R2-1  | **Contrast policy** (E1 §5):<ul><li>a validation error only on Brand colours, and only for an explicitly chosen pair that fails;</li><li>warnings plus render-time fallbacks everywhere else;</li><li>guaranteed-bound checks over pictures and video;</li><li>**Keep text readable** on by default for new sections only.</li></ul> | E-A3's last bullet |
| R2-2  | **Glass over any suitable background** (DE-6): tinted with no blur over solids, frosted only over varied backgrounds, with solid fallbacks                                                                                                                                                                                           | E-A4               |
| R2-3  | **Document-keyed `@id`s** for persistent entities, and URL-keyed ids for page nodes; **typed, provenance-based parity**                                                                                                                                                                                                              | Refines E-A7       |
| R2-4  | **Split the AI crawler switch** into "train on this site" and "show in AI search answers" (228). **Migration keeps behaviour:** an existing _off_ becomes both off, and Currawong then reviews each affected client                                                                                                                  | New                |
| R2-5  | **A separate, gated AI-search evidence spike (229);** 226 stays Search Console only                                                                                                                                                                                                                                                  | New                |
| R2-6  | **The Settings and Configuration Manager** as milestone MS in FX, with the template registry (227) first and no speculative Foundation tasks                                                                                                                                                                                         | New                |
| E-A3  | **Design settings v2:** density, shape, heading style and motion level (with phones) as Studio CSS variables; fonts stay a build-time choice from a documented list                                                                                                                                                                  | Unchanged from r1  |
| E-A9  | **Improvement records** (an agency-only type in each site's dataset) and **the Search Console spike** (226: read-only, the client's consent, local data deleted after use)                                                                                                                                                           | Unchanged from r1  |
| E-A10 | **Build plan version 20** (§9), with the r2 additions                                                                                                                                                                                                                                                                                | Updated            |

Re-staging (part of E-A10) is still optional. Without it, the new stages hold only the new tasks.

---

## 2. What existing tasks already cover

| Requirement (from your brief)                            | Existing tasks                                                           | Status            | Gap filled by                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------- | ------------------------------------- |
| Brand colours across the site, with contrast             | 78, 109, 140                                                             | Done              | 168, 194 (explain and test)           |
| Per-section spacing, tone, backgrounds, motion and edges | 4, 82, 83, 84, 114, 154                                                  | Done              | 216 and 217 (site-wide)               |
| Layout switches (image side), buttons                    | 5, 80                                                                    | Done              | —                                     |
| A video under the image, a supporting block              | 81 (hero only)                                                           | Done for the hero | 219, 193                              |
| Glass                                                    | 113, 153 (Link list), 159 (navigation)                                   | Done, or to do    | 218                                   |
| Overrides that are visible and resettable                | 153, 167 (Link list)                                                     | Done              | 193 and 213 (families)                |
| Reusable sections                                        | `sharedSection`, 50 (pattern registry)                                   | Done, or to do    | —                                     |
| Bespoke sections                                         | 14                                                                       | To do (per site)  | Additions (§3)                        |
| Recipes and templates                                    | 120, 197                                                                 | Done, or to do    | —                                     |
| Design reference to page                                 | Revision 3 §9.6 (no task)                                                | Not planned       | 215, 220, 221                         |
| JSON-LD correctness                                      | 188 (PR #102 open)                                                       | Doing             | 222                                   |
| Services, locations and relationships                    | 191, 192, 212                                                            | To do             | Additions (§3)                        |
| Technical SEO checks                                     | 28, 189, content health                                                  | Done              | 223, 195                              |
| Content quality                                          | 23, 35, 57                                                               | Done, or to do    | 225, plus additions to 57             |
| Search Console                                           | 202, 210                                                                 | To do (FX)        | 226, plus additions                   |
| Publishing and permissions                               | 24, 161, 162, 205, 206 (190, 196, 214 later)                             | Done, or to do    | —                                     |
| AI-search crawler controls and evidence                  | `allowAiCrawlers` (one switch), 36 (IndexNow), 55                        | Done, or to do    | 228, 229, plus additions to 55 and 32 |
| Settings and configuration                               | `/api/site-info`, setup wizard, 189 (health), per-feature `get*Config()` | Done              | 227, then milestone MS (FX)           |

---

## 3. Existing tasks that change

**All changes are additions.** No status, note or ID changes. Each addition is appended to the task's prompt as `ADDITION (26 October 2026, documents E1–E4)`, and the card's summary gains "E-series additions are in the prompt."

| Task                                              | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Dependencies                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **193** Section contract v2: split family         | **This replaces requirements 2–4** of the current prompt:<ul><li>No `look` field: looks are `SPLIT_PRESETS` (Media right, Media left, Stacked, Text over media) through `presetsOption`, matched by `preset-match`.</li><li>Fix 167's preset tie (`describePresetState` ties when presets differ by one field) first.</li><li>`media` (image or video) and one `supporting` slot come from 219. `image` migrates into `media` with a dry run.</li><li>Glass comes from 218.</li><li>An override summary with Reset in the Design tab.</li><li>`imageSide.ts` is Image + text's options file, not a section.</li></ul>Its size drops from 4–6 to about 3 sessions | [205] → **[205, 218, 219]**      |
| **213** Section contract v2: hero family          | <ul><li>Same conventions: `HERO_PRESETS` are its looks, its supporting slot already uses 219's registry, and panels apply where the layout has a background.</li><li>Add an override summary with Reset.</li><li>No `look` field.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                      | Unchanged [193]                  |
| **194** Theme-adaptation contract test            | <ul><li>Cover every tone × panel (218) × text role combination, at each Density and Heading style (216).</li><li>The default brand and two fixture brands, one light and one dark.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | [168] → **[168, 218]**           |
| **191** Content contract v2 note                  | <ul><li>Adopt E2 §3 as the starting point: the fact-ownership table, the `@id` scheme, page versus site entities and the type-selection rules.</li><li>Decide whether `author` may reference a `teamMember`.</li><li>Confirm improvement records (E-A9).</li></ul>                                                                                                                                                                                                                                                                                                                                                                                               | Unchanged                        |
| **192** Content contract v2: services             | <ul><li>Build `Service` nodes in `src/lib/structured-data/` (222).</li><li>Add rules F-1 and F-2 for services (225), once 225 exists.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | [191] → **[191, 222]**           |
| **212** Content contract v2: locations            | <ul><li>Branch and service-area nodes built through 222's module, with E2's `@id`s.</li><li>`businessInfo.serviceAreas` strings migrate to _service area_ locations with a dry run.</li><li>Rule F-8.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Unchanged [192]                  |
| **195** Internal links and orphan pages           | <ul><li>Don't re-implement content health's orphan and broken-link detection: reuse `content-health/utils/detect.ts`.</li><li>Add only what rendered HTML shows (navigation and footer links, links inside shared sections).</li><li>Emit Findings (223).</li></ul>Its size drops to about 1.5 sessions                                                                                                                                                                                                                                                                                                                                                          | [188] → **[188, 223]**           |
| **202** Search Console import                     | <ul><li>Start from 226's import code and write-up.</li><li>Keep its thresholds and caveats.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | [201] → **[201, 226]**           |
| **210** Search Health cards                       | <ul><li>Cards are Findings (223) with `source: 'search-console'`.</li><li>Changes link to improvement records (224).</li><li>Comparisons follow E2 §7: the site's own CTR by position bucket, weekday-aligned 28-day windows, a year-on-year comparison only with 13 months of data, and confounders listed.</li></ul>                                                                                                                                                                                                                                                                                                                                           | [202] → **[202, 224]**           |
| **57** Fleet content QA                           | <ul><li>The deterministic checks are 223 and 225's rules.</li><li>The AI pass is rule F-7 (judgement), producing Findings with `basis: 'judgement'`. It never writes.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Unchanged                        |
| **14** Bespoke section                            | <ul><li>Build inside `SectionFrame` with `sectionFields`, use slot components where they fit, and declare `options.manifest`.</li><li>Classify the fields in `CLIENT_EDITABLE`.</li><li>Note in the client README whether it should be promoted to the template (task 50).</li></ul>                                                                                                                                                                                                                                                                                                                                                                             | Unchanged                        |
| **50** Pattern registry                           | A promoted section must carry its manifest entry and its client-editable classification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Unchanged                        |
| **13** Apply the client's brand                   | Choose the font pairing from 216's documented list in the README; record it in `tokens.json`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Unchanged                        |
| **108** Parallax preset                           | Also wire `placement: 'background'` to the shared section Background image (E1 §3, "subtle parallax on the background")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Unchanged                        |
| **159** Glass for navigation                      | Reuse 218's panel resolver and contrast fallback                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Unchanged                        |
| **86** Saved motion presets                       | Before starting, check whether 217's site motion level has removed the need. Close it as `skip`, with a note, if so                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Unchanged                        |
| **55** Lead attribution                           | Classify AI assistant referrers (chatgpt.com, perplexity.ai, copilot.microsoft.com, gemini.google.com) as their own source in attribution and events (E2 §8)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Unchanged                        |
| **188** JSON-LD tests (doing, PR #102)            | **No scope change before merge.** Note: its literal-string helper is the first layer; 222 replaces literal comparisons with typed, provenance-based parity (E2 §3.5), and collapsed accordions and tabs count as visible                                                                                                                                                                                                                                                                                                                                                                                                                                         | Unchanged                        |
| **32** Go live and hand over                      | <ul><li>Record the client's choices for AI training and AI search (228), and for Google's **Search generative AI control** in Search Console.</li><li>Add **Bing Places** beside Google Business Profile in the off-site consistency check (E2 §8.4).</li><li>Record consent for read-only Search Console access (226, 229).</li></ul>                                                                                                                                                                                                                                                                                                                           | Unchanged                        |
| **208** Foundation: new-site wizard               | Guided feature setup reads the feature configuration registry (227); it writes values to providers and never stores them (E3 §9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | [201] → **[201, 227]**           |
| **209** Foundation: verification and health views | Show per-feature readiness with plain-English reasons from `/api/site-info` (227), and the health workflow's own setup diagnostics                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | [201, 189] → **[201, 189, 227]** |

---

## 4. New tasks: specifications

Each spec has a size, sessions (2–3 hours each) and dependencies, then:

- **Problem:** what it solves;
- **Value:** what users gain;
- **Scope:** the technical scope;
- **Existing:** the implementation it builds on;
- **Acceptance:** acceptance criteria and required tests;
- **Done:** the definition of done;
- **Prompt:** a suggested Claude Code prompt.

The template context block is prepended when a prompt is copied, so prompts don't repeat its conventions.

### 215 — Design manifest generated from the schemas

**Stage DE · Medium · 2 sessions · deps 205**

- **Problem:** nothing describes the Design Engine in a form tools can read, and a hand-written registry would drift.
- **Value:**
  - an accurate list of what each section supports;
  - the base for validating proposals (220) and for AI (221);
  - a version Foundation can show.
- **Scope:**
  - `scripts/build-design-manifest.mjs` writes `design-manifest.generated.json` at the repo root, next to `schema.json`;
  - it runs from `npm run typegen`, with a `--check` mode and a CI staleness check;
  - optional `options.manifest = { purpose, example }` on section types.
- **Existing:**
  - the `jiti` loading in `scripts/build-editor-guide.mjs`;
  - `sectionTypes`;
  - `section-style-options.ts`;
  - `presetsOption`;
  - `registerSectionRules`;
  - `CLIENT_EDITABLE` (205).
- **Acceptance:**
  - Unit tests on a tiny in-memory schema: lists, nested objects, preset `set` maps, rule evaluation per variant, client-editable flags.
  - Every real section type appears.
  - Every preset value that a preset sets is in its field's list.
  - Nothing under `src/app` imports the manifest.
  - `npm run check` and `npm run test:e2e` pass.
- **Done:** merged, and in a release. README "Design manifest".

```text
TASK
Generate design-manifest.generated.json from the existing schemas so tools (and later AI) can read what the Design Engine supports, without a second source of truth. Read docs/nocturne/NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md §6.1 first.

READ FIRST
scripts/build-editor-guide.mjs (the jiti loading pattern and its --check flag), src/features/pages/schemas/sections/index.ts, src/lib/sanity/schema/section-style.ts, src/lib/sanity/section-style-options.ts, src/lib/sanity/schema/preset-field.ts, src/lib/sanity/schema/section-form.ts, src/features/site/schemas/design-settings.ts, the CLIENT_EDITABLE registry from task 205, src/styles/tokens.json.

REQUIREMENTS
1. scripts/build-design-manifest.mjs writes design-manifest.generated.json at the repo root: { manifestVersion (template-version.json), sections: [{ type, title, purpose?, example?, fields: [{ path, kind, required, max?, list?: [{ value, title }], clientEditable }], variants?, presets: [{ value, title, set }], rules: [{ variant, hasPicture, fixesAlignment, hasOwnBackgroundImage }], slots? }], sectionStyle: { fields }, designSettings: { fields }, tokens: { <group>: [names] } }.
2. Walk field definitions recursively (objects, arrays, named types from the schema list). Option lists come from options.list; limits from exported LIMITS constants where they exist. Where a limit lives only inside a validation function, leave it out and list what the manifest does not capture in the README. Do not execute validation functions with fake rules.
3. Rules are functions: evaluate each registered section's rules once per variant value (and once with no variant) and record the booleans.
4. Optional `options.manifest = { purpose: string, example?: object }` on a section type. Add it to hero and mediaText now. FAMILY_TYPES = ['hero', 'mediaText'] must have a purpose, or the check fails.
5. Wire it into `npm run typegen` after the editor guide, add `--check`, and make CI fail when the committed file is stale (as for the editor guide).
6. Unit tests: a tiny in-memory schema (enum lists, nested objects, preset set maps, rule evaluation per variant, clientEditable flags), plus assertions on the real output: every entry in sectionTypes is present, and every value a preset sets is in its field's list. A test fails if anything under src/app imports the manifest (JS budget).
7. README "Design manifest": what it is, how it is generated, what it does not capture, and that it is read-only documentation for tools.

ACCEPTANCE
- `npm run check` and `npm run test:e2e` pass; CI's staleness check passes on the committed file.

DONE WHEN
Merged and in a template release.
```

### 216 — Design settings v2: density, shape and heading style

**Stage DE · Medium · 3 sessions · deps none (run after 168)**

- **Problem:** site-wide spacing, corner shape and heading character can only be changed in code.
- **Value:**
  - "More breathing room", "softer corners" and "more editorial headings" take one change.
  - Sections that chose their own value keep it, and are listed.
- **Scope:**
  - Three picture choices on Brand colours (agency only).
  - A pure mapping in `src/lib/design/site-decisions.ts`.
  - `:root` variables through `resolveDesignTokens`.
  - Studio sample previews.
  - A "sections that set their own spacing" count.
  - A vetted font-pairing list as data (`src/config/font-pairings.ts`: display and body font, mood tags, `next/font` names), read by the README, task 13 and the design manifest (215). It's the path to future design-reference and AI font selection (approved E-A3).
  - **The Brand colours contrast policy (r2, E1 §5):**
    - an explicitly chosen Advanced pair that fails text contrast becomes an **error** on this document, with **Use suggested**;
    - derived and brand-coloured text adjusts at render;
    - page documents never get contrast errors.
- **Existing:**
  - `resolveDesignTokens` (variables only where values differ);
  - `DesignSettingsInput`;
  - the preset picker (74);
  - the `panel-usage-input.tsx` "used by" pattern;
  - the tokens in `tokens.json`.
- **Acceptance:**
  - Unit tests for the mapping tables.
  - e2e: **Airy** changes the computed padding of a section with no spacing set, and leaves a **Compact** section unchanged.
  - e2e: **Round** changes `--radius-card`.
  - e2e: **Editorial** changes the `h2` letter spacing and weight.
  - With nothing set, the visual baselines are unchanged; new baselines for each choice (Linux workflow).
  - The JS budget is unchanged.
- **Done:** merged, released, and the README updated.

```text
TASK
Add Density, Shape and Heading style to Brand colours (designSettings) as site-wide named choices, rendered as :root CSS variables through resolveDesignTokens, so one change restyles the whole site while sections that chose their own value keep it. Read docs/nocturne/NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md §3 (Experience B) and §5 first.

READ FIRST
src/features/site/schemas/design-settings.ts, src/lib/color/resolve-design-tokens.ts, src/features/site/components/design-settings-input.tsx and design-style.tsx, src/styles/tokens.json (space, radius, type), scripts/build-tokens.mjs, src/lib/sanity/schema/section-style.ts (spacing), src/features/studio/components/panel-usage-input.tsx.

REQUIREMENTS
1. Fields, agency-only, as picture choices through the preset picker:
   - density: compact | standard | airy;
   - shape: sharp | soft | round;
   - headingStyle: standard | editorial | modern | classic.
   Unset means today's values exactly.
2. One pure module, src/lib/design/site-decisions.ts, maps each choice to CSS variable values for existing token names: space.section-y*, gutter, radius roles, and the type tokens' size ratio, letter spacing and weight. Section-level spacing (compact, default, spacious) stays relative to the density, so a section's own choice still works.
3. resolveDesignTokens includes these variables, server-side as today: no client JavaScript, no flash, no new request. Add the fields to the settings query (no new query) and run typegen.
4. Heading styles only change variables. Fonts stay those in tokens.json and next/font. When Editorial needs a display font the site doesn't have, use the body font, and show a Studio note asking Currawong to add one.
5. Studio: a sample preview (a heading, body text, a button and a card) at the chosen values in DesignSettingsInput, and "N sections set their own spacing" with links, using the panel-usage pattern and one GROQ count.
6. README "Brand colours and design": each choice and inheritance ("unset inherits; a section's own choice wins"). Put six to eight vetted next/font pairings in src/config/font-pairings.ts as data: id, display and body family, next/font import names, and mood tags such as editorial, modern or classic. The README table and task 13 read it, and task 215's manifest includes it, so design-reference and AI font selection can use it later. Don't load new fonts in this task.
7. Contrast policy (E1 §5, "When a global change breaks contrast"):
   - On designSettings, a failing pair where both colours were explicitly chosen under Advanced becomes a validation error, with a one-click "Use suggested". Every other contrast problem stays a warning.
   - Derived text picks near-black or white, as today. Brand-coloured text (links, eyebrows) renders a lightness-adjusted shade of the same hue (adjustLightnessForContrast, accent-text), and Studio says so, offering "Use as chosen".
   - Never add contrast errors to page or section fields: they would block content publishing.
   - README: keep site-wide design changes in their own release, because a release publishes all or nothing.

ACCEPTANCE
- Unit tests for the mapping tables.
- e2e: with density airy, a section without spacing gains vertical padding while a Compact section doesn't change; shape round changes --radius-card; editorial changes h2's computed letter-spacing and weight.
- Unit tests: an explicitly chosen failing pair gives an error; a derived pair never does; a pale Primary renders links in a darker shade of the same hue at 4.5:1 or better.
- Visual baselines are unchanged with nothing set; add baselines for the new choices with the "Update visual baselines" workflow.
- Home page JavaScript is unchanged. `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release, with the README updated.
```

### 217 — Site motion level, with a calmer setting on phones

**Stage DE · Small · 1–2 sessions · deps 216**

- **Problem:** motion intensity is chosen per section, and there's no phone-specific setting.
- **Value:** "Reduce the animation on mobile" takes one change.
- **Scope:**
  - Two picture choices on Brand colours: Motion and On phones.
  - Data attributes on the site shell's root element.
  - The existing motion presets and parallax multiply in the site factor, with a phone media query read in the existing hooks.
  - Reduced motion still wins.
- **Existing:**
  - `components/motion/presets.ts` (intensity factors, parallax speeds);
  - `parallax.tsx`;
  - the `MotionConfig reducedMotion="user"` provider.
- **Acceptance:**
  - Unit tests for the factor maths.
  - e2e: at 390 px against 1280 px, the reveal distance is lower with **Calmer**; **Off on phones** renders the final state.
  - The memory spec passes (listeners cleaned up).
  - Home JS grows by at most 0.3 KB gzipped.
- **Done:** merged, released, README.

```text
TASK
Add a site-wide Motion level (Calm, Standard, Expressive) and an On phones setting (Same, Calmer, Off) to Brand colours, multiplied into every section's animation and parallax. Read docs/nocturne/NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md §3 (the last row of the Experience B table) first.

READ FIRST
src/components/motion/presets.ts (INTENSITY_FACTOR, PARALLAX_SPEEDS, customRange), src/components/motion/parallax.tsx, motion-provider.tsx, src/app/(site)/site-shell.tsx, src/features/site/schemas/design-settings.ts.

REQUIREMENTS
1. Two agency-only fields, motionLevel and motionOnPhones, as picture choices. Unset means Standard and Same, which is today's behaviour exactly.
2. The site shell renders data-motion-level and data-motion-phones on its root element from the cached settings: no new request, nothing cached that depends on the request.
3. The motion presets read the site factor once on the client and multiply it with each section's intensity: distances, durations and parallax travel. "Calmer" halves travel and shortens durations under the phone media query; "Off" renders final states on phones. Use matchMedia inside the existing hooks and clean up listeners (the memory test).
4. prefers-reduced-motion still wins over everything.
5. README: what each level does, and that a section's own intensity still applies within the site level. Note in task 86's card whether saved motion presets are still needed.

ACCEPTANCE
- Unit tests for the factor maths.
- e2e: at 390 and 1280 px widths, the reveal translate distance differs as specified; Off renders final states on phones.
- tests/e2e/memory.spec.ts passes; home page JavaScript grows by at most 0.3 KB gzipped.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release.
```

### 218 — Glass and solid panels for any section

**Stage DE · Medium · 2 sessions · deps 168** _(revised in r2)_

- **Problem:** glass exists only inside the Link list, so "make this section glass" needs code.
- **Value:** glass or a solid card on any section, over any suitable background, legible by construction.
- **Scope:**
  - `sectionStyle.panel` (none, glass or solid) with `panelStrength` under Advanced.
  - A shared resolver that site code can import.
  - **Glass renders in one of two ways,** chosen by the resolver, not the editor:
    - **tinted** (translucent fill, a highlight border, no `backdrop-filter`) over solid tones, where blur would have no visible effect;
    - **frosted** (with blur) only over pictures, gradients, video, patterns or overlapping content.
  - A tint from the tone.
  - **Contrast:**
    - exact over solids and gradient stops;
    - a **guaranteed bound** over pictures and video (E1 §5);
    - "check visually" when the bound can't decide.
  - A solid fallback, and a warning that names the fix.
  - `prefers-reduced-transparency` and `prefers-contrast: more` render solid.
  - Rendered in `SectionFrame` for all sections. Sections that draw their own surfaces (the Link list) opt out.
- **Existing:**
  - `surface-options.ts` (`glassSurfaceLook`, strengths);
  - `.glass-row` in `globals.css`;
  - `lib/color/glass-contrast.ts`;
  - the `section-form.ts` rules;
  - `staleImageOptionMessage`.
- **Acceptance:**
  - Unit tests for the resolver: the tinted and frosted choice, the bound maths and the fallback.
  - e2e with axe on four panel fixtures (over a solid tone, an image, a gradient and an inverse tone). The solid-tone panel has no `backdrop-filter`.
  - Gallery entries and visual baselines.
  - The JS budget is unchanged (CSS only).
- **Done:** merged, released, README "Section panels".

```text
TASK
Add a Panel option to every section's Design tab — None (default), Glass, Solid card — that puts the section's content on a panel over its background, tinted from the section's tone. Glass blurs only where blur is visible. Contrast is exact where it can be and bounded over pictures, with an automatic solid fallback. Read docs/nocturne/NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md §5 and decision DE-6 first.

READ FIRST
src/lib/sanity/surface-options.ts (glassSurfaceLook and strengths), src/features/pages/components/sections/link-list/glass-row.tsx, src/styles/globals.css (.glass-row), src/lib/color/glass-contrast.ts, src/lib/sanity/schema/section-style.ts and section-form.ts, src/components/ui/section-style.ts, section-frame.tsx, section-background.tsx, and task 168's warning format.

REQUIREMENTS
1. sectionStyle gains panel ('none' | 'glass' | 'solid') and, under Advanced, panelStrength (light | medium | strong; unset follows the glass tokens). Unset renders exactly as today.
2. Glass is offered on any section background. The resolver chooses how to render it:
   - over a solid tone: "tinted", a translucent fill flattened against the tone, with a highlight border and no backdrop-filter;
   - over a picture, gradient, video, pattern or overlapping content (a section edge, a parallax layer): "frosted", with blur.
   Sections that draw their own surfaces (the Link list) register `ownsSurfaces` and don't show Panel.
3. The tint comes from the section's tone (inverse gives dark glass, accent gives an accent tint); text colours on the panel are derived, never chosen.
4. Contrast:
   - over solids, exact against the flattened colour;
   - over gradients, at the stops and at sampled points between them;
   - over pictures and video, a guaranteed bound: text must pass against the panel colour composited over both black and white. If it passes both, it's guaranteed; if it fails both, it fails; otherwise it's "not guaranteed: check visually". Never claim to have measured the photo.
   When body text isn't guaranteed at 4.5:1, raise the panel opacity up to its strength's maximum. If that still isn't enough, render the panel solid, and show a Studio warning naming the fix (a stronger overlay, a higher strength, or Solid card) in task 168's format. Warnings only, never validation errors: the section lives in a page document.
5. Put the resolver in src/lib/sanity/ (importable by the site) so task 159 can reuse it. prefers-reduced-transparency and prefers-contrast: more render solid.
6. SectionFrame renders the panel for every section, with no per-section code. Add fixtures, section-gallery entries and visual baselines (Linux workflow).

ACCEPTANCE
- Unit tests for the resolver: the tinted and frosted choice, the bound maths (both extremes), the opacity raise and the solid fallback.
- e2e with axe on four panel fixtures (a solid tone, an image, a gradient, an inverse tone). The solid-tone panel's computed backdrop-filter is "none".
- Home page JavaScript is unchanged. `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release, with README "Section panels".
```

### 219 — Shared slot registry (from the hero slot), with a video block

**Stage DE · Medium · 2 sessions · deps none**

- **Problem:** typed supporting content exists only in the hero, and adding a video under an image needs a new field per section.
- **Value:** families accept typed blocks (video, stats, logos, badges, an inline list, a quote) with no new section code.
- **Scope:**
  - `src/features/pages/slots/`: a registry, a `slotField()` factory and a renderer.
  - The hero migrates to it with stored data unchanged.
  - A new `slotVideo` block reuses the video section's facade and native player.
  - One GROQ fragment per block.
  - The blocks are classified in `CLIENT_EDITABLE`.
- **Existing:**
  - `hero/slots.tsx`;
  - the hero's `supporting` field and README "Adding a hero slot";
  - the `video` section components;
  - `stats-bar`, `logo-row`, `badge-row` and `inline-list`.
- **Acceptance:**
  - A unit test that every registry entry has a schema, a component and its allowed places.
  - Hero e2e and visual baselines unchanged.
  - The video block plays only after a click, and respects consent.
- **Done:** merged, released, README "Adding a slot block".

```text
TASK
Generalise the hero's supporting-slot registry into a shared slot registry that any section family can use, keep the hero rendering identically, and add a video block. Read docs/nocturne/NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md §4 first.

READ FIRST
src/features/pages/components/sections/hero/slots.tsx, the `supporting` field in src/features/pages/schemas/sections/hero.ts, README "Adding a hero slot", src/features/pages/components/sections/video/, src/components/ui/stats-bar.tsx, logo-row.tsx, badge-row.tsx, inline-list.tsx, src/features/pages/api/sections.ts.

REQUIREMENTS
1. src/features/pages/slots/: registry.ts (block type → schema type, component, allowedIn such as 'hero.supporting', 'split.media' and 'split.supporting', and clientEditable), slot-field.ts (slotField({ name, slot }) builds the field, insert menu and thumbnails), render-slot.tsx.
2. The hero uses the registry. Stored data is unchanged and needs no migration; hero e2e and visual baselines must not change.
3. A new block, slotVideo, reuses the video section's click-to-load facade (YouTube and Vimeo) and its native video with captions, and stays consent-aware as today.
4. One GROQ fragment per block, folded into the existing page query: no new request.
5. Classify the block fields in the task 205 registry: content is client-editable, layout is not.
6. Update the README: "Adding a slot block" replaces "Adding a hero slot".

ACCEPTANCE
- A unit test that every registry entry has a schema, a component and allowedIn, and that every allowedIn value names a known slot.
- Hero specs and visual baselines are unchanged; a new fixture shows slotVideo in the hero.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release.
```

### 220 — Change proposals: contract, validator and draft applier (no AI)

**Stage DE · Medium · 3 sessions · deps 215**

- **Problem:** there's no safe way for a script, or later an AI, to propose a design change.
- **Value:**
  - Changes are validated, previewable and undoable.
  - Useful straight away for scripted starts and repeated agency edits.
- **Scope:**
  - `src/lib/proposals/` holds the types and a pure validator: manifest, design checks, permissions.
  - `scripts/proposal.mjs` handles `validate` and `apply`. It applies drafts only, with `ifRevisionID`, is dry-run by default and needs `--yes`, uses scratch datasets only, and can bundle a release when the site uses Releases.
  - Sanity schema validation: a first 30-minute check of whether `validateDocument` runs in Node, with the CLI fallback otherwise.
- **Existing:**
  - the manifest (215);
  - `resolveDesignTokens`;
  - the `CLIENT_EDITABLE` registry;
  - `scripts/setup/seed.mjs` (writing with a token);
  - the `migrations/` dry-run pattern.
- **Acceptance:**
  - A unit test for every rejection reason.
  - Three fixture proposals (glass and image left; density **Airy**; a supporting video) validate and apply against a mocked client.
  - Refuses dataset names other than scratch ones unless explicitly overridden, and the override isn't documented for use.
- **Done:** merged, README "Change proposals".

```text
TASK
Create a change-proposal format with a validator and a draft-only applier — `npm run proposal -- validate <file>` and `npm run proposal -- apply <file> --dataset <scratch> --yes` — so scripted (and later AI-made) changes are checked and land only as drafts. Read docs/nocturne/NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md §6.2 first.

READ FIRST
design-manifest.generated.json (task 215), src/lib/color/resolve-design-tokens.ts, the CLIENT_EDITABLE registry (task 205), scripts/setup/seed.mjs (writing with a token), migrations/README.md.

REQUIREMENTS
1. src/lib/proposals/types.ts: ChangeProposal as in E1 §6.2.
2. A pure validator (src/lib/proposals/validate.ts):
   - manifest: paths exist, values are in their lists, slot blocks are allowed, array limits are respected;
   - design: contrast through resolveDesignTokens for designSettings changes, and the panel rules (task 218) where present;
   - permissions: annotate needsAgencyReview from CLIENT_EDITABLE.
   It returns accepted and rejected patches, with reasons. A proposal that mixes content and design patches is split into two parts before validation, so a rejected design part never blocks the content part (E1 §5).
3. Sanity validation: first spend at most 30 minutes checking whether `validateDocument` from 'sanity' can run in Node with this schema. If not, apply to drafts, run `sanity documents validate` on the scratch dataset, and discard the drafts on failure. Record what you found in the README.
4. The applier (scripts/proposal.mjs):
   - dry-run by default, and --yes to write;
   - a token from SANITY_PROPOSAL_TOKEN;
   - drafts only, with ifRevisionID set to baseRev, in one transaction per proposal;
   - with --release, when the profile's releases flag is on, the changes go into one release;
   - it refuses any dataset whose name doesn't start with "scratch" (no documented override);
   - it never publishes.
5. Three fixture proposals: make a section glass with the image on the left; set density to airy; add a supporting video. Tests use a mocked client.
6. README "Change proposals": the format, the checks, how to preview (Presentation) and undo (discard the draft).

SAFETY
Never run against a client or production dataset in this task.

ACCEPTANCE
- Unit tests for every rejection reason and for the revision guard.
- `npm run check` passes.

DONE WHEN
Merged (no release is needed until a site uses it).
```

### 221 — Experiment: design reference to a validated proposal

**Stage DE · Medium · 2–3 sessions · deps 220, 193, 213**

- **Problem:** we don't know whether reference-driven page creation saves time.
- **Value:** a go or no-go decision on building it into Foundation, based on evidence.
- **Scope:**
  - Three references with usage rights (a screenshot, a Figma file if available, a moodboard).
  - A Claude Code session turns each into a proposal with a gap list, using the manifest.
  - Apply to a scratch dataset with 220.
  - Correct by hand, and time it against a manual build.
  - Stop rule: correction above 70% of the manual time.
- **Existing:** 215 and 220; the families from 193 and 213.
- **Acceptance:** `docs/experiments/<date>-design-reference.md` with:
  - desktop and mobile screenshots;
  - the three times (proposal, correction and manual);
  - the gaps found;
  - a recommendation.
- **Done:** the write-up is committed, and the decision is recorded in this card's notes.

```text
TASK
Run a bounded experiment: turn three design references into validated proposals and measure correction time against building the same page by hand. No product code. Read docs/nocturne/NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md §3 (Experience A) and §6 first.

STEPS
1. The owner supplies three references with rights to use them: a screenshot or mock-up, a Figma file if available, and a moodboard.
2. For each: give the model the reference, design-manifest.generated.json and the E1 rules. Ask for a ChangeProposal with design decisions (a palette mapped to Brand colours roles, the nearest documented font pairing, density, shape, heading style, motion), a page of sections (families, presets, slot contents, placeholder copy) and a gap list.
3. Validate and apply it to a scratch dataset with task 220's tool, then preview it in Presentation at desktop and mobile widths.
4. Correct it by hand in Studio until it's acceptable. Time the proposal, the correction, and a manual build of a comparable page (or a recorded estimate from a similar real page).
5. Stop rule: if correction takes more than 70% of the manual time on two of the three, stop and write up why.

OUTPUT
docs/experiments/<date>-design-reference.md: screenshots, a times table, the gap list (what couldn't be represented and how it was handled) and a recommendation: build it into Foundation, extend the families first, or stop.

DONE WHEN
The write-up is committed and the decision is in this card's notes.
```

### 222 — One structured-data module with stable `@id`s

**Stage CI · Medium · 2–3 sessions · deps 188, 191** _(revised in r2)_

- **Problem:**
  - six emitters build their own `@id`s, and some change when a slug changes;
  - pages have no `WebPage` node;
  - authors are anonymous;
  - parity is checked by literal strings.
- **Value:** consistent, stable, non-contradictory markup, validated by meaning, before services and locations add more.
- **Scope:**
  - `src/lib/structured-data/`: `ids.ts`, `nodes/*.ts` and `parity.ts`, all pure.
  - **Document-keyed `@id`s** for persistent entities, and URL-keyed ids for page nodes (E2 §3.2).
  - Builders return nodes plus a **provenance map** (property → document and field), used only by tests and the audit.
  - **Typed parity** replaces 188's literal comparisons (E2 §3.5).
  - Contradiction checks, and the deny list.
  - A `WebPage` node on every page.
  - Authors linked to Person nodes, per 191.
  - A graph-integrity test.
- **Existing:**
  - `site-json-ld.tsx`, `business-json-ld.ts`, `article-json-ld.tsx`, `person-json-ld.tsx`;
  - `events/utils/json-ld.ts`, `breadcrumbs.tsx`, `faq.tsx`;
  - 188's `src/lib/json-ld-visibility.ts` (its normaliser is reused);
  - `parseAuPhone`;
  - `opening-hours.ts`.
- **Acceptance:**
  - Unit tests per node (required properties).
  - A slug change in a fixture keeps the service's or person's `@id` and changes its `url`.
  - Typed parity: "5:30 pm" and "17:30", "+61 2 9000 0000" and "(02) 9000 0000", and "St" and "Street" all match.
  - A collapsed FAQ answer counts as visible.
  - A changed phone number in one place is caught as a contradiction.
  - A test that nothing outside the module builds `#organization` or `#website` strings.
  - Graph integrity.
  - No visible change; no JS change.
- **Done:** merged and released.

```text
TASK
Move every JSON-LD builder into src/lib/structured-data/ with stable @ids, add a WebPage node to every page, link blog authors to Person nodes where the task 191 note allows, and replace literal-string parity with typed, provenance-based validation. Read docs/nocturne/NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §3 (especially §3.2 and §3.5) and the 191 note first.

READ FIRST
src/features/site/components/site-json-ld.tsx, src/features/site/utils/business-json-ld.ts, src/features/blog/components/article-json-ld.tsx, src/features/team/components/person-json-ld.tsx, src/features/events/utils/json-ld.ts, src/features/pages/components/breadcrumbs.tsx, src/features/pages/components/sections/faq.tsx, src/lib/json-ld-visibility.ts and tests/e2e/structured-data.spec.ts (task 188), src/features/site/utils/phone.ts, src/lib/opening-hours.ts.

REQUIREMENTS
1. ids.ts: one function per @id in E2 §3.2.
   - Persistent entities (service, location, person, event, article) are keyed by the published document _id, with drafts. and version prefixes removed: `{origin}/#service-{id}`. They don't change when a slug changes. Draft and release-version ids (drafts.*, versions.*) must never appear in an emitted @id. A test renders the same document in draft mode and published, and asserts identical @ids (approved R2-3).
   - WebPage, BreadcrumbList and FAQPage are keyed by URL.
   - The origin is siteUrl.
   A unit test scans src/ and fails if '#organization', '#website' or '#webpage' strings are built anywhere else.
2. nodes/: pure builders (organization or local business, website, webPage, breadcrumb, article, person, event, faqPage), each with unit tests for required and recommended properties.
   - business-json-ld.ts moves here, keeping its behaviour.
   - Each builder also returns a provenance map (JSON-LD property path → document id and field path), which is never rendered.
   - An entity is described in full only on its canonical page, and referenced by @id elsewhere; its `url` carries the current URL.
3. Every page renders a WebPage node: isPartOf the #website, about its main entity when it has one, breadcrumb by @id, inLanguage.
4. Authors: if the 191 note approved `author` referencing a teamMember, Article.author is that Person's @id; otherwise a named Person without an @id, as today. Change the schema only if the note approved it (with typegen and a fixture).
5. parity.ts replaces literal comparisons in task 188's helper, by property class (E2 §3.5):
   - visible facts compare typed values: E.164 phones; addresses by component, with St/Street and state abbreviations; hours as day and time ranges; dates; amount plus currency; folded names;
   - descriptive text must come from a field rendered on the page (provenance);
   - areaServed must be visible somewhere on the site;
   - identity and technical properties must be valid but are exempt from visibility.
   "Visible" means present in the rendered page and reachable by a visitor: collapsed accordions and tabs count. Keep 188's normaliser. Keep the contradiction checks (the same @id with different values across pages; a JSON-LD value different from its owning field) and the deny list (self-serving ratings and reviews, offers without a visible price, FAQs not on the page, credentials not shown).
6. Components keep rendering where they do, with stegaClean as today. No visible change and no client JavaScript.
7. Add a graph-integrity check to the structured-data spec: every @id reference on a page resolves to a node on that page or in the site graph.

ACCEPTANCE
- Unit tests for typed parity (5:30 pm = 17:30; +61 2 9000 0000 = (02) 9000 0000; St = Street), provenance and the deny list.
- A fixture slug change keeps the @id and changes the url. A collapsed FAQ answer passes.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release.
```

### 223 — Page audit with evidence-backed findings

**Stage CI · Large · 3 sessions · deps 222**

- **Problem:** the checks exist in three places with three output shapes, there's no page-level view, and nothing carries evidence and a fix location together.
- **Value:** "what's wrong with this page, why, and where do I fix it".
- **Scope:**
  - `src/lib/audit/`: the Finding contract, ordering, the `ruleId` registry and the page rules.
  - `scripts/audit-page.mjs`: `--json` and `--sample=N`.
  - A published read of the page's document, for Studio intent links.
  - Content health items carry the same rule IDs.
  - The health workflow includes the audit summary.
- **Existing:**
  - `scripts/launch-check/*.mjs` (`html`, `seo`, `result`);
  - `scripts/health-report.mjs`;
  - `content-health/utils/detect.ts` and `build-report.ts`;
  - `json-ld-visibility.ts`;
  - 222's module.
- **Acceptance:** E2 §11 tests 1, 2, 3, 5 and 7:
  - five broken fixtures produce exactly five `ruleId`s;
  - the clean fixtures produce no deterministic warnings;
  - evidence fields are complete;
  - a re-check shows the finding resolved;
  - no writes.
- **Done:** merged, released, README "Page audit".

```text
TASK
Create a page audit that returns evidence-backed findings — `npm run audit:page -- <url> [--json] [--sample=N]` — on a shared Finding contract, reusing the existing launch-check and content-health pure functions. Read docs/nocturne/NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §4, §6 and §11 first.

READ FIRST
scripts/launch-check/ (args, html, seo, result, pool), scripts/health-report.mjs, .github/workflows/health.yml, src/features/studio/content-health/utils/detect.ts and build-report.ts, src/lib/json-ld-visibility.ts, src/lib/structured-data/ (task 222).

REQUIREMENTS
1. src/lib/audit/finding.ts: the Finding type (E2 §6), the order (severity, then basis), and a ruleId registry with a title and README anchor for each. ruleIds never change meaning.
2. Page rules in src/lib/audit/rules/, each pure and unit-tested:
   - indexability (status, noindex, robots, a self-canonical that answers 200);
   - title and description present, and unique against the sitemap sample;
   - a single H1 and heading order;
   - JSON-LD that parses;
   - visible parity (task 188's helper);
   - graph integrity;
   - the main entity matches the document type (once task 192 exists);
   - internal links on the page resolve (HEAD requests through the existing pool);
   - images without alt text;
   - AI-search readiness (E2 §8.2): no unintended noindex, nosnippet, max-snippet or data-nosnippet on the main content; the main text is present in the server HTML; robots.txt matches the site's AI crawler choices (task 228 once it exists; until then, report that the single switch also blocks PerplexityBot's search crawling). llms.txt is checked only for consistency with the sitemap, when present.
   Reuse launch:check functions instead of copying them.
3. Content side: read the page's published document by path with the read token, through a server-only script client (never a browser token), and attach documentId, path and a Studio intent to each finding where the fix is a field.
4. Output: readable text grouped by severity, with --json writing audit.json. Exit non-zero only for blockers. --sample=N audits the home page plus N sitemap pages. Add a short audit summary to the health workflow's issue (scripts/health-report.mjs).
5. Content health: give its items the same ruleIds where the check is the same, with no other UI change.
6. Fixtures: five deliberately broken pages, as in E2 §11 test 1, and the existing clean fixtures. Tests assert that no Sanity mutation is ever sent.

ACCEPTANCE
- The broken fixtures produce exactly those five ruleIds. The clean fixtures produce no deterministic finding at warning or above. Every finding has observed, source, at, why and fix.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release, with README "Page audit".
```

### 224 — Improvement records

**Stage CI · Medium · 2 sessions · deps 223**

- **Problem:** nothing records what was changed, when and why, so outcomes can't be reviewed.
- **Value:** a history of improvements per site, and a prompt to review each one after 28 days.
- **Scope:**
  - An agency-only `improvement` type with these fields: `ruleId`, title, page reference, field path, before, after, evidence summary, `publishedRev`, `publishedAt`, `reviewOn`, outcome and notes.
  - A profile flag.
  - A "Record improvement" document action, prefilled from the last published revision's `seo.*` differences and a pasted finding.
  - A "Due for review" list in Content health.
  - The health issue lists records that are due.
- **Existing:**
  - document actions in `src/features/studio/actions/`;
  - `structure-access.ts`;
  - `CLIENT_EDITABLE`;
  - `health-report.mjs`.
- **Acceptance:**
  - Unit tests for the prefill diff and the due-date logic.
  - The route inventory and TAGS are unchanged: public pages never query improvements.
  - Classified as agency-only.
  - A fixture record appears in the health report.
- **Done:** merged, released, README.

```text
TASK
Add improvement records: an agency-only `improvement` document type and a "Record improvement" action that captures a fix's finding, before and after values, published revision and a review date, so outcomes can be reviewed later. Read docs/nocturne/NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §9 first.

READ FIRST
src/features/studio/actions/, src/features/studio/utils/structure-access.ts, the task 205 registry, src/lib/audit/finding.ts (task 223), scripts/health-report.mjs, site.profile.ts and src/config/define-site-profile.ts.

REQUIREMENTS
1. A schema with these fields: ruleId, title, page (a reference), fieldPath, before, after, evidence (text), publishedRev, publishedAt, reviewOn (defaults to 28 days after publishedAt), outcome (not reviewed | improved | no change | worse | inconclusive) and outcomeNotes.
2. Behind a profile feature flag, `improvements`, which is on by default. Agency-only in structure and in the task 205 registry. Never queried by public routes: the route inventory and TAGS are unchanged.
3. A "Record improvement" document action on pages (and services once they exist). It's prefilled from the difference between the last two published revisions for seo.* and title fields, and from a pasted Finding JSON (optional).
4. Content health shows a "Due for review" list. The health workflow reads due records with the read token, and lists them in its issue.
5. README: when to record an improvement, and how to review it honestly (see E2 §7's caveats).

ACCEPTANCE
- Unit tests for the prefill diff and the due logic. The e2e suite shows the public site is unchanged.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release.
```

### 225 — Fact-consistency and completeness rules

**Stage CI · Medium · 2 sessions · deps 223**

- **Problem:** contradictory and stale facts are objective errors, but nothing finds them.
- **Value:** wrong phone numbers, an old ABN, past special hours and duplicate summaries are caught before visitors see them.
- **Scope:** rules F-1 to F-5 and F-8 in `src/lib/audit/rules/`, run by Content health and the page audit. Service and location rules switch on when those types exist.
- **Existing:**
  - `parseAuPhone` (`site/utils/phone.ts`);
  - `abn.ts`;
  - `opening-hours.ts`;
  - `plain-text.ts`.
- **Acceptance:** a unit-test fixture for each rule, positive and negative (including formatting variants of the same phone number, which must not be flagged), and an e2e fixture page with a conflicting phone number.
- **Done:** merged and released.

```text
TASK
Add deterministic content rules F-1 to F-5 and F-8 from docs/nocturne/NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §5 to the shared rule library, run by Content health and the page audit.

READ FIRST
src/lib/audit/ (task 223), src/features/site/utils/phone.ts, abn.ts, src/lib/opening-hours.ts, src/lib/plain-text.ts, src/features/studio/content-health/utils/detect.ts.

REQUIREMENTS
1. F-3, fact conflicts: find AU phone numbers, emails, ABNs and street addresses in Portable Text and headings. Normalise them with the existing parsers, and report each one that differs from Business info, or from the page's location once task 212 exists. The same number in a different format isn't a conflict.
2. F-4, stale facts: past special hours still shown; past events still featured.
3. F-5, duplicates: exact duplicate titles, descriptions and summaries (deterministic). Near-duplicates are heuristic and need a similarity threshold, documented.
4. F-1, F-2 and F-8: only when service or location types exist; otherwise the rules report nothing.
5. Content health groups items by rule.

ACCEPTANCE
- Positive and negative unit fixtures for every rule. An e2e fixture page with a conflicting phone number gives one finding.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release.
```

### 226 — Spike: Search Console evidence for one real site

**Stage CI · Medium · 2 sessions · deps 223, 224**

**Triggered** when a site has been live for at least 28 days, and the client agrees.

- **Problem:** the Search Health design (202, 210) is untested against real data.
- **Value:** evidence that CTR-gap and decline findings are useful, or a reason to change them, before Foundation's Search Health is built.
- **Scope:**
  - A dependency-free import (a service account JWT signed with `node:crypto`) for 28 days of final data, paged and with truncation flagged.
  - Stored in a git-ignored `.search-console/` folder.
  - URLs mapped to documents.
  - `ctr_gap` and `declining_page` findings with caveats.
  - A write-up.
- **Existing:**
  - the Finding contract (223);
  - improvement records (224);
  - the read token in `check-dataset.mjs`;
  - revision 3's B.7 sketch.
- **Acceptance:**
  - Tests with a mocked fetch: paging, truncation, thresholds, the site's own CTR baseline.
  - No data committed (`.gitignore` covers it).
  - The scope is `webmasters.readonly`.
  - The write-up says which findings were acted on.
- **Done:** the write-up is in `docs/experiments/`, and 202 and 210's notes are updated.

```text
TASK
Spike: import 28 days of Search Console data for one real site into a local, git-ignored folder, map its URLs to Sanity documents, and produce ctr_gap and declining_page findings, to test the evidence model before Foundation's Search Health is built. Read docs/nocturne/NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §7 first.

BEFORE YOU START (owner, by hand)
- The site has been live for at least 28 days, and the client has agreed to read-only Search Console access.
- A Google Cloud service account is added to the property as a restricted user. Its key file is outside the repo; its path goes in .env.local as GSC_KEY_FILE.

REQUIREMENTS
1. scripts/search-console/import.mjs, dependency-free: sign a service-account JWT with node:crypto (RS256), scope https://www.googleapis.com/auth/webmasters.readonly, then call searchAnalytics.query with dimensions [page, query, date], dataState "final" and rowLimit 25000, paging by startRow. Record truncation and the count of anonymised queries. Write .search-console/<property>/<start>_<end>.json, and add .search-console/ to .gitignore.
   Data minimisation (approved E-A9): request only the metrics and dimensions the findings need, and only the windows being compared. Keep the key file outside the repo, readable only by you (chmod 600). Never log rows or keys. The write-up states the data's limits: sampling, anonymised queries, AI features inside Web totals, and averaged positions.
2. Map URLs to documents through a published GROQ read with the read token (path to page slug). List unmatched URLs.
3. Findings in task 223's contract, source 'search-console':
   - ctr_gap: the site's own CTR by position bucket (1–3, 4–6, 7–10, 11–20), at least 200 impressions for the page and query in 28 days;
   - declining_page: the last 28 days against the previous 28, aligned by weekday, with at least 100 clicks in the earlier window.
   Always attach the caveats from E2 §7, including that AI Overviews and AI Mode impressions sit inside the Web totals and can't be separated through the API. Make the thresholds named constants.
4. Tests with a mocked fetch: JWT claims, paging, truncation, the baseline and the thresholds. Never call Google in tests.
5. README "Search Console spike": the setup, and how to delete the data afterwards.
6. Write up docs/experiments/<date>-search-console.md: which findings were useful, which were false positives, what you acted on (record it with task 224), and what tasks 202 and 210 should change.

SAFETY
Read-only. Never commit Search Console data. Delete the local folder when the write-up is done.

DONE WHEN
The write-up is committed, and tasks 202 and 210 have notes pointing to it.
```

---

### 227 — Feature configuration registry and diagnostics

**Stage F · Medium · 2 sessions · deps none** _(new in r2)_

- **Problem:** each feature decides on its own whether it's configured. Nothing lists what a site needs, so missing settings surface late (a form that can't send). The health workflow can't explain its own setup gaps.
- **Value:**
  - one plain-English list of every feature's requirements and readiness, for pre-launch checks now;
  - the foundation of the Settings and Configuration Manager (milestone MS) later.
- **Scope:**
  - Declarative `config.registry.ts` per feature: its purpose, profile flag, and settings (name, kind, where set, required, docs anchor). **Never values.**
  - Composed in `src/app` and scripts (shared code can't import features).
  - Readiness from the existing `get*Config()` functions.
  - `npm run config:check`.
  - Per-feature readiness with reasons in `/api/site-info` (booleans and reason codes only).
  - The health workflow's own setup diagnostics.
  - The README's environment table generated from the registry.
- **Existing:**
  - `getFormsConfig`, `getNewsletterConfig`, `getEnquiryConfig`, `getCheckoutConfig`, `getWebhookConfig`;
  - `/api/site-info`;
  - `src/config/env.ts`;
  - `scripts/setup/`;
  - `.github/workflows/health.yml`;
  - `scripts/health-report.mjs`.
- **Acceptance:**
  - A completeness test: every environment variable read in `src/` is in the registry, or on a documented ignore list.
  - `config:check` reports missing required settings with plain-English reasons, and exits non-zero only with `--strict`.
  - `/api/site-info` never contains a value: a test plants a secret and asserts it's absent.
  - The README table is regenerated with no diff in CI.
- **Done:** merged, released, README "Configuration".

```text
TASK
Create a feature configuration registry and diagnostics: one declarative list of what each feature needs (never the values), with readiness from the existing config functions, `npm run config:check`, per-feature readiness in /api/site-info, and setup diagnostics in the health workflow. Read docs/nocturne/NOCTURNE_PRODUCT_ARCHITECTURE.md §9 first. This is separate from the design manifest (task 215): don't merge them.

READ FIRST
src/features/forms/utils/config.ts, src/features/forms/utils/newsletter/config.ts, src/features/forms/utils/enquiry-config.ts, src/features/pricing/utils/config.ts, src/app/api/site-info/route.ts, src/config/env.ts, site.profile.ts, scripts/setup/, .github/workflows/health.yml, scripts/health-report.mjs, README environment tables.

REQUIREMENTS
1. A `config.registry.ts` per feature (forms, newsletter, enquiries, pricing, members and auth, analytics and consent, Sentry, Sanity core, revalidation, health monitoring). Each entry has a feature id, a plain-English purpose, the profile flag, and settings: [{ name, kind: 'public-env' | 'server-env' | 'secret' | 'sanity' | 'github-var' | 'github-secret' | 'profile', where: 'vercel' | 'sanity' | 'github' | 'site.profile.ts', required, docs }]. Never values.
2. Compose the list in src/app (for /api/site-info) and in a script loaded with jiti, because shared code can't import features. Readiness comes from each feature's existing get*Config() result and its `missing` reason; don't duplicate parsing.
3. `npm run config:check [--strict]`: a table of features with ready, not configured (and why, in plain English) or off in the profile. It exits non-zero only with --strict.
4. /api/site-info adds `readiness: { <feature>: { ready: boolean, reason?: <code> } }` (codes, not values) and `configRegistryVersion`.
5. The health workflow checks its own setup first (PRODUCTION_URL, the Sanity variables and the token secret present), and reports missing ones in the issue in plain English.
6. Generate the README's environment table from the registry, with a CI staleness check like the editor guide's.

ACCEPTANCE
- A completeness test: every process.env name read under src/ is in the registry or on a documented ignore list.
- A test plants a fake secret in the environment and asserts it never appears in /api/site-info or config:check output.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release, with README "Configuration".
```

### 228 — AI crawler controls: training separate from search

**Stage CI · Small · 1 session · deps none** _(new in r2)_

- **Problem:** the single "Allow AI crawlers" switch blocks training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) together with a search crawler (PerplexityBot). Opting out of training therefore also removes the site from Perplexity's answers. OpenAI's and Anthropic's search crawlers aren't listed at all.
- **Value:** owners decide training and AI-search visibility separately, in plain English, as the vendors document them.
- **Scope:**
  - Two switches on Site identity: "Let AI companies train on this site's content" (training crawlers) and "Show this site in AI search answers" (search crawlers).
  - `robots.ts` and `ai-crawlers.ts` group the user agents by purpose.
  - User-triggered fetchers are documented, not blocked.
  - A migration that keeps every site's robots.txt output identical until a person reviews and saves the new settings (a policy version field).
  - `llms.txt` follows the search switch.
- **Existing:**
  - `src/lib/ai-crawlers.ts`;
  - `src/app/robots.ts`;
  - `allowAiCrawlers` in `site-identity.ts`;
  - `tests/e2e/ai-crawlers.spec.ts`;
  - `src/app/llms.txt`.
- **Acceptance:**
  - Unit and e2e tests for the four combinations.
  - robots.txt is byte-identical before and after the migration, for on and off; new agent groups apply only after the switches are saved.
  - Googlebot and Bingbot are never affected.
  - The README explains Google's Search Console generative AI control and that user-triggered fetchers may ignore robots.txt.
- **Done:** merged and released. The README and handover notes (32) are updated.

```text
TASK
Split the single "Allow AI crawlers" setting into two: AI training, and AI search answers. Group user agents by purpose, as the vendors document them, and migrate existing values without changing any site's behaviour. Read docs/nocturne/NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §8.3 first.

READ FIRST
src/lib/ai-crawlers.ts, src/app/robots.ts, src/app/llms.txt, src/features/site/schemas/site-identity.ts (allowAiCrawlers), tests/e2e/ai-crawlers.spec.ts, migrations/README.md.

REQUIREMENTS
1. ai-crawlers.ts exports groups:
   - TRAINING: GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot;
   - SEARCH: OAI-SearchBot, Claude-SearchBot, PerplexityBot;
   - USER_FETCHERS: ChatGPT-User, Claude-User, Perplexity-User, documented only, never relied on.
   Each has a comment linking the vendor's documentation.
2. Site identity: `allowAiTraining` ("Let AI companies train on this site's content") and `allowAiSearch` ("Show this site in AI search answers"), with plain-English descriptions. Googlebot and Bingbot are never affected. Note that Google's AI Overviews and AI Mode are controlled in Search Console's "Search generative AI control", not here.
3. robots.ts disallows each group according to its switch. llms.txt is served only when AI search is allowed.
4. Preserve effective behaviour exactly (approved R2-4). Add aiCrawlerPolicy: unset means legacy. Legacy sites keep today's robots.txt output byte for byte: the same five agents (GPTBot, ClaudeBot, Google-Extended, PerplexityBot, CCBot), driven by allowAiCrawlers. The new groups, including OAI-SearchBot, Claude-SearchBot and Applebot-Extended, apply only once a person saves the two new switches, which sets aiCrawlerPolicy to 2. A migration (dry run first) may pre-fill the switches from allowAiCrawlers, but it never sets the policy version. While a site is on the legacy policy, Studio shows "Review AI crawler settings". A test asserts that robots.txt is identical before and after the migration, for both on and off.
5. README "AI crawlers": the three purposes, what each switch does, that user-triggered fetchers may ignore robots.txt, and that changes take about a day to apply at the vendors.

ACCEPTANCE
- Unit and e2e tests for all four switch combinations, plus the fallback.
- `npm run check` and `npm run test:e2e` pass.

DONE WHEN
Merged and in a template release.
```

### 229 — Spike: AI-search evidence for one real site

**Stage CI · Medium · 2 sessions · deps 223, 55, 228** _(new in r2; triggered)_

**Triggered** when a site has at least 28 days of AI-surface data: Google's generative AI report is visible, or Bing AI Performance shows citations. The client must also agree.

- **Problem:** we don't know whether the available AI-search signals are useful enough to act on, or worth importing in Foundation:
  - Google AI impressions by page (no clicks, no queries, no documented API);
  - Bing citations and grounding queries (a sample, with no API);
  - AI-assistant referrals in analytics;
  - crawler fetches.
- **Value:** an evidence-based decision on what Foundation should import, and which findings are actionable. No score.
- **Scope:**
  - Manual exports from Search Console's generative AI report and Bing AI Performance.
  - AI referral sessions from the site's analytics (55's classification).
  - Crawler fetches from host logs, if retained.
  - A small importer for the CSV exports, producing Findings with `source: 'ai-report'`, for example "a page with Bing citations but a missing summary", or "AI impressions on a page whose facts conflict".
  - A write-up.
- **Existing:** the Finding contract (223), the crawler groups (228), 55's referrer classification, and E2 §8.
- **Acceptance:**
  - The importer is tested on fixture CSVs.
  - No data committed (a git-ignored folder).
  - The write-up gives, for each signal, availability, coverage, actionability and false positives, and a recommendation for Foundation: import now, wait for an API, or ignore.
- **Done:** the write-up is in `docs/experiments/`, with notes on 210 and milestone CI3.

```text
TASK
Spike: gather the AI-search evidence that's actually available for one real site, and test whether any of it supports actionable, evidence-backed findings. No scores. Read docs/nocturne/NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md §8 first.

BEFORE YOU START (owner, by hand)
- The client agrees. Export CSVs from Search Console's Generative AI performance report (Search) and from Bing Webmaster Tools' AI Performance, for the same 28 days, into .ai-search/ (git-ignored).
- Check whether Google or Microsoft has since documented API access for these reports. If so, note it and use it read-only instead.

REQUIREMENTS
1. scripts/ai-search/import.mjs reads the CSVs into a normalised shape: page, date, surface, impressions or citations, and grounding query where present. Tests use fixture CSVs.
2. Join it with AI referral sessions from the site's analytics (task 55's classification), and with the page audit's findings (task 223) for the same pages.
3. Produce Findings with source 'ai-report', each with evidence and caveats. Examples:
   - "Cited by Copilot 14 times; the page has no summary (F-1)";
   - "AI Overview impressions on a page whose phone number conflicts (F-3)".
   Never produce a visibility score, and never imply ranking or causation.
4. Write up docs/experiments/<date>-ai-search.md. For each signal: availability, coverage, actionability, false positives. Then a recommendation for Foundation (import now, wait for an API, or ignore), and any change to task 210.

SAFETY
Read-only. Never commit exported data, and delete .ai-search/ when the write-up is done.

DONE WHEN
The write-up is committed, and tasks 210 and the CI3 milestone have notes pointing to it.
```

---

## 5. Milestones and stages

**New stages,** shown in the rail after stage F (Website building workstream):

| Stage                        | Tasks                                                                    | Milestones                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **DE: Design Engine**        | 215–221, plus 193, 213 and 194 (re-staged from F)                        | <ul><li>**DE1:** site-wide design decisions with contrast that explains itself (216, 217, 218, with 168 and 194).</li><li>**DE2:** the split and hero families with shared slots (219, 193, 213).</li><li>**DE3:** a manifest and validated proposals (215, 220), then the experiment (221).</li></ul>                                                                                     |
| **CI: Content Intelligence** | 222–226, 228 and 229, plus 188, 191, 192, 212 and 195 (re-staged from F) | <ul><li>**CI1:** one structured-data module with stable `@id`s and typed parity (188, 191, 222, then 192 and 212 when a site needs them).</li><li>**CI2:** page audit, fact rules, improvement records and AI crawler controls (223, 224, 225, 228, 195).</li><li>**CI3:** search evidence: Search Console (226, then 202 and 210 in FX) and the AI-search evidence spike (229).</li></ul> |

**Existing stages:**

- **Stage F keeps** 187, 189, 190, 196, 198, 205, 206 and 214, and **gains 227.** Its milestone becomes: "MV: every launch verified (marker, health checks, configuration readiness through task 227). MP: safe publishing (Contributor review now, the hardened gate when needed). Design Engine and Content Intelligence milestones are in stages DE and CI."
- **Stage FX gains milestone MS (r2):** "MS: Settings and Configuration Manager: guided feature setup, readiness, secure provider-side configuration and deployment-aware updates, built on task 227. Its tasks are specified once task 201 exists." No Foundation tasks are added now.
- **Task 168 stays in P1,** because it belongs to the v1.9.0 release. DE1 names it as a dependency.

## 6. Dependencies

```
DE   168 ─► 218 ─┐
     216 ─► 217  │
     219 ────────┼─► 193 ─► 213 ─┐
     205 ────────┘               ├─► 221
     205 ─► 215 ─► 220 ──────────┘
     168, 218 ─► 194

CI   188, 191 ─► 222 ─► 223 ─┬─► 224 ─► 226 ─► 202 (FX, after 201) ─► 210 (also after 224)
                     │       ├─► 225
                     │       ├─► 195 (also after 188)
                     │       └─► 229 (also after 55 and 228)
                     └─► 192 ─► 212
     228 (no dependencies)

F/FX 227 ─► 208, 209 (FX, also after 201)
```

**New in r2:**

- 229 depends on 223, 55 and 228;
- 208 depends on 227;
- 209 depends on 227.

No cycles. This was checked across all 229 tasks, with every proposed dependency change included.

## 7. Session estimates

| Group                                                    | Sessions                                                                                                                                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DE new tasks                                             | <ul><li>215: 2.</li><li>216: 3–4 (with the contrast policy).</li><li>217: 1–2.</li><li>218: 2.</li><li>219: 2.</li><li>220: 3.</li><li>221: 2–3.</li><li>**Total: 15–18.**</li></ul> |
| DE existing tasks, as changed                            | <ul><li>193: about 3 (down from 4–6).</li><li>213: 2.</li><li>194: 1.</li><li>168: 2.</li><li>**Total: about 8.**</li></ul>                                                          |
| CI new tasks                                             | <ul><li>222: 2–3.</li><li>223: 3.</li><li>224: 2.</li><li>225: 2.</li><li>226: 2.</li><li>228: 1.</li><li>229: 2.</li><li>**Total: 14–15.**</li></ul>                                |
| CI existing tasks, as changed                            | <ul><li>188: 0.5 remaining.</li><li>191: 1.</li><li>192: 2–3.</li><li>212: 2–3.</li><li>195: about 1.5.</li><li>**Total: 7–9.**</li></ul>                                            |
| F new task                                               | 227: 2                                                                                                                                                                               |
| **Vertical slice A** (216, 217, 218, 219, 193, with 168) | **About 12–15**                                                                                                                                                                      |
| **Vertical slice B** (rest of 188, 191, 222, 223, 224)   | **About 8–10**                                                                                                                                                                       |

---

## 8. The next ten development sessions (revised in r2)

**The order follows your priorities:**

1. security and privacy;
2. completing real websites;
3. production friction;
4. design flexibility;
5. content correctness.

**It also keeps revision 3's rules:**

- in-progress work finishes first;
- one platform task is in progress at a time.

**Client-lane work comes first whenever it's due:** 124 (the Link page on her domain), 30, 31, 125 and 32. It isn't listed here, because the client sets the timing.

**The one change from r1:** the first part of task 227 moves ahead of the design work. `config:check` gives the real site's pre-launch QA (31) a plain-English list of missing settings. Panels (218) move to just after the ten.

| #   | Session                                                                                                                      | Task     | Why now                                                     | Done when                                             |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| 1   | Finish 188: run the e2e suite on PR #102, review it and merge. Then write the 191 note from E2 §3 (stable ids, typed parity) | 188, 191 | It's in progress; the note is short and unblocks 222        | PR #102 is merged and the 191 note is approved        |
| 2   | Field classification registry                                                                                                | 205      | Security, and it feeds 215, 219 and 220                     | Merged, with the completeness test                    |
| 3   | Agency publish review, part 1                                                                                                | 206      | Security (approved in revision 3)                           | The review dialog works                               |
| 4   | Agency publish review, part 2; clients become Contributors                                                                   | 206      | Security                                                    | Released; the client's role changed (R3-A1)           |
| 5   | Timed launch rehearsal                                                                                                       | 128      | Task 125 (the real site's launch) depends on it             | A timing table in 128's notes                         |
| 6   | Feature configuration registry, part 1: registry and `config:check`                                                          | 227      | Real-site launch: missing settings found before visitors do | `config:check` runs on the client repo before task 31 |
| 7   | Contrast warnings that say what to fix, part 1                                                                               | 168      | Production friction; a precondition for 218 and 194         | Warnings name the pair, the ratio and the fix         |
| 8   | Contrast warnings, part 2 (Use suggested colour, undo)                                                                       | 168      | —                                                           | Merged                                                |
| 9   | Design settings v2, part 1: density and shape                                                                                | 216      | Design flexibility; the first visible slice A step          | Density and shape work end to end, with e2e tests     |
| 10  | Design settings v2, part 2: heading style, the contrast policy, previews, font pairings                                      | 216      | —                                                           | Merged and released                                   |

**After these:**

1. 227 part 2 (`/api/site-info` and the health diagnostics);
2. slice A: 218, 219, 193 and 217;
3. slice B: 222, 223 and 224;
4. then 228, 194, 215, 213, 225 and 220.

**Triggered** (each waits for its trigger): 221, 226 and 229.

---

## 9. The exact change list for the canonical build plan (version 20)

Applied only after approval, to the live artifact `https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`. Read the live page in full first, and stop if its version is no longer `1792925278-5621`. Build it the same way as version 19: strip the platform-injected first and last lines, assert that each replacement matches exactly once, run `node --check` on the data script, and do a headless render check.

1. **Stages:**
   - insert `de` and `ci` (Appendix 1) after stage `f`;
   - replace `f`'s milestone with the text in §5;
   - append the MS sentence (§5) to `fx`'s milestone.
2. **Tasks:** insert 215–229 (Appendix 1) before task 87, the insertion point used since version 18. Task 227 is in stage `f`.
3. **Re-stage:** set `s` to `de` for 193, 213 and 194, and to `ci` for 188, 191, 192, 212 and 195. Nothing else changes on those records.
4. **Dependencies:**
   - 193 → [205, 218, 219];
   - 194 → [168, 218];
   - 192 → [191, 222];
   - 195 → [188, 223];
   - 202 → [201, 226];
   - 210 → [202, 224];
   - 208 → [201, 227];
   - 209 → [201, 189, 227].
5. **Prompts:**
   - add `p-215` to `p-229` (§4) before the `DATA AND BEHAVIOUR` comment;
   - append the §3 additions, as `ADDITION (26 October 2026, documents E1–E4)`, to prompts 193, 213, 194, 191, 192, 212, 195, 202, 210, 57, 14, 50, 13, 108, 159, 86, 55, 188, 32, 208 and 209;
   - append " E-series additions are in the prompt." to those tasks' `what`.
6. **Text:**
   - lede: "214 tasks," → "229 tasks,";
   - "(187–214 are the newest)" → "(215–229 are the newest)";
   - the footer gains a version 20 paragraph at the front.
7. **Approved direction panel:** add one bullet:

   > 26 October 2026: Design Engine and Content Intelligence direction (docs/nocturne E1–E4, r2). Design values reference named site decisions. Sections are families with typed slots, and presets are their looks. The design manifest is generated from schemas. Changes from scripts or AI are validated drafts that a person publishes. Contrast errors only ever block the design change itself. One structured-data graph with stable entity ids. Findings with evidence, never scores, and no AI visibility score. AI training and AI search are separate crawler choices. The feature configuration registry is separate from the design manifest.

8. **Template context block,** under DESIGN AND MOTION, add:

   > Design values reference named site decisions (tone, panel, density, radius role); unset inherits (src/lib/sanity/design-overrides.ts). Raw values belong only under Advanced. Contrast errors belong only on the Brand colours document; section-level contrast problems are warnings with render-time fallbacks, and contrast over pictures is a guaranteed bound or "check visually", never a measurement. New section types and slot blocks declare options.manifest and their CLIENT_EDITABLE classification (once tasks 215 and 219 exist). Build JSON-LD only through src/lib/structured-data/, with document-keyed @ids for persistent entities (once task 222 exists).

9. **The progress database is unchanged.** New tasks start as `todo`, with no documents. Task 188 stays `doing` until PR #102 merges.

---

## 10. Final review: challenging the proposal

| Question                                               | Answer, and what changed                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Are we introducing unnecessary abstractions?           | <ul><li>**Removed in r1:** the `look` field, a hand-written registry and a generic region model.</li><li>**r2 adds** one registry (feature configuration, 227) because three consumers need it now (`config:check`, `/api/site-info`, health), and keeps it apart from the design manifest.</li><li>**Not added:** a Glass sub-choice for editors. The resolver picks tinted or frosted.</li></ul> |
| Could Sanity and the current code already handle more? | Yes, and the plan leans on them: presets as looks, Releases for site-wide proposals, history for undo, Presentation for preview, schema validation for proposals, document `_id`s as stable entity keys, content health's rules for 195, `launch:check`'s pure functions for the audit, and the existing `get*Config()` readiness for 227                                                          |
| Too many controls?                                     | <ul><li>Five site-wide choices, each three or four named options.</li><li>One Panel choice per section.</li><li>Two plain-English crawler switches in place of one.</li><li>No sliders outside Advanced, and no breakpoint controls.</li></ul>                                                                                                                                                     |
| Is AI adding real value?                               | Not in the next 20 sessions. AI appears only as a bounded experiment (221) and one judgement rule (F-7). AI search is measured as evidence (229), never optimised blindly                                                                                                                                                                                                                          |
| Are contrast promises honest?                          | <ul><li>Exact over solids.</li><li>A guaranteed bound or "check visually" over pictures and video.</li><li>No claim to measure photographs.</li></ul>                                                                                                                                                                                                                                              |
| Evidence, or attractive scores?                        | No scores, including no AI visibility score. Readiness and observed visibility are separate families. Google's and Bing's AI reports are used for what they report: impressions and citations, not clicks or rank                                                                                                                                                                                  |
| Can it support independent client sites?               | Yes. Every capability runs in the site's repo and CI; Foundation only aggregates, and configures providers through their own APIs                                                                                                                                                                                                                                                                  |
| Can one person maintain it?                            | <ul><li>15 tasks, about 33–37 sessions of new work, spread over milestones you can pause between.</li><li>Three of them (221, 226, 229) are triggered spikes.</li><li>No new repo, service or always-on infrastructure.</li></ul>                                                                                                                                                                  |
| Does it improve real website delivery?                 | <ul><li>**227:** missing configuration found before launch.</li><li>**Slice A:** removes the code edits you named.</li><li>**Slice B:** catches content and structured-data errors.</li><li>**228:** fixes an unintended AI-search opt-out.</li></ul>                                                                                                                                              |
| Are we building too early what could stay documented?  | <ul><li>**Kept as documented direction:** the Settings Manager's Foundation tasks, Foundation-side AI orchestration, a Studio proposals inbox, client-facing analytics, and AI-report importing in Foundation (until 229 decides).</li><li>**Trigger-based:** 221, 226 and 229.</li></ul>                                                                                                          |

---

## Appendix 1 — Proposed canonical records (validated, not applied)

These were validated against the live plan's STAGES and TASKS:

- the schema keys and their order;
- the stage, workstream, context and size values;
- unique task numbers (215–229);
- every dependency present;
- no cycles with the §9 dependency changes included.

```json
{
  "stages": [
    {
      "id": "de",
      "n": "DE",
      "ws": "Website building",
      "title": "Design Engine: site-wide design, families and proposals",
      "where": "Template repo",
      "desc": "Site-wide design decisions in Studio with contrast safety, section families with typed slots, and a generated design manifest with validated change proposals. Necessary work is driven by real sites; the AI experiment comes last.",
      "milestone": "DE1: density, shape, heading style, motion level and section panels set once for the whole site, with contrast that explains itself (216–218, 168, 194). DE2: the split and hero families with shared slots (219, 193, 213). DE3: a generated design manifest and validated change proposals (215, 219, 220), then the design-reference experiment (221)."
    },
    {
      "id": "ci",
      "n": "CI",
      "ws": "Website building",
      "title": "Content Intelligence: correct structured data, explainable audits",
      "where": "Template repo and client site",
      "desc": "One entity graph with stable @ids and tested visible-content parity, a page audit that returns evidence-backed findings, improvement records, then Search Console evidence. No scores; nothing publishes automatically.",
      "milestone": "CI1: one structured-data module with stable @ids and typed parity (188, 191, 222, then 192 and 212 when a site needs them). CI2: page audit, fact rules, improvement records and AI crawler controls (223–225, 228, 195). CI3: search evidence from a real site: Search Console (226, then 202 and 210 in FX) and the AI-search evidence spike (229)."
    }
  ],
  "tasks": [
    {
      "n": 215,
      "s": "de",
      "first": false,
      "t": "Design manifest generated from the schemas",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "design-manifest.generated.json built by npm run typegen from the section schemas, sectionStyle options, presets, layout rules, slots and the client-editable registry, with only purpose and example added by hand; CI fails when it is stale.",
      "why": "Tools and future AI need a reliable description of what the Design Engine supports, without a second source of truth.",
      "files": [
        "scripts/build-design-manifest.mjs",
        "scripts/build-editor-guide.mjs",
        "src/features/pages/schemas/sections/index.ts",
        "src/lib/sanity/schema/section-form.ts"
      ],
      "deps": [205]
    },
    {
      "n": 216,
      "s": "de",
      "first": false,
      "t": "Design settings v2: density, shape and heading style",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "Brand colours gains Density, Shape and Heading style as picture choices that render as :root CSS variables through resolveDesignTokens; unset keeps today's look, sections that set their own spacing keep it and are listed.",
      "why": "\"More breathing room\", \"softer corners\" and \"more editorial headings\" should be one change for the whole site, not code.",
      "files": [
        "src/features/site/schemas/design-settings.ts",
        "src/lib/color/resolve-design-tokens.ts",
        "src/features/site/components/design-settings-input.tsx",
        "src/styles/tokens.json"
      ],
      "deps": []
    },
    {
      "n": 217,
      "s": "de",
      "first": false,
      "t": "Site motion level, with a calmer setting on phones",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "Design settings gains Motion (Calm, Standard, Expressive) and On phones (Same, Calmer, Off), multiplied into every section's animation and parallax without a new provider or request; reduced motion still wins.",
      "why": "\"Reduce the animation on mobile\" is a site decision, not 30 section edits.",
      "files": [
        "src/components/motion/presets.ts",
        "src/components/motion/parallax.tsx",
        "src/app/(site)/site-shell.tsx"
      ],
      "deps": [216]
    },
    {
      "n": 218,
      "s": "de",
      "first": false,
      "t": "Glass and solid panels for any section",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A Panel option in every section's Design tab (None, Glass, Solid card): glass over any suitable background, tinted with no blur over solid tones and frosted only where something varied is behind it, exact or guaranteed-bound contrast, and an automatic solid fallback with a warning that says what to fix.",
      "why": "\"Make this section glass\" is the most requested treatment and today exists only inside the Link list.",
      "files": [
        "src/lib/sanity/schema/section-style.ts",
        "src/components/ui/section-frame.tsx",
        "src/lib/sanity/surface-options.ts",
        "src/lib/color/glass-contrast.ts"
      ],
      "deps": [168]
    },
    {
      "n": 219,
      "s": "de",
      "first": false,
      "t": "Shared slot registry (from the hero slot), with a video block",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "The hero's supporting-slot registry becomes a shared registry any section family can use (schema, component, where allowed, client-editable), the hero renders identically, and a video block joins stats, logos and badges.",
      "why": "\"Add a video under the image\" needs typed slots shared across families, not a new field per section.",
      "files": [
        "src/features/pages/components/sections/hero/slots.tsx",
        "src/features/pages/slots/",
        "src/features/pages/api/sections.ts"
      ],
      "deps": []
    },
    {
      "n": 220,
      "s": "de",
      "first": false,
      "t": "Change proposals: contract, validator and draft applier (no AI)",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A ChangeProposal format with npm run proposal validate and apply: checked against the manifest, Sanity validation, contrast and the client-editable registry, then written only as drafts (or one release) with revision guards, to scratch datasets.",
      "why": "Scripted and future AI-made changes must be validated, previewable and undoable before anyone publishes them.",
      "files": ["src/lib/proposals/", "scripts/proposal.mjs", "design-manifest.generated.json"],
      "deps": [215]
    },
    {
      "n": 221,
      "s": "de",
      "first": false,
      "t": "Experiment: design reference to a validated proposal",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "Three real references turned into proposals (design decisions, sections, a gap list) in a Claude Code session, applied to a scratch dataset, corrected by hand and timed against a manual build; stop if correction exceeds 70% of manual time.",
      "why": "Tests whether design-reference import is worth building, with evidence instead of promises.",
      "files": ["docs/experiments/"],
      "deps": [220, 193, 213]
    },
    {
      "n": 222,
      "s": "ci",
      "first": false,
      "t": "One structured-data module with stable @ids",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "Every JSON-LD builder moves into src/lib/structured-data/ with document-keyed @ids that survive slug changes, a WebPage node on every page, authors linked to Person nodes where the 191 note allows, and typed, provenance-based parity in place of literal string matching.",
      "why": "Services and locations will add more markup; one module prevents contradictory or duplicated entities.",
      "files": [
        "src/features/site/components/site-json-ld.tsx",
        "src/features/site/utils/business-json-ld.ts",
        "src/features/blog/components/article-json-ld.tsx",
        "src/lib/structured-data/"
      ],
      "deps": [188, 191]
    },
    {
      "n": 223,
      "s": "ci",
      "first": false,
      "t": "Page audit with evidence-backed findings",
      "w": "Template",
      "ctx": "template",
      "size": "Large",
      "what": "npm run audit:page returns findings in one shared contract (rule, basis, severity, evidence, why, fix with a Studio link, how to re-check), reusing launch:check, content health and the JSON-LD parity helper; Content health items carry the same rule IDs.",
      "why": "Answers \"what is wrong with this page, why, and where do I fix it\" with evidence instead of a score.",
      "files": [
        "src/lib/audit/",
        "scripts/audit-page.mjs",
        "scripts/launch-check/",
        "src/features/studio/content-health/utils/detect.ts"
      ],
      "deps": [222]
    },
    {
      "n": 224,
      "s": "ci",
      "first": false,
      "t": "Improvement records",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "An agency-only improvement document type and a Record improvement action that captures the finding, before and after values, the published revision and a review date; the health issue lists records due for review.",
      "why": "\"Did the improvement work?\" needs a record of what changed, when and why.",
      "files": ["src/features/studio/", "src/lib/audit/", "scripts/health-report.mjs"],
      "deps": [223]
    },
    {
      "n": 225,
      "s": "ci",
      "first": false,
      "t": "Fact-consistency and completeness rules",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "Deterministic rules in the shared library: phone, email, ABN or address in page text that differs from Business info, stale facts, duplicate titles and summaries, and incomplete service and location pages once those types exist.",
      "why": "Contradictory facts are objective errors that confuse visitors and search engines, and they can be found without AI.",
      "files": [
        "src/lib/audit/rules/",
        "src/features/site/utils/phone.ts",
        "src/features/site/utils/abn.ts"
      ],
      "deps": [223]
    },
    {
      "n": 226,
      "s": "ci",
      "first": false,
      "t": "Spike: Search Console evidence for one real site",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A read-only local import of 28 days of Search Console data (final, paged, truncation flagged) into a git-ignored folder, URL-to-document mapping, and CTR-gap and declining-page findings with caveats (AI Overviews and AI Mode impressions can't be separated through the API), written up for tasks 202 and 210.",
      "why": "Tests the evidence model on real data before Foundation's Search Health is built.",
      "files": ["scripts/search-console/", "docs/experiments/"],
      "deps": [223, 224]
    },
    {
      "n": 227,
      "s": "f",
      "first": false,
      "t": "Feature configuration registry and diagnostics",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A declarative registry of what each feature needs (settings, kind, where set, never values), readiness from the existing config functions, npm run config:check, per-feature readiness in /api/site-info, health-workflow setup diagnostics and a generated README environment table.",
      "why": "Missing configuration should be found before launch, in plain English; it is the foundation of the Settings and Configuration Manager.",
      "files": [
        "src/features/forms/utils/config.ts",
        "src/app/api/site-info/route.ts",
        "src/config/env.ts",
        ".github/workflows/health.yml"
      ],
      "deps": []
    },
    {
      "n": 228,
      "s": "ci",
      "first": false,
      "t": "AI crawler controls: training separate from search",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "Two Site identity switches, AI training and AI search answers, with user agents grouped by purpose as the vendors document them, llms.txt following the search switch, and a migration that keeps every site's current behaviour.",
      "why": "Today opting out of AI training also removes a site from Perplexity's answers, and OpenAI's and Anthropic's search crawlers are not listed.",
      "files": [
        "src/lib/ai-crawlers.ts",
        "src/app/robots.ts",
        "src/features/site/schemas/site-identity.ts",
        "tests/e2e/ai-crawlers.spec.ts"
      ],
      "deps": []
    },
    {
      "n": 229,
      "s": "ci",
      "first": false,
      "t": "Spike: AI-search evidence for one real site",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "Manual exports from Search Console's generative AI report and Bing AI Performance, AI referrals from analytics and crawler fetches, joined with page-audit findings into evidence-backed findings (no score), written up with a recommendation for Foundation.",
      "why": "Tests whether the AI-search signals that exist today are actionable before anything is built to import them.",
      "files": ["scripts/ai-search/", "docs/experiments/"],
      "deps": [223, 55, 228]
    }
  ]
}
```
