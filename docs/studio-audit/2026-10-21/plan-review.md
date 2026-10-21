# Plan review after the 21 October 2026 UI/UX audit

A planning pass only: nothing was implemented, published or deployed, and neither the build plan nor its saved
progress was changed. It reads the two audit documents in `docs/` (`Nocturne_Studio_UI_UX_Product_Quality_Audit.md`,
`Nocturne_Studio_Premium_Visual_Redesign_Proposal.md`) and the four concept boards as **evidence and design targets**,
checks each finding against the repository, and maps it to the real plan. Proposed task prompts are in
[`plan-tasks.md`](plan-tasks.md).

## 1. The plan and its conventions

| Item           | What is true                                                                                                                                                                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical plan | The **Currawong Build Plan** artifact, `https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL`, version 14 (20 October 2026), 159 tasks. Nothing in the repo competes with it: `docs/studio-audit/2026-10-17/plan-tasks.md` and `docs/code-audit/2026-10-18/report.md` are staging areas whose tasks were (or were meant to be) copied into it. |
| Format         | One HTML page: `STAGES` and `TASKS` arrays (`n, s, first, t, w, ctx, size, what, why, files, deps`), one `<script type="text/plain" id="p-NNN">` prompt per task, two shared context blocks.                                                                                                                                                |
| Progress       | The page's database, collection `progress`, docs `t01`–`tNNN` with `{status: todo / doing / done / skip, notes, updatedAt}`. 86 docs exist; tasks without a doc are `todo`.                                                                                                                                                                 |
| Stages         | `shipped`, `now` (launch lane), `q0` (P0), `client` lane, `q1` (P1), `q2` (P2), `mig` lane, `p3`, `dom`, `p4`, `p5`, `p6` (P3 platform). Priority is the stage.                                                                                                                                                                             |
| Rules          | Task numbers never change; new tasks take the next free number (**160**); finished tasks move to _Shipped_ and keep their notes; each version adds a dated paragraph to the footer. Releases are template semver tags (`CHANGELOG.md`, `template-version.json` = 1.6.0, 18 October).                                                        |
| Automation     | None. The plan is edited by hand (insert prompt blocks before the `DATA AND BEHAVIOUR` comment and `TASKS` entries in stage order).                                                                                                                                                                                                         |

## 2. Stack and Studio facts that decide feasibility

- `sanity` 6.19.0, `react` 19.3.1, `@sanity/ui` 4.4.9, `next` 16.4.2, `next-sanity` 13.3.4. `@sanity/themer` is
  **not installed**. The installed versions meet its documented requirement (Studio 6+, React 19), but its API is
  unverified here: a spike comes before any migration.
- Theme: `src/features/studio/theme.ts` wraps Sanity's **deprecated `buildLegacyTheme`** (built once per scheme, with
  the legacy markers removed so dark mode works, from task 106). Brand roles come from `studio-brand.json` over
  `src/config/studio-brand/currawong.ts`. `no-ui-overrides.test.ts` forbids CSS overrides of Sanity internals.
- Shell: `studio.components.logo = StudioLogo` (the **deprecated logo hook**), `navbar = RoleNavbar` (the agency strip
  and client-view toggle, then `renderDefault`), and workspace `icon = StudioIcon`.
- Roles: `src/lib/sanity/roles.ts` and `src/features/studio/roles.ts`. Tools are filtered in `utils/tool-access.ts`,
  the insert menu in `components/section-insert-filter.tsx`, and actions in `utils/document-access.ts`.
- Approved decisions that bear on the proposal (14 and 17 October): the CMS brand is **Currawong by default and the
  client's own when set**. It is separate from the site's `tokens.json`. **The workspace theme uses self-hosted Newsreader for display headings and Inter for interface text and inputs (21 October, task 172). UI 5 alpha components retain Sanity styling and CDN-hosted Inter under the agreed narrower scope.** The default CMS palette follows proposal §5, with the classic palette retained as a named alternative.
  Clients **keep Variants and Releases** (17 October, decisions 1–2). Dark mode is preferred, with light offered (106,
  shipped).
- No end-to-end test opens the Studio. Studio code is covered by unit tests (`studio-inputs.test.tsx`, `*.test.ts`)
  and the brand-preview page specs. `docs/studio-roles-test-script.md` is a manual script.

## 3. Brand and artwork inventory (VD-001)

| File                                                                         | Size       | What it is                                                                             |
| ---------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------- |
| `src/assets/brand/currawong/wordmark-on-light.webp`, `wordmark-on-dark.webp` | 1368 × 266 | Currawong wordmark, used by `currawongBrand.logo`                                      |
| `mark-no-text.webp`, `mark-no-text-on-dark.webp`                             | 1368 × 266 | Bird mark without text, used by `currawongBrand.mark` (workspace icon, favicon source) |
| `mark.webp`, `mark-on-dark.webp`                                             | 1368 × 266 | Mark with text                                                                         |
| `src/app/icon.png`, `apple-icon.png`                                         | —          | Default favicon from the dark mark (commit d914736)                                    |

**There is no Nocturne artwork in the repository.** "Nocturne" is the template, repo and package name (CHANGELOG
1.5.0). The audited shell showed the CMS brand (the mark beside the workspace name), which is the approved design, not
a defect. `StudioLogo` already draws a wordmark in a fixed 24 × ≤160 px box, picking the light or dark file by colour
scheme. VD-001 therefore starts with a **brand decision**, not code (section 8, decision 1).

## 4. Finding the cause of UX-001 (source-level, not yet reproduced)

`SectionInsertFilter` (`src/features/studio/components/section-insert-filter.tsx:27-44`) runs only in client view. It
replaces the array input's `arrayFunctions` with a wrapper that renders `<DefaultFunctions>`, where
`DefaultFunctions = props.arrayFunctions`. Sanity 6.19 leaves that prop **undefined** unless a plugin supplies one:
`ListArrayInput` and `GridArrayInput` fall back to `ArrayOfObjectsFunctions` only when it is undefined
(`node_modules/sanity/lib/PerspectiveProvider-*.js`). No installed plugin or project file sets it. So in client view the
wrapper renders an undefined component, which is exactly React error #130 ("element type is invalid … got:
undefined"), on every page-builder array. Agency view passes the prop through untouched and works. This matches every
symptom in the audit (client view only, Home and Links, still there after navigating back). It has been live since
task 26 (15 October) and affects **real client editors, not only the preview toggle**. The file has no tests.

## 5. Finding the cause of UX-002 (source-level)

`mainDocuments` in `src/features/studio/presentation.ts` maps `/` to the page whose slug is `HOME_SLUG` (`home`).
Before launch, `src/proxy.ts` serves the profile's `launch.homepage` page (for example `links`) at `/`, and a site whose
home page has another slug (the audited site's is `/test`), or that reaches it through a Studio redirect, has no
`home` page. Result: "Missing a main document for /" while the page renders. The catch-all route
`['/', '/:a', '/:a/:b', '/:a/:b/:c', …]` also matches `/api/draft-mode/enable`, the iframe's first URL, which gives the
first warning. Visual selection still works because overlays carry their own document ids. Studio redirects
(`lookupRedirect`) are not consulted either.

## 6. Crosswalk

Category key: 1 confirmed bug · 2 symptom needing diagnosis · 3 UX recommendation · 4 existing strength · 5 content or
site readiness · 6 idea or test to validate · 7 deferred. Feasibility: T supported theme · C small supported custom
component · A schema or navigation architecture · ? version-dependent.

| ID                 | Nature                              | Existing task(s)                                          | Repo evidence                                                                                       | Disposition                                                         | Proposed delta                                                                        |
| ------------------ | ----------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| UX-001             | 1 (P0). Cause found at source level | 26 (shipped 15 Oct, no render test)                       | Section 4                                                                                           | **New 160** (P0, patch release). Task 26 stays shipped, with a note | Fix, error boundary, regression tests, v1.7.0                                         |
| UX-002             | 2 → cause found (P1)                | 118 (preview pass, done), 121                             | Section 5                                                                                           | **New 161**                                                         | Resolver uses launch homepage and redirects, skips `/api/*`, explains unmapped routes |
| UX-003             | 3 (P1), A                           | 153 (per-link Inherit), 152 item "review Design tab", 156 | `inheritable-choice-input.tsx`, `layerDesign`                                                       | **New 167**, Link list first                                        | Override summary, reset card or group, scope labels                                   |
| UX-004             | 3 (P1), C                           | 140 (done: checks use Brand colours), 109                 | `theme-colour-picker`, `colour-input.tsx` (Brand colours already suggests fixes)                    | **New 168**                                                         | Each warning names the property and offers a fix or Inherit. Not a WCAG claim         |
| UX-005             | 3 (P2), C/?                         | 111 (singleton "New …" fixed)                             | `structure.ts` uses default lists                                                                   | **New 165** (feasibility first)                                     | Explained empty lists for Forms, Panels, Shared sections, Enquiries, AI context       |
| UX-006             | 3 (P2), decision                    | 17 Oct decision 2: Releases stays                         | `tool-access.ts`; `releases.enabled` exists in 6.19 config types                                    | **Decided**: 166                                                    | Hide when the project's plan lacks Releases, or keep                                  |
| UX-007             | 1 (P2), C                           | 27 (shipped)                                              | `start-here/utils/wording.ts:20-23` gives "Untitled business info" to every untitled singleton      | **New 164**                                                         | Singleton names from the structure titles                                             |
| UX-008             | 4 + 3 (P2)                          | 27, 33 (shipped), 44 (p3)                                 | `site.profile.ts help.supportEmail/guideUrl` exist; the fallback reads "Ask your Currawong contact" | **Enhance 32** (handover sets help) **+ part of 162**               | Better fallback text and a support link from the error state                          |
| UX-009             | 5                                   | client lane 31                                            | Frame validator works (`frames/schemas/frame.ts`)                                                   | **Site track** (living-prana 31)                                    | Re-export the Compass Frame. No template change                                       |
| UX-010             | 6 (P3)                              | 74, 76 (shipped)                                          | Illustrated picker and search exist                                                                 | **Deferred**                                                        | Revisit after task 77 shows a picker problem                                          |
| UX-011             | 3 (P2), A                           | —                                                         | Breadcrumbs are native                                                                              | **In 167** (scope labels); jump to parent deferred                  | —                                                                                     |
| UX-012             | 3 (P2)                              | 89 decisions 4–6, `*/wording.ts`                          | Wording modules exist                                                                               | **Deferred** until 77's publishing scenario                         | Copy taxonomy after evidence                                                          |
| UX-013             | 5                                   | client lane 31, 121 checklist                             | Content health and launch checklist counted it                                                      | **Site track**                                                      | Nothing in the template                                                               |
| UX-014             | 6 (P2 verification)                 | 89                                                        | No Studio keyboard tests                                                                            | **New 173** (with UX-017)                                           | Keyboard, name and responsive sample of custom inputs                                 |
| UX-015             | 6 (P2 verification)                 | 77 (todo), 24 (shipped)                                   | —                                                                                                   | **Enhance 77**: scenario I                                          | Staged draft → preview → publish → restore                                            |
| UX-016             | 6 (P2)                              | Content health (shipped)                                  | `detect.ts` has links, anchors, panels, alt, redirects, orphans; no frame size or contrast          | **Deferred** (P3)                                                   | Possible frame-size check later                                                       |
| UX-017             | 6 (P2)                              | 89 (1024 px shots)                                        | —                                                                                                   | **In 167**                                                          | —                                                                                     |
| UX-018             | 6 (P3)                              | **91** (todo)                                             | —                                                                                                   | **Enhance 91** with audit context                                   | No new task                                                                           |
| VD-001             | 3, brand decision, C/?              | 66, 69 (shipped)                                          | Section 3                                                                                           | **Decided**: 170, 171                                               | Navbar composition replaces the deprecated logo hook                                  |
| VD-002             | 3, T/?                              | 66, 88, 106 (shipped)                                     | `theme.ts` legacy builder                                                                           | **New 172** (spike + migration)                                     | Proposal hex values only if approved; today's palette is approved                     |
| VD-003             | 7                                   | 159 is **site** glass, not Studio                         | Sanity UI has no glass surfaces                                                                     | **Deferred** (P3)                                                   | Only on Nocturne-owned floating UI, if ever                                           |
| VD-004/005/006/010 | 3, T                                | 88                                                        | Native Sanity UI                                                                                    | **In 172** (theme tokens), else none                                | No CSS patching (`no-ui-overrides.test.ts`)                                           |
| VD-007             | 3, C+A                              | 153                                                       | `slider-input.tsx`                                                                                  | **In 167** (reset and source on sliders)                            | —                                                                                     |
| VD-008/011         | 3, C                                | 110                                                       | Custom inputs vary                                                                                  | **In 173** (audit of custom inputs)                                 | —                                                                                     |
| VD-009             | 7                                   | —                                                         | Native shell                                                                                        | **Spike 174** (added 21 Oct, after 171 and 172)                     | Layout rework not justified yet; the spike decides                                    |
| VD-012             | 3, T; conflicts with "default font" | 66                                                        | —                                                                                                   | **In 172**: Newsreader and Inter (decision 3)                       | —                                                                                     |
| VD-013             | 3                                   | —                                                         | —                                                                                                   | **In 160** (error), **165** (empty), **161** (unmapped preview)     | —                                                                                     |

Strengths C1–C10 are all implemented (tasks 26, 27, 33, 74–76, 78, 80, 23, 24, 101). None of them is reopened.

## 7. Component adoption matrix (repository evidence)

| Screen                       | Theme tokens                             | Brand / nav                                    | Shared controls                                        | States and contrast                | Inheritance / presets            | Responsive / AT verified              | Status                              |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | ---------------------------------- | -------------------------------- | ------------------------------------- | ----------------------------------- |
| Studio shell, Start here     | Legacy theme, both schemes (66, 88, 106) | CMS brand logo via deprecated hook; RoleNavbar | Sanity UI cards (110)                                  | "Untitled" singletons (UX-007)     | N/A                              | 1024 px shots only (89)               | Shipped; 164, 171, 172 planned      |
| Pages / Hero                 | Theme                                    | Shared                                         | Preset picker (74)                                     | **Client Sections crash**          | Hero preset divergence (80, 112) | No                                    | 160 and 162 are P0                  |
| Link list / cards            | Theme                                    | Shared                                         | Preset picker, inheritable choice, slider, icon picker | Contrast badges (140)              | Per-link Inherit (153)           | Keyboard check pending (155 note)     | 153–155 done; 167, 168, 169 planned |
| Brand colours                | Theme                                    | Shared                                         | Colour input                                           | Suggested fixes, preview (78, 109) | Basic / advanced                 | No                                    | Shipped: the model for 165          |
| Website settings / media     | Theme                                    | Shared                                         | Native                                                 | Launch & visibility (121)          | N/A                              | Manual walkthrough pending (121 note) | Shipped                             |
| Presentation                 | Theme                                    | Shared                                         | Native                                                 | **Unmapped `/` warning**           | N/A                              | No                                    | 161 planned                         |
| Reusable / Enquiries / tools | Theme                                    | Shared                                         | Native lists                                           | Generic empty text                 | N/A                              | No                                    | 165 planned                         |

## 8. Decisions (answered 21 October 2026)

| #   | Question                     | Answer                                                                                                                                                   | Where it goes        |
| --- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | Nocturne as the Studio brand | Nocturne is Currawong's brand. The navbar shows wordmark-on-light in light mode and wordmark-on-dark in dark mode; a client's logo and colours still win | 170, 171             |
| 2   | Releases for clients         | Per site, only when the project's Sanity plan includes it (narrows the 17 October decision)                                                              | 166, 32              |
| 3   | Studio typography            | Google Fonts: Newsreader (serif, display) and Inter (sans, interface). Replaces the 14 October default-font rule                                         | 172                  |
| 4   | Studio palette               | Adopt the proposal's colours; keep today's palette to go back to                                                                                         | 172                  |
| 5   | Merged tasks still `doing`   | Mark done                                                                                                                                                | Done in the database |

Found while answering 1: the wordmark files read NOCTURNE but have no transparency and wide margins (2500 × 833), so
they need trimmed, transparent exports first (170). And `StudioLogoView` never shows Currawong's logo files in the
navbar: without a client logo it draws the small mark beside "Currawong Creative", which is what the audit saw.

Three owner reports added on 21 October: a hero frame error that only deleting the hero cleared (162), publishing that
is blocked without saying why (163), and frames that cannot get under the 50 KB SVG limit (169: transparent PNG or
WebP rather than a higher SVG limit, because every visitor downloads the whole SVG).

## 9. Plan hygiene found

- **Task 26 shipped without a client-view render check.** The crash went unnoticed for six days. 160 adds the missing
  regression test. Task 26 keeps its status, with a note linking 160.
- **Merged but `doing`:** 145, 149, 150, 153, 154, 155: marked done on 21 October (decision 5), notes kept.
- **Stale stage text:** the Shipped stage still says "v1.4.0 is due (task 90)", P1 and P2 name v1.5.0 and v1.6.0 as
  milestones, but 1.6.0 was released on 18 October. Unreleased already holds the Link list work. Decided 21 October: 160 ships
  as **v1.7.0** together with the Link list work already in Unreleased (new features make it a minor release, not the
  v1.6.1 patch first proposed); the launch lane already shipped in v1.6.0.
- **Code audit tasks never planned:** `docs/code-audit/2026-10-18/report.md` proposed tasks A–H, and only A (S-1) was
  absorbed (task 118). B (pricing tags), C (webhook filter test), D (error retry), E (JS budget), F (CSP), G (Partial
  Prefetching) and H (Assist path) are not in the plan. This is outside this audit's scope, but it is the same kind of
  gap.
- **Glass naming:** task 159 (site glass for navigation and banners) and VD-003 (Studio glass) are different things.
  Keep them apart in titles.
- **Overlap:** 44 (Ask Currawong form, p3) and UX-008. 164 only improves the fallback and links the configured
  support route, so 44 stays as planned.
- No duplicates were found among open tasks for UX-001, 002, 005 or 007.

## 10. Changes to the plan

Additive only: no renumbering, no stage removed, no status reset.

**Done on 21 October (progress database):** t145, t149, t150, t153, t154 and t155 marked `done`, with their notes
kept and a dated line added; t26 keeps `done` and gains the UX-001 note pointing to 160.

**Approved, not yet on the plan page (version 15).** The page is about 465 KB and must be read in full before it can be
republished, which did not fit in the session that made this review. Do it in a fresh session:

- Tasks 160–173 from `plan-tasks.md`: 160–163 in P0 (`q0`), 164–173 in P1 (`q1`), `first: false`.
- Prompt additions to 77, 91 and 32 (end of `plan-tasks.md`).
- Move 145, 149, 150, 153, 154 and 155 to Shipped (`s: "shipped"`); the header count becomes 173.
- Context block and "Approved direction" panel: Studio fonts are Newsreader and Inter (21 October), the default CMS
  palette follows the proposal with the classic palette kept, Nocturne is the default navbar wordmark.
- Stage text: Shipped no longer says "v1.4.0 is due"; the P0 milestone becomes "v1.7.0 with task 160" (changed from v1.6.1 on 21 October: the release also carries the Link list features, so it is a minor); P1 and P2
  milestones name the next real releases.
- A footer paragraph for version 15, which also records the deferred items (UX-010, UX-012, UX-016, VD-003, VD-009)
  and the site-track items for living-prana (UX-009 Compass Frame, UX-013 copy, meta descriptions and orphans, under
  client lane task 31).

Order: **160 → v1.7.0 → 162 → 163 → 161 → 164/165/166 → 172 spike → 170 (you) → 171 → 167/168/169 → 173**. Visual work
does not start before 160 ships.

## Assumptions and gaps

- UX-001's cause is from source and matches every symptom, but it was **not reproduced** here (no signed-in Studio).
  160 starts with a failing test.
- UX-002 was reasoned from the template. The living-prana repo, profile and redirect content were not inspected.
- `@sanity/themer`'s current API and stability were not checked (not installed, no network research in this pass).
- All four concept boards were viewed (PNG). They are concepts, not captures. Board 04 (scope badge "This card only",
  "Customise this card · 2 overrides", per-group override counts and reset, "See safer colour") informed 164 and 165.
  Board 02's "1 custom override" pill on the section row informed 164's list summary. Board 03's separation of colour
  from surface recipe informed 166. Board 01 (Nocturne wordmark, workspace selector) waits for decision 1. Every board
  uses a serif display face for headings, which is why decision 3 matters.
