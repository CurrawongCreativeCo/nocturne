# Task 151: working status (decorative dividers and section transitions)

**Reconciled on 17 November 2026** against `main` at `c127ab7` (post-merge CI: 18 of 18 jobs successful, run 44006781268) and the owner decisions recorded during the task.
**Task 151 is not Done.** Every planned code slice has merged, but Done acceptance needs the manual checks and owner
sign-offs listed under _Pending acceptance_. This file records status only. It changes no plan, task status or
capability baseline (see `t275-canonical-patch/t151-plan-amendments.md` for the unapplied Task 280 amendment).

## Implemented (merged to main)

| Work                                                                                        | PR   | Merge commit | Merged |
| ------------------------------------------------------------------------------------------- | ---- | ------------ | ------ |
| B1: edge stability (empty sections, Minimal pages, iOS selectors, long pages; S1/S2/S3/S10) | #190 | `bb053ca`    | 13 Nov |
| Slice 1: composed edge foundation, frozen parity snapshot (no visible change)               | #203 | `c070efd`    | 13 Nov |
| Slice 2: Tide v2 and Contour                                                                | #204 | `f17f2ae`    | 13 Nov |
| Slice 3: layered-edge generator and Still water                                             | #206 | `0b82378`    | 14 Nov |
| Slice 4: Lagoon and Reef                                                                    | #207 | `903c527`    | 14 Nov |
| Slice 5: Studio visibility advisory                                                         | #208 | `f5b8972`    | 14 Nov |
| Slice 6: Elevated (straight edge with a shadow)                                             | #209 | `4a9a000`    | 14 Nov |
| Part A: shared decorative dividers inside sections                                          | #210 | `6c730c5`    | 15 Nov |
| Slice 7 batch 1: Double, Dotted line, Gradient                                              | #211 | `e2e1e29`    | 15 Nov |
| Slice 7 batch 2: Glow finish and the Ornament centre                                        | #212 | `1e164bf`    | 15 Nov |
| Slice 8: per-layer colours and the layer-below advisory                                     | #215 | `55d59c3`    | 15 Nov |
| Slice 8 fix: clearing the per-layer colours in Studio                                       | #225 | `4dd5dcb`    | 16 Nov |
| Clearing Alignment and the generated edge's controls in Studio                              | #227 | `6989101`    | 17 Nov |
| Crest colour, Line colour, Shadow and the divider radios: clear with a labelled default     | #228 | `c127ab7`    | 17 Nov |

**#228** fixed the controls the 17 November real-Studio check found still clearing only through Studio's unnamed
icon:

- Tide's **Crest colour**, Contour's **Line colour** and Elevated's **Shadow** now start with **Use shape default**. A
  value left on another shape stays visible with a warning naming its shape and that choice, and is hidden once cleared
  (they used to be hidden with the value kept and no way to clear it).
- The shared divider's **In the middle**, **Letters**, **Letter spacing**, **Size in the middle**, **Length** and
  **Thickness** now start with **Use divider default**. Their hiding rules are unchanged.
- Every choice is disabled in read-only mode (the edge radios' clear icon used to stay enabled on an earlier revision,
  though clicking it did nothing).

Stored values, defaults and rendering are unchanged.

## Composable section edges (approved 20 November 2026)

One composable section-edge system beside the saved edges, in four tasks: **Task 1** model and renderer, **Task 2**
Studio editing and reusable site designs, **Task 3** end-to-end verification and release readiness, then quick-start
designs as data. Contract: [composable-section-edges.md](./composable-section-edges.md). Build Plan cards and their
acceptance criteria: [composable-edges-plan-entries.md](./composable-edges-plan-entries.md) (**not yet imported** into
the live plan, which needs a signed-in session).

- **Task 1: merged 20 Nov** (PR #236, merge commit `e9b78d0`, reviewed head `57a72fe`; saved edges keep their output).
- **Task 2: in draft** on `feat/composed-edge-task-2` (from `e9b78d0`): the Section edge editor, warnings from the
  active edge, independent named site designs. Not checked: a real signed-in Studio (no project credentials in the
  session), Presentation preview, real Safari.
- **Task 3: not started.**
- **Blocker:** none in code. Importing the cards into the live plan is an owner action.

## Owner decisions in force

- **Geometry and presets.** Classic stays frozen on its own code path. The parity snapshot must never change. Tide v2
  is used, with Primary at 25% by default and Echo kept. Small is refused for generated shapes (a stored Small is
  drawn at Medium). Generated custom heights are 40–64 px on phones, 40–120 on tablets and 40–160 on desktops. There
  is no layer below at Shallow: a stored value is kept, not drawn, and Studio warns. Generated geometry reads no band
  height.
- **Lagoon and Reef.** Lagoon uses the mixed arrangement and has no layer below. Reef always draws a layer below and
  has its hairline off. Crest position, depth and layer below are fixed per preset. The owner accepted Lagoon
  Large/Flip in the dark scene (a faint second layer) as it is.
- **Stored values that no longer apply** stay saved and visible with a warning. Once cleared, the field is hidden.
  Nothing is deleted automatically.
- **Slice 7.**
  - Glow is a `finish` field (unset means Flat).
  - The labels are "Three dots" (key `dots`) and "Dotted line" (key `dotted`).
  - Dotted takes Line's centre options.
  - Gradient runs Primary to Secondary and keeps the stored line colour.
  - Ornament is a centre.
  - There is no Wave rule.
  - In forced colours, rules fall back to CanvasText.
- **Deferred together:** Reef's hairline and the White veil colour (the veil is a hairline-only role, and the hairline
  needs new Reef geometry).
- **Service page and Event page dividers** move to the proposed Task 280. That happens only after the owner publishes
  the plan amendment. Until then, nothing in the code names Task 280.
- **CI rules.** Investigate a hairline failure before changing the 1 px overlap. Never regenerate visual baselines
  just to make CI pass. The gallery is append-only.

## Manual checks completed

| Check                                                                                                                                            | When      | Result                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright WebKit (local `playwright.webkit.config.ts`; this is not Safari and not an iPhone)                                                    | 13–16 Nov | Slice 2: 140/140. Slice 4: 231/231 (Chromium 333/333). B1: all 14 selectors accepted by WebKit 27.2. Slice 8 `section-edge-layer-colours.spec.ts`: 8/8 (16 Nov), plus a read-only visual inspection of `/edge-layer-colours` in WebKit (desktop and phone captures)                                                                                                               |
| Real Studio, Slice 8 (local `next dev`, project r4kwvgkz, a temporary draft, writes guarded, draft deleted afterwards)                           | 16 Nov    | Passed: applicability, saves, retention, advisory, Preview note. Found two problems: the field menu has no Clear, and the inline clear icon has no accessible name. Both are fixed by #225                                                                                                                                                                                        |
| Real Studio, #225 recheck                                                                                                                        | 16 Nov    | 31/31                                                                                                                                                                                                                                                                                                                                                                             |
| Real Studio, #221 (Sanity 6.22) clearing recheck                                                                                                 | 17 Nov    | 31/31                                                                                                                                                                                                                                                                                                                                                                             |
| Real Studio, #227 (the same target, guards and cleanup)                                                                                          | 17 Nov    | 50/50: warning text, group names, mouse and keyboard clearing, one field changed per action, persistence after reopening, read-only on an earlier revision                                                                                                                                                                                                                        |
| Real Studio, remaining controls on merged `main` (draft `task151-remaining-qa`, deleted)                                                         | 17 Nov    | Tide Crest colour, Contour Line colour, Elevated Shadow: 58/62; the four failures are the unnamed clear icon (3) and its enabled state on an earlier revision, fixed by #228. Hero divider (Slice 7: labels, Finish, Dotted line centres, Gradient keeps line colour, Ornament size) all passed; Part A in a page draft (Link list, FAQ header, Rich text blocks as agency) 24/24 |
| Real Studio, #228 fix branch (draft `task151-option-clear-qa`, deleted; before the fix the six divider radios' clear icon was confirmed unnamed) | 17 Nov    | 56/56: named groups with the default choice first, mouse and keyboard clearing of one field each, leftover warnings naming Tide, Contour and Elevated and hidden once cleared, Three dots and Gradient retention, reopen, read-only on an earlier revision                                                                                                                        |
| Real Studio, **Navigation settings** (the Footer divider; the Navigation divider belongs under Footer) (**agent-run**)                           | 17 Nov    | **22/22 passed**                                                                                                                                                                                                                                                                                                                                                                  |
| Real Studio, **Team page settings** divider (**agent-run**)                                                                                      | 17 Nov    | **16/16 genuine checks passed.** A further Diamond-visibility assertion also failed. It was a mistaken test expectation, not a product defect, and is not counted as a check                                                                                                                                                                                                      |
| **Blog settings** divider                                                                                                                        | 17 Nov    | **Not applicable.** Blog settings has no divider field                                                                                                                                                                                                                                                                                                                            |
| **Device pass, Mac Safari and real iPhone Safari** (**owner-run**), against `c127ab7`, default palette, with the preview image adaptation below  | 17 Nov    | Confirmed by the owner, with **clean top and bottom overscroll** on both. Orientations, zoom levels and the pages reviewed were **not recorded**                                                                                                                                                                                                                                  |
| **Light fixture palette on Mac Safari** (**owner-run**)                                                                                          | 17 Nov    | Approved by the owner                                                                                                                                                                                                                                                                                                                                                             |
| **Light fixture palette on real iPhone Safari** (**owner-run**)                                                                                  | 17 Nov    | Approved by the owner                                                                                                                                                                                                                                                                                                                                                             |
| **Dark fixture palette on Mac Safari** (**owner-run**)                                                                                           | 17 Nov    | Approved by the owner                                                                                                                                                                                                                                                                                                                                                             |
| **Dark fixture palette on real iPhone Safari** (**owner-run**)                                                                                   | 17 Nov    | Approved by the owner                                                                                                                                                                                                                                                                                                                                                             |

The device pass and the palette approvals are each recorded per device and per palette. **They are complete within
their reported scope and are not requested again.** Pages, orientations and zoom levels were **not recorded** for any
of them, and that coverage stays unrecorded. Before the owner's review, an agent-side Playwright scan of the light palette (WebKit,
iPhone-13 emulation, Chromium: 93 section boundaries, no seam rows, no horizontal overflow) and a colour-and-pictures
check of the dark palette (57 of 57 pictures loaded) were run. Neither replaced the owner's review.

**Preview adaptation (disposable, nothing in the repo changed).** The device and palette reviews ran on a local
production build of `c127ab7` with the fake e2e data. A small front proxy served the e2e fixture picture from the
preview's own origin, because ordinary browsers have no Playwright request routing. Rendering, geometry and styling were
untouched. Brand colours were switched between the fixture's `light` and `dark` samples with the fake lake's own control
endpoint and the signed revalidate webhook.

**Two-palette evidence (Slice 8).** The Reef in `/edge-layer-colours`, light and dark, on file in
`docs/nocturne/t151-evidence/`:

- `reef-light-desktop-playwright-webkit.png` (light sample: Primary #0b6e4f, Secondary #e4572e, Highlight #ffd166)
- `reef-dark-desktop-playwright-webkit.png` (dark sample: Primary #7ad9b4, Secondary #f2a07b, Highlight #ffd166)

Both are **Playwright WebKit captures at 1440 px with the privacy banner dismissed, not device photos**, and both are
**fixture-palette** evidence. No requirement that the palettes be real client palettes was found. The owner named the
dark Reef capture as the last image needed for the two-palette record. The owner's own screenshot was not received for
this record.

## Pending acceptance (needed before Done)

Done is the owner's call. This section separates what is **complete within its reported scope**, what is blocked by
**access**, what is a **pending device or manual check**, what needs an **operations action**, and the remaining
**decisions**.

### Complete within reported scope (not requested again)

- **Device pass, Mac Safari and real iPhone Safari** (owner-run, 17 Nov): clean top and bottom overscroll on both.
  Pages, orientations and zoom levels are **unrecorded**; that coverage is not claimed.
- **Light and dark fixture-palette approvals** on Mac Safari and on real iPhone Safari (owner-run, 17 Nov): four
  separate approvals, with the same unrecorded coverage.
- **S3 top-overscroll follow-up (B1) stays open as its own technical item.** The clean overscroll result above is
  recorded, but it is a device observation, not a closure of that follow-up.

### Access blockers (cannot be run without the access named)

- **Rich text role guard as a client** (the agency-only note, not a blank dialog). Needs a client-role sign-in. The QA
  project's trial notice is relevant (see Operations).
- **Presentation preview of the edges.** Needs a Viewer or preview token. No new token is to be created without approval.

### Pending device and manual checks (not yet run)

- **Windows High Contrast** (forced colours is covered only by Playwright emulation). Needs Edge on Windows.
- **Tide's Echo control in a real Studio.** It is not named in any recorded pass.
- **VoiceOver in Studio** (Safari): the new "Use shape default" and "Use layout default" controls announced inside their
  named groups, and "Layer below: Use shape default" dimmed while nothing is saved.
- **Part A dividers as drawn on the pages** (`/hero-dividers`, `/link-dividers`, `/media-text-dividers`,
  `/rich-text-dividers`). The agent Studio passes covered **editing and persistence** in a Studio draft, not visual
  inspection of these four fixture pages. Whether any were part of the owner's device pass is unrecorded.

### Operations (owner action)

- **Deploy the Sanity schema by hand.** CI's `deploy-schema` job reports success, but its Deploy schema step is skipped
  (no `SANITY_DEPLOY_TOKEN`). The deployed schema lacks the fields added since Slice 2 until someone deploys it. Then
  confirm `edgeTideLayer`, `edgeLineColour`, the five generated-edge fields, `edgeShadow`, `edgeLayerColours` and the
  divider `finish` are present.
- **Task 280 handoff and the servicePage baseline transfer.** These wait for the owner to publish the plan amendment and
  name the reviewer.
- **The QA project's trial notice** (see below): decide whether the plan change affects QA before the trial ends.

### Remaining product and owner decisions

- **Dark-mode visibility advisory** (Studio judges the light scene only): decide whether it is needed before Done.
- **Issue #205** (see below).
- **Deferred, not reopened:** the Reef hairline and White veil, and the smoother-wave design reference (see below).

## Deferred or follow-up (outside Task 151's remaining code)

- **Operations: the QA project's trial notice.** The Studio for r4kwvgkz (the approved QA target) shows "Your free
  trial is ending soon" (Private Datasets, User Roles, Comments, Scheduled drafts, AI Assist). Nothing was changed. The
  owner should decide whether the plan change affects QA (for example, the user roles a client-role check would need)
  before the trial ends.

- **Issue #205:** a plain Surface section is see-through under its bottom edge. The proposed fix gives framed Surface
  sections an opaque background. It needs owner approval because it changes Classic's visuals.
- **Reef hairline and the White veil** (see above).
- **Design reference (deferred, 17 Nov):** broader, smoother waves with soft overlapping layers. Nothing changes now: no
  geometry, preset, stored value or baseline. If it is taken up, it is a new preset or family through the layered
  generator's closed preset table (not an edit to a frozen shape), needs the owner's visual approval before code, and
  keeps Classic and the parity snapshot unchanged and production edges static. The reference image was not received for
  this record.
- **Ribbon.** Deferred. **Drift and the other motion** wait for Task 217. Production edges stay static.
- **Known Studio gaps that keep values on purpose:**
  - A Layer below saved as false under Lagoon or Reef is hidden with no warning. False draws the same as unset.
  - A Layer below saved under a non-generated shape is also hidden with no warning.
  - Both stay saved by the retention rule. Neither changes the page.
- **CI flakes seen on Task 151 PRs** (rerun and investigate, never re-baseline): panel-image (visual), media-text
  placement, and Dotted line bold (rules-styles, once). The fake-lake ECONNRESET is tracked separately (#216, #217,
  #222, #223).
