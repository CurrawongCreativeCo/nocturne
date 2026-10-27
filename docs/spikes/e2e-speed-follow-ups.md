# End-to-end speed: approved follow-ups, results

27 October 2026. Follows [e2e-speed.md](e2e-speed.md). The local results below were written on the spike branch; the
CI results at the end are from GitHub Actions. Merged: timing instrumentation, the stale data-cache fix and the bounded
image decode (pull requests #123 and #124). Not merged: the `.next/cache` copy exclusion (dropped, see the end).

## Read this first

- **Local numbers are Windows runs; the CI section at the end is the evidence that counts.**
- **One claim in the spike was wrong.** It said excluding `.next/cache` saves 9 s per copy. It does not (see change 4).

## Unit-test count: 2,996 versus "more than 4,000"

| Branch / commit                              | Test files | Tests         |
| -------------------------------------------- | ---------: | ------------- |
| `main` (`fda1873`)                           |        260 | 2,980         |
| This branch at the start (`30aa364`)         |        264 | 2,996 (+16)   |
| This branch now (after the timing tests)     |        265 | 3,004 (+8)    |
| Playwright, local run: passed / total listed |          — | 1,891 / 2,365 |

- The branch is 16 unit tests ahead of `main`, in five files: `consent-reveal`, `frame-picture`, `frame-mask`,
  `lighthouse-config` and `postcss-container-frames`. Nothing was deleted, and `vitest.config.ts` includes the same
  globs on both.
- I found no source for "more than 4,000" in the repository, the changelog, the docs or the cached logs. The nearest
  figure is unit plus end-to-end (2,996 + 1,858 passed = 4,854), and a count that mixes the two would explain it. **The
  correct unit baseline is 2,980 on `main` and 2,996 on the branch.** If the 4,000 came from another branch or a
  different command, I need that name to compare.
- The `main` count was taken in a throwaway worktree (removed afterwards). Three tests there fail because generated
  files did not match under this machine's CRLF checkout; that is environmental and not related to the count.
- I did not touch any unrelated file for the CRLF format warnings. `npm run check` still reports the same 11 files
  (including `ci.yml`, which already failed before my edit), so `format:check` stays red on Windows for reasons that
  predate this work.

## Change 1: CI timing instrumentation (`daa7cfc`)

- **What.** The CI reporter adds a JSON report per job (`E2E_TIMINGS_FILE`), each job uploads it, and a new
  `e2e-timings` job (never fails the pipeline) writes a step summary: wall time, build-and-server startup (time before
  the first test), test phase, worker time, ran/skipped/failed/flaky/retried, the slowest job, the slowest tests, time
  by spec and project, and each workflow job's duration from the Actions API. `scripts/e2e-timings.mjs` does the work and
  has 8 unit tests; I ran it over the real local reports.
- **Before / after CI time.** None to report: this adds a ~1 minute job in parallel and 6 small uploads. It should not be
  on the critical path, but only a CI run can confirm that.
- **Tests.** Unit 8 new, all pass. The script was run against two real reports.
- **Reliability.** No test changes. The `e2e-timings` job has `continue-on-error`, and the download and API calls fall
  back to empty. The `gh run download` step relies on `actions: read` on the job's token.
- **Retain?** Yes, and push it first.
- **Risks.** I could not run the workflow here, so the YAML is parsed but unexecuted. A first CI run may need a fix to
  the summary step. `playwright.config.ts` now writes `e2e-timings/` in CI (git-ignored).

## Change 2: the three recurring-event failures (`f2e65b8`)

- **Cause, with evidence.** The fixture dates its events from the day the suite runs, which is intended. But Next.js
  keeps cached Sanity responses in `.next/cache/fetch-cache`, which survives between builds. My build reused responses
  cached on 22 October (the folder's files were dated then), so the site showed the club's first Tuesday as skipped
  while the test, using today's dates, expected the skipped day a week later. Not a flaky test and not a product bug.
- **Proof.** Failing: the three tests failed again on a re-run. Moving only `fetch-cache` aside: all 68 events tests
  passed on both projects. Putting the stale folder back with the fix applied: 68 pass again, and the folder's files are
  dated today (it was rebuilt).
- **Fix.** `scripts/e2e-clear-data-cache.mjs` deletes `fetch-cache` before the Playwright build. No assertion changed.
- **Before / after.** Local: 3 failures to 0 (full run, 1,891 passed, 0 failed). CI: CI starts clean, so I expect it
  never saw this; the change has no CI timing effect.
- **Reliability.** Better for local runs, neutral for CI. Compiler caches are kept, so builds stay quick.
- **Retain?** Yes.
- **Risks.** The Lighthouse server (`scripts/e2e-server.mjs`) builds the same way and does not clear the cache; its pages
  do not use dated events, so I left it. Any future clock-dependent fixture is covered by the same clear.

## Change 3: bounded image decoding (`9957aa2`)

- **What.** `tests/e2e/settle.ts` is one shared wait for pictures and fonts, replacing three copies (`visual.spec.ts`,
  `design-settings-visual.spec.ts`, `link-list-glass.spec.ts`). Each picture and the fonts get 10 s. A timeout throws
  an error that names the pictures and points at the `page.route` stubs. A picture that answers with an error still
  settles, as before, and the screenshot shows it missing. `framed-image.spec.ts` keeps its own `decode()`, which is the
  assertion itself.
- **Tests.** `settle.spec.ts` (3 tests, desktop only): loads, answers with a 404, and never answers. The third fails in
  0.5 s with the message naming `http://pictures.test/never.gif`. Passing locally. The first version of that test hung
  because `setContent` waits for the load event, which a never-answered picture blocks; fixed by waiting for
  `domcontentloaded`.
- **Regression check.** `visual.spec.ts` (306 tests), `link-list-glass` and `design-settings-visual` ran with
  `E2E_VISUAL_ANY_OS=1`: zero "did not finish loading" errors. Their failures were the expected missing Windows
  baselines (the `-win32.png` files they wrote were deleted).
- **Before / after.** A hang used to cost 30 s per attempt, 60 s with the retry. It now costs 10 s, 20 s with the retry:
  for the 23 October incident (6 tests) that is about 360 s of worker time down to about 120 s. This is arithmetic from
  the limits, not a CI measurement.
- **Reliability.** The wait can now fail where it used to hang; it cannot hide a picture that does not load, because a
  timeout is an error. A slow CI runner needing more than 10 s per picture would now fail; the first CI summaries will
  show the slowest settle.
- **Retain?** Yes.
- **Risks.** 10 s is a judgement. Tighten it later with real timings. The Linux baselines were not run here, so a run
  on Linux (the "Update visual baselines" workflow or CI) is the real check of the visual specs.

## Change 4: leave `.next/cache` out of the server copies (`3dad846`)

- **Measured, like for like (Windows).**

  | Step                                       | Before          | After                             |
  | ------------------------------------------ | --------------- | --------------------------------- |
  | One copy (`e2e-copy-build.mjs`)            | 18.2 s (3 runs) | 17.1 s (3 runs)                   |
  | Size of each copy                          | 1.8 GB          | 177 MB                            |
  | Build and servers, enquiries+prelaunch run | 72.2 s          | 69.1 s (56.9 s on an earlier run) |
  | Removing the previous copy (alone)         | —               | 11.8 s; copying 5.2 s             |

  The saving is about 1 s per copy, inside run-to-run noise (the startup measurement varied by 15 s). Windows spends its
  time deleting the previous copy, which scales with file count, not bytes. **The spike's "15 s down to 6 s" was a copy
  into an empty folder against a copy over an old one; ignore it.**

- **Server modes verified.** `enquiries`, `prelaunch-*` and `site-info` on desktop and mobile: 110 ran, 0 failed, with
  and without the change.
- **Reliability.** The copies now start with a clean data cache. Nothing in the specs depended on the copied cache.
- **Retain?** Neutral. It is safe and saves about 3 GB of disk writes per run, but it does **not** meaningfully speed
  anything up on this machine. Linux CI may differ (faster deletes, so the byte saving could show), which only the
  baseline can tell. I would keep it only if CI shows a gain; otherwise drop this commit.
- **Risks.** None found.

## Change 5: shared page for the brand preview (experiment, not applied)

One group, Currawong classic in the light scheme (4 tests: axe, contrast, keyboard focus, primary-button colour), run
two ways, desktop, one worker, 3 repeats. The experiment spec was temporary and is not committed.

| Measure                                       | A: a page per test (today)                                                    | B: one shared page, serial                                                          |
| --------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Time for the group, uncontended               | 26.9 s                                                                        | 9.3 s (**-65%**)                                                                    |
| Tests passing (3 repeats)                     | 12 of 12                                                                      | 12 of 12                                                                            |
| One injected failure (test 2 of 4), retries 1 | Failing test retried alone (7.1 s + 7.2 s); the other 3 pass and are reported | Failure retried by rerunning the whole group; tests 3 and 4 **never ran** (skipped) |
| Artifacts on failure                          | Trace + error context per test                                                | Framework trace shows an empty page; I had to attach a screenshot by hand           |
| Setup                                         | None                                                                          | Own browser context with the project's options copied across                        |

- **Isolation.** Passing run: no coupling visible. The focus test blurs and focuses elements, so order matters, and
  the serial mode needs the order kept.
- **Why it costs reliability.** One failure hides the results of the later checks in its group (here the focus and
  colour checks), and a retry repeats the group's setup. axe also refuses a page from `browser.newPage()`, so the page
  needs `browser.newContext()` with `baseURL`, `storageState`, `reducedMotion` and viewport copied, plus the device
  options on mobile. That copy can drift from the project config.
- **Scale.** This group type is 6 groups of 4 (24 of 58 tests per project). At -17.6 s a group, about 106 s of the
  493 s one worker needs per project (21%), not the 70% the spike assumed for the whole file. Contended numbers were
  not measured.
- **Recommendation: do not apply to the remaining tests.** The gain is real but the loss of per-test results,
  diagnostics and the retry cost fail your "no reduction in reliability" test. Two alternatives are better to try next:
  (a) let the preview page render only one case and scheme via a query string, so each test stays isolated and
  cheaper (not tried, changes the test page); (b) only if (a) is rejected, share the page for the read-only axe checks
  alone, with `expect.soft` so one failure does not hide the rest.

## Local full run, before and after the five changes

| Run                           | Wall    | Build + servers | Test phase | Worker time | Passed | Failed |
| ----------------------------- | ------- | --------------- | ---------- | ----------- | -----: | -----: |
| Before (spike run 1)          | 1,044 s | 180 s (cold)    | 826 s      | 7,588 s     |  1,858 |      5 |
| After (all changes, this run) | 901 s   | 84 s (warm)     | 811 s      | 6,512 s     |  1,891 |      0 |

Not a controlled comparison: the first run had a cold build cache, and the isolated projects ran this time (they were
skipped by dependency failures before), so the test phase is the fair figure (-2%, within noise). The extra passes
are the `settle` spec (3) and the isolated projects. Visual specs skip on Windows in both. **Linux visual baselines have
not been refreshed or run here**; the "Update visual baselines" workflow or CI is where they run.

## CI results (27 October 2026)

Two comparable runs of the same code (the fixes added a no-op cache clear in CI and a decode cap), on GitHub's
`ubuntu-latest`, from the `e2e timings` summary of each run:

| Shard (wall / build + servers / tests)          | Run A (fixes PR)     | Run B (timings PR, re-run) |
| ----------------------------------------------- | -------------------- | -------------------------- |
| 1                                               | 352 / 51 / 301 s     | 519 / 77 / 442 s           |
| 2                                               | **992** / 74 / 919 s | **760** / 59 / 701 s       |
| 3                                               | 468 / 75 / 393 s     | 395 / 62 / 333 s           |
| 4                                               | 511 / 55 / 456 s     | 598 / 60 / 537 s           |
| isolated (design-visual / design / experiments) | 155 / 101 / 84 s     | 138 / 88 / 63 s            |

- **Slowest shard:** shard 2 in both runs, which also holds the biggest share of the work (1,807 s of 4,046 s of worker
  time in run A, 1,377 s of 3,934 s in run B).
- **Failures and retries:** none in either run. No flaky tests, nothing unmeasured.
- **Visual tests:** passed against the existing baselines in both runs. No baseline was regenerated.
- **Variation:** the same shard moved by up to 50% between runs (shard 1: 352 s to 519 s), in both directions. One
  attempt also lost 335 s to a slow Chromium install and hit the 20-minute job limit (a re-run passed). Build and
  server startup was 51 to 77 s per shard. Two runs cannot show an effect of a few seconds.
- **Critical path:** `e2e (2/4)` took 1,056 s of the 1,200 s job limit in run A.
- **Missing versus zero:** the summary printed "n/a" for a measurement it did not have, and a report that arrives with
  no tests no longer appears as a job (fixed in `cfa256f`: a re-run had left the previous attempt's summary artifact
  to be read as a job).
- **Uploaded data:** reports are slimmed to durations and statuses (about 16 to 19 KB per job, no config, errors or output).
- **Formatting:** the Linux `check` job passed `format:check`; the Windows warnings were line endings only.

### Decisions

- **Change 4 (`.next/cache` exclusion): dropped, not merged.** Startup varies by about 25 s across shards in one run,
  against roughly 1 s saved locally. CI cannot show a benefit that small, and no operational reason justified it.
- **The pending `e2e` check** that never reported came from a ruleset still requiring a job named `e2e`, which was
  split into `e2e (n/4)` on 16 October. It was updated in the repository's ruleset; no code was involved.
- **Brand-preview shared page:** rejected. No further brand-preview work is planned.

### Observations (no work started)

- Shard 2 carries 45% of the worker time because the heaviest files (`studio-brand-preview`, `visual`,
  `studio-brand-visual`) fall in the same contiguous slice.
- Its job can approach the 20-minute limit on a slow day.
- Project scope, shards, workers, conditional servers and shared builds remain deferred until there is a demonstrated need.
