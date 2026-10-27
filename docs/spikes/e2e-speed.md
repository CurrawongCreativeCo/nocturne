# Spike: faster end-to-end tests

Written 27 October 2026 on the branch `spike/e2e-speed`. No spec, `playwright.config.ts` or workflow changed; this is
findings and a proposal. The numbers come from two local runs (below), so read them as proportions, not as CI minutes.

## Summary

- **Skipped tests are not the cost.** The 105 tests that skip by `isMobile` (or skip a project in the test body) cost
  17.7 s of worker time in total (mean 169 ms, none above 1.4 s), about 0.2% of the run. Moving them into config saves
  almost no time. What it fixes is sharding, which counts them as work (see "Shard balance").
- **One spec is a quarter of the suite.** `studio-brand-preview.spec.ts` is 26% of all worker time in the main run
  (2,006 s of 7,588 s), and it runs on both projects. About 70% of every test in it is the same page load in
  `beforeEach`.
- **A phone adds nothing to 14 spec files and 50 more tests**, on evidence from the specs themselves (below). Dropping
  those from `mobile` removes 306 of 2,306 tests and 13.9% of worker time. 74% of that saving is the mobile run of
  `studio-brand-preview` alone (1,005 of 1,351 s).
- **Best single change** is not about browsers: load the brand preview once per scheme instead of once per test. With
  that, the mobile scope change and a rebalanced shard split, worker time falls 23.5% and the slowest shard falls from
  33% of the work to 26%.
- **Cheap, measured extras:** `.next/cache` is 1.6 GB of the 1.8 GB build and is copied twice per Playwright run for
  nothing (the time saving claimed here was wrong: see the correction in e2e-speed-follow-ups.md); the isolated CI job builds three times to run 171 s of tests;
  more than six workers gave no speed-up on this machine.
- **Not measured:** real CI timings. `gh` is not installed here and CI logs were not available, so per-shard minutes
  are modelled from local durations. The first follow-up records them in CI.

## How this was measured

| Run | Command                                                                                         | Result                                                                                               |
| --- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | `npx playwright test --reporter=json` (all projects, retries 0)                                 | 1,045 s wall: 180 s cold build and servers, 826 s of tests. 1,858 passed, 496 skipped, 5 failed.     |
| 2   | `E2E_VISUAL_ANY_OS=1 npx playwright test visual.spec design-settings experiments --no-deps`     | 741 s wall. Visual specs fail by design on Windows (no `win32` baseline); only their timing is used. |
| 3   | `studio-brand-preview --project=desktop --workers=1`                                            | 58 tests, 493 s, mean 8.5 s, fastest 5.8 s, median 6.8 s.                                            |
| 4   | `hero-slot section-edges section-background link-list.spec --project=desktop --workers=6/10/14` | 186 tests: 77 s, 72 s, 70 s wall; 454 s, 706 s, 957 s of summed test time.                           |

Machine: Windows 11, 20 logical cores, Node 22.18, Playwright 1.64.0, so 10 workers by default. Caveats:

- **Visual specs skip on Windows** (run 1), so run 2 supplies their timings (`visual.spec.ts` about 6.3 s a test,
  mostly screenshot and comparison). They are marked `*` in the table. Real Linux numbers will differ.
- **The isolated projects skipped in run 1** because five failures stopped their dependencies. Run 2 supplies them:
  experiments 4.6 s, design 16 s (3 of 14 ran, then the serial chain stopped), design-visual 150 s.
- **Per-test times are inflated by contention.** The same `studio-brand-preview` tests took 17.3 s on average at 10
  workers and 8.5 s at one. Treat the table as relative cost.
- **Worker time** below means the sum of test durations (not wall time). Run 1 averaged 9.2 workers busy, so wall time is
  roughly worker time divided by 9.2 locally.

Five tests failed in run 1, none because of the project split: three `events.spec.ts` tests (the repeating event still
lists its skipped day, 10 November 2026; I did not diagnose it, but it may depend on today's date),
`studio-brand-preview` "shows every kind of thumbnail, dark" (hit the 30 s timeout under load), and `team.spec.ts`
"raises the card a few pixels" on mobile (hover predicate timeout under load). In run 2, `design-settings.spec.ts`
"adds no JavaScript to the home page" failed on this machine.

## Inventory

All 67 spec files, 1,153 tests per project (1,206 on desktop-side, counting the 53 in the isolated projects). "Mobile
skips" counts tests that skip themselves on mobile, not the Linux-only visual skips. Times are worker seconds from the
runs above. Class codes: **Both** is the default; **Desktop (A)** already skips mobile and only needs config;
**Desktop (B)** is new; "+ tag N" means N tests in a mixed file.

| Spec                     | Tests (per project) | Desktop s | Mobile s | Mobile skips | Class         | Why                                                                                                            |
| ------------------------ | ------------------: | --------: | -------: | -----------: | ------------- | -------------------------------------------------------------------------------------------------------------- |
| accessibility            |                  26 |        70 |       49 |            1 | Both          | axe over every route at phone width plus a keyboard check; the mobile canary for page-level axe                |
| ai-crawlers              |                   4 |         0 |        0 |            4 | Desktop (A)   | robots.txt and llms.txt through `request`; already skips mobile                                                |
| announcement             |                   7 |         9 |       10 |              | Both          | reveal timing and the close control box                                                                        |
| blog                     |                  20 |        28 |       26 |            2 | Desktop (B)   | server-rendered lists, pagination, canonicals, RSS; no viewport, hover or box assertions                       |
| browser-icon             |                   4 |         4 |        0 |            4 | Desktop (A)   | icon files and link tags; already skips mobile                                                                 |
| business-info            |                   5 |         7 |        7 |              | Desktop (B)   | footer text, JSON-LD, time-zone badge; no layout assertions                                                    |
| consent                  |                  13 |        16 |       18 |              | Both          | banner layout shift and focus on a first visit                                                                 |
| cursors                  |                   5 |         7 |        5 |              | Both          | pointer behaviour; holds one of the three mobile-only tests                                                    |
| design-settings-visual   |                  28 |      150* |        — |              | Isolated      | own project, desktop only                                                                                      |
| design-settings          |                  14 |        16 |        — |              | Isolated      | own project, desktop only                                                                                      |
| embed                    |                  10 |        16 |       15 |              | Both          | click-to-load iframe heights and tap targets                                                                   |
| enquiries                |                   4 |        10 |        7 |              | Desktop (B)   | native form POST and the stored document, against the second server; same markup on a phone                    |
| events                   |                  34 |       140 |       64 |              | Desktop (B)   | 11 `request` checks, server HTML and an axe pass on the gallery; no layout assertions                          |
| experiments              |                  11 |         5 |        — |              | Isolated      | own project, desktop only                                                                                      |
| font-loading             |                   1 |         7 |        0 |            1 | Desktop (A)   | response headers; skips mobile in the test body                                                                |
| forms                    |                  13 |        60 |       37 |              | Both          | error summary focus and "does not move once settled"                                                           |
| framed-image             |                  12 |        57 |       41 |              | Both          | frames at 1280 and 390 px, hover, reduced-motion variants                                                      |
| gallery                  |                  12 |        35 |       44 |            2 | Both          | drag, hover and keyboard on the gallery                                                                        |
| heading-text             |                  16 |        12 |       36 |              | Both          | line wrapping is the phone case                                                                                |
| hero-parts               |                  19 |        56 |       76 |              | Both          | intro animation and boxes                                                                                      |
| hero-slot                |                  66 |       585 |      364 |              | Both + tag 25 | 25 "fits at phone, tablet and desktop widths" tests set their own widths; the rest stay on both                |
| hero-variants            |                 107 |       347 |      364 |            3 | Both + tag 50 | 50 "renders its heading and image in the server HTML" tests read `request` HTML; the 53 axe tests stay on both |
| image-placeholder        |                   2 |         0 |        1 |              | Desktop (B)   | `request` HTML only                                                                                            |
| launch-date              |                  11 |        24 |       17 |              | Desktop (B)   | date read from server HTML in en-AU, countdown text; no layout assertions                                      |
| link-actions             |                   8 |        11 |       10 |              | Both          | tap targets and boxes                                                                                          |
| link-list-categories     |                  10 |        12 |       13 |              | Both          | phone stacking; the link page is a phone-first product                                                         |
| link-list-depth          |                   5 |         6 |        7 |              | Both          | link page shadows; phone-first product                                                                         |
| link-list-design         |                  12 |        17 |       19 |              | Both          | link page card design; phone-first product                                                                     |
| link-list-dividers       |                   8 |         8 |       10 |              | Both          | link page at 320 px; phone-first product                                                                       |
| link-list-glass          |                  13 |        13 |       14 |              | Both          | hover, 375 px, screenshot                                                                                      |
| link-list-overrides      |                   9 |        11 |       11 |              | Both          | link page overrides; phone-first product                                                                       |
| link-list                |                  33 |        73 |       95 |              | Both          | 375 px and 1280 px layouts, keyboard                                                                           |
| location                 |                   9 |        14 |       34 |              | Both          | the map beside the details is layout; kept to be safe                                                          |
| logo-marquee             |                  15 |        66 |       82 |            1 | Both          | hover, pause and motion                                                                                        |
| members                  |                  11 |        28 |       30 |              | Desktop (B)   | sign-in redirects, sitemap and search exclusion through `request` and server HTML; no layout assertions        |
| memory                   |                   3 |        55 |       65 |              | Both          | listener and node leaks; mobile has its own code paths (9 `isMobile` branches)                                 |
| motion-presets           |                   9 |        19 |       19 |              | Both          | animation presets                                                                                              |
| motion                   |                   3 |         9 |        7 |              | Both          | reveal and lazy feature bundle                                                                                 |
| navigation               |                  10 |        11 |        3 |            7 | Both          | mixed file: 7 desktop-only and 2 mobile-only tests, already skipped in the body                                |
| newsletter               |                   8 |        13 |       14 |              | Desktop (B)   | form states, rate limit and server action; a native form, same on a phone                                      |
| ops-notices              |                   1 |         0 |        0 |            1 | Desktop (A)   | one `request` check; already skips mobile                                                                      |
| pages                    |                  16 |        17 |       16 |              | Desktop (B)   | h1 count, Open Graph, 404, canonical; no layout assertions                                                     |
| panels                   |                  24 |        33 |       37 |              | Both          | panels at 1280 and 390 px                                                                                      |
| parallax                 |                   7 |        16 |       15 |              | Both          | scroll and motion                                                                                              |
| performance              |                   2 |         0 |        0 |            2 | Desktop (A)   | gzip budget; already skips mobile (Lighthouse covers a phone separately)                                       |
| personalization          |                   2 |         3 |        5 |              | Desktop (B)   | greeting from a stored visit; no layout assertions                                                             |
| prelaunch-gate           |                  36 |        26 |        0 |           36 | Desktop (A)   | the gate, through `request`; already skips mobile                                                              |
| prelaunch-looks          |                  25 |        52 |       73 |              | Both + tag 25 | each test sets a phone and a desktop viewport itself                                                           |
| prelaunch-pages          |                   7 |        12 |       17 |              | Both + tag 2  | as above                                                                                                       |
| pricing                  |                   9 |         8 |       13 |              | Desktop (B)   | Stripe checkout and webhook through `request`; same markup on a phone                                          |
| process                  |                  11 |        35 |       37 |              | Both          | layouts and boxes                                                                                              |
| releases                 |                   2 |         5 |        6 |              | Desktop (B)   | release perspective through draft mode; server HTML                                                            |
| route-progress           |                   5 |        15 |        0 |            5 | Desktop (A)   | header links; already skips mobile                                                                             |
| search                   |                  18 |        36 |       36 |            2 | Desktop (B)   | results page, JS-off, markup treated as text; the 2 keyboard tests already skip mobile                         |
| section-background-image |                  18 |        36 |       41 |              | Both          | picture choice depends on width and device pixel ratio (1 vs 2.6)                                              |
| section-background       |                  22 |       138 |       96 |              | Both          | background layout and boxes                                                                                    |
| section-edges            |                  47 |       223 |      182 |              | Both          | phone and desktop edges; boxes                                                                                 |
| section-style            |                  18 |        66 |       65 |              | Both          | tone matrix through axe; a later candidate (see Risks)                                                         |
| site-info                |                   3 |         0 |        0 |            3 | Desktop (A)   | `/api/site-info`; already skips mobile                                                                         |
| slider                   |                  19 |        46 |       32 |            5 | Both          | drag, hover and buttons on phones                                                                              |
| stats                    |                  18 |        42 |       38 |              | Both          | 375 px and 1280 px layouts, formatted figures                                                                  |
| studio-brand-preview     |                  58 |      1001 |     1005 |              | Desktop (B)   | Sanity UI under the brand theme; one page, both colour schemes at once; no viewport logic                      |
| studio-brand-visual      |                  32 |      447* |       0* |           32 | Desktop (A)   | screenshots; mobile already skips every test                                                                   |
| styleguide               |                  16 |       104 |       62 |            2 | Both          | frames wider than a phone are skipped on mobile; boxes                                                         |
| team                     |                  15 |        30 |       22 |              | Both          | hover lift on cards                                                                                            |
| video                    |                  12 |        56 |       26 |              | Both          | poster, keyboard, autoplay policy                                                                              |
| visual                   |                 153 |      967* |    1014* |              | Both          | one baseline per project and section                                                                           |
| **Total**                |         1206 + 1153 |      5442 |     4448 |              |               |                                                                                                                |

## Classification, with evidence

Signals counted in every spec: explicit viewport sizes, hover and mouse calls, `boundingBox` and similar, screenshots,
`isMobile` branches, `request` calls, and whether the spec uses a phone-only code path. Then I read the test titles.

**Needs both (default, 41 files, four of them with some tagged tests below).**

- Visual and responsive: `visual`, `link-list*` (a phone-first product), `section-edges`, `panels`, `stats`, `slider`,
  `hero-parts`, `heading-text`, `framed-image`.
- Navigation, motion, touch and hover: `navigation`, `motion*`, `parallax`, `logo-marquee`, `team`, `gallery`.
- `section-background-image` sets its own widths but still needs both, because it chooses a picture by device pixel
  ratio (1 on desktop, 2.6 on Pixel 7). This is the case that "sets its own viewport" does not cover.
- `accessibility`, `consent`, `forms`, `embed` and `memory` stay as the phone canaries for axe, layout shift, tap targets
  and leaks.

**Desktop only is enough, already in place (A): 9 files.** `ai-crawlers`, `browser-icon`, `ops-notices`, `site-info`,
`prelaunch-gate` (36 tests: "the gate is the same on every device"), `route-progress`, `performance`, `font-loading`
and `studio-brand-visual` (where every test already skips mobile). Most read `request` or headers. They already skip, so
the change is configuration only: 56 phantom tests (88 with `studio-brand-visual`) leave the shard count.

**Desktop only is enough, new (B): 14 files, 200 mobile tests, 1,246 worker seconds.** `blog`, `enquiries`, `events`,
`image-placeholder`, `members`, `newsletter`, `pages`, `personalization`, `pricing`, `releases`, `business-info`,
`launch-date`, `search`, `studio-brand-preview`. The evidence for each is that the spec has no viewport, hover, touch,
`boundingBox` or media-query assertions, and its checks are about server HTML, `request` calls, redirects, form
state, structured data or stored documents. A phone gets the same markup and runs the same server action.
`studio-brand-preview` tests Sanity UI under a Studio theme on one page that already renders both colour schemes; the
Studio is an agency tool and the page has no viewport logic.

**Mixed files (tag, not whole file).**

- `hero-variants`: 50 of 107 tests only read the hero from `request` HTML ("renders its heading and image in the server
  HTML"). 105 s of mobile time. The 53 axe tests stay on both.
- `hero-slot` (25), `prelaunch-looks` (25) and `prelaunch-pages` (7 tests) set their own phone, tablet and desktop widths
  inside the test, so the mobile project repeats the desktop one with only device emulation added. 235 s. This is the
  weakest call and I would do it second.

**Mobile only.** No file. Three tests: two "mobile menu" tests in `navigation` and one in `cursors`. Both projects
already skip them in the body at 0.5 s or less, so tagging them `@mobile` is for honesty in the config, not for speed.

**Git history.** There are 398 commits and none records which project failed, so history can show only which specs
changed for mobile bugs. The three mobile fixes I found touch specs that stay on both: `23dc25d` (mobile navigation;
`navigation`, `accessibility`; it also added `pages.spec.ts`, which has no mobile branch), `e8f78ab` (iOS background gaps; `link-list-design`, `link-list-overrides`) and `f93e889`
(phone stacking; `link-list-categories`). No B spec appears in a mobile-fix commit, and none has an `isMobile` branch
except `blog` and `search`, which each have two tests that already skip mobile. This is an absence of evidence in
a log that cannot show the answer, not proof. The first follow-up (CI timings) and a mobile-only-failure count after four
weeks would be real evidence.

## Mechanism

Keep the readable shape: **unlisted means both.** Two small pieces.

1. **A registry for whole files.** One file, `tests/e2e/project-scope.ts`, listing the specs that run on desktop only,
   with the reason beside each. The config reads it. Because the default is both, a forgotten entry costs a minute of CI,
   never coverage, and a renamed file falls back to both.

   ```ts
   // tests/e2e/project-scope.ts
   /** Specs where a phone adds nothing. Anything not listed runs on desktop and mobile. */
   export const DESKTOP_ONLY: Record<string, string> = {
     'blog.spec.ts': 'server-rendered lists, pagination and canonicals; no layout assertions',
     'studio-brand-preview.spec.ts': 'Sanity UI under the brand theme; no viewport logic',
     // ...
   }
   ```

   ```ts
   // playwright.config.ts
   const mobileIgnore = Object.keys(DESKTOP_ONLY).map((file) => new RegExp(`${file.replace('.', '\\.')}$`))
   { name: 'mobile', testIgnore: [...ISOLATED_SPECS, ...mobileIgnore], grepInvert: /@desktop/, use: { ...devices['Pixel 7'] } },
   { name: 'desktop', testIgnore: ISOLATED_SPECS, grepInvert: /@mobile/, use: { ...devices['Desktop Chrome'] } },
   ```

2. **Tags for tests inside mixed files.** Playwright's `{ tag: '@desktop' }` option on `test` and `test.describe` (the
   same `grepInvert` filter). `@desktop` means desktop only, `@mobile` means mobile only. Untagged tests run on both.

   ```ts
   test('renders its heading and image in the server HTML', { tag: '@desktop' }, async ({ request }) => {
   ```

Why not `testMatch` per project: it lists what runs, so a new spec matches nothing until someone remembers to add it, and
coverage is lost silently. Why not tags only: whole-file scope would need every file wrapped in a `describe`, and a tag
cannot say why. Why not file names (`*.desktop.spec.ts`): renaming breaks the snapshot folders, which are named after
the spec.

Two guards: a Vitest test that every `DESKTOP_ONLY` key is a real file, and a CI step that prints
`playwright test --list --project=mobile | tail -1` so a shrinking mobile count is visible in review. Once a spec is in
the registry, its `test.skip(({ isMobile }) => isMobile, ...)` lines can go.

## Time saved

Worker seconds, from the combined data (run 1 plus run 2 for visual and isolated specs). The shard rows model
Playwright 1.64's sharding: tests in project order (desktop, then mobile), file order within a project, cut into four
contiguous slices of equal test count (`filterForShard`), with tests that skip dynamically still counted.

| Scenario                                                                        | Tests | Worker s | Saved         | Shard share (1 / 2 / 3 / 4) | Slowest vs mean |
| ------------------------------------------------------------------------------- | ----: | -------: | ------------- | --------------------------- | --------------- |
| Today                                                                           | 2,306 |    9,718 | —             | 19% / 33% / 19% / 29%       | 1.32            |
| 1. Tier A + B + 50 tagged hero tests off mobile                                 | 2,000 |    8,367 | 1,351 (13.9%) | 20% / 32% / 24% / 24%       | 1.27            |
| 2. Scenario 1 + 57 self-sized tests off mobile                                  | 1,943 |    8,131 | 1,587 (16.3%) | 20% / 32% / 24% / 24%       | 1.28            |
| 3. Scenario 2 + `studio-brand-preview` loads once per scheme (assumes 70% less) | 1,943 |    7,431 | 2,287 (23.5%) | 22% / 25% / 26% / 26%       | 1.05            |

- **Total.** Locally that is about 150 s (scenario 1) to 250 s (scenario 3) of a roughly 21-minute run (826 s measured
  plus Linux visual specs plus startup). It is the scenarios' proportion that carries over to CI, not the seconds.
- **Per shard.** The slowest shard is the wall time. Today shard 2 holds 33% of the work (3,196 worker s); scenarios 1 and
  2 only bring it to 32% (2,649 / 2,588) because the heavy desktop files sit in the second slice, so they save work but
  not much wall time. Scenario 3 brings it to 1,958 (25 to 26%, within 5% of an even split): **the slowest shard falls 39%**.
- **Balance gets worse before it gets better.** Dropping mobile tests shifts the slice boundaries into the desktop
  files. After scope changes, rebalance (follow-up 6) or the saving lands in the wrong shard.
- **Shard 1 also runs Lighthouse CI** after its tests, so it should be the lightest shard, not an average one.
- **Fixed cost per shard** (checkout, `npm ci`, Chromium, build, servers) is not reduced by any of this.

## Other cheap wins

**Slowest ten tests** (run 1, contended, worker seconds): memory mobile 37.1 and desktop 34.9; `studio-brand-preview`
thumbnails dark 30.9 (timed out) and 23.7, whole-page axe 24.5 and 22.3; styleguide axe 27.2; events gallery axe 25.3;
`studio-brand-visual` focus ring 24.4; hero-slot axe 23.0. Together 273 s, 2.8% of the run. Half of all worker time is
in 287 of the 1,863 tests that ran, so there is no short list of slow tests to fix; the per-file `beforeEach` cost is the
thing to look at. The two `memory` tests are slow on purpose (180 s limit) and are the mobile code-path guard.

**Retries.** CI retries once. Five failures cost 42 s in run 1, so a normal failure costs little to retry. A timeout
costs 30 s twice. The visual hang on 23 October (six tests waiting on `image.decode()`, 6 x 30 s x 2) was 360 s of
worker time, 3.7% of a run. The cause is in `visual.spec.ts` `settle()`: `img.decode().catch(...)` never settles for an
image that never loads, so the wait runs to the test timeout. Cap each decode (for example `Promise.race` against 5 s)
and the same fault costs about 6 x 5 s x 2 = 60 s. I would keep the retry; no data shows retries hide a bug. Revisit
`retries: 0` for the visual projects only if the cap does not fix it. `actionTimeout` and `navigationTimeout` are unset
(they follow the 30 s test timeout), so a hung click is also 30 s; setting 10 s is worth trying but risks flaking the
slow axe tests, so it needs a trial.

**Worker count.** On this 20-thread machine, 6, 10 and 14 workers took 77, 72 and 70 s for the same 186 tests, while
summed test time rose from 454 to 957 s. The single Next.js server is the limit past about 6 workers, and extra
workers just slow each test and cause the timeouts seen above. CI runners are much smaller (Playwright's default is
half the logical cores), so the knee is different; I could not measure it. Try `--workers=3` and `--workers=4` on one
shard once.

**Duplicated work across the three servers and the jobs.**

- **`.next/cache` is copied twice per run.** `scripts/e2e-copy-build.mjs` copies the whole `.next` (1.8 GB here) for the
  enquiries-off and pre-launch servers. 1.6 GB of that is `.next/cache`, which `next start` never reads. Copying
  without it took 6 s instead of 15 s (178 MB). **Correction (27 October):** that compared a copy into an empty folder
  with a copy over the previous one. Measured like for like, a copy takes 18.2 s with the cache and 17.1 s without,
  because removing the previous copy dominates on Windows. See e2e-speed-follow-ups.md.
- **Eight builds per pipeline.** Each `npx playwright test` builds the site: four shards, three isolated steps, and
  Lighthouse rebuilds once more. Startup (build and four servers) was 66 to 79 s warm and 180 s cold locally.
- **The isolated job pays that three times for at least 171 s of tests** (experiments 4.6 s, design 16 s for the 3 tests
  that ran, design-visual 150 s),
  because `--no-deps` removes the project chain as well, so each project needs its own command. Keeping the chain
  among the isolated projects only (`dependencies` on `desktop` and `mobile` only when not in CI) lets one command run
  all three, in order, with one startup.
- **The second and third servers are started every time** though only `enquiries.spec.ts` (8 tests over two projects)
  and `prelaunch-gate.spec.ts` (36) use them. Every shard and every isolated step starts both. Starting them only when the
  run includes those specs would save two copies and two starts per run.
- **`studio-brand-preview.spec.ts`** loads `/studio-brand-preview` in a `beforeEach` for all 58 tests per project. The
  fastest test is 5.8 s and the median 6.8 s, so about 5.5 to 6 s of each is the page load and `data-ready` wait: roughly
  350 of the 493 s one worker needs per project, and more under contention. Most of its tests only read the page, so one load per
  scheme in a serial group (or a shared `page` in `beforeAll`) would keep the same assertions.

## Risks

- **A mobile-only regression in a moved spec is no longer caught.** Mitigations: the markup that matters most on a phone is
  in specs kept on both (`accessibility`, `visual`, `link-list*`, `forms`, `navigation`). Review again after four weeks by
  counting failures that only `mobile` caught; any hit moves a spec back.
- **Responsive duplication.** If a section ever renders separate phone and desktop markup, "exactly one h1" and
  structured-data checks in B specs would only see desktop's. `accessibility.spec.ts` runs axe over every route on mobile
  and would show a duplicate heading, which is why it stays on both.
- **Tags can drift.** A tagged test is skipped on mobile with no sign at the test. The registry is read in review and the
  CI mobile count makes shrinkage visible; tags are limited to mixed files.
- **Self-sized specs lose device emulation** (touch, 2.6 DPR, `meta viewport`). Scenario 2 is a judgement; ship scenario 1
  first and trial scenario 2 for a fortnight.
- **Sharding.** Test-count slices put whole heavy files in one shard. Weights (`PWTEST_SHARD_WEIGHTS`) exist in 1.64 but
  are an undocumented environment variable; a matrix by project (`--project=desktop --shard=1/2`, and so on) is
  supported and easier to tune.
- **Numbers are local and partly contended.** Windows, one machine, 10 workers; visual timings use the missing-baseline
  path. The direction is reliable, the minutes are not.
- **Visual baselines are not touched**, so the "Update visual baselines" workflow is not needed for any of this.

## Proposed follow-up tasks

| #   | Title                                          | What                                                                                                                                                                                                           | Why                                                                                         | Files                                                                    | Size |
| --- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---- |
| 1   | Record per-test timings in CI                  | Add the JSON reporter in CI, upload it, and print spec and shard totals in the job summary.                                                                                                                    | These numbers are local. CI minutes are what costs sessions.                                | `playwright.config.ts`, `.github/workflows/ci.yml`                       | XS   |
| 2   | Load the Studio brand preview once per scheme  | Replace the per-test `beforeEach` navigation with a serial group per scheme, or a shared page, keeping every assertion.                                                                                        | 26% of worker time; about 70% of each test is the repeated page load.                       | `tests/e2e/studio-brand-preview.spec.ts`                                 | S    |
| 3   | Scope specs to the projects they need          | Add `tests/e2e/project-scope.ts`, wire `testIgnore` and `grepInvert`, move Tier A and B into it, tag the 50 hero tests, remove now-redundant `isMobile` skips, document it in the README. Unlisted stays both. | 14% of worker time, 306 fewer tests, no more phantom tests in shard counts.                 | `playwright.config.ts`, `tests/e2e/project-scope.ts`, specs, `README.md` | M    |
| 4   | Leave `.next/cache` out of the server copies   | Filter the cache folder in `cpSync`.                                                                                                                                                                           | 9 s per copy locally, two copies in each of seven runs; the cache is never read.            | `scripts/e2e-copy-build.mjs`                                             | XS   |
| 5   | Cap image decoding in the visual specs         | `Promise.race` each `img.decode()` against 5 s in `settle()`.                                                                                                                                                  | A hang costs 30 s twice per test; the 23 October one cost 360 s.                            | `tests/e2e/visual.spec.ts`                                               | XS   |
| 6   | Rebalance the CI shards                        | After task 3, choose a split by project (for example desktop 1/2, 2/2, mobile 1/1) or by weights, with Lighthouse on the lightest. Check the shares from task 1.                                               | Scenario 3 is within 5% of even; the unfixed split leaves shard 2 at 32 to 33%.             | `.github/workflows/ci.yml`                                               | S    |
| 7   | Run the isolated projects in one command in CI | Make the isolated projects depend on `desktop` and `mobile` only outside CI so one `playwright test --project=experiments --project=design --project=design-visual` keeps the order.                           | Three builds and startups (66 to 180 s each locally) for 171 s of tests.                    | `playwright.config.ts`, `.github/workflows/ci.yml`                       | S    |
| 8   | Start the extra test servers only when needed  | Start the ports 3101 and 3102 servers only when the run includes `enquiries` or `prelaunch-gate`, for example behind an `E2E_SERVERS` variable set by the workflow.                                            | Every run copies the build and starts two servers that most runs never call.                | `playwright.config.ts`, `.github/workflows/ci.yml`, README               | M    |
| 9   | Find the best worker count for CI              | Run one shard at `--workers` 2, 3 and 4 and compare.                                                                                                                                                           | Local results show a knee at about 6; CI runners are smaller and unmeasured.                | `.github/workflows/ci.yml`                                               | XS   |
| 10  | Diagnose the failing events tests              | Find why the repeating event still lists its skipped day (10 November 2026) in three `events.spec.ts` tests; if it is the clock, make the fixture date-independent.                                            | Three tests failed in the 27 October run; a failure costs a retry and hides real ones.      | `tests/e2e/events.spec.ts`, `tests/e2e/fixtures/dataset.mjs`             | S    |
| 11  | Reuse one build across the CI shards           | Build once, upload `.next` (without the cache), and download it in each shard and the isolated job.                                                                                                            | Eight builds per pipeline; saves most of the fixed cost per shard. Needs task 1 to size it. | `.github/workflows/ci.yml`, `playwright.config.ts`                       | M    |

Suggested order: 1, 2, 4, 5 (small, independent, measurable), then 3 with 6, then 7 to 9, and 11 only if task 1 shows
the build is the largest fixed cost.

## Reproducing

```sh
# Timings (JSON reporter). Visual specs skip off Linux; E2E_VISUAL_ANY_OS=1 times them but they fail without baselines.
PLAYWRIGHT_JSON_OUTPUT_NAME=run.json npx playwright test --reporter=json
# Uncontended cost of one spec
npx playwright test studio-brand-preview --project=desktop --workers=1
```

Running visual specs on Windows writes `*-win32.png` files into the snapshot folders. They are git-ignored; delete them
afterwards.
