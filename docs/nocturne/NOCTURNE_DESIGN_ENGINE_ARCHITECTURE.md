# Nocturne Design Engine Architecture (Document E1)

**Status:** the direction was approved by the owner on 26 October 2026. This is **revision r2**, the same day, refining contrast and publishing (§5), glass over solid backgrounds (DE-6) and proposal splitting (§6.2). Nothing is implemented, and the canonical build plan (version 19, 214 tasks) is unchanged.

**Companion documents:**

- [E2, Content Intelligence architecture](./NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md);
- [E3, integrated product architecture](./NOCTURNE_PRODUCT_ARCHITECTURE.md);
- [E4, roadmap integration proposal](./NOCTURNE_DE_CI_ROADMAP_INTEGRATION.md).

They build on revision 3 (documents A–D in this folder), which you approved on 25 October. Where this document changes a revision 3 decision, it says so.

**How the evidence was gathered.** I read the source on local `main` at `2b6595c`, plus `origin/main` for task 189, and the live build plan with its progress database (111 done, 2 doing, 100 to do, 1 skipped). Labels:

- `[Code]` means I read it in the source;
- `[Test]` means a unit or e2e test covers it;
- `[Plan]` means it exists only as a task;
- `[Hyp]` means a hypothesis that still needs checking.

---

## 1. Summary

**The Design Engine already exists.** It is a typed, server-rendered system:

- **Section schemas:** 20 section types.
- **One shared `sectionStyle`:** about 1,100 lines of tones, backgrounds, overlays, edges, motion, spacing, width and alignment.
- **Presets:** picture-based presets that set several fields at once.
- **A layered override model:** `layerDesign`, with "unset means inherit".
- **Brand colours:** stored in Studio, resolved to CSS variables with contrast checks.
- **No added JavaScript:** none of this adds JavaScript to public pages.

**What's wrong is reach, not foundations:**

- Most site-wide design decisions (type, spacing, shape, glass, motion level) can only be changed in code.
- Glass only exists inside the Link list.
- Layouts can't take a second piece of media or a supporting block, except the hero's single slot.
- Nothing describes the system in a form a machine, or a future AI, can use.

**My recommendation, in one line:**

- Keep the typed section approach.
- Make site-wide design decisions **named and referenced**, never copied.
- Grow a small number of **section families with typed slots**.
- **Generate** a capability manifest from the schemas you already have.

Then every future change, by a human or an AI, is a validated Sanity draft that you preview and publish as usual.

---

## 2. Existing capability audit

Classes:

1. working and verified;
2. partially implemented;
3. implemented but architecturally fragile;
4. planned, not implemented;
5. missing.

| Capability                  | Class                    | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Tasks                   |
| --------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Design tokens pipeline      | 1                        | <ul><li>`src/styles/tokens.json` holds colour (28 roles), font, type, space, radius, shadow, emphasis, glass, edge and motion.</li><li>`scripts/build-tokens.mjs` generates `tokens.generated.css` and `tokens.generated.ts`.</li><li>CI checks the generated files are current. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                            | 2                       |
| Brand colours in Studio     | 1                        | <ul><li>The `designSettings` singleton sets appearance, primary, secondary, highlight, the full palette and gradients.</li><li>`resolveDesignTokens` (`src/lib/color/resolve-design-tokens.ts`) writes only the changed `:root` variables, server-side, and runs contrast checks with suggested shades. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                     | 78, 109, 140            |
| Shared section style        | 1                        | <ul><li>`src/lib/sanity/schema/section-style.ts` sets tone; gradient; image (size, position, repeat, strength, wash, overlay, gradient overlay, "stays put"); motion (preset, intensity, custom timing); edges; spacing; width; alignment; anchor; and fill screen.</li><li>Rendered by `SectionFrame` (`src/components/ui/section-frame.tsx`). `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                             | 4, 82, 83, 84, 114, 154 |
| Options that suit a layout  | 1, with limited coverage | <ul><li>`registerSectionRules` (`schema/section-form.ts`) hides Parallax, Alignment and Background image where they don't apply.</li><li>Only three section types register rules; the rest get every option. `[Code]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 4                       |
| Section variants            | 1                        | Ten of the 20 sections have a `variant` (for example hero, gallery, team, testimonials and stats) `[Code]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 5                       |
| Presets                     | 1                        | <ul><li>`PresetDefinition { value, title, set: Record<path, value> }` (`schema/preset-field.ts`) is a macro that writes several fields.</li><li>`preset-match.ts` recognises which preset the current values match.</li><li>Used by the hero. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 74, 80                  |
| Hero supporting slot        | 1                        | One typed slot with a registry (`hero/slots.tsx`): "one schema, one component, one registry line" `[Code][Test]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 81                      |
| Element-level animation     | 1                        | Hero parts animate separately, inheriting the section preset `[Code][Test]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 85                      |
| Parallax                    | 2                        | <ul><li>Presets in three strengths, with placement `beside` or `background` (`components/motion/presets.ts`).</li><li>The hero's background uses `background`.</li><li>I found no drift wired to the shared section **Background image**, which has only "stays put" (fixed). `[Code]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | 84, 101, 108            |
| Glass                       | 2                        | <ul><li>Tintable glass exists for Link list rows, cards and social buttons only (`surface-options.ts`, `glass-row.tsx`).</li><li>Worst-case glass contrast exists (`lib/color/glass-contrast.ts`).</li><li>No section-level glass, and none for navigation. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 113, 153, 159           |
| Layered overrides           | 2                        | <ul><li>`layerDesign` (`lib/sanity/design-overrides.ts`) gives four layers, with `undefined` meaning inherit and deliberate "off" values kept. Link list only.</li><li>The override summary and reset (task 167) are Link list only. The hero trial wasn't rolled out because `describePresetState` ties when presets differ by one field (167 notes). `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                      | 153, 167                |
| Typography                  | 2                        | <ul><li>Fonts and the type scale live in `tokens.json` and `next/font`: changing them means changing code.</li><li>Studio offers heading emphasis and gradients per heading, not a site-wide treatment. `[Code]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | 2, 107                  |
| Site-wide spacing and shape | 2                        | Only in `tokens.json`. Spacing is chosen per section (compact, default or spacious) `[Code]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 2, 4                    |
| Responsive styling          | 2, by design             | <ul><li>Layouts stack on phones by design; editors don't set breakpoints.</li><li>Only the edge height has a "phones" value.</li><li>No site-wide motion level for phones; `prefers-reduced-motion` is respected everywhere. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 3, 83                   |
| Page composition            | 1                        | <ul><li>`page.pageBuilder` is an array of the 20 section types plus references to `sharedSection` (one section reused on many pages).</li><li>Page templates exist for pre-launch. `[Code][Test]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | 120                     |
| Draft preview               | 1                        | Presentation, draft mode, and form beside Preview in Structure `[Code][Test]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | 26, 183                 |
| Publishing                  | 1, with a UI-only gap    | <ul><li>Safe publish with slug redirects, and a validation dialog.</li><li>Clients are kept out of the Design tab by `hiddenFromClients`, which is UI only.</li><li>The enforceable boundary is planned. `[Code][Plan]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | 24, 161, 162, 205, 206  |
| Machine-readable registry   | 2 (the raw material)     | <ul><li>`schema.json` (from `sanity schema extract`) holds types and fields, but not option lists.</li><li>`scripts/build-editor-guide.mjs` already loads `sectionTypes` through `jiti` to read titles, limits and sizes.</li><li>No design manifest exists. `[Code]`</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | 33                      |
| Fragility                   | 3                        | <ul><li>**`section-style.ts` is 1,100 lines** and grows with every option. Rules cover three sections.</li><li>**`link-list.ts` (944 lines) and `link-list-design.ts` (705 lines)** hold the deepest design work. The shared parts were extracted (`surface-options`, `depth-options`, `design-overrides`), but every rollout (137, 146, 156, 158) rewires them by hand.</li><li>**Presets copy values:** a preset that wrote a raw colour or size wouldn't follow a later global change. Today's presets mostly write semantic names (tone `accent`, not a hex), which is what keeps them safe.</li><li>**The JS budget has no headroom** (about 218.5 of 220 KB). Any Design Engine feature that needs client JavaScript on public pages is constrained.</li></ul> | —                       |
| Planned                     | 4                        | Section contract v2 (193, 213), theme-adaptation test (194), contrast that says what to fix (168), glass for navigation (159), card overrides elsewhere (156), parallax direction (108), saved motion presets (86), pattern registry (50), site recipes (197)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                       |
| Missing                     | 5                        | <ul><li>A design manifest.</li><li>Structured change proposals.</li><li>Design-reference interpretation.</li><li>Site-wide density, shape, heading and motion decisions in Studio.</li><li>Section glass.</li><li>A second media or supporting slot outside the hero.</li><li>Override summaries outside the Link list.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                    | —                       |

**What the audit changes in revision 3's thinking:**

1. **Presets already are the "looks".** Revision 3 (§9.4, task 193) proposed a new stored `look` field. Presets already set layout, tone, motion and shape as a named bundle. A second mechanism would add a third layer of inheritance.
2. **The slot pattern already exists** in the hero (task 81). It should be generalised, not reinvented as a `supportingMedia` field.
3. **The manifest can be generated.** The editor guide generator already reads the schemas this way.

---

## 3. The ideal workflows, and what's realistic

### Experience A — a website from a design reference

**The challenge.** A finite component library can't reproduce arbitrary references. A reference is made of three different things:

| Part of a reference                                                                       | Can a finite system represent it?                                                                                                                                                       |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design decisions:** palette, type mood, density, corner shape, surface style, motion    | Yes, largely: these are a few named values, and extracting them from a reference is fairly reliable `[Hyp]`                                                                             |
| **Composition:** section order, layout, what sits where                                   | Mostly, _if_ families have slots. Most marketing pages are largely hero, split, cards, CTA and editorial sections `[Hyp: not measured; task 221 measures the share on real references]` |
| **Signature elements:** an unusual hero, a custom illustration grid, an interactive piece | No. These are what make a site bespoke, and they're code                                                                                                                                |

**The approaches compared:**

| Approach                                                                      | Attractive                           | Maintainable                       | Editable              | Verdict                                               |
| ----------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------- | --------------------- | ----------------------------------------------------- |
| Match the reference to existing components                                    | Generic when the library is small    | Yes                                | Yes                   | Necessary, but not enough                             |
| Generate structured section configurations (families, presets, slots, tokens) | Good, if the families are expressive | Yes                                | Yes                   | **The core**                                          |
| Extend component variants for each reference                                  | Good                                 | Each variant costs upkeep          | Yes                   | Only when a variant recurs (the pattern registry, 50) |
| AI code generation of whole pages                                             | Can be close to the reference        | **No:** one-off code in every repo | **No:** not in Studio | Reject for pages                                      |
| **Hybrid:** controlled components plus a bounded bespoke section              | Best                                 | Yes: bespoke code is isolated      | Mostly                | **Recommended**                                       |

**The recommendation: a hybrid with an honest gap report.**

1. **Interpret.** A model reads the reference and proposes:
   - design decisions (palette and contrast-checked roles, the nearest font pairing, density, shape, glass, motion level);
   - a section sequence (families, presets and slot contents);
   - a **gap list** of regions it couldn't represent, each with a suggested treatment: a bespoke section, a new preset, or "simplify".
2. **Validate and apply** the proposal as a Sanity draft (§6).
3. **The designer refines** in Presentation, by natural language (Experience B) or by hand.
4. **Gaps become bespoke sections** in the client repo (task 14), built on `SectionFrame` and the slot contracts, so they still get tones, backgrounds, motion and Studio editing. A bespoke section used twice is promoted to the template through the pattern registry (task 50).

**Expect:**

- design decisions that are close;
- a composition that is structurally right but rhythmically plain;
- signature elements that are missing by design.

Don't expect pixel-perfect results. Revision 3's stop rule stands: if correcting the proposal takes more than 70% of the manual build time, stop the experiment `[Hyp]`.

**Inputs, by reliability:**

- **Figma files** can expose real variables and structure through Figma's developer tooling, so they're more reliable than screenshots `[Hyp: check in the experiment]`;
- **screenshots and mock-ups** are next;
- **"inspiration" moodboards** are the least reliable, and are best used only for design decisions.

**Fonts.** `next/font` fonts are fixed when the site is built. The engine therefore chooses from a **curated list of font pairings**, never arbitrary fonts. Changing a site's pairing is a reviewed commit to `tokens.json` (task 13). Foundation or an AI can open that as a pull request.

### Experience B — changing designs without code

| Request                                                            | Structure needed                                                                                                                                             | Supported today?                                                                                      | Where it's too rigid                                               | Scope                                                       | Plan                            |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------- |
| "Make this section glass."                                         | `style.panel: 'glass'`: the content sits on a glass panel over the section's background                                                                      | No. Glass is Link list only                                                                           | Glass belongs to Link list surfaces, not `sectionStyle`            | Section; the strength follows the site's Glass setting      | **New 218**                     |
| "Give the background some subtle parallax."                        | `style.motion: 'parallax'` with a background placement                                                                                                       | Partly: the hero background and side pictures drift. The shared Background image only has "stays put" | Background placement isn't wired to the shared background          | Section                                                     | 108 (add the shared background) |
| "Move the text left and the image right."                          | `imagePosition: 'right'`                                                                                                                                     | **Yes** (Image + text and the hero)                                                                   | —                                                                  | Section                                                     | —                               |
| "Add a button beneath the text."                                   | `ctas[]` (at most 2)                                                                                                                                         | **Yes** (Image + text, the hero and the CTA banner); clients can do it                                | —                                                                  | Section                                                     | —                               |
| "Add a video underneath the image."                                | A typed `supporting` slot holding a `video` block                                                                                                            | No                                                                                                    | `mediaText.image` is a single image field                          | Section                                                     | 219, then 193 (changed)         |
| "Give this section more breathing room."                           | `style.spacing: 'spacious'`, or the site-wide **density**                                                                                                    | **Yes** for one section; no for the whole site                                                        | Density is code-only (`tokens.json` space)                         | Section or site                                             | **New 216**                     |
| "This blue background needs a glass treatment that works with it." | A glass panel tinted from the section's tone. Over a solid blue it's a translucent tint with no blur (nothing varied is behind it), so its contrast is exact | No                                                                                                    | No section glass; contrast checks exist per component              | Section                                                     | 218 + 168                       |
| "Make the headings more editorial."                                | A site-wide **heading treatment** (scale ratio, weight, tracking, case, italic emphasis) over the build's font pairing                                       | No. Only emphasis and gradients per heading                                                           | The type scale is code-only                                        | Site, with a section override only where a family offers it | **New 216**                     |
| "Apply this colour scheme across the website."                     | `designSettings` colours                                                                                                                                     | **Yes** (Brand colours, with contrast warnings)                                                       | Warnings don't yet say what to fix, or which sections are affected | Site                                                        | 168, 194                        |
| "Reduce the animation intensity on mobile."                        | A site-wide **motion level** with a phone setting                                                                                                            | No. Intensity is set per section; reduced motion is respected                                         | No site-wide motion decision                                       | Site                                                        | **New 217**                     |

**How every change behaves:**

- **Preview:** a Presentation draft, with desktop and mobile widths.
- **Undo:** Sanity history, or discarding the draft.
- **Publish:** the normal publish dialog. Agency review for clients (task 206).
- **Invalid configurations are prevented in three places:**
  1. options that don't suit a layout are hidden (`registerSectionRules`);
  2. combinations are rejected by validation (warnings for taste, errors for broken output);
  3. the manifest validator rejects them in proposals (§6).

### Experience C — intelligent global design

See §5. Global decisions are **named values that sections refer to**, so a change flows to everything that inherits it. Deliberate local choices are kept, and shown.

### Experience D — flexible page composition

See §4.

---

## 4. The component composition model (decision DE-2)

### The options compared

| Model                                                | Creative freedom                                               | Editor simplicity                                                 | Accessibility                                           | Maintainability                   | AI compatibility                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------- |
| Many fixed section types (today's default)           | Low per type; grows only by adding types                       | High per type; the insert menu gets crowded                       | High: each type is hand-checked                         | Falls as types multiply           | Medium: many shapes to learn                                     |
| Composable content regions (any block in any region) | High                                                           | Low: every region becomes a page builder                          | Hard to guarantee heading order and contrast            | Medium                            | High in principle, but valid output is hard                      |
| **Families with controlled, typed slots**            | **High where it matters** (media, supporting content, actions) | **High:** a layout is chosen first, and slots only take what fits | **High:** each family owns its heading order and layout | **High:** one renderer per family | **High:** a small grammar of family, preset, slots and overrides |
| Generic drag-and-drop page builder                   | Highest                                                        | Low for clients; agency time moves to policing layouts            | Poor without heavy constraints                          | Low                               | Medium                                                           |
| Code generation per page                             | Highest                                                        | None (not editable)                                               | Unchecked                                               | Lowest                            | Easy to produce, unsafe to keep                                  |

### The model: families, presets, typed slots and a bespoke escape hatch

1. **Family.** One schema and one renderer for a recurring layout idea:
   - **split** (Image + text);
   - **hero**;
   - **cards** (features, services, testimonials, team);
   - **call to action** (CTA banner, newsletter);
   - **editorial** (rich text).

   Specialised sections stay as they are: gallery, stats, logo cloud, process, video, embed, location, events, link list, FAQ and pricing. Families are for recurring layouts, not for everything.

2. **Layout presets** (existing `PresetDefinition` macros) choose the arrangement, such as Media right, Media left, Stacked or Text over media. Each layout fixes its responsive behaviour. **Editors never set breakpoints.**
3. **Typed slots** live in one shared slot registry, generalised from `hero/slots.tsx`:

   | Slot         | Accepts                                                                                        | Rule                                                                              |
   | ------------ | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
   | `media`      | image (with Adjust picture and Image design), video (the video section's facade), framed image | Exactly one per layout that has media                                             |
   | `supporting` | video, stats bar, logo row, badge row, inline list, quote                                      | At most one. The layout decides where it goes (under the media or under the text) |
   | `actions`    | `cta`                                                                                          | At most two                                                                       |

   A new slot block type is one schema, one component and one registry line, with its client-editable classification (task 205) and its manifest entry generated automatically.

4. **Section style** (the existing `sectionStyle`) applies on top: tone, background, the new panel (glass or solid), motion, edges and spacing.
5. **Overrides** follow the `layerDesign` rules (§5). Each family shows an **override summary with Reset** (task 167's mechanism), once the preset-tie bug noted in 167 is fixed.
6. **The bespoke escape hatch** is a client-repo section (task 14), generated with `npm run new:section`. It renders inside `SectionFrame`, uses the slot components, and declares its manifest entry. Promote it to the template when a second site needs it (task 50).

**Why not a page builder?** A page builder makes every layout decision an editor's decision. That's the opposite of what Nocturne is for: designer-made layouts that clients can't break. Families with slots give you the "add a video under the image" freedom without making layout an editing task.

**Migration.** Each family migrates when a real site first touches it, in this order: split, hero, cards, call to action. Each migration:

- is a dry-run Sanity migration in `migrations/`;
- keeps existing pages rendering identically until an editor changes something;
- comes with visual baselines.

---

## 5. Token and inheritance model (decision DE-1)

### The layers, from least to most specific

| #   | Layer                 | Where it's stored                                                                                            | Who edits it                   | How it reaches the page                                     |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------------- |
| 1   | Template defaults     | `src/styles/tokens.json`                                                                                     | Code (template)                | Generated CSS custom properties and Tailwind theme          |
| 2   | Site design decisions | `designSettings` (Studio): colours today; density, shape, heading treatment, glass and motion level proposed | Agency                         | `resolveDesignTokens` writes `:root` variables, server-side |
| 3   | Section preset        | The fields a preset sets (macros), stored on the section                                                     | Agency (clients: content only) | Section classes                                             |
| 4   | Section overrides     | Explicit `sectionStyle` or family values                                                                     | Agency                         | Section classes and inline variables                        |
| 5   | Item overrides        | For example one Link list link's Appearance                                                                  | Agency                         | Item classes                                                |
| 6   | Code                  | Bespoke sections                                                                                             | Code (client repo)             | —                                                           |

The font pairing sits in layer 1 per site, through `tokens.json` (task 13). It's the one site decision that needs a build.

### The rules

1. **Unset means inherit, at every layer.** This is the existing `design-overrides.ts` rule ("only `undefined` means inherit"), applied beyond the Link list.
2. **Store references, not values.** Presets and overrides store **semantic names**:
   - tone `accent`;
   - panel `glass`;
   - density step `spacious`;
   - radius role `card`.

   They don't store hex values or pixels. A global change then updates everything that refers to the name. Raw values (a hex, an exact millisecond) are allowed only under Advanced, for the agency, and the override summary lists them.

3. **A local choice is kept and shown.** When a global decision changes, a section that set its own value keeps it. The Brand colours and Design settings screen shows "N sections set their own …", with a link to each. This uses the "used by" pattern from `panel-usage-input.tsx`.
4. **Derived colours are recomputed.** Text on a surface is always derived (as `accent-ink` is today), so a new primary colour brings new, legible text colours with it.

### When a global change breaks contrast (revised in r2)

**Principle: a contrast failure blocks the unsafe design change, never unrelated content.** In Sanity, a validation error blocks publishing the _whole document_ it's in. Contrast errors are therefore only allowed where the document _is_ the design change.

| Where the failing choice lives                                     | What happens                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brand colours and Design settings** (its own singleton document) | <ul><li>An **error** only when an _explicitly chosen_ Advanced palette pair fails text contrast (for example ink on surface), with a one-click **Use suggested**.</li><li>Pages, posts and every other document still publish, because they're separate documents.</li><li>Derived pairs never error, because they're adjusted automatically (below).</li></ul> |
| **A section's Design tab** (inside a page document)                | <ul><li>**Warnings only,** naming the pair, the ratio and the fix (task 168).</li><li>The render applies the safe fallbacks below wherever they're computable.</li><li>An error here would block the page's content, so it isn't allowed.</li></ul>                                                                                                             |
| **A proposal** (scripted or AI, E1 §6)                             | <ul><li>The unsafe _design_ patches are rejected.</li><li>A proposal that mixes content and design is split into two, so a rejected design part never blocks the content part.</li></ul>                                                                                                                                                                        |
| **A release** that bundles Brand colours with content              | A release publishes all or nothing. Guidance (README): keep site-wide design changes in their own release                                                                                                                                                                                                                                                       |

**Safe automatic adjustments.** All of these happen at render, in derived values; stored choices are never rewritten:

1. **Text on any solid colour is always fixable.** For any background, either near-black or white reaches at least about 4.58:1. That's the worst case, a background of relative luminance about 0.18. The resolver already chooses (`accent-ink`).
2. **Brand-coloured text** (links, eyebrows, accent headings) uses a lightness-adjusted shade of the same hue (`adjustLightnessForContrast` and the existing `accent-text` token). Studio says "Links use a darker shade of Primary for legibility", with **Use as chosen** to make it explicit.
3. **Borders and icons** get the same adjustment to 3:1.
4. **Panels** raise their opacity until the guaranteed bound (below) passes, and otherwise render solid.
5. **Overlays on pictures** only rise automatically when the section opts in to **Keep text readable**. That's the default for new sections, and off for existing ones, so updates never change a published look.

**Pictures, video and animation: what can be promised.** No reliable contrast measurement over an arbitrary photograph, video frame or moving background is promised. The resolver uses a **guaranteed bound** instead of image analysis:

- An overlay, wash or panel of colour C at opacity α over _any_ pixel produces a colour between α·C over black and α·C over white.
- If text passes against **both extremes**, it's legible whatever the picture, frame or parallax position. That's reported as _guaranteed_.
- If it fails against both, it's reported as _fails_.
- Otherwise it's _not guaranteed: check visually_. That's a human judgement, never a pass. The fix it suggests is a stronger overlay, a panel, or Solid.

This extends the worst-case method that `glass-contrast.ts` uses for Link list rows. Gradients are checked at their stops and at sampled points between them.

**Testing.** Task 194's CI contract test checks every tone × panel × text role combination at 4.5:1 with the default and fixture brands, on solid colours and gradients. Pictures are tested only for the guaranteed-bound states.

---

## 6. AI-readiness architecture (decisions DE-3 and DE-4)

### 6.1 A generated design manifest, not a second source of truth

**Decision:** `scripts/build-design-manifest.mjs` generates `design-manifest.generated.json`. It follows the pattern of `build-editor-guide.mjs`: it loads the TypeScript schemas through `jiti`, runs from `npm run typegen`, and CI checks the committed file is current.

| Manifest content                                                  | Source (already exists)                                                                                                                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Section types, fields, required fields, array limits, text limits | `sectionTypes`, validation rules and `LIMITS` constants (the editor guide already reads these)                                                                                |
| Allowed values and their titles                                   | `options.list` and `section-style-options.ts` constants                                                                                                                       |
| Presets and the fields they set                                   | `HERO_PRESETS` and other `presetsOption()` lists                                                                                                                              |
| Which options suit which layout                                   | `registerSectionRules`. Rules are functions, so the generator evaluates them for every variant and records the results (for example `{ variant: 'split', hasPicture: true }`) |
| Slots and the blocks they accept                                  | The shared slot registry (task 219)                                                                                                                                           |
| Who can edit each field                                           | `CLIENT_EDITABLE` (task 205)                                                                                                                                                  |
| Design token names and site decisions                             | `tokens.json` keys and `designSettings` option lists                                                                                                                          |
| Purpose, guidance and an example of valid content                 | **The only new input:** an optional `options.manifest = { purpose, example }` on each section type, which the CI check requires for families                                  |

**Why not hand-write a capability registry?** Because it would drift from the schemas within a release. Generating it means:

- the manifest can't describe a field that doesn't exist;
- a new option can't be added without appearing in it.

### 6.2 Change proposals

```ts
/** A proposed change: data only, never code. Produced by a person, a script or a model. */
export interface ChangeProposal {
  id: string
  manifestVersion: string // the template version the proposal was made against
  intent: string // the original instruction, kept for the record
  scope: 'section' | 'page' | 'site'
  changes: Array<{
    documentId: string // the published id; the proposal is applied to its draft
    baseRev: string // the revision the proposal was made from
    patches: SanityPatch[] // set / unset / insert, using paths the manifest knows
  }>
  rationale: string // shown to the reviewer
  gaps?: string[] // what couldn't be represented (Experience A)
}
```

**The pipeline:** instruction → proposal → validation → draft → preview → approval → publish.

| Step     | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Validate | <ol><li>**Manifest:** the paths, values, slots and limits exist.</li><li>**Sanity validation:** the patched draft passes the schema's own rules. `validateDocument` from `sanity` is the candidate `[Hyp: check that it's exported and usable outside Studio]`; otherwise run the `sanity documents validate` CLI against a scratch dataset.</li><li>**Design checks:** contrast through `resolveDesignTokens` and the glass checks; slot rules.</li><li>**Permissions:** `CLIENT_EDITABLE` decides whether the change needs agency review.</li></ol> |
| Apply    | <ul><li>Written to the **draft** with `ifRevisionID: baseRev`, so a stale proposal fails instead of overwriting newer work.</li><li>Site-wide proposals go into one **Release** where the Sanity plan includes Releases (the `releases` profile flag); otherwise as drafts of each document.</li></ul>                                                                                                                                                                                                                                                |
| Preview  | Presentation, desktop and mobile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Approve  | <ul><li>A person publishes.</li><li>Client-originated proposals go through the agency review (task 206).</li><li>**Nothing publishes automatically.**</li></ul>                                                                                                                                                                                                                                                                                                                                                                                       |
| Undo     | <ul><li>Before publishing: discard the draft or the release.</li><li>After: Sanity history, Revert.</li></ul>                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Recover  | <ul><li>Validation failure: a list of rejected patches with reasons, and nothing written for that part. Content and design patches are separate parts, so a rejected design change never blocks a content change (§5).</li><li>A revision conflict: re-propose from the new revision.</li><li>A partial failure inside a release: the release isn't published.</li></ul>                                                                                                                                                                              |
| Record   | The proposal JSON and its outcome are saved with the draft. The storage is decided in the experiment: a `proposal` field in the release description, or a file in the client repo                                                                                                                                                                                                                                                                                                                                                                     |

**Who applies proposals?** A signed-in agency user, in Studio, or a script using a scoped token in a **scratch** dataset during the experiment. This keeps revision 3's rule that all content and design edits happen in Studio drafts. Foundation never writes content. Sanity history then shows a real person as the author.

**Where the model runs:**

- **for the experiment:** in a Claude Code session, with no product code;
- **later:** in Foundation, server-side, with the API key held there and agency-only. Sanity's own AI features (Assist is installed; Agent Actions write schema-aware drafts) are an alternative to evaluate, because they validate against the schema natively `[Hyp: check the plan, pricing and limits first]`.

### 6.3 What AI shouldn't do

- Publish anything.
- Generate page code. Bespoke sections are written as normal pull requests.
- Choose arbitrary fonts or raw values outside Advanced.
- Write a design change on a client's behalf without agency review.

---

## 7. Critical technical decisions

| ID   | Decision                                                                                                                                                                                                                                                                                                                                                                            | Replaces or confirms                              |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| DE-1 | **Design values are references to named site decisions, never copies.** Unset inherits. Raw values only under Advanced, and listed in the override summary                                                                                                                                                                                                                          | Generalises `design-overrides.ts`                 |
| DE-2 | **Families with typed slots, from a shared slot registry; presets are the looks.** No separate stored `look` field                                                                                                                                                                                                                                                                  | **Changes revision 3 §9.4 and tasks 193 and 213** |
| DE-3 | **The design manifest is generated from the schemas.** Only purpose and example are new inputs                                                                                                                                                                                                                                                                                      | New                                               |
| DE-4 | **Every non-manual change is a validated proposal, applied as a draft by an authenticated person.** Nothing publishes automatically                                                                                                                                                                                                                                                 | Extends revision 3 §9.6 and §9.10                 |
| DE-5 | **Site-wide density, shape, heading treatment, glass and motion level are runtime CSS variables** from `designSettings`. Fonts stay a build-time decision                                                                                                                                                                                                                           | New. No client JS, so the JS budget is unaffected |
| DE-6 | **Glass works over any suitable background; blur only where it's visible** (r2). Over a solid tone, glass renders as a translucent tint with no backdrop blur. It's frosted only over pictures, gradients, video, patterns or overlapping content. It's tinted from the tone, and falls back to solid when contrast can't be guaranteed or the visitor prefers reduced transparency | Extends the Link list glass rule to sections      |
| DE-7 | **No public-page JavaScript for design features** beyond what Motion already loads. Phone motion uses the existing motion modules                                                                                                                                                                                                                                                   | Confirms the JS budget constraint                 |

---

## 8. Highest-priority gaps, in order

1. **Site-wide design decisions beyond colour:** density, shape, heading treatment (216), then motion level (217). They unlock most "global change" requests at little cost, because the resolver and CSS variables already exist.
2. **Section glass panel (218).** It's the most requested treatment, and the parts already exist (`glass-contrast.ts`, glass tokens, `surface-options.ts`).
3. **Contrast that explains and lists affected sections (168, then 194).** Global changes are only safe if their effects are visible.
4. **The shared slot registry (219), then the split family (193, changed),** then the hero (213). These cover "add a video", "add a supporting block" and layout switches.
5. **The design manifest (215).** It's cheap, it makes the system describable, and it's the precondition for every proposal.
6. **Change proposals (220),** then **the design-reference experiment (221).** Both are deliberately last.

**Not proposed:**

- Studio controls for per-breakpoint layout;
- arbitrary fonts;
- a free-form page builder;
- a visual canvas editor;
- AI code generation for pages.

---

## 9. Vertical slice A — Design Engine

**Goal:** on a real page, go from a preset to a refined, glass-and-motion page, change a global decision, preview it on desktop and mobile, and publish it, with no code change in the client repo.

| Step                                  | Deterministic today, or after the slice's tasks                                                 | Experimental                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1. Start from a component or template | Page templates (120), hero presets (80), the split family's presets (193)                       | From a design reference (221)       |
| 2. A valid initial configuration      | Studio validation, plus the manifest validator for scripted starts (215, 220)                   | Proposals from a model (221)        |
| 3. Change layout and regions          | Image side, a video under the image, a second button (219, 193)                                 | Natural-language instructions (221) |
| 4. Apply a global change              | Density **Airy**, shape **Soft**, heading treatment **Editorial** (216), and Brand colours (78) | —                                   |
| 5. Add glass and motion               | Glass panel (218), motion presets (84), "Calmer on phones" (217)                                | —                                   |
| 6. Preview on desktop and mobile      | Presentation viewport toggle, Preview beside the form (183)                                     | —                                   |
| 7. Save safely                        | Draft, publish validation (161, 162), agency publish or review (206)                            | —                                   |
| 8. Deploy without code                | Publishing revalidates the page. No deployment is needed for content or design changes          | —                                   |

**Tasks the slice needs:** 216, 217, 218, 219 and 193, with 168 before 218. The slice is about **12–14 sessions**, including task 168.

**Acceptance tests (measurable):**

1. **An e2e fixture page** uses the split family with a video in `supporting`, a glass panel over a background image, and two actions. A second section has glass over a solid tone. It renders as a tint with no `backdrop-filter`. Both render with no axe violations. The panel text reaches at least 4.5:1 (exact on the solid tone, guaranteed-bound over the picture), measured by the 194 test.
2. **Inheritance (e2e):** setting the fixture's density to **Airy** changes the computed vertical padding of every section that doesn't set its own spacing, and leaves a section with **Compact** set unchanged. The same pattern applies to shape (`--radius-card`) and heading treatment (computed letter spacing and weight of `h2`).
3. **Phones (e2e):** with motion **Calmer on phones**, the reveal distance at a 390 px viewport is lower than at 1280 px. Reduced motion still renders final states.
4. **Budgets:** home page JavaScript within the existing budget, with no increase above 0.5 KB gzipped. LCP and CLS within `lighthouserc.json`.
5. **No code:** the slice's changes on the real page produce an empty `git diff` in the client repo.
6. **Usability (task 77 method):** "Make this section glass, put the image on the left, add a video under it, and make the whole site more spacious" is done by the agency in under 5 minutes with no code, timed once before and once after.

The experimental path (step 1 from a reference) is measured separately by task 221.

---

## 10. Self-challenge (revisions made)

- **Unnecessary abstractions?** I dropped revision 3's `look` field (presets already are looks) and a hand-written capability registry (generate it instead). I also rejected a general slot-in-any-region model.
- **Could Sanity already do more?** Yes:
  - Releases bundle site-wide changes;
  - history provides undo;
  - Presentation provides preview;
  - schema validation can validate proposals.

  The plan uses all four instead of building its own.

- **Too many controls?** Design settings v2 adds five site-wide decisions, each a short list of named choices with pictures, under the existing "Beautiful defaults → Simple presets → Advanced" rule. No sliders by default.
- **Is AI adding value?** Not yet. The manifest and proposals are useful without AI: scripted starts, recipes (197) and migrations. AI waits until families exist (221), and has a stop rule.
- **Are the design-reference expectations realistic?** Only with the gap list and the bespoke escape hatch. Pixel-perfect isn't promised.
- **Can one person maintain it?** Yes:
  - two new modules (the manifest generator and the proposal validator);
  - one generalised registry (slots);
  - additions to existing resolvers.

  No new service or repo.
