# Task 139 review package: profile image presets (PR #151)

Real screenshots of the production build against the fake Content Lake (`tests/e2e/fixtures/dataset.mjs`), in the
section gallery, at **390 px (mobile), 1080 px (tablet) and 1440 px (desktop)**. Synthetic content only: one made-up
portrait (an asymmetric figure with white and black corner markers, so cropping and clipping are visible). Chromium on
macOS, reduced motion, consent rejected. Captured with a throwaway script; no part of the e2e suite was run locally.

- `after/<width>/<section>.png`: this branch. `focus-team-list-portrait-large-ring.png` is the same list after pressing Tab to the first member.
- `main-before/<width>/`: `main` (ca0496b) for the two default sections that matter most.

## What each screenshot shows

| Request                                                                                               | File (under `after/<width>/`)                                                                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Testimonial avatar, default Medium, no ring                                                        | `testimonials.png`                                                                                                                                |
| 2. Testimonial avatar, Small and Large                                                                | `testimonials-avatar-small.png`, `testimonials-avatar-large.png`                                                                                  |
| 3. Testimonial avatar, solid and gradient rings (and a ring on the inverse tone, Highlight colour)    | `testimonials-avatar-ring-line.png`, `testimonials-avatar-ring-gradient.png`, `testimonials-avatar-ring-inverse.png`                              |
| (unknown values fall back)                                                                            | `testimonials-avatar-malformed.png`, `team-list-portrait-malformed.png`                                                                           |
| 4. Team list, default (new, or existing without an Image design)                                      | `team-list.png`                                                                                                                                   |
| 5. Team list, customised Portrait                                                                     | `team-list-portrait-small.png`, `team-list-portrait-large-ring.png`, `team-list-portrait-gradient.png`, `focus-team-list-portrait-large-ring.png` |
| 6. Team list, existing legacy Image design (circle), with a Portrait stored beside it that is ignored | `team-list-legacy-image-design.png`                                                                                                               |
| 7. Team grid and slider, unchanged                                                                    | `team-grid.png`, `team-grid-circle.png`, `team-slider.png`                                                                                        |
| 8. Studio Design tab, including the legacy case                                                       | **Not captured.** See "Not verified".                                                                                                             |

## Before and after against `main`

Section screenshots compared pixel for pixel (`main` build vs this branch, same fixtures, same browser):

| Section                                                                                      | 390            | 1080      | 1440      | Verdict                                                                                         |
| -------------------------------------------------------------------------------------------- | -------------- | --------- | --------- | ----------------------------------------------------------------------------------------------- |
| `testimonials` (default avatar)                                                              | identical      | identical | identical | No change.                                                                                      |
| `team-list` (default list)                                                                   | identical      | identical | identical | No change: the default now goes through ProfileImage and is the same pixels as FramedImage was. |
| `team-grid`, `team-grid-circle`, `team-slider`                                               | identical      | identical | identical | No change (still FramedImage).                                                                  |
| `team-list-legacy-image-design`                                                              | 2,503 px       | 2,392 px  | 4,807 px  | Sub-pixel placement only (see below). Same circle pictures as `main`.                           |
| `*-malformed` (unknown values)                                                               | small          | small     | small     | Sub-pixel placement only (see below).                                                           |
| `testimonials-avatar-{small,large,ring-*}`, `team-list-portrait-{small,large-ring,gradient}` | different size |           |           | Intentional: `main` has no such settings, so it draws the default.                              |

Sub-pixel note: sections placed after the new, taller or shorter variants sit at a different fractional position in the page, so
an element screenshot rasterises them one pixel row apart. Cropping just the picture and allowing for anti-aliasing (a channel
difference above 24), the malformed and legacy pictures match `main` exactly at the right offset (0.0 % different) at all three
widths. The Linux visual baselines do not cover these new sections, so CI cannot catch such drift; the checks above are the evidence.

**CI finding, fixed.** The first push of the corrections put the new gallery fixtures in the middle of the section gallery, which
moved 30 or so existing sections by a sub-pixel and failed their Linux visual baselines in two e2e shards (for example
`video-embed`, `process-vertical`, `panel-gradient`). That is the effect measured above, seen by CI. The new fixtures now sit
last in `gallerySections`, as the fixture file already requires of new entries. No baseline was updated.

## Checks made while looking at the images

- **Clipping and wrapping:** no clipped rings or pictures at any width; names and roles wrap normally. At 390 px a Large ring on a team list leaves the text a narrower column (it wraps one line more); nothing overflows.
- **Spacing:** a ring adds its width and gap around the picture, so a ringed avatar's box is a few pixels larger than the unringed one. The default has no ring and does not move.
- **Focus:** the member's name link shows the site's focus outline; the portrait and ring take no tab stop (`tests/e2e/profile-image-presets.spec.ts` presses Tab).
- **Tokens:** rings use the theme's Primary (solid), Primary to Secondary (gradient) or the chosen theme colour (Highlight on the inverse tone); the picture corners use the card radius.
- **Contrast:** a ring is decoration and carries no text. axe on every new state is in the new spec, which only CI runs; see the PR for its result.

## Differences table

| Change                                                                                                | Intentional? | Risk                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testimonial avatar drawn by ProfileImage (`size-12` circle, `rounded-full`) instead of `rounded-pill` | Yes          | None seen: identical pixels at three widths. `rounded-pill` and `rounded-full` are both fully round on a square.                                      |
| Image `sizes` hint is now `48px` and the CDN width 96 (was 48)                                        | Yes          | Sharper on 2x screens; one extra size in the CDN cache.                                                                                               |
| New team list uses ProfileImage, not FramedImage                                                      | Yes          | None seen: identical pixels. Hotspot is applied by the CDN crop, not `object-position`. A very unusual hotspot is worth a look on a real client site. |
| Saved Image design on a list keeps FramedImage and hides Portrait                                     | Yes (F1)     | None; nothing deleted.                                                                                                                                |
| A Portrait stored beside a saved Image design is ignored                                              | Yes (F1)     | An editor who set Portrait first, then Image design, sees Image design only.                                                                          |

## Not verified

- **Studio Design tab (item 8).** Not captured: Studio needs a signed-in session on a real Sanity project, which this task forbids touching. The visibility rule is covered by unit tests of the schema's `hidden` callbacks (`team-portrait-fields.test.ts`, `team-portrait.test.ts`) but nobody has looked at it in a real Studio. The legacy control's description reads "On the List layout, clear this to choose Portrait (size and ring for small portraits) instead."
- Dark-mode and Safari renderings.
- The images are macOS Chromium; the repository's visual baselines are Linux-only.
