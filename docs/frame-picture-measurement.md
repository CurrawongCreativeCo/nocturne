# Picture frame measurement

Measured 22 October 2026 against the owner's `docs/border.svg`, supplied for this task. The source and temporary exports were deleted after measurement as requested; they are not fixture artwork or committed assets.

- SVG: **843,483 bytes** (823.7 KiB), SHA-256 `c3a67083c5987fcad37ace26541346aa9b012c6de5de5fbced7b7a500e8e856b`.
- Square artwork, `viewBox="0 0 600 599.999999"`, intrinsic 800 × 800 px. Rasterised directly at 2400 × 2400 px, rather than enlarging an 800 px bitmap.
- Transparent centre verified from decoded pixels: centre alpha **0**. The source contains coloured artwork; only its alpha contributes to the site's frame mask.
- Colour PNG export: **1,959,792 bytes**. Single-colour PNG with exactly the same alpha: **774,160 bytes**.

These are **local encoded file sizes**, using Sharp 0.35.5 / libvips and WebP quality 75. They are a reproducible estimate of image-CDN output, not measured Sanity CDN responses. No artwork was uploaded and no production content was touched. Sanity's encoder versions/settings can differ; inspect the actual CDN transfer in a client preview before putting a detailed frame in a hero. SVG bytes below are uncompressed file bytes; HTTP compression can reduce its transfer, so these percentages are not a guaranteed network saving against a compressed SVG response.

| Requested width                             | Output width       | Colour WebP (bytes) | Single-colour WebP (bytes) | Single-colour reduction from SVG |
| ------------------------------------------- | ------------------ | ------------------- | -------------------------- | -------------------------------- |
| 192 (small profile)                         | 192                | 13,258              | 7,084                      | 99.16%                           |
| 256 (medium profile)                        | 256                | 19,882              | 10,842                     | 98.71%                           |
| 384 (large profile)                         | 384                | 36,014              | 19,704                     | 97.66%                           |
| 780 (390 px picture at 2×, comparison only) | 780                | 117,324             | 66,286                     | 92.14%                           |
| 1280 (below 640 px viewport)                | 1280               | 243,232             | 134,376                    | 84.07%                           |
| 1600 (export comparison only)               | 1600               | 342,112             | 190,642                    | 77.40%                           |
| 2048 (640–1023 px viewport)                 | 2048               | 502,286             | 283,834                    | 66.35%                           |
| 2560 (1024 px viewport and above)           | 2400, no upscaling | 578,146             | 343,750                    | 59.25%                           |

The **5 MiB upload cap** comfortably admits the measured 1.96 MB colour PNG (about 2.7× headroom for export differences), while rejecting unnecessarily large originals. It is deliberately separate from the visitor's download budget. Export at 1600–2400 px, in a single colour on transparency: colour detail is wasted when the theme fills an alpha mask. This measurement supports retaining the 50 KiB SVG cap rather than increasing it to admit this file. A detailed frame still has a material download cost, even as WebP.

The renderer requests `fm=webp&fit=max` through the Sanity image URL builder. CSS selects one of 1280, 2048 or 2560 px at the site's existing 640/1024 px breakpoints, sufficient for 2× the largest frame in each range (maximum content width 80rem). Profiles request 192, 256 or 384 px. Only the selected CSS mask is downloaded; no resize listener, observer, script or Content Lake query is added. SVG masks retain their original file URL.

To reproduce with the original artwork supplied again:

1. Read the SVG into a buffer and record its byte length and SHA-256.
2. Rasterise using `sharp(svg, { density: 216 }).resize({ width: 2400, height: 2400, fit: 'inside' }).png().toBuffer()` (800 px at 72 dpi becomes 2400 px at 216 dpi).
3. For the single-colour version, extract that PNG's alpha channel and join it onto a solid black RGB image of the same dimensions. This retains the alpha exactly.
4. For each width in the table, encode with `sharp(png).resize({ width, withoutEnlargement: true }).webp({ quality: 75 }).toBuffer()`. Count the output bytes and compute `100 × (1 − WebP bytes / SVG bytes)`.
5. For exact CDN figures, use an authorised non-production image asset, request the builder's URLs and record the response bytes and headers separately. This task did not upload the owner's artwork.

The gallery uses an independent, small transparent WebP fixture (`tests/e2e/fixtures/frame-picture.webp`), not the owner's artwork. Refresh `media-text-image-frame-picture` desktop/mobile screenshots with the **Update visual baselines** workflow on Linux.

## Validation and the Lighthouse investigation

Historical Windows validation on 22 October 2026, using Lighthouse 12.6.1:

- `npm run check`: passed, including 262 unit test files / 2,985 tests.
- `npm run test:e2e -- --workers=4`: 1,881 passed, 470 skipped by the existing platform/device rules. Raster rendering and frame-page axe checks pass on desktop and mobile. Linux visual baselines still need refreshing as above.
- `npm run test:lighthouse`: collected 12 reports across the four configured URLs and exited 0, **but this is not a passing performance-budget check**. Inspection found that every `assertMatrix` entry in the existing `lighthouserc.json` places its audit rules beside `matchingUrlPattern`, instead of inside an `assertions` object. LHCI therefore applies no audit rules (`assertion-results.json` was empty).

Applying the intended rules to those saved reports with a temporary corrected configuration (no threshold changes) fails the performance score on **all four URLs**, plus LCP on **About** and **Link page**. Median measurements:

| URL           | Performance | LCP     | CLS    |
| ------------- | ----------- | ------- | ------ |
| `/`           | 0.66        | 2707 ms | 0      |
| `/about`      | 0.66        | 3990 ms | 0      |
| `/hero-parts` | 0.71        | 2356 ms | 0      |
| `/links`      | 0.55        | 4558 ms | 0.0188 |

To check whether the score failure existed before this task, the unchanged revision `fda1873` was built in an isolated checkout against the same fake Content Lake, installed dependencies, browser and throttling. Only its temporary Turbopack module-resolution root was adjusted to share the installed dependencies. Three home-page runs on a separate port produced:

| Revision            | Home performance scores | Median |
| ------------------- | ----------------------- | ------ |
| Unchanged `fda1873` | 0.64, 0.69, 0.68        | 0.68   |
| Frame branch        | 0.69, 0.64, 0.66        | 0.66   |

The unchanged revision also misses 0.9 in every sample; both revisions have a best score of 0.69. This confirms an existing performance-budget failure on this Windows machine, rather than establishing that the frame feature meets Lighthouse acceptance. The small sample is not a statistical regression analysis. The unchanged home page also has substantial main-thread blocking (1424–2504 ms). The budget enforcement bug exists in that revision too.

The owner subsequently included the Lighthouse harness and performance work in this branch. Each matrix entry now wraps its audit rules in `assertions` and explicitly selects median aggregation. Regression tests use the installed LHCI assertion engine: a good report must produce four passing results, and two failing runs out of three must fail the score, LCP and CLS budgets. Applied throttling and the existing score/CLS thresholds are retained; About's LCP limit is tightened from 3000 to 2500 ms. The JavaScript performance spec is unchanged.

The consent banner now has hidden server-rendered markup and a small storage check that reveals it before hydration on a first visit. The script follows the content: revealing before its children were parsed allowed a thin empty banner to paint and then grow, measured at CLS 0.0465. Revealing the complete markup removed that shift in the diagnostic run (home/About/hero CLS 0; Link page 0.0188). Saved choices keep it hidden; providers still require consent, and the keyboard controls take over after hydration. The consent suite includes cases with Next.js scripts blocked and the existing axe checks.

The footer's opening-hours badge also waits until first entering view before starting its clock and date formatting. Its observer and timer are cleaned up; the complete hours list remains server-rendered.

Two unnecessary downloads were also removed from public visits:

- The Studio's Newsreader preload (58,779 transferred bytes in the local report) no longer leaks onto public pages. Studio font families and theme settings are retained; its font files load when its CSS uses them.
- Browser tabs use a new 32 px PNG (1,644 file bytes), rather than the 512 px default (171,743 file bytes). The 192/512 px and Apple variants remain available, and client artwork still replaces all defaults.

Diagnostic public font-display and inline-CSS experiments did not establish a consistent improvement and were reverted. No audit was disabled, no threshold was raised, and no throttling setting was relaxed. Windows validation was interrupted when the owner needed to leave work; the historical runs above are not final acceptance.

### Resumed macOS validation, 22 October 2026

The checkpoint was resumed with a clean lockfile install under Node 24.22.1. The initially installed dependencies still resolved Lighthouse 12.6.1; that diagnostic run is excluded from the final results below. Engine versions and host resources differ from the Windows investigation, so these figures do not establish a performance gain attributable to the frame changes.

- `npm run check`: passed, including 264 unit test files / 2,996 tests, types, lint and formatting.
- `npm run test:e2e -- --workers=4 --retries=1 --trace=off`: **1,886 passed, 471 skipped**, in 21.4 minutes. No retries were used. All dependent projects completed; the existing Linux/device skips remain. Trace recording was disabled after an earlier run exhausted this laptop's disk while writing artifacts; no tests or assertions were disabled. The final run used the locked dependencies and all readiness fixes, and its servers stopped cleanly.
- Focused desktop/mobile frame, consent, business-info, location, launch-date and link-list checks: 274 passed, 6 skipped, without retries. A subsequent map/marquee/navigation trace run passed 52 tests, with 6 skipped.
- `npm run test:lighthouse` with `CHROME_PATH` pointing to Playwright Chromium: passed under Lighthouse **13.5.0 / Chrome 156**, with the original applied `devtools` throttling. The harness rebuilt public output with the gallery disabled and stopped its servers afterwards. All **16 audit-rule results** across 12 reports passed. Passing assertions are now retained explicitly: LHCI otherwise saves only failures, so an empty results file alone cannot distinguish a passing run from missing rules. The regression test checks the actual configuration retains four results per URL.

Three-run medians from that final Lighthouse invocation:

| URL           | Performance | Accessibility | LCP     | TBT   | CLS      |
| ------------- | ----------- | ------------- | ------- | ----- | -------- |
| `/`           | 0.99        | 1             | 1754 ms | 82 ms | 0.000492 |
| `/about`      | 0.98        | 1             | 1700 ms | 87 ms | 0.000492 |
| `/hero-parts` | 0.99        | 1             | 1711 ms | 81 ms | 0        |
| `/links`      | 0.99        | 1             | 1650 ms | 80 ms | 0.018774 |

### Follow-up Linux CI failure and announcement fix

A subsequent Linux CI run on `3cb7a23` failed home CLS (median **0.056183**) and About performance/LCP (**0.85 / 4047 ms**), despite the local results above. The other pages passed. These CI failures remain relevant; a passing local run does not establish Linux acceptance.

The announcement's reveal script ran before its message and dismiss button were parsed. A new desktop/mobile regression blocks Next.js chunks and observes the markup at reveal: both cases failed against the old build and pass after moving the script after the content. Date windows, stored dismissals, blocked storage, keyboard behaviour and consent remain covered. CI now explicitly selects the installed Playwright Chromium, matching local validation, and includes hidden files in the report artifact so `.lighthouseci` is retained. The downloaded failing artifact contained no Lighthouse reports, preventing identification of About's actual CI LCP candidate or browser version; its cause is not confirmed.

Follow-up local validation under Node 24.22.1:

- `npm run check`: passed, 264 unit test files / 2,996 tests, types, lint and formatting.
- `npm run test:e2e -- 'announcement.spec.ts|consent.spec.ts' --project=desktop --project=mobile --workers=4`: 40 passed, without retries.
- `npm run test:lighthouse` with Playwright Chromium: all 16 assertions passed under Lighthouse 13.5.0 / Chrome 156. Home/About/hero/links median performance was **0.99 / 0.99 / 0.99 / 0.99**, LCP **1725 / 1651 / 1701 / 1658 ms**, and CLS **0 / 0 / 0 / 0.018774**. No budgets, throttling, content or public queries changed.

Rerun Linux CI with these changes. If About still fails, inspect its retained `lcp-breakdown-insight` and browser version before proposing further performance changes.

### 23 October: confirmed Linux rendering causes

The retained Lighthouse reports from [CI run 39885870342](https://github.com/CurrawongCreativeCo/nocturne/actions/runs/39885870342)
on `d9775be` identify both remaining causes under Chrome 156:

- Home: `layout-shifts` attributes **0.056183 CLS** to the Features section moving when the public
  Inter WOFF2 loads. The font swap changes wrapping above that section.
- About: `lcp-breakdown-insight` identifies the first Process step's paragraph,
  “We learn about your business and your customers.”, at **4003 ms**. The paragraph's ancestor
  starts hidden for the step's reveal, so rendering waits for hydration and animation even though
  this second section is already in the initial viewport.

The public font now uses `display: 'optional'`, retaining preloading and metric-adjusted fallbacks
while preventing a late swap on slow first visits. The first Process step stays visible in server
HTML; later steps keep their existing reveals. No budget, throttling, fixture content or consent
behaviour was changed.

Tests and Lighthouse were **not run**, as requested by the owner. These are fixes based on the
saved failing reports, not a claim of a passing rerun. Rerun Linux CI to verify the resulting metrics.
