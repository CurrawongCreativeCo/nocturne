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

The optional `sectionStyle.composedEdge` value opts a section in when it has version 1 and valid geometry. Without a recognised value, the existing resolver reads the previous fields. No migration or renaming of stored fields is needed. Studio keeps this value hidden and read-only until the agency controls are part of the same authoring workflow.

- **Contour and mode.** Use 2–7 ordered points across a normalized band. Both ends are pinned horizontally. Straight and smooth interpolation use the same points. A **transition** clips the upper background and the next section overlaps by the same height. The Surface tone paints under the cut so the contour shows even without a background picture or gradient. A **rule** contributes a band after the content with a straight join and no overlapping neighbour. Height uses the existing responsive edge tokens.
- **Layers.** Up to three paints follow the shared contour or draw independent contours. Horizontal and vertical offsets are geometry. Within each paint plane, later layers draw in front. A transition paints below the cut, casts its shadow, draws the upper section with its clipped tints, then draws foreground strokes and the centre. Inside the upper section a tint keeps a saved shape's order: above the section's background, below its Decorative mark and its content. A rule paints in stored order.
- **Paint and span.** A solid site colour role or a two-role gradient can paint a fill or stroke. Gradients can fade at the ends. Width and alignment set the artwork's viewing window. A smaller window shows the same part of the contour at the same page position. The full-width cut remains continuous.
- **Opening.** A site icon or Sanity image reserves a centred strip through the artwork, aligned to the contour at that point. The underlying boundary remains intact. The centre inherits no interaction or text semantics. If the asset or icon is unavailable, the artwork draws continuously.
- **Shadow depth.** A shadow has blur, distance and opacity, scaled to the band. It is a lighting treatment cast below a transition. Changes to those settings never move the cut. The old generated-edge storage key `edgeDepth` still means layer spacing and retains its original values.
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

Task 1 owns the stored-data projection, resolver and the shared SectionFrame path for authored transitions and rules. Task 2 owns progressive Studio inputs and site-scoped saved designs. Decide copy versus linked behaviour before implementing that feature. Task 3 owns authenticated Studio, publish, real Safari, existing-site regression and performance acceptance. Quick-start designs come later as data.

The unit and legacy parity tests exercise the saved-data queries and the public and editable rendering paths. The browser review uses fixture data and a local stand-in for the centre image asset. The live board has an approval note on Task 151. Creating the four individual cards requires its authenticated database importer.
