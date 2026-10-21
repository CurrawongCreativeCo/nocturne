# Hidden image settings

Investigation: 21 October 2026. Branch: `fix/hidden-image-design-validation`.

## Reproduction before the fix

Ran Sanity 6.19's document validator locally against the real `imageDesign` schema, compiled into a
minimal page → sections → hero fixture. The first reproduction used an in-memory document-existence callback returning false for the
unpublished frame. It was then repeated against the running fake Content Lake
(`node tests/e2e/fake-sanity.mjs`), with the original schema from commit `d94bf0f`, project `e2etest1`,
host `http://localhost:9999`, and an existence query through the fake client. Both returned the same
reference error. No production reads or writes, uploads or dataset mutations were made.

The hero had `appearance: 'circle'`, `frame: 'custom'`, and a reference to `unpublished-frame`,
including the `_weak: true` / `_strengthenOnPublish: {type: 'frame'}` metadata of an inline-created
reference. Even though Approved frame was hidden, the validator returned:

- Error: **Referenced document must be published** (`reference.not-published`).
- Path: `sections[_key=="hero"].imageDesign.customFrame`.

The same fixture, with motion None and stale `travel: 99`, `scale: 9`, `frameInset: 99`, also returned:

| Path beneath the hero's `imageDesign` | Exact error                                      |
| ------------------------------------- | ------------------------------------------------ |
| `travel`                              | Must be lower than or equal to 7.000000000000001 |
| `scale`                               | Must be lower than or equal to 1.15              |
| `frameInset`                          | Must be lower than or equal to 12                |

Calling the real frame SVG checker with a valid SVG and a 700 × 1024 byte asset size returned:
**This file is 700 KB. Frames must be under 50 KB: simplify the paths and export again.**
This is a different document's error, at the frame's `svg` field; it does not propagate into the page.
The page's error comes from its reference to that unpublished frame.

These are document-validation results, not a browser replay of the owner's upload. In Studio they
feed the page's validation summary and the field's validation marker; the hidden field has no visible
input beside which to display its marker. The frame's SVG error belongs in the inline frame editor
(or Design → Image frames). Browser placement and the original upload remain to be confirmed manually.

## Fix and publishing

`validateVisible` uses Sanity 6.19's runtime validation context (`hidden`, including ancestors) to
return no rules for hidden controls. This also bypasses inherited reference and enum checks;
returning true from a custom validator alone does not bypass those rules. Visible controls keep
their existing rules and messages. There is no numeric relaxation for visible fields.

Sanity's publish operation also strips `_weak` from references with `_strengthenOnPublish`, even
when hidden. `FrameReferenceInput` keeps inactive frame references weak, retaining their selections.
Changing a shape/frame/border combines reference metadata with the choice in one patch event. An
already-hidden reference is repaired once when its object input opens; Undo remains available.
Choosing the frame again restores strengthening and its published-document validation. This makes
local edits safe without a dataset migration or clearing saved choices.

Both Image design's Approved frame and Link list's Profile → Frame use `options.disableNew: true`.
Add and publish frames only under Design → Image frames.

`imageDesignFields` still resolves the frame URL in the existing query. `FramedImage` passes the
result to `resolveImageDesign`: only Framed uses frame style, colour, inset or URL; only custom
parallax uses travel, direction or scale. A non-custom frame ignores a stale custom URL. No extra
request or query change is needed. Link list's `resolveProfileImage` likewise uses a frame URL only
for its frame border. Public rendering already followed the intended rules.

## Hidden-field audit (PR notes)

| Area               | Conditional fields checked                                                                                                                            | Publishing trap and treatment                                                                                                                                                           |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Image design       | Frame, Approved frame; exact-motion switch, travel, direction, scale; frame colour and inset                                                          | Built-in reference check, numeric limits and enum checks now skip while hidden. The custom-frame requirement still applies while visible.                                               |
| Link list Profile  | Border width, gap, gradient, frame, border colour                                                                                                     | Hidden frame's inherited reference check could block; its warning alone did not bypass it. Nested custom colour hex could also block. Both skip while hidden; inline creation disabled. |
| Service categories | Whole group without categories; separator colour when separator is None                                                                               | Nested custom hex validation now respects hidden ancestors.                                                                                                                             |
| Cards              | Surface controls in Editorial; strength for Transparent; border colour for None; eyebrow and description in Compact                                   | Nested custom hex and inherited list checks now respect hidden ancestors. Contrast guidance remains a warning when visible.                                                             |
| Arrows and icons   | Arrow style/colour without arrows; icon controls in Editorial; container controls for Plain/Transparent/None                                          | Nested custom hex and list checks skip while hidden.                                                                                                                                    |
| Social icons       | Whole group without socials; button background, strength, border and border colour for Plain/Transparent/None                                         | Nested custom hex and list checks skip while hidden.                                                                                                                                    |
| Dividers           | Category/bio divider without both; social dividers without socials; centre/text/icon/image/size/width/thickness/colours according to style and centre | The named shared divider schema also wraps its children, so hidden custom hex and list checks skip. Text length guidance remains a warning when visible.                                |
| Depth and glow     | Link/social/profile shadows according to layout/content; glow targets and colour when Off                                                             | Nested custom hex and list checks skip while hidden.                                                                                                                                    |

## Verification remaining

Regression coverage added for the round hero with stale reference/numeric values, visible missing
and unpublished custom frames, visible numeric limits, and frame reference publishing metadata.
Type generation completed using the fake project. TypeScript, targeted ESLint and formatting checks passed.
The existing `/framed-images` circle fixture now carries stale frame and exact-motion settings; its
rendered appearance should stay unchanged. Test suites are deliberately deferred at the owner's request:
run `npm run check` and `npm run test:e2e` later. Manually confirm the original Studio upload workflow
and Undo for shape/frame/border changes. Public visuals are unchanged; no baseline refresh is expected.
