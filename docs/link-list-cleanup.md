# Link list clean-up, 23 October 2026

Branch: `chore/link-list-cleanup`. Each numbered item has a separate implementation commit;
validation corrections and documentation follow those commits.

| Item | Result                                                                                                                                         | Commit    |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 1    | Profile and WordmarkHeading extracted; LinkListView composes the section.                                                                      | `f2fc9c4` |
| 2    | Inline separators and dividers share shape classes.                                                                                            | `c7c8461` |
| 3    | Social button shadows use the named OWN_SHADOW values.                                                                                         | `4c5d342` |
| 4    | Every shadow, divider, arrow and social-style choice has thumbnail coverage.                                                                   | `1c99ec1` |
| 5    | Typecheck disables incremental caching; build info was already ignored and CI does not cache it.                                               | `c6c6c06` |
| 6    | Unmocked browser pictures receive a valid local PNG from the fake Content Lake. Existing visual mocks take precedence.                         | `e91a5b2` |
| 7    | Normal, Wide and Extra wide letter spacing for service categories and divider words; unset keeps existing typography.                          | `8826c21` |
| 8a   | Image headings use the existing link grouping. The first visible link supplies the image; heading text remains its accessible name.            | `a87bcd2` |
| 8b   | Visible words above social icons name their navigation through aria-labelledby; otherwise it remains “Social profiles”.                        | `0855b9a` |
| 9    | Help shortened by source review. **Authenticated six-panel captures skipped:** no saved session or non-production Studio target was available. | `2485124` |
| 10   | Link text, icons, thumbnails, shadows and layout types extracted.                                                                              | `3963205` |
| 11   | Social surfaces are composed directly, without replacing class strings.                                                                        | `0c9c4bb` |
| 12   | Offline design-input examples, keyboard/axe checks and separate screenshot cases in both schemes.                                              | `7814923` |
| 13   | Shared surface contrast API, with a small Link list schema adapter.                                                                            | `ac9e82e` |

Item 9's [capture checklist and access limitation](studio-audit/2026-10-23/link-list-review.md)
remain explicit; input-gallery coverage does not substitute for an authenticated Studio audit.

No existing visual baseline file has been changed. This macOS checkout skips Linux comparisons.
Use **Update visual baselines** to add the four new section-gallery cases (desktop and mobile) and
four new Studio design-input cases (desktop); the exact names are in README's clean-up verification.
Review existing baselines in Linux CI before merging.

The approved JavaScript budget is **220 KB** (confirmed during this clean-up). The production build
measures **219.1 KB gzipped** for Home and Links. The test threshold has not been changed.

The checks use the fake Content Lake. Type generation used the fixture project ID. No production
content or Sanity project, dataset, token, CORS or membership settings were changed.

## Final validation

- `npm run typegen` passed; generated schema and query types are current.
- `npm run check` passed: typecheck, lint, formatting and 3,068 tests across 267 files.
- `npm run test:e2e -- --workers=4 --trace=off` passed: 1,916 passed, 487 skipped on macOS.
  The skips include Linux-only visual comparisons; their pixels still need Linux CI verification.
- Existing visual baseline files are unchanged. New screenshot cases need the workflow above.

An earlier check run hit the existing theme test's five-second timeout while the browser suite
was running. The final full check passed after the browser suite finished, without changing
the test or raising its timeout.
