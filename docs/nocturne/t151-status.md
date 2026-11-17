# Task 151: working status (decorative dividers and section transitions)

**Reconciled on 17 November 2026** against `main` at `6989101` and the owner decisions recorded during the task.
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

**This PR** fixes the controls the 17 November real-Studio check found still clearing only through Studio's unnamed
icon:

- Tide's **Crest colour**, Contour's **Line colour** and Elevated's **Shadow** now start with **Use shape default**. A
  value left on another shape stays visible with a warning naming its shape and that choice, and is hidden once cleared
  (they used to be hidden with the value kept and no way to clear it).
- The shared divider's **In the middle**, **Letters**, **Letter spacing**, **Size in the middle**, **Length** and
  **Thickness** now start with **Use divider default**. Their hiding rules are unchanged.
- Every choice is disabled in read-only mode (the edge radios' clear icon used to stay enabled on an earlier revision,
  though clicking it did nothing).

Stored values, defaults and rendering are unchanged.

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

| Check                                                                                                                                    | When      | Result                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Playwright WebKit (local `playwright.webkit.config.ts`; this is not Safari and not an iPhone)                                            | 13–16 Nov | Slice 2: 140/140. Slice 4: 231/231 (Chromium 333/333). B1: all 14 selectors accepted by WebKit 27.2. Slice 8 `section-edge-layer-colours.spec.ts`: 8/8 (16 Nov), plus a read-only visual inspection of `/edge-layer-colours` in WebKit (desktop and phone captures)                                                                                                                  |
| Real Studio, Slice 8 (local `next dev`, project r4kwvgkz, a temporary draft, writes guarded, draft deleted afterwards)                   | 16 Nov    | Passed: applicability, saves, retention, advisory, Preview note. Found two problems: the field menu has no Clear, and the inline clear icon has no accessible name. Both are fixed by #225                                                                                                                                                                                           |
| Real Studio, #225 recheck                                                                                                                | 16 Nov    | 31/31                                                                                                                                                                                                                                                                                                                                                                                |
| Real Studio, #221 (Sanity 6.22) clearing recheck                                                                                         | 17 Nov    | 31/31                                                                                                                                                                                                                                                                                                                                                                                |
| Real Studio, #227 (the same target, guards and cleanup)                                                                                  | 17 Nov    | 50/50: warning text, group names, mouse and keyboard clearing, one field changed per action, persistence after reopening, read-only on an earlier revision                                                                                                                                                                                                                           |
| Real Studio, remaining controls on merged `main` (draft `task151-remaining-qa`, deleted)                                                 | 17 Nov    | Tide Crest colour, Contour Line colour, Elevated Shadow: 58/62; the four failures are the unnamed clear icon (3) and its enabled state on an earlier revision, fixed by this PR. Hero divider (Slice 7: labels, Finish, Dotted line centres, Gradient keeps line colour, Ornament size) all passed; Part A in a page draft (Link list, FAQ header, Rich text blocks as agency) 24/24 |
| Real Studio, this PR (draft `task151-option-clear-qa`, deleted; before the fix the six divider radios' clear icon was confirmed unnamed) | 17 Nov    | 56/56: named groups with the default choice first, mouse and keyboard clearing of one field each, leftover warnings naming Tide, Contour and Elevated and hidden once cleared, Three dots and Gradient retention, reopen, read-only on an earlier revision                                                                                                                           |

## Pending acceptance (needed before Done)

- **S6 and S7: Safari on macOS and a real iPhone.** These were never run. Playwright WebKit does not count.
- **S3 top-overscroll follow-up** (B1). Deferred, still open.
- **Owner visual QA** of the full edge set in light and dark. That includes Elevated and the Slice 7 rules on real
  content. It also includes owner screenshots of two palettes for Slice 8.
- **Real-Studio checks still pending** (each needs another role or document type; not simulated):
  - The Rich text role guard as a client (the agency-only note, not a blank dialog).
  - Dividers on other document types: Navigation (header and footer), Team page settings, Blog settings.
  - Presentation preview of the edges (needs a Viewer token).
- **Deployed Sanity schema.** The post-merge `deploy-schema` job skips because no `SANITY_DEPLOY_TOKEN` is configured.
  The deployed schema lacks the fields added since Slice 2 until someone deploys it by hand.
- **Windows High Contrast** (forced colours is covered only by Playwright emulation).
- **Dark-mode visibility advisory** (Studio judges the light scene only).
- **Task 280 handoff and the servicePage baseline transfer.** These wait for the owner to publish the amendment and
  name the reviewer.

## Deferred or follow-up (outside Task 151's remaining code)

- **Operations: the QA project's trial notice.** The Studio for r4kwvgkz (the approved QA target) shows "Your free
  trial is ending soon" (Private Datasets, User Roles, Comments, Scheduled drafts, AI Assist). Nothing was changed. The
  owner should decide whether the plan change affects QA (for example, the user roles a client-role check would need)
  before the trial ends.

- **Issue #205:** a plain Surface section is see-through under its bottom edge. The proposed fix gives framed Surface
  sections an opaque background. It needs owner approval because it changes Classic's visuals.
- **Reef hairline and the White veil** (see above).
- **Ribbon.** Deferred. **Drift and the other motion** wait for Task 217. Production edges stay static.
- **Known Studio gaps that keep values on purpose:**
  - A Layer below saved as false under Lagoon or Reef is hidden with no warning. False draws the same as unset.
  - A Layer below saved under a non-generated shape is also hidden with no warning.
  - Both stay saved by the retention rule. Neither changes the page.
- **CI flakes seen on Task 151 PRs** (rerun and investigate, never re-baseline): panel-image (visual), media-text
  placement, and Dotted line bold (rules-styles, once). The fake-lake ECONNRESET is tracked separately (#216, #217,
  #222, #223).
