# Composable section edges: Build Plan entries (approved 20 November 2026, not yet imported)

**Status:** the owner approved this sequence on 20 November 2026. The live Build Plan
(`https://currawong-build-plan.vercel.app/build-plan/151`) holds an approval note on Task 151 only. These four cards
are **not in the live plan yet**: the board needs a signed-in session, and its authenticated database importer must add
them once. Import each card once; do not create duplicates if one already exists. Statuses here are proposals for the
import, not live statuses.

Each card keeps its **original acceptance criteria verbatim** (from the production prompts). Checks added after the
20 November review are listed separately under _Added checks_, on the task that owns them.

## Card 1 — Composable section edges, Task 1: unified model and renderer

- **Parent:** Task 151 (section dividers). **Status to import:** `doing` (draft PR open, awaiting the owner's Task 1
  review). **Contract:** [composable-section-edges.md](./composable-section-edges.md).

**Original acceptance criteria**

- A single documented model and rendering path can represent an existing slant, layered waves, and an offset angular
  edge without shape-specific code branches.
- The same model can express existing gradients, partial width, and a central icon/image opening, including at least
  one composition that combines two or more of those with layered geometry.
- Shadow-based depth and geometric Y-offset are independent, correctly named properties. A shadow visibly creates
  separation from the adjoining section without being mistaken for contour movement.
- Valid existing saved dividers keep their output; migrations or adapters are explicit and covered by focused tests.
- Responsive rendering, clipping/overflow, layer order, and sensible fallback behaviour are checked in the supported
  rendering modes. Accessibility treatment for decorative content is explicit.
- The plan and current task state identify Tasks 2 and 3, the later quick-start-design task, and any true blocker.

**Added checks (20 November review)**

- Renderer coverage: the edge capability evidence claims `resolveSectionEdge`; `composedEdge` is marked as the `edge`
  capability; the composed path is probed through `SectionRenderer`, with precedence (a renderable composition wins
  over a saved shape) and fallback (one that can't render leaves the saved shape's output byte-identical, or a straight
  section).
- Legacy parity: the frozen parity snapshots are unchanged.
- The tint inside the upper section is `-z-10`, under the Decorative mark and content, with a class regression test
  and a browser paint-order check.
- One real-renderer fixture (`/edge-composed-authored`) combining layered contours, a gradient, partial width, a centre
  icon and a shadow, with Playwright checks of the mask, shadow, clipping and stacking at 1440 and 390 px, and forced
  colours extended to the new selectors.
- Fallbacks documented and tested: no paint layer left, large vertical offsets, shadow spill on Surface (a saved shape
  on Surface stays see-through). Shadow depth, vertical offset and layer spacing stay distinct; `edgeDepth` keeps
  `shallow`, `standard`, `deep`.
- The hidden field cannot block publishing: its range checks are warnings while it is hidden.

## Card 2 — Composable section edges, Task 2: Studio editing and reusable site designs

- **Depends on:** Card 1 merged after the owner's review. **Status to import:** `todo`.

**Original acceptance criteria**

- I can make a distinctive section edge in Studio using layered geometry, a gradient, partial width, a central
  image/icon, and a shadow where appropriate; the controls reflect the actual saved values.
- Save/reopen and undo/reset preserve the design and do not alter unrelated sections.
- I can save the configuration as a named site design, apply it to a second section, and customise that instance
  independently under the chosen copy/link rule.
- Existing divider controls and saved content either map into the unified editor or have an explicit compatibility path.
  No second competing "new divider" system appears.
- Basic controls are manageable at phone widths; advanced point editing is discoverable and keyboard usable to the
  degree supported by Studio.

**Added checks (20 November review)**

- Studio warnings reflect the **active** edge: the visibility advisory (`edge-visibility.ts`) and the section form
  (`section-form.ts`) read `resolveSectionEdge`, so a section whose composition draws is not warned about its stored
  shape, and one whose composition cannot render is.
- A real Studio check of hidden-field validation **before** enabling import or editing: verify whether an out-of-range
  saved value can block publish without a visible fix. Task 1 made every rule on the hidden field a warning; Task 2
  decides the levels once the controls are visible, and must not re-introduce an error the editor cannot reach.
- Decide copy versus linked behaviour before implementing saved designs.

## Card 3 — Composable section edges, Task 3: end-to-end verification and release readiness

- **Depends on:** Card 2. **Status to import:** `todo`.

**Original acceptance criteria** (from the Task 3 prompt)

- Verify a full flow: create or edit an edge in Studio; combine geometry, gradient, partial width, centre image/icon,
  and shadow; save and reopen; save it as a site design; reuse it on a second section; customise one instance; preview
  and publish a scratch site.
- Check desktop and narrow screens, keyboard access and decorative semantics, common visual failures, old saved
  dividers, and output when a referenced image is missing.
- Measure the relevant rendering and bundle impact in the actual page rather than extrapolating the lab's markup delta.
- Distinguish deployed behaviour from local verification; do not claim a real publish was tested unless observed.
- List regressions and open limits; update the task state with what is done, what remains and the next action.

**Added checks (20 November review)**

- The complete Studio flow: save, reopen, reuse, preview and a scratch publish, observed.
- Responsive, accessibility, legacy-site and performance evidence (bundle and rendering, measured on the page). Real
  Safari is checked here.

## Card 4 — Composable section edges: quick-start designs (later)

- **Depends on:** Card 3. **Status to import:** `todo`, not a condition for completing the engine.
- A small set of starting designs stored as data through the same engine, chosen from user value and the outcome
  families recorded in the contract (asymmetric overlap, split opening, echo contour, translucent band, stepped edge).
  No hard-coded render variants.
