# Resume prompt: raster frames and Lighthouse

**Resumed on macOS, 22 October 2026:** local acceptance now passes. `npm run check` passed 264 files / 2,996 tests; the complete browser suite passed 1,886 tests with 471 existing skips and no retries used (`--workers=4 --retries=1 --trace=off`). Lighthouse 13.5.0 / Chrome 156 passed all 16 retained audit-rule results across 12 reports. See [the final validation and medians](frame-picture-measurement.md#resumed-macos-validation-22-october-2026). The new picture-frame visual baselines still require the Linux **Update visual baselines** workflow. The branch has not been pushed.

The remaining text preserves the original work-computer handover as historical context. Its unfinished-validation notes are superseded by the results above. This handover was written on 22 October 2026 because the owner needed to leave work and resume on their home laptop.

**Later CI follow-up:** Linux baselines were imported and their paths corrected in `3cb7a23`. A subsequent CI run failed home CLS and About LCP/performance. The announcement now reveals only after its complete content is parsed; CI explicitly selects Playwright Chromium and retains hidden Lighthouse reports. Code checks, 40 focused browser tests and all 16 Lighthouse assertions pass locally. **Linux CI must be rerun; About's CI LCP cause remains unconfirmed.** See [the follow-up results](frame-picture-measurement.md#follow-up-linux-ci-failure-and-announcement-fix).

## Start here

1. Read `AGENTS.md` if present and `README.md`. No applicable `AGENTS.md` was found on the work computer. Follow the repository's existing architecture, generators, direct imports, Australian English, accessibility, caching and test conventions. Read the relevant Next.js 16 guides in `node_modules/next/dist/docs/` before changing Next.js code.
2. Inspect the working tree before editing. The owner requested a checkpoint commit on the new branch **`feat/raster-frames-lighthouse-handover`**, created from `feat/raster-image-frames`, based on `fda1873`. The checkpoint includes the implementation, fixtures and this handover; see `git log -1` for its hash. **The branch has not been pushed.** Transfer or push the branch to make it available on the home laptop. Preserve unrelated changes. Do not discard the branch or start the implementation again.
3. Use **Node 24**, matching `.nvmrc`, then `npm ci` if needed. The work computer's global Node 22.18.0 is unsupported. A portable Node 24.22.1 and npm were prepared under ignored `node_modules/.cache/validation-runtime/node_modules/node/bin/`; this cache will not travel with Git and is not a project dependency. No computer-wide Node update was made. On that work computer, prepending this directory to the terminal's PATH selects both portable Node and npm; `npm.cmd` avoids PowerShell script-policy restrictions. On the home laptop, use its normal supported Node 24 setup.
4. Do not expose `.env` values or mutate production Sanity content, datasets, projects, tokens, CORS or members. Tests use the fake Content Lake. Do not force-push. Do not spawn sub-agents unless the owner requests it.

## Owner's task and authorised scope

Approved custom image frames must accept a transparent PNG or WebP Sanity image asset alongside the existing SVG file. Keep the 50 KiB SVG limit. Validate picture format, at least 1600 px on the long side, a justified upload cap and an opacity warning where metadata permits. Use Sanity's image URL builder for appropriately sized WebP masks, guarded by `isCdnUrl`. Preserve theme frame colours, show picture thumbnails in the picker and Image frames list, and add a gallery fixture, rendering/axe coverage, README export guidance and an Unreleased changelog entry. Keep public queries folded into existing cached fetches and use generated query types.

The owner explicitly **included Lighthouse harness and performance fixes in this branch**, after discovery that the existing assertions silently did nothing. Acceptance remains `npm run check`, `npm run test:e2e` and `npm run test:lighthouse` passing, with the real artwork byte comparison available for the PR. Do not raise budgets, drop audits or change throttling just to obtain a green result.

The owner supplied `docs/border.svg` and expressly requested deletion afterwards. **It and its temporary raster exports have already been deleted. Do not restore, commit or ask for the artwork again.** The measurement is preserved in `docs/frame-picture-measurement.md` and uses the actual supplied file. The independent gallery fixture is retained.

## Implementation already in the working tree

- `src/features/frames/schemas/frame.ts`: SVG/Picture artwork choice; legacy missing format remains SVG; conditional upload fields; PNG/WebP validation, minimum long side 1600, **5 MiB** upload cap and `metadata.hasAlpha === false` warning. Native Sanity preview uses the picture asset, including reference-picker thumbnails. Existing agency-only composition remains.
- `src/features/frames/api/queries.ts`: `FRAME_PICTURE_ASSET_QUERY`, a `defineQuery` for Studio upload metadata. Both picture validators use the generated `FRAME_PICTURE_ASSET_QUERY_RESULT`. Pure checks live in `utils/frame-picture.ts`, with tests. Existing Studio SVG validation conventions are preserved; no new visitor fetch was added.
- `src/lib/sanity/frame-mask.ts`: Sanity image URL builder, `fm=webp&fit=max`, CDN guard, SVG URLs unchanged. Tests cover sizing and unsafe/malformed URLs.
- `src/components/ui/image-frames.tsx`: alpha mask filled with the selected token colour. CSS chooses 1280 px below viewport 640, 2048 px from 640 to 1023, and 2560 px from 1024 upwards, covering 2× the maximum content frame. Profiles use 192/256/384 px. No resize JavaScript is added.
- Existing shared fragments and page-section queries select `picture.asset->url` for Picture, otherwise `svg.asset->url`; no parallel public queries or new document types. Existing access filters/tags remain. `npm run typegen` was run successfully; generated types are in `src/types/sanity.types.ts`. Generated names use uppercase `_RESULT`.
- `tests/e2e/fixtures/frame-picture.webp`: independent transparent 2400×1600 fixture, 11,178 bytes; dataset has picture asset/frame and a framed-images section. Gallery adds `media-text-image-frame-picture`. Rendering tests verify the sized mask URL, colour and decoded transparent centre; existing axe scan covers it. Visual tests serve the raster fixture.
- README Image design guidance covers SVG/Picture, transparent backgrounds, single-colour exports, 1600–2400 px and why complex SVGs should be rasterised. CHANGELOG Unreleased entries added.

### Performance and harness work already implemented

- `lighthouserc.json`: audit rules now correctly nest inside each matrix entry's `assertions`; median aggregation is explicit. Previously the command exited 0 with an empty assertion-results array. Regression tests in `scripts/lighthouse-config.test.mjs` exercise the installed LHCI assertion engine, including two failing runs out of three.
- Budgets remain performance 0.9, accessibility 1, CLS 0.05. **About's LCP is tightened from 3000 to 2500 ms**, matching the other pages. Applied `devtools` throttling is retained. `tests/e2e/performance.spec.ts` is unchanged. The repository's existing JS budget is 220 KB, despite the task boilerplate saying 200; it was not raised.
- `package.json` overrides `@lhci/cli`'s Lighthouse dependency to **13.5.0**, with the lockfile updated. Latest LHCI 0.15.1 bundled Lighthouse 12.6.1; the 13.5 release targets Chrome 156, matching the installed Playwright Chromium. Primary reference: <https://github.com/GoogleChrome/lighthouse/releases/tag/v13.5.0>. Compare measurements using the same browser/engine/runtime; old and new engine figures are not directly equivalent.
- `scripts/e2e-server.mjs` now starts the fake lake before building, waits for it, always builds fresh with `E2E_GALLERY=0`, then starts Next. Child processes use `process.execPath`, avoiding Windows npm/npx selecting another Node. It cleans up children on exit. **This final startup correction still needs an actual `npm run test:lighthouse` integration run.** It rebuilds `.next`, so run it only after Playwright has stopped.
- `scripts/e2e-copy-build.mjs` replaces Unix rm/cp in Playwright startup, with whitelisted cache destinations and path containment checks.
- Consent banner: hidden server-rendered markup plus a tiny storage-validity script reveals first-visit content before hydration; saved choices remain hidden. **Keep the script after all banner content.** Placing it first briefly painted an 11 px empty strip, then expanded it, producing CLS 0.0465. Moving it last removed that shift in diagnostics. Focus, choices and provider consent gating remain client controlled. New tests block Next chunks and verify pre-hydration visibility and that all three controls exist at reveal.
- Studio Inter/Newsreader loaders set `preload: false`, removing an unused 58,779-byte Newsreader preload from public pages without changing Studio font families/theme. Public Inter remains `display: 'swap'`; optional-display experiments were reverted.
- Default tab icon now uses new 32 px PNG (1,644 bytes), with new 192 px PNG (34,542 bytes), original 512 px and Apple sizes retained. Client icons still win. Generator, launch-check hashes and e2e tests updated.
- Opening-hours clock: `OpenNowBadge` now accepts `deferUntilVisible`, default false. **Only `site-footer.tsx` opts in**. Location sections retain their immediate status. Observer/timer cleanup is retained, reserved height is rendered. Footer business-info test verifies empty before scrolling, then status after entering view.
- Container-frame CSS is generated only for development, Vercel preview or `E2E_GALLERY=1`; live self-hosted builds now omit preview-only CSS too. Helper and five environment cases added to existing PostCSS tests.
- No Webpack, inline-CSS or public font-display experiments remain; `next.config.ts` and public root layout have no semantic changes.

## Artwork measurement, already finished

See `docs/frame-picture-measurement.md` for all widths, exact bytes, source hash, reproduction steps and qualifications. Original SVG: **843,483 bytes**. Single-colour WebP with the same alpha, quality 75: **134,376 bytes at 1280 px**, **283,834 at 2048**, **343,750 at the largest request** (2560 capped to 2400, no upscaling). Profiles range 7,084–19,704 bytes. Original-colour PNG was 1,959,792 bytes; 5 MiB gives about 2.7× headroom. Keep the SVG cap.

These are **local Sharp 0.35.5 encodings, not live Sanity CDN response measurements**. No artwork was uploaded. SVG sizes are uncompressed file bytes, not HTTP transfer bytes. Preserve those qualifications in the PR; do not claim guaranteed compressed-network savings. The file is already deleted as requested.

## Exact validation state at handover

- A complete **`npm run check` passed under confirmed portable Node 24**: 264 files / 2,996 unit tests, types, lint and formatting. Since then there have been small e2e-only timing edits described below; rerun the complete check on the final state.
- An **earlier** full browser suite passed 1,886 tests / skipped 471 before the final consent-script placement, footer clock deferral, CSS scope and engine update. This is useful history, **not final acceptance**.
- The latest `npm run test:e2e -- --workers=4 --retries=1` was **stopped at the owner's request to go home**, around test 1373, in the mobile hero tests. It did not complete. No final passing full-suite result exists for the latest source. All test/server Node processes were confirmed stopped afterwards.
- In that interrupted run, desktop raster rendering, frame scales, consent-before-hydration, immediate Location status, deferred footer status, memory cleanup and unchanged JS budgets passed. The keyboard Enter case passed after its correction.
- Known desktop failures in that run were fixed **after their test instances had already executed**, so must be rechecked:
  - `launch-date.spec.ts`, “is hidden from screen readers and the date line stays”: locator matched both the live countdown and a hidden streamed copy (`S:2`). The aria-hidden assertion now filters to the visible countdown, retaining absence/count checks elsewhere.
  - `link-list.spec.ts`, 375 px “fits without sideways scrolling…”: measured 4 zero-size buttons before the final streamed link arrived. Now waits for Gift cards to be visible before measuring. Five buttons and original width/height limits are still required.
- Additional timing fixes to verify:
  - `framed-image.spec.ts`: scale checks now poll for original 1.13/1.07 values instead of immediately parsing `none` as NaN.
  - Its axe test initially failed scrolling a detached node during initial settlement, then passed on retry. Added `networkidle` before enumerating reveal nodes; this late edit needs rechecking.
  - `link-list.spec.ts`, Enter test uses the link locator's `press('Enter')`, avoiding focus being lost between separate focus and keyboard actions.
- **Outstanding mobile consent flake:** `consent.spec.ts`, “the banner does not move the page”, failed once and passed on retry. Its initial heading bounding box was **null**, later `{height: 40.546875, width: 364, x: 24, y: 240}`. The pre-hydration banner can appear before the streamed h1. This test has **not yet been fixed**. Wait for the heading to be visible and have a real bounding box before recording baseline geometry; retain the before/after position check. Distinguish initial streaming from an actual layout shift.
- Logs/reports on the work machine are ignored and will not travel with Git: `node_modules/.cache/frame-final-check.log`, `frame-final-e2e.log`, `test-results/`, `.lighthouseci/` and diagnostic folders. Important findings are included here so the cache is unnecessary on the home laptop.

## Remaining work, in order

1. Fix the mobile consent test's missing initial heading measurement as above. Review the small late e2e edits, then run focused tests for `consent`, `framed-image`, `business-info`, `location`, `launch-date` and `link-list` on both devices. Do not paper over failures with sleeps or weaken assertions; wait for observable readiness.
2. Run **`npm run check`** on the final source. Run **`npm run test:e2e -- --workers=4`** (one retry as in CI is acceptable if reported), allowing the full suite to finish. Run code checks and browser tests sequentially on a resource-constrained machine; concurrency made initial streaming timing more apparent. Do not start code checking while Playwright deletes `test-results`, since ESLint can encounter an ENOENT during directory discovery.
3. With every manual/test server stopped, run **`npm run test:lighthouse`** in isolation. Set `CHROME_PATH` to a compatible Chrome, or use Playwright Chromium (`node -p "require('@playwright/test').chromium.executablePath()"`). Use Node 24 for all child processes too. The updated startup script should build fresh public output automatically; verify that integration and clean shutdown. Check the report's engine/browser versions.
4. Inspect actual assertion results and all four page medians, not just exit status. Expect **16 audit-rule results across the four URLs**, with no empty assertions. Performance is still unresolved, as detailed below. Continue evidence-led performance fixes without weakening budgets or changing test data to hide costs. If acceptance still fails, report it explicitly, with measurements; do not call the task complete.
5. Update the validation section of `docs/frame-picture-measurement.md`: it currently includes historical runs and an unfinished final-results note. Replace that note with exact final commands/counts/metrics, distinguish old Lighthouse 12 results from 13.5 and retain the measurement qualifications. README and CHANGELOG should describe only final changes. Update the stale comment in `.github/workflows/ci.yml` that still says Lighthouse uses the Playwright build; the harness now rebuilds public output.
6. Verify `git diff --check`, no accidental experiments or `.env` changes, no `docs/border.svg`, generated types current and the JS budget/performance spec untouched. No schema/query changes have occurred since the last successful typegen; rerun it only if those change.
7. Visual baselines are Linux-only. The new `media-text-image-frame-picture` desktop/mobile baselines need the **Update visual baselines** workflow. Do not generate Windows/macOS baselines. Mention this manual action in the final reply.
8. Finish with a short honest summary, tests/results, measurement link and manual actions. The owner authorised a local checkpoint branch and commit; no PR or push has been created. Publish the branch only as authorised by the owner.

## Lighthouse findings: avoid repeating unsuccessful experiments

The old configuration's empty assertions caused a false green. Applying corrected assertions to its first saved reports gave median performance/LCP: home 0.66/2707 ms, About 0.66/3990, hero 0.71/2356, links 0.55/4558. Unchanged `fda1873` was independently built against the fake lake and scored home 0.64/0.69/0.68 (median 0.68), proving a pre-existing failure on the work machine. That temporary checkout was removed. This does not establish current acceptance.

Latest **single-run diagnostics**, Lighthouse 13.5 / Chrome 156 / applied devtools throttling, before the final footer-only prop refinement and using a public build:

| URL           | Performance | LCP     | TBT    | CLS          |
| ------------- | ----------- | ------- | ------ | ------------ |
| `/`           | 0.80        | 2297 ms | 635 ms | 0            |
| `/about`      | 0.82        | 1996 ms | 635 ms | 0            |
| `/hero-parts` | 0.80        | 2377 ms | 619 ms | 0            |
| `/links`      | 0.76        | 2167 ms | 895 ms | about 0.0188 |

LCP/CLS were within limits, but performance remained below 0.9. These are not the final three-run medians. Standard simulation with the updated engine also failed acceptance (scores 0.87/0.90/0.88/0.89; LCP about 3.3–3.6 s). **No throttling-method change was kept.** The major remaining cost was main-thread blocking in Next/Turbopack bootstrap/hydration; the off-screen date formatting was only part of it. Do not assume a browser-engine update alone fixes performance.

Experiments already rejected and reverted: public Inter optional display (inconsistent), experimental inline CSS (worse), Webpack public build (slower/more blocking). Do not silently disable coverage audits, relax CPU/network throttling, raise thresholds, remove real features or change fixture content to make scores pass. Reassess on the home laptop with isolated runs before making more changes; performance depends on host resources.

The owner authorised temporarily stopping their separate `theme-parks-next` development server on the work computer (`C:\Users\ThompsBe\Dev\Repos\theme-parks-next`, root PID 11912 and its 75 workers). It was stopped; the owner needs to restart it there when wanted. This permission does not authorise stopping unrelated applications on the home laptop.
