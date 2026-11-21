# Composable section edges

The owner approved this direction on 20 November 2026. The [Build Plan decision](https://currawong-build-plan.vercel.app/build-plan/151) records the four-card sequence pending audited import.

## Evidence and scope

| Existing or reference composition                                           | What it exercises                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagonal, Wave, Curve and Arch                                              | A continuous full-width cut whose band overlaps the next section. The upper section owns it.                                                                                                                                                                                                       |
| Classic layered wave, Tide, Contour, Still water, Lagoon, Reef              | Paint under the cut, tint clipped by the cut, foreground strokes, repeatable offsets and layer order. Elevated separately demonstrates a shadow at a straight join.                                                                                                                                |
| Decorative rules in headings, Rich text, Link list, navigation and listings | Gradient with fading ends, several widths, alignment and a centre that can contain an icon or image. These saved designs and placements keep their current render paths.                                                                                                                           |
| Pale attached crop                                                          | A mint band and a faint ring visible through it. The ring’s storage and reach are indeterminate from the crop.                                                                                                                                                                                     |
| Blue attached crop and the lab                                              | Two translucent contours above the cut are enough to recreate the overlapping bands. The lab also proved a two-point slant and two strokes following an offset angular contour.                                                                                                                    |
| Existing saved values                                                       | The fake Content Lake includes stored diagonal, wave, layered, elevated, generated edges, and short and medium decorative rules. The original parity tests exercise stored keys, fields, combinations and preview wrappers. The focused rollout uses those fixtures and a new stored-data example. |

## Model

The optional `sectionStyle.composedEdge` value opts a section in when it has version 1 and valid geometry. Without a recognised value, the existing resolver reads the previous fields. No migration or renaming of stored fields is needed. Since Task 2 Studio edits it through one Section edge editor (below). Its range checks stay warnings: the editor only writes values the page draws, and the renderer holds each value to its range or falls back, so a stored value never blocks publishing. Any problem the editor reports names a control the editor shows (or Reset, which is always there).

- **Contour and mode.** Use 2–7 ordered points across a normalized band. Both ends are pinned horizontally. Straight and smooth interpolation use the same points. A **transition** clips the upper background and the next section overlaps by the same height. The Surface tone paints under the cut so the contour shows even without a background picture or gradient. A **rule** contributes a band after the content with a straight join and no overlapping neighbour. Height uses the existing responsive edge tokens.
- **Layers.** Up to three paints follow the shared contour or draw independent contours. Horizontal and vertical offsets are geometry. A vertical offset moves a layer's points, which stop at the band's top and bottom: a layer moved past an edge flattens along it rather than leaving the band, and the cut never moves. Within each paint plane, later layers draw in front. A transition paints below the cut, casts its shadow, draws the upper section with its clipped tints, then draws foreground strokes and the centre. Inside the upper section a tint keeps a saved shape's order: above the section's background, below its Decorative mark and its content. A rule paints in stored order.
- **Paint and span.** A solid site colour role or a two-role gradient can paint a fill or stroke. Gradients can fade at the ends. Width and alignment set the artwork's viewing window. A smaller window shows the same part of the contour at the same page position. The full-width cut remains continuous.
- **Opening.** A site icon or Sanity image reserves a centred strip through the artwork, aligned to the contour at that point. The underlying boundary remains intact. The centre inherits no interaction or text semantics. If the asset or icon is unavailable, the artwork draws continuously. A centre needs artwork to open: when no paint layer is left (none stored, or every one at 0% opacity) there is no centre, and a transition still draws its cut, its shadow and the next section's overlap, while a rule keeps its band as empty space.
- **Shadow depth.** A shadow has blur, distance and opacity, scaled to the band. It is a lighting treatment cast below a transition. Changes to those settings never move the cut or any layer. Its blur also spreads above the band's top, where the upper section covers it; a composed Surface section is given its tone's colour for this, and a saved shape on Surface keeps today's see-through background. The old generated-edge storage key `edgeDepth` still means layer spacing and retains its original values.
- **Fallbacks.** Unrecognised versions, invalid contours and invalid layer geometry use the previous section data. Offsets and paint values are bounded. Forced colours can suppress decoration while retaining the boundary. When CSS masking is unavailable, a transition stays flat and drops its paint. Geometry emits numeric SVG commands. Only site colour roles and validated image references can enter the renderer.

An omitted height uses Medium. Artwork defaults to full width and centre alignment. The artwork span can use 5–100% of the section, with 10–60% of that span available for a centre opening. Horizontal offsets stay within 8% of the span’s full coordinate system and vertical offsets within 30% of the band. Missing interpolation uses straight segments and neighbouring points must be at least 4% apart across the section.

In the browser fixture the upper section's Decorative mark draws over the translucent tint inside its cut, as it does over a saved shape's tints, and the tint colours the background below it. A mark that continues across both backgrounds needs a separate decoration positioned relative to both sections, with its own visibility and content rules.

## Compositions that test the rules

| Outcome            | What the model has to prove                                                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asymmetric overlap | Independently positioned contours can cross without changing where either section ends.                                                             |
| Split opening      | A partial-width gradient and layered paint can share one central badge or image while a transition stays continuous behind them.                    |
| Echo contour       | Two offset strokes can trace one contour at all widths.                                                                                             |
| Translucent band   | A fill can tint the section's background artwork while its Decorative mark and content stay above the tint.                                         |
| Stepped edge       | Closely spaced points can suggest a step. A true vertical stair would justify an explicit step interpolation and a defined centre anchor at a jump. |

V1 is a band that can be read from left to right. A closed hole, a loop or a path doubling back requires a different shape and clipping contract. Use reviewed artwork in an existing decorative placement, or a reviewed bespoke section when it needs to own layout or interaction.

## Handoff

Task 1 owns the stored-data projection, resolver and the shared SectionFrame path for authored transitions and rules. Task 2 owns the Studio editor and site-scoped saved designs (below). Task 3 owns authenticated Studio, publish, real Safari, existing-site regression and performance acceptance. Quick-start designs come later as data.

The unit and legacy parity tests exercise the saved-data queries and the public and editable rendering paths. The browser review uses fixture data and a local stand-in for the centre image asset. The live board has an approval note on Task 151. The four cards, with their acceptance criteria and the checks added after the Task 1 review, are in [composable-edges-plan-entries.md](./composable-edges-plan-entries.md); creating them requires the board's authenticated database importer.

## Studio editor and site designs (Task 2)

- **One editor** on `style.composedEdge`, routed by `options.edgeEditor`, in the Design tab (agency only). Basics first, then Contour, Paint layers, Centre, Shadow depth and Site designs. `src/lib/sanity/composed-edge-editor.ts` is the model: every edit returns a value `resolveComposedEdge` accepts (ends pinned to the left and right, points 4% apart, at most seven points and three layers). `edgeProblems` lists what would stop a stored value drawing, each with the control that fixes it; a test holds it empty exactly when the resolver draws.
- **Preview and warnings use the shared resolver.** The preview draws `resolveComposedEdge`'s own paths; the visibility advisory and the per-layer colour warning read `resolveSectionEdge`, so a section whose composition draws is not warned about its stored shape, and one whose composition cannot draw is.
- **Designs are independent copies** (decided: copy, not link). `designSettings.edgeDesigns` holds named copies; saving copies the section's edge in with fresh keys, applying copies one into a section with fresh keys. Neither follows the other. It reuses Design settings' persistence and its agency-only permission (no new type, role or provider call), writes the draft, and the public site never reads it. Designs can be renamed (only the name changes: the key, the settings and every section copy stay as they are). A name is checked against the list as stored at the moment of saving or renaming, not the picker's cache, so a duplicate added from another editor is caught; a stored design that no longer draws still owns its name. The hidden name's own rules are warnings, so nothing there can block publishing. Deleting a design leaves sections that used it untouched.
- **Preview parity.** Studio stores a centre picture as `image.asset._ref`; the page's query projects it to `_id`, which the resolver reads. The preview applies the same projection (`asProjected`), so a selected picture opens the gap and an unavailable one closes it, as on the page. The preview's SVG definition ids are scoped per instance. The minimum point gap is compared with a floating-point tolerance (`gapAllowed`) in the resolver and the editor, so a gap of exactly 4% (8.2 − 4.2 is 3.999999999999999) is valid in both.
- **Not in Task 2:** a full scratch publish, real Safari and release performance evidence (Task 3); quick-start designs (later, as data).

### Real Studio findings (Task 2, disposable project, 20 November 2026)

Observed in a signed-in Studio against the Task 177 QA project (page draft and Brand colours draft only, then deleted):

- Studio's global CSS strips the browser's own look from form controls (a radio draws nothing, a range has no track), so the editor's native radios, checkboxes and sliders opt back in (`appearance: auto`).
- Rendering Sanity's nested image field inside the editor uploaded the file but never attached it to the edge. The editor now owns the centre picture control: it uploads with the Studio client and writes `centre.image` in the same change as everything else, so it is saved, undone and copied with the edge.
- Hidden-field rules do appear in the Validation panel (as warnings), and Publish stays enabled. A hidden design whose name is empty or over 60 characters is listed in the editor (as "(unnamed design)" or truncated) so it can be renamed or deleted there; the warning clears.
- Presentation could not connect to the preview: the site's draft-mode route needs `SANITY_API_READ_TOKEN`, which the QA target did not have. Recorded as pending in Task 3's card.
- A centre picture upload that finishes later attaches to the edge as it is when it completes: edits made while waiting survive, and if the centre has since left Picture (or the custom edge was removed) the upload is not attached. Undo steps back from the value at the moment of attaching.

## Release checks so far (Task 3, 21 November 2026)

- **WebKit (Playwright's build 27.2, not Safari or an iPhone), GitHub run 44820147515:** 272 passed, 27 failed, 1 skipped.
  The authored-edge spec passed in WebKit, including its forced-colours case. The one skip is Reef's "mirrors with
  Flip" test (`section-edge-lagoon-reef.spec.ts`), not an authored-edge test.
- **The 27 failures are pre-existing in this WebKit setup.** All are `section-edge-hairlines.spec.ts` cases at pixel
  ratios 1.25 and 1.5 on saved shapes. The same spec on the pre-Task-1 commit e6730c2 (same runner image, Node and WebKit
  build, two workers, two runs) fails the same 27 shape/ratio cases with identical widths and pixel counts. No new or
  worse case. Evidence, comparison and screenshots: [evidence/webkit-hairlines-control](./evidence/webkit-hairlines-control/README.md).
  Not fixed here (the spec is "measured, not fixed").
- **Real Safari: owner visual approval only.** On 21 November 2026 the owner checked the fixture preview (an authored edge and a
  legacy saved wave) in Mac Safari and iPhone Safari and reported that it looked good on both. Safari versions, viewport
  and zoom were not recorded, and no Safari screenshots exist. See [safari-preview](./evidence/safari-preview/README.md).
- **Page weight (local production build):** the composed page loads no extra JavaScript; HTML grows with the markup.
- Presentation, the scratch publish and the live Build Plan import are pending credentials (see Task 3's card).
