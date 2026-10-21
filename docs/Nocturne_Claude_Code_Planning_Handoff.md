# Nocturne — Claude Code Planning Handoff

_Ready-to-paste prompt. This handoff requests **planning and plan maintenance only**. It does **not** authorise implementation, publishing, deployments, client-content edits, or destructive restructuring._

---

## Prompt for Claude Code

You are working in the **Nocturne** repository, a premium Sanity Studio-based website/content platform developed by Currawong Creative Co.

Your immediate job is **to inspect and maintain the existing development plan**, using the independently prepared **UI/UX audit and premium visual redesign proposal** as fresh evidence. Do **not** implement the redesign or audit recommendations now. Do **not** change production content, publish a site, deploy, change client access, or execute destructive roadmap migration.

### Inputs

1. Read **`Nocturne_Studio_UI_UX_Product_Quality_Audit.md`**, titled **Nocturne Studio — UI/UX & Product Quality Audit**, including its substantial visual-design addendum. The audit was conducted on 21 October 2026 in the live authenticated Studio, but read-only and without repository access.
2. Read **`Nocturne_Studio_Premium_Visual_Redesign_Proposal.md`**, titled **Nocturne Studio — Premium Visual Redesign & Design System Proposal**, including all candidate `VD-001`–`VD-013` work, proposed tokens, light/dark/glass recipes, component states, technical caveats and the conceptual mockup index. The four visual boards (`Nocturne_Concept_01_Studio_Shell_Light_Dark` through `Nocturne_Concept_04_Nested_Glass_Editor`, PNG/SVG) are **concepts**, not captures of implemented UI. Review them if available.
3. Locate the **real existing development plan** in this repository. Search intelligently through top-level docs, planning folders, issue/task files, changelogs, release notes, and any project-specific planning conventions. Do not presume its filename or location.
4. Read relevant `AGENTS.md`, contribution/development instructions, task schemas, and repository conventions before proposing edits.
5. Inspect current implementation, tests, schemas, history, and recent changes to establish whether the audit's observations are still true and whether the redesign is technically feasible. The audit is user-level evidence; the proposal is a **design target**, neither is a claim about root causes or current code status.

If **either requested document** is not present in the repository/workspace, **stop and ask for it** rather than guessing its contents. The PNG/SVG boards are supplementary, but do not silently claim to have reviewed them when absent. If multiple plans appear canonical or the active one is unclear, present candidates and ask which source of truth to maintain.

### Product principles to retain

The experience should feel premium, cohesive, clear, and trustworthy for both agency designers and nontechnical clients. Its philosophy is:

> **Beautiful defaults → Simple presets → Advanced customisation.**

Preserve observed strengths, including:

- **Role-separated agency/client modes**, with technical launch and advanced settings kept out of the client's normal navigation.
- **Task-oriented client Start here**, contextual help, and explanatory field content.
- **Illustrated Link List and section presets**, not a plain text-only replacement.
- **Brand-colour live preview and inline contrast guidance**.
- **Clear nested breadcrumbs**, explicit preset divergence, and inherited styling capabilities.
- **Non-destructive draft-versus-published separation and contextual validation**.
- **A coherent, genuine Nocturne identity** with horizontal wordmark where space permits, without conflating the platform, Currawong workspace and client website brands.
- **Restrained glass treatment:** subtle floating/navigation layers only; most editing surfaces remain opaque and legible.

Do not open new tasks merely to rebuild features the audit explicitly says already exist.

### Step 1 — Inventory the existing plan and implementation

Before editing, produce a concise evidence summary:

- Exact path(s), format, ownership, and current conventions of the canonical plan.
- Existing task IDs, statuses, milestones/versions, dependencies, archived history, and any automated tooling that manages it.
- How completed tasks are retained; whether there are naming/versioning rules.
- Existing components/functions/tests associated with each audit finding, using source references and test evidence where appropriate.
- Any already-planned or already-fixed work that overlaps the audit.
- Current branding/artwork inventory: actual approved horizontal light/dark wordmarks, icon/favicon files, import paths, naming conventions, dimensions and background contrast. **Do not assume suggested filenames exist** or inflate the favicon into a logo.
- Exact `sanity`, React, `@sanity/ui`, theme and Studio configuration versions. Check existing custom navbar/tool menu/`renderDefault`, workspace icon, form overrides, design token infrastructure, client/agency mode and test coverage.
- Whether the project can use the officially documented current theming API; Sanity's 2026 `@sanity/themer` package requires **Studio 6+ / React 19**, while the current repo version is unknown. Old `logo` hooks and `buildLegacyTheme` are deprecated, and an experimental themer preview tool should not silently become a production dependency.
- Any uncertainty (for example, a UI bug not reproducible locally, an unavailable login, or a plan outside the repo).

**Do not invent** pre-existing task IDs, milestones, status labels, releases, or implementation details. Do not infer “fixed” solely because a function exists; look for behaviour/tests and note verification gaps.

### Step 2 — Triage every audit finding without duplicating it

Create an internal crosswalk, and include a concise version in your final report:

| Audit ID                         | Nature                                                                          | Existing plan task(s) | Repo/behaviour evidence   | Disposition                                                         | Proposed delta          |
| -------------------------------- | ------------------------------------------------------------------------------- | --------------------- | ------------------------- | ------------------------------------------------------------------- | ----------------------- |
| UX-001 … UX-018, VD-001 … VD-013 | Confirmed bug / partial observation / design proposal / content QA / hypothesis | Actual IDs, if any    | Source/test/UI references | Existing, enhance, new, deferred, needs verification, or superseded | Concrete change or none |

Use the exact severity/confidence distinctions in the audit. In particular:

- **UX-001 (P0):** reproducible client-view **Sections** React error on Home and Links. This is an **observed core-workflow blocker**, but the root cause is unknown until code investigation. Match to existing client-mode/editor bugs before adding work. Plan a regression test for both page types and roles.
- **UX-002 (P1):** Preview showed “Missing a main document” for draft enable/root routes while site rendered and a clicked region later mapped to Links. The **warning is observed**; the broad claim “visual editing is broken” would be inaccurate. Inspect redirect and resolver implementation before choosing a task.
- **UX-003 (P1):** inherited/custom appearance mental model and reset UX. Verify current capabilities and whether this is already a design-system initiative. Preserve full agency expressiveness.
- **UX-004 (P1):** the editor's _own diagnostics_ flagged specific contrast risks. They are not a certified site-wide WCAG audit. Address combination-level remediation and appropriate verification, not blanket claims.
- **UX-005–008, UX-010–012, UX-016:** principally role-aware UX, copy, navigation, and component-design improvements; validate against existing work and deduplicate.
- **UX-009 and UX-013:** primarily **example-site content/asset/launch readiness**, not proof of a shared platform defect. Route to the proper project/content plan or record as external dependency if this repo's product roadmap should not own it.
- **UX-014, UX-015, UX-017, UX-018:** testing/verification gaps or hypotheses; do not turn them into confirmed bugs without evidence.
- **VD-001 (visual foundation):** the small shell mark currently fails to establish an obvious horizontal Nocturne brand identity. Determine the real assets and select the correct artwork **by the surface behind it**, not blindly by file name or OS colour scheme. The proposal artwork is a placeholder. Evaluate a supported navbar/brand component; do not use deprecated Sanity `logo` customization.
- **VD-002 and VD-012:** proposed Studio light/dark colour semantics, typography, spacing, radii, elevation and focus. These are **suggested tokens**, not assertions about existing values. Keep platform UI tokens separate from client site branding.
- **VD-003:** restrained glass for floating/small navigation surfaces with opaque fallback, actual contrast and performance tests. Do not apply blur to all forms, long lists or the client site's design merely because a Studio component uses glass.
- **VD-004–011 and VD-013:** coherent buttons, fields, pickers, toggles, sliders, panels, navigation, dialogs, icons and states. Verify which are native Sanity controls and preserve their editing/keyboard semantics. Prefer shared supported token/component changes over brittle DOM CSS patching.

Assign every item one of these clear categories:

1. **Confirmed bug** (with reproduction and verification work).
2. **Observed symptom needing diagnosis**.
3. **UX recommendation / design opportunity**.
4. **Existing functionality to preserve**.
5. **Content/project-specific readiness item**.
6. **Idea or test needing further validation**.
7. **Deferred enhancement / not recommended now**.

Within proposed visual work, label feasibility as **supported theme**, **small supported custom component**, **larger schema/navigation architecture**, or **uncertain/version-dependent**, using source-level proof. Separate **brand/creative decisions** needing approval from code tasks. A mockup is not proof that its labelled UI behaviour is currently implemented.

Where evidence shows an audit finding is already implemented and verified, annotate its disposition, **do not reopen it**. If implemented but unverified, prefer a targeted verification task.

### Step 3 — Prioritise coherent implementation packages

Use the existing plan's priority system if it has one; otherwise propose a compatible mapping to:

- **P0:** serious usability, access, data-safety, or core-workflow blocker.
- **P1:** high-impact problem to address soon.
- **P2:** important polish, efficiency, or verification work.
- **P3:** lower-confidence investigation or later enhancement.

Start with these _candidate packages_, refining them against the real code and plan:

**A. Core client editor stability (release gate)**

- UX-001 and direct regression coverage for Home, Links, nested sections, agency/client roles, navigation away/back, safe error recovery.
- Record whether UX-002 also blocks reliable client workflow or belongs in a separate Preview package.

**B. Preview and publishing trust**

- UX-002 route/document association and UX-015 authorised staging journey.
- Explicitly test redirected root and canonical page paths; keep draft/publish/undo semantics traceable.

**B2. Visual foundation and product branding (after stability gate; high system-wide value)**

- VD-001 horizontal Nocturne wordmark and surface-aware variants after actual asset approval. Separate Nocturne platform, Currawong workspace, and client-site preview identities.
- VD-002/012 light/dark semantic surfaces, typography, radii, spacing, focus and elevation. Check Sanity theme compatibility and initial visual regression coverage before broad adoption.
- Avoid treating visual redesign as a P0 substitute for UX-001.

**B3. Shared Studio UI language and restrained glass**

- VD-003–006, VD-008, VD-010/011 and VD-013: shared buttons, inputs, selectors, switches, cards, panels, menus, empty/error/saving states and icon accessibility.
- A small set of glass surface recipes applied only where layer separation genuinely helps; opaque fallback, contrast/reduced-transparency/performance tests mandatory.
- Use native Sanity UI components and supported theming where possible; introduce custom wrappers only for demonstrated gaps.

**C. Appearance system and accessible design feedback**

- UX-003 inheritance, scope, override summaries, resets, plus UX-004 contrast remediation.
- UX-011 nested-context navigation, UX-014 targeted control/keyboard checks, UX-016 diagnostics roll-up only when justified.
- Start with Link List evidence, then determine whether shared primitives benefit Hero and other section types. Plan migration safeguards for existing content.
- Incorporate VD-007 (precise sliders and reset/source indicators) and VD-009 (scope, breadcrumbs, adaptive panels) only after verifying schema/value precedence and native component constraints.

**D. Client-facing clarity and surface polish**

- UX-005 empty states, UX-006 Releases navigation, UX-007 recent titles, UX-008 support, UX-012 terminology and help patterns.
- Protect already-effective Start here/agency separation.

**E. Catalogue and quality investigations**

- UX-010 section-picker discovery research, UX-017 responsive matrix, UX-018 performance baseline.
- UX-009/013 separate site-specific launch/content track as appropriate.

Dependencies and actual release boundaries must come from architecture and current commitments. Do not force all package items into one milestone. Flag UX-001 as the first functional gate unless source/reproduction evidence shows it is already fixed.

Build a **component adoption matrix** for Studio shell, Start here, Pages/Hero, Link List, Brand colours, Website settings/media, Preview and ancillary tools. Columns should include theme tokens, brand/header, shared controls, states/contrast, inheritance/presets, responsive/AT verification and actual implementation status. The current design proposal includes a template; fill it with repository evidence, not assumptions.

### Step 4 — Improve task quality

For each changed or new canonical task, retain or add:

- **Outcome statement:** user problem and intended result, not only implementation instructions.
- **Source evidence:** audit UX ID(s), observed route/workflow, relevant code/tests or reproducible steps.
- **Design reference:** proposal VD ID(s), relevant visual concept name, token/component acceptance criteria and explicit statement that the image is conceptual.
- **Affected user/role:** client, designer, administrator, site visitor.
- **Confidence:** observed, partial, hypothesis; keep original distinctions.
- **Acceptance criteria:** observable, ideally automatable checks, with no assumption of a confirmed root cause.
- **Verification plan:** role, document type, viewport/browser, negative and regression cases, visual/screen-reader/staging checks where needed.
- **Feasibility tier:** supported theme vs custom component vs architectural change vs version-dependent, with installed-version API evidence.
- **Dependencies, priority, effort confidence, proposed milestone**.
- **Scope exclusions:** what not to redesign or modify; especially no live content changes.

Prefer updating the existing closest task with audit evidence and revised acceptance criteria to creating another task. If separate issues share a root cause, use one canonical parent with sub-work and traceable cross-references. Conversely, split enormous tasks only along testable delivery boundaries and keep original ID/history relationships intact.

### Step 5 — Recommend roadmap versioning and lifecycle hygiene

Evaluate, but **do not invent**, version/milestone names. Compare the current plan with these possible **themes**, which are not fixed release numbers:

1. Current implementation and **functional stabilisation**.
2. Nocturne **visual foundations**: actual wordmark, semantic theme, typography, spacing, radii and interaction/focus primitives.
3. **Shared Studio UI polish**: buttons/forms/panels/nav/dialogs, restraint in glass, error/empty states and accessibility.
4. **Workflow clarity**: client editing, Preview/publication confidence, deep nested scope and predictable inheritance.
5. **Component adoption** after checking Link List and Brand colours feature parity.
6. Future advanced editing, motion and evidence-based enhancements.

Review task hygiene:

- Duplicates and repeated symptoms with one root cause.
- Superseded requirements and obsolete experiments.
- Completed tasks accidentally left open and work marked complete without verification.
- Tasks too broad or with unrelated features bundled together.
- Missing tests, acceptance criteria or dependencies.
- Similar features already present in Link List yet separately proposed elsewhere.
- Visual redesign tasks split into isolated button/card CSS tweaks despite a shared token/component root cause, or copied across multiple screens without an adoption/verification tracker.
- Backlog items that belong to a project site's content readiness rather than core Nocturne engineering.

Distinguish **implemented and verified**, **implemented but awaiting verification**, **in progress**, **planned**, **deferred**, and **superseded** using the plan's existing vocabulary if possible. Keep historical completed work discoverable but separate from active priorities.

### Step 6 — Preserve history; pause before destructive changes

**Planning files may be edited only within a safe, reviewed scope.** Preserve existing task IDs, original context, completion markers, dates and decisions. Never wipe history just to make a prettier plan. If consolidating duplicates, retain aliases or a mapping from old IDs to the canonical task. Avoid resetting statuses.

You may safely make additive, traceable maintenance updates to the existing plan once its conventions and canonical location are established. However, **if the proposed work would substantially restructure, renumber, archive, delete, split across files, or otherwise make old plan references hard to recover, stop and present a migration proposal for approval before changing those structures**. Include a before/after outline, ID mapping strategy, preservation and rollback approach.

Do not change roadmap-related automation or external trackers without separate authorisation. Do not create releases or GitHub issues/PRs unless that is the user's established, authorised plan-maintenance workflow.

### Step 7 — Validate and report

After any authorised, non-destructive planning edits:

1. Validate Markdown/schema syntax and any plan linter/formatter, without rewriting unrelated text.
2. Inspect the diff for unintentional history loss, duplicates, ID changes, or status resets.
3. Check that new P0/P1 work has explicit verification and dependencies.
4. Confirm existing strengths have not been relabelled as missing functionality.
5. Check that wordmark asset assumptions, Sanity version/theming feasibility, light/dark/glass accessibility fallbacks and component adoption are explicit rather than assumed.
6. Summarise changes in a concise handoff report:
   - Canonical plan file(s) read/updated.
   - Existing tasks enhanced (real IDs), genuinely new tasks, deferred items, and confirmed already-done items.
   - Updated priority/milestone recommendations and unresolved dependencies.
   - Duplicates merged or merely proposed for merging.
   - Verification gaps and assumptions needing human confirmation.
   - Approved versus proposed brand assets, feasible theme/component plan, and which conceptual mocks informed actual tasks.
   - **Any structural migration held for approval.**

**Completion definition:** The plan accurately reflects confirmed bugs, recommendations and verification gaps from the audit, avoids duplicate work, retains traceability, and provides an actionable next sequence. **No product features are implemented as part of this handoff.**

---

## Quick reference: audit-to-task mapping

| Audit ID | Triage starter                                                     | Indicative priority  | Key caution                                                |
| -------- | ------------------------------------------------------------------ | -------------------- | ---------------------------------------------------------- |
| UX-001   | Confirmed client editor crash                                      | P0                   | Do not infer code root cause from React error.             |
| UX-002   | Preview association symptom                                        | P1                   | Visual selection partly worked; verify redirect logic.     |
| UX-003   | Appearance/inheritance system opportunity                          | P1                   | Preserve existing powerful settings and presets.           |
| UX-004   | Diagnosed colour-risk remediation                                  | P1                   | UI diagnostics ≠ full WCAG conformance test.               |
| UX-005   | Contextual empty states                                            | P2                   | Respect role/action permissions.                           |
| UX-006   | Client Releases affordance decision                                | P2                   | Entitlement/product choice required.                       |
| UX-007   | Human-readable activity labels                                     | P2                   | Verify singleton title logic.                              |
| UX-008   | Configurable support CTA                                           | P2                   | Do not hardcode private staff contacts.                    |
| UX-009   | Site image frame asset QA                                          | P2                   | Existing validator worked; content vs product ownership.   |
| UX-010   | Section catalogue discovery                                        | P2                   | Keep illustrated picker and search.                        |
| UX-011   | Nested editor scope/navigation                                     | P2                   | Check shared panel components and current back semantics.  |
| UX-012   | Copy/state vocabulary standard                                     | P2                   | Agency technical content correctly hidden from clients.    |
| UX-013   | Site placeholder/SEO/launch readiness                              | P2, site track       | Do not treat test content as platform bug.                 |
| UX-014   | Keyboard/accessible-name investigation                             | P2 verification      | Accessibility not fully tested.                            |
| UX-015   | Edit/draft/preview/publish staging test                            | P2 verification      | Requires authorised nonproduction fixture.                 |
| UX-016   | Overview diagnostic roll-up                                        | P2 opportunity       | Confirm current checks before adding a dashboard.          |
| UX-017   | Responsive matrix                                                  | P2 verification      | Mobile simulation was not a device test.                   |
| UX-018   | Performance measurement baseline                                   | P3 investigation     | No objective slowdown established.                         |
| VD-001   | Actual wordmark inventory and surface-aware Studio header branding | P1 visual foundation | Concept mark is placeholder; verify assets and navbar API. |
| VD-002   | Studio light/dark semantic colour system                           | P1 visual foundation | Do not mix client's site palette into admin chrome.        |
| VD-003   | Restrained glass recipes                                           | P2 shared UI         | Opaque fallback, performance and blended contrast gates.   |
| VD-004   | Button hierarchy/states                                            | P2 shared UI         | Theme native Sanity components where supported.            |
| VD-005   | Input/form field scale and feedback                                | P2 shared UI         | Maintain labels, validation and edit semantics.            |
| VD-006   | Preset/select/radio/switch consistency                             | P2 shared UI         | Keep existing six illustrated Link List presets.           |
| VD-007   | Precision sliders with reset/source                                | P2 workflow          | No unintended data change/inheritance migration.           |
| VD-008   | Card, panel, accordion and empty-state framework                   | P2 shared UI         | Avoid giant scroll containers; dedupe UX-005.              |
| VD-009   | Shell/navigation/nested layout                                     | P2 workflow          | Preserve role gating, responsive focus and breadcrumbs.    |
| VD-010   | Dialog/popover rhythm and focus                                    | P2 shared UI         | Prefer reliable native modal semantics.                    |
| VD-011   | Icon sizing and accessible action names                            | P2 shared UI         | Verify accessibility, do not assume global defect.         |
| VD-012   | Typography, spacing, radii, elevation and motion tokens            | P1 visual foundation | Test light/dark, native/custom parity and upgrades.        |
| VD-013   | Empty, save, publish, error and warning states                     | P2 shared UI         | Functional UX-001/002 fixes are prerequisite.              |

**Final reminder:** Inspect **both** reports and actual source first. Deduplicate second. Verify feasibility and improve the plan third. Seek approval before substantial migration. **Do not implement the redesign, publish, deploy, or alter live client data in this planning pass.**
