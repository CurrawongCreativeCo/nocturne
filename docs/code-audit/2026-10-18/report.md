# Code audit, 18 October 2026

Template repository at `a2e0a91` (main, after PR #62 and #63), audited on branch `audit/code-audit-2026-10-18`.
Read-only apart from the small fixes listed in [Fixes made on this branch](#fixes-made-on-this-branch).

## Summary

**Overall health: good, with a handful of sharp edges.** The fundamentals are strong: TypeScript strict with
`noUncheckedIndexedAccess`, no `any`, no `@ts-expect-error`, no non-null assertions, ESLint `strict-type-checked`
plus jsx-a11y `strict` and enforced feature boundaries, every Sanity read through one `'use cache'` boundary,
signed webhooks with constant-time comparison, embeds rebuilt from parsed ids, and a large test suite (2,371 unit
tests, about 2,000 end-to-end tests). axe found **no WCAG 2.2 AA violations** on any of the 144 section gallery
entries or the extra pages checked, and all 62 sitemap URLs have exactly one `<h1>`.

The problems found are mostly **in the seams**: a cache tag missing from one fetch, a webhook filter that drifted from
`TAGS`, a "Try again" button that can't retry, a Prettier plugin that silently glued two classes together, and tests
that weren't running or couldn't pass. **CI's end-to-end job was red on main**: one test always failed (and, in a
local run, kept 53 tests in three dependent projects from running), and 13 visual baselines are missing.

### Top 10

| #   | Severity | Finding                                                                                                                     | Status                                    |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | High     | [S-1](#s-1) Open redirect: `/api/draft-mode/disable?redirect=/%5Cevil.example` sends visitors off-site                      | Open, 2-line fix                          |
| 2   | High     | [C-1](#c-1) Webhook mode: a Stripe price change never reaches pages with a pricing table (`stripePrice` tag missing)        | Open, 1-line fix                          |
| 3   | High     | [C-2](#c-2) Webhook mode: A/B tests never start or stop (README webhook filter lacked `experiment`)                         | **Fixed** (docs); guard test proposed     |
| 4   | High     | [T-1](#t-1) CI e2e red on main: the "stays put" background test always failed                                               | **Fixed**                                 |
| 5   | High     | [T-2](#t-2) Real bug behind it: a "stays put" background was never clipped to its section                                   | **Fixed** (one-character fix)             |
| 6   | High     | [T-3](#t-3) Thirteen visual baselines are missing (custom gradient, Glass rows), so the Linux visual tests fail             | **Manual**: run "Update visual baselines" |
| 7   | High     | [T-4](#t-4) Three unit test files (33 tests) never ran; one had gone stale                                                  | **Fixed**                                 |
| 8   | Medium   | [E-1](#e-1) "Try again" on the error pages calls `reset()`, which doesn't refetch, so it can't recover from a Sanity outage | Open, small                               |
| 9   | Medium   | [D-1](#d-1) AI Assist "Write meta description" points at a field that doesn't exist (`sections`, not `pageBuilder`)         | Open, 1-word fix                          |
| 10  | Medium   | [P-1](#p-1), [P-2](#p-2) JS budget: the test counts 39.5 KB modern browsers skip, and misses 39 KB live mode adds           | Open, plan below                          |

### What to do first

1. **Today, small:** fix S-1 (use the existing `safePath`), C-1 (add `TAGS.stripePrice`), E-1 (`retry`) and D-1
   (`pageBuilder`). Each is a one-to-three-line change with a test; they were left as findings because they change
   behaviour.
2. **Make CI green:** merge this branch, then run the **Update visual baselines** workflow for the 13 missing
   baselines (T-3).
3. **Guard the drift:** a unit test that the README webhook filter lists every `TAGS` value (C-2), and the Prettier
   pitfall in [Q-1](#q-1).
4. **Plan:** the JavaScript budget work (P-1, P-2: the test overcounts by 39.5 KB, while live mode adds 39 KB it
   never sees), a Content Security Policy for the public site (S-2) and adopting Partial Prefetching (P-3).
   Proposed tasks are at the end.

---

## How the audit was done

| Tool                                | Version               | Used for                                                                                                            |
| ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npx knip`                          | 6.41.0                | Unused files, exports, types and dependencies (`--reporter compact`, no config)                                     |
| `npx next analyze`                  | 16.4.2 (in repo)      | Module graph, to trace who imports what (its chunk names differ from a real build's, so not used for sizes)         |
| One-off source-map build            | Next 16.4.2           | Home page chunk sizes by source: temporary, uncommitted `productionBrowserSourceMaps`, built into a scratch dir     |
| `@axe-core/playwright` + Playwright | 4.13 / 1.64 (in repo) | Ad-hoc axe sweep (WCAG 2.2 AA tags) of the section gallery and pages the a11y spec doesn't list, at 1280 and 390 px |
| `npm run check`, `npm run test:e2e` | in repo               | Baseline before any change, and again after the fixes                                                               |
| grep, Node one-off scripts          |                       | Casts, `'use client'`, `server-only`, `catch`, cache tags, US spellings, URL parsing checks                         |

No dependency was added to `package.json`. Nothing called the Sanity CLI or a real project: the e2e build used the
`e2etest1` placeholder and the fake Content Lake. One-off scripts lived in `node_modules/.cache/audit` (git-ignored).

**Baseline before changes:** `npm run check` passed (213 files, 2,338 tests). `npm run test:e2e`: 1,567 passed,
**2 failed** (T-1 on desktop and mobile), 381 skipped (visual baselines on macOS, device-only tests), **53 did not
run** (the `experiments`, `design` and `design-visual` projects depend on `desktop` and `mobile` passing).

**After the fixes:** see [Verification](#verification).

---

## Findings

Severity: **Critical** (exploitable now or data loss), **High** (wrong behaviour users or editors will meet, or a
red CI), **Medium** (a real defect with a workaround, or risk that grows), **Low** (hygiene). Size: **Small**
(under a day), **Medium** (a few days), **Large** (a week or more).

### 1. Architecture

**Checked:** ESLint boundary zones (`eslint.config.mjs:43-48`, `125-150`) and that lint passes with no
boundary-related `eslint-disable`; every `'use client'` module (58) and what it imports; every module reading a
secret-looking env var and whether it imports `server-only`; the token import guard.

**Found:** the boundaries hold. No feature imports another, shared code imports no feature, and the only
`eslint-disable` comments are for jsx-a11y and `no-img-element` with reasons. `src/proxy.ts` and
`sanity.config.ts` import features, as composition roots may. Every module holding a token (`token.ts`,
`write-client.ts`, `edge-config-sync.ts`, `live.ts`, `auth.ts`) imports `server-only`, and
`token-import-guard.test.ts` walks the import graph from every client module. Client components are leaf-sized;
the big ones (`slider.tsx`, `overlay.tsx`, `contact-form.tsx`) are behind `next/dynamic` wrappers.

<a id="a-1"></a>**A-1 · Low · `safePath` lives in the auth feature but is generic**
Evidence: `src/features/auth/utils/safe-path.ts:8`; the draft-mode route re-implements a weaker check at
`src/app/api/draft-mode/disable/route.ts:8` (see S-1).
Why: shared logic in a feature can't be reused by shared code or other features, so it gets re-written.
Fix: move it to `src/lib/safe-path.ts` (with its test) and import it from both places. Size: Small.

<a id="a-2"></a>**A-2 · Low · Secret-reading modules without `server-only`**
Evidence: `src/lib/styleguide-access.ts:32` (`STYLEGUIDE_PREVIEW_TOKEN`); the forms, newsletter and pricing configs
read secrets through an `env` parameter (`src/features/forms/utils/config.ts:31`).
Why: Next only inlines `NEXT_PUBLIC_*` into browser code, so nothing leaks today. `server-only` would make an
accidental client import a build error instead of a silent `undefined`.
Fix: add `import 'server-only'` to the config modules that no client component imports. Size: Small.

<a id="a-3"></a>**A-3 · Low · `sanityFetch` is exported**
Evidence: `src/lib/sanity/live.ts:23`. Nothing outside `live.ts` uses it.
Why: the README rule is "every read through `cachedSanityFetch`". An exported `sanityFetch` is one auto-import away
from an uncached fetch.
Fix: export only `SanityLive` from that destructure (keep `sanityFetch` module-private). Size: Small.

### 2. Dead code

**Checked:** knip 6.41.0 over the whole repo; every GROQ fragment in `src/lib/sanity/fragments.ts`; the
`settings` fallback in `SETTINGS_QUERY`.

**Found:** little real dead code. knip's six "unused files" are false positives: `scripts/e2e-server.mjs` (used by
`lighthouserc.json:4`), `scripts/make-default-icons.mjs` (run by hand, README:230),
`src/lib/sanity/schema/placeholder-thumbnail.tsx` (imported by generated sections,
`scripts/section-templates.mjs:15`), and the three `.test.tsx` files (T-4). Every GROQ fragment is used. knip
reported no unused dependencies.

<a id="dc-1"></a>**DC-1 · Low · 60 exports and 25 exported types used only in their own file**
Evidence: knip output, for example `src/components/motion/motion-elements.tsx` (`MotionSection`, `MotionArticle`,
`MotionUl`, `MotionFigure`), `src/features/studio/roles.ts` (`audienceFor`, `isClientEditor`, `isContributor`),
`src/lib/sanity/fragments.ts` (`statsBarFields`, `badgeRowFields`, `logoRowFields`, used only inside the file),
`src/features/studio/actions/confirm-delete-page.tsx` (`ConfirmDeletePage`).
Why: unused exports widen the public surface and hide truly dead code. Some (the motion wrappers) are a deliberate
kit for client projects.
Fix: drop `export` where nothing outside uses it; keep the motion kit and mark it in a comment; add a `knip.json` so
the generators' templates and manual scripts stop showing as false positives. Size: Small.

<a id="dc-2"></a>**DC-2 · Low · Two unlisted dependencies**
Evidence: `scripts/postcss-container-frames.mjs` imports `postcss`; `src/lib/sanity/schema/auto-alt-text.test.ts`
and `image-field.test.ts` import `@sanity/schema`. Neither is in `package.json`; both resolve through other packages.
Why: a dependency update that drops them breaks the build or the tests without a clear reason.
Fix: add both as devDependencies (a dependency change, so not done here). Size: Small.

<a id="dc-3"></a>**DC-3 · Low · Legacy `settings` fallbacks are still read**
Evidence: README:3262-3266 ("Once every dataset has been migrated, delete the `settings` fallbacks"),
`migrations/split-site-settings`.
Why: expected while client datasets migrate; listed so it isn't forgotten.
Fix: once the Ops dashboard confirms every client dataset has run the migration, remove the fallbacks and the
migration folder. Size: Small.

### 3. Duplication

<a id="du-1"></a>**DU-1 · Low · A second WCAG contrast implementation, with a different threshold**
Evidence: `src/features/studio/qr-code/qr-code.ts:50-62` (`luminance` with `0.03928`, its own `contrastRatio`)
versus `src/lib/color/contrast.ts:4-20` (`0.04045`).
Why: two formulas for one rule can disagree near the boundary, and the QR one has no shared tests.
**Keep `src/lib/color/contrast.ts`**; have `qr-code.ts` import `relativeLuminance` and `contrastRatio`. Size: Small.

<a id="du-2"></a>**DU-2 · Low · The 4.5:1 and 3:1 thresholds are defined four times**
Evidence: `src/features/site/utils/resolve-design-tokens.ts:27-28`, `src/features/styleguide/utils/token-contrast.ts:7-8`,
`src/config/studio-brand/resolve.ts:15-16`, `src/features/studio/qr-code/qr-code.ts:16`.
Fix: export `TEXT_CONTRAST = 4.5` and `UI_CONTRAST = 3` from `src/lib/color/contrast.ts` and import them. Size: Small.

<a id="du-3"></a>**DU-3 · Low · Three components render their own modal `<dialog>`**
Evidence: `src/components/ui/overlay/overlay.tsx:148`, `src/features/search/components/quick-search-dialog.tsx:111`,
`src/features/pages/components/sections/gallery/lightbox.tsx:66`. All three share `useModalDialog`
(`src/components/ui/overlay/use-modal-dialog.ts`), so focus trapping, scroll lock and focus return are already one
implementation; the backdrop-click and markup are repeated.
**Keep `Overlay` + `useModalDialog`.** The duplication is small and each has a different layout, so this is only worth
doing if a fourth dialog appears. Size: Medium.

<a id="du-4"></a>**DU-4 · Low · Two guards for the style guide's pages**
Evidence: `src/app/section-gallery/stats-bar/page.tsx:43` and `src/app/studio-brand-preview/page.tsx:31` check
`NODE_ENV`/`E2E_GALLERY` directly; `/section-gallery` and `/section-gallery/tokens` use `requireStyleguide()`
(`src/app/section-gallery/guard.ts:17`).
Why: on a Vercel preview with `STYLEGUIDE_PREVIEW_TOKEN`, the gallery opens but the stats-bar page under it
answers 404.
Fix: use `requireStyleguide()` + `requireStyleguideToken()` on the stats-bar page (the brand preview may stay
stricter on purpose; say so in a comment). Size: Small.

Link resolvers (`resolve-link.ts` / `resolve-basic-link.ts`) and section wrappers were checked: the link split is
deliberate (keeps client components small), and every section renders through `SectionFrame` (the `index.tsx`
files without it are variant dispatchers).

### 4. Type safety

**Checked:** every `any`, `as`, non-null assertion and `@ts-expect-error` / `@ts-ignore` outside tests and generated
files; hand-written types in `src/types` and `src/features/*/types`.

**Found:** **zero** `any`, `@ts-expect-error`, `@ts-ignore` or non-null assertions. Feature types are all derived
from the generated `*_QUERY_RESULT` types. `src/features/pricing/types/index.ts` is hand-written, correctly: it
describes documents the Stripe webhook writes, not query results.

There are 208 `as` casts outside tests. By kind:

| Kind                                                                                                                    | Count (approx.) | Justified?                                       |
| ----------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------ |
| Studio schema callbacks: `parent`, `document`, `value` and `useFormValue()` are `unknown` in Sanity's types             | ~150            | Yes. A typed helper would remove most (see TS-2) |
| CSS custom properties in `style` (`as CSSProperties`)                                                                   | 8               | Yes: React's type has no custom properties       |
| Token tuples (`as [number, number, number, number]`, `src/components/motion/presets.ts:22`)                             | 5               | Yes: JSON imports widen to `number[]`            |
| DOM events (`event.target as Element`, `src/features/site/components/mobile-menu.tsx:26`)                               | 5               | Yes                                              |
| Lookup tables indexed by a string (`src/lib/sanity/schema/section-variant.ts:40`)                                       | ~10             | Yes, each falls back on `undefined`              |
| Query data cast to a component prop type                                                                                | 4               | **No**, see TS-1                                 |
| `response.json() as Promise<{ results: SearchResult[] }>` (`src/features/search/components/quick-search-dialog.tsx:79`) | 1               | Acceptable: our own route's response             |

<a id="ts-1"></a>**TS-1 · Low · Link list images are cast to `SanityImageData`**
Evidence: `src/features/pages/components/sections/link-list/link-list-parts.tsx:76`, `:184`, `:202`,
`src/features/pages/components/sections/link-list/glass-row.tsx:39`.
Why: `SanityImageData` (`src/types/sanity.ts:15`) is documented as "any query that spreads the fragment satisfies
it", so a cast means the generated type differs and the cast hides how. A schema change could make the cast lie.
Fix: find the mismatch in `PAGE_QUERY_RESULT` for `linkList` and fix the projection or widen the structural type.
Size: Small.

<a id="ts-2"></a>**TS-2 · Low · Schema callbacks repeat the same casts**
Evidence: `src/lib/sanity/schema/section-form.ts` (13 casts), `src/lib/sanity/schema/heading-text.ts` (10),
`src/features/events/schemas/event.ts` (10), `src/features/pages/schemas/sections/video.ts` (9).
Fix: small typed helpers, for example `parentOf<T>(context)` and `useFormString(path)`, so each cast lives in one
place. Size: Medium.

### 5. Error handling

**Checked:** error boundaries and not-found pages, every `catch` block, server actions and route handlers.

**Found:** every empty or comment-only `catch` has a reason (storage blocked, fail-open proxy, Sentry must not break
error handling). `/api/search` answers 502 on a failure, the Stripe webhook answers 500 so Stripe retries, the
redirect sync answers 502 so Sanity retries. The site layout keeps the header and footer around page errors
(`src/app/(site)/error.tsx`), `global-error.tsx` covers layout failures, and `not-found.tsx` exists for `(site)` and
`/ab/[code]`.

**What a visitor sees when Sanity is slow or down:** published pages are prerendered and cached "forever", so
visitors keep getting the last good page. Only a cache miss (a new page, the first render after a publish) reaches
Sanity. If that fails, the page shows "Something went wrong" inside the site chrome, with a reference that matches
the server logs and Sentry.

<a id="e-1"></a>**E-1 · Medium · "Try again" uses `reset()`, which doesn't refetch**
Evidence: `src/app/(site)/error.tsx:14`, `:37`; `src/app/global-error.tsx:16`, `:39`. Next 16's docs
(`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`, "`retry`" and "`reset`") say
`reset()` re-renders without re-fetching and recommend `retry()` (stable since 16.3).
Why: the boundary's own comment says it's for "Sanity is unreachable". In that case `reset()` re-renders the same
failed result, so the button does nothing useful.
Fix: take `retry` instead of `reset` in both components, and add an e2e test that a failed page recovers once the
fake Content Lake answers again. Size: Small.

<a id="e-2"></a>**E-2 · Medium · Form and checkout actions throw when Sanity can't be reached**
Evidence: `src/features/forms/api/submit-form.ts:47` (`FORM_QUERY`) and `src/features/pricing/api/checkout.ts:50`
(`CHECKOUT_PRICE_QUERY`) await `cachedSanityFetch` outside any `try`.
Why: both actions otherwise return friendly error states. A failed read (the first send on a new server instance,
or after the form changed) throws into the error boundary instead, and the visitor loses what they typed.
Fix: wrap the read and return the existing "can't be sent right now" / `UNAVAILABLE` state; log the error. Size: Small.

### 6. Security

**Checked:** secrets and `server-only`; draft mode and preview routes; webhook signatures; server action input
validation; rate limits; headers and proxy; SVG handling; user-supplied URLs; embeds and iframes; the members-only
and test-mode gates.

**Found, and good:** the Sanity webhook verifies with `parseBody` before reading the body
(`src/app/api/revalidate/route.ts:31-35`); the Stripe webhook checks an HMAC over the raw body in constant time, with
a 5-minute replay window (`src/features/pricing/utils/stripe-signature.ts`); draft mode is enabled only through
`defineEnableDraftMode`; forms re-fetch their definition by id and validate only its fields, and checkout re-reads
the price, so the browser can't choose either; JSON-LD and inline scripts escape `<`; embeds rebuild the iframe
address from ids parsed against an allow-list, with narrow `sandbox` tokens (`src/config/embed-providers.ts`);
custom frame SVGs are used as CSS masks, never inlined; React 19 blocks `javascript:` URLs, and link schemas
validate schemes (`src/lib/sanity/schema/link.ts:71`); the style guide's preview token is compared in constant time.

<a id="s-1"></a>**S-1 · High · Open redirect in `/api/draft-mode/disable`**
Evidence: `src/app/api/draft-mode/disable/route.ts:7-9` accepts any `redirect` that starts with `/` but not `//`.
Checked with Node's URL parser: `/\evil.example` and `/<TAB>/evil.example` both resolve to `https://evil.example/`.
So `https://<site>/api/draft-mode/disable?redirect=/%5Cevil.example` is a link on the client's domain that lands
on any site, with no sign-in needed: a phishing aid.
Fix: `const path = safePath(request.nextUrl.searchParams.get('redirect'))` with the existing, tested helper
(`src/features/auth/utils/safe-path.ts`, whose tests already cover both bypasses), and a route test. Not fixed here
because it changes behaviour. Size: Small.

<a id="s-2"></a>**S-2 · Medium · No Content Security Policy on the public site**
Evidence: `next.config.ts:5-8` explains why there is no CSP (the Studio needs inline code). The site's own routes
already get a separate header set (`next.config.ts:23-26`, everything except `/studio`).
Why: a CSP is the second line of defence if editor content or a dependency ever injects a script. The public site
has a few known inline scripts (announcement bar, form attribution, analytics, tracking), which can be allowed by
hash because they are static per build.
Fix: start with `Content-Security-Policy-Report-Only` on the non-Studio routes (`script-src 'self'` + hashes +
the analytics hosts, `frame-src` from the embed providers, `img-src` `cdn.sanity.io`), collect reports, then
enforce. Size: Medium.

<a id="s-3"></a>**S-3 · Low · Test-mode switches rely on `VERCEL_ENV`**
Evidence: `src/features/forms/utils/config.ts:27-29`, `src/features/auth/utils/providers.ts:12`.
Why: on Vercel, production ignores `FORMS_TEST_MODE` and `AUTH_TEST_MODE`. On any other host `VERCEL_ENV` is unset,
so either variable would turn off the spam check or turn on password sign-in in production. Vercel is the only
supported host today (README, "Cloudflare (not supported yet)").
Fix: also require `NODE_ENV !== 'production'` or an explicit `E2E=1`, so the rule holds on any host. Size: Small.

<a id="s-4"></a>**S-4 · Low · Video and map iframes have no `sandbox`**
Evidence: `src/features/pages/components/sections/video/video-facade.tsx:32`,
`src/features/pages/components/sections/location/map-embed.tsx:36`.
Why: their addresses are rebuilt from parsed ids, so the risk is low, but the Embed section's providers all carry a
narrow `sandbox`. Consistency makes review easier.
Fix: add `sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"`
and test playback. Size: Small.

<a id="s-5"></a>**S-5 · Low · Checkout has no rate limit**
Evidence: `src/features/pricing/api/checkout.ts:29`. Contact and newsletter use `submissionLimiter` /
`newsletterLimiter` (`src/features/forms/api/rate-limiter.ts`).
Why: each POST creates a Stripe Checkout Session. It costs nothing but adds noise to the Stripe dashboard and
uses API rate limit.
Fix: a `checkoutLimiter` (for example 10 per IP per 10 minutes) in the pricing feature. Size: Small.

Accepted by design, not findings: the Viewer token reaches the browser only as `browserToken` in draft mode
(`src/lib/sanity/live.ts:27`, README "Dataset privacy"); the rate limiters are per server instance
(`src/features/forms/utils/rate-limit.ts:14-17` says so).

### 7. Accessibility

**Checked:** axe (WCAG 2.2 A/AA tags) over every section gallery entry (144) and `/section-gallery/tokens`,
`/section-gallery/stats-bar`, `/links`, `/link-glass`, `/links-photo`, `/links-pattern`, `/links-tiled`,
`/hero-parts` and `/parallax`, at 1280 and 390 px; `<h1>` count on all 62 sitemap URLs; by reading, focus
management in the overlays, the mobile menu, reduced motion, alt text and heading order.

**Found:** **no axe violations**, and exactly one `<h1>` on every sitemap URL. (The gallery has 48 by design: each
entry renders as a page's first section.) All three modal dialogs use native `<dialog>` with `showModal()` through
one binding that locks scroll and returns focus (`src/components/ui/overlay/modal-dialog.ts:38`). The mobile menu is
a `<details>` that closes on Escape and returns focus to its button (`src/features/site/components/mobile-menu.tsx:28-32`).
Motion runs through `MotionConfig reducedMotion="user"`, and hover lifts check `useReducedMotion()`. Decorative
layers are `aria-hidden` with empty alt.

No new accessibility findings. One gap is listed under _Not checked_: the dark Brand colours palettes were not swept
beyond what `design-settings.spec.ts` already covers.

### 8. Performance and caching

**Checked:** Cache Components setup (`next.config.ts`), the one `'use cache'` boundary
(`src/lib/sanity/live.ts:48-64`), every fetch's `tags` against the document types its query dereferences, request
count and waterfalls in the page route, images and fonts, and the home page's client JavaScript (below).

**Found, and good:** every Sanity read goes through `cachedSanityFetch` or (search only) `shortLivedSanityFetch`, with
`perspective` and `stega` passed explicitly (`strict: true`). Nothing reads `cookies()`, `headers()` or the clock
inside `'use cache'`. Unknown URLs are answered from the cached page index. Section data is folded into
`PAGE_QUERY`. Images use Next 16's `preload` (not the deprecated `priority`) only on the first section, and the font
is self-hosted by `next/font` with a size-adjusted fallback. Draft and published fetches share one function.

<a id="c-1"></a>**C-1 · High · Webhook mode: Stripe price changes never reach pages with a pricing table**
Evidence: `PAGE_QUERY` dereferences prices (`src/features/pages/api/sections.ts:176-182`, `price->`), but its
fetch tags (`src/features/pages/api/get-page.ts:45-55`) list `page`, `sharedSection`, `form`, `teamMember`, `frame`,
`event`, `eventCategory`, `businessInfo` and `panel`, **not `stripePrice`**. README:658 says the opposite ("a
`stripePrice` change expires the pages that show it, tagged `stripePrice`"). The webhook route expires only the tag
named after the document's type (`src/app/api/revalidate/route.ts:64`).
Why: when a price changes, is archived or is added in Stripe, the Stripe webhook writes the `stripePrice` document,
the Sanity webhook expires `stripePrice`, and no page entry carries that tag. Visitors keep seeing the old amount, or
a plan whose price no longer exists, until something else on the page is published. (Checkout itself re-reads the
price, so nobody can be charged a stale amount.) Live mode is unaffected: it uses per-document sync tags.
Fix: add `TAGS.stripePrice` to the list, plus a test (Task B). Not fixed here because it changes caching behaviour.
Size: Small.

<a id="p-3"></a>**P-3 · Medium · Partial Prefetching is not adopted yet**
Evidence: `next build` warned on every build that `partialPrefetching` was unset. `4901105` sets it to `false`
(what unset already meant), which silences the warning without changing anything. Next's docs
(`node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/partialPrefetching.md`) say both
features will be on everywhere in the next major, and the option removed.
Why: with `true`, Next prefetches one App Shell per route; every CMS page is the one `[[...slug]]` route, so links
across the site would share one prefetch. It also has to happen before the next major.
Fix: Task G. Size: Medium.

<a id="p-4"></a>**P-4 · Low · One `fetch` uses the pre–Cache Components `next.revalidate` option**
Evidence: `src/lib/ops/fetch-notices.ts:23` (`next: { revalidate: 300 }`). Next's "Migrating to Cache Components"
guide ("`fetch` cache options") says to move it into a `'use cache'` function with `cacheLife`.
Why: the five-minute cache may not apply, so each Studio Start here load can call the Ops dashboard. Only editors
cause it, so the load is small.
Fix: a small `'use cache'` function with `cacheLife({ revalidate: 300 })` around the request (not Sanity data, so it
doesn't conflict with the one-boundary rule for Sanity reads). Size: Small.

<a id="p-5"></a>**P-5 · Low · The page route reads Business info before the page**
Evidence: `src/app/(site)/[[...slug]]/page.tsx:97` awaits `getLocationBusiness` before `PageView` fetches the
page; `src/features/pages/api/get-page.ts:35-37` reads the page index before `PAGE_QUERY`.
Why: both are cached, so this costs nothing per visit; on a cache miss (build, after a publish) the reads run one
after another instead of together.
Fix: start `getLocationBusiness` without awaiting and pass the promise, or read it inside the Location section's
own render. Size: Small.

#### What is in the home page's JavaScript

Measured on a production build with the e2e environment (webhook mode, all three analytics providers on, so the
consent banner is included). Gzip level 9, 1 KB = 1000 B, as `tests/e2e/performance.spec.ts` counts.
Attribution comes from a one-off build with browser source maps (a temporary, uncommitted
`productionBrowserSourceMaps`), splitting each chunk's gzip size by its sources' share of the minified bytes, so
small entries are approximate.

| What                                                            |   KB gzip | Notes                                                               |
| --------------------------------------------------------------- | --------: | ------------------------------------------------------------------- |
| **`noModule` polyfills** (`<script noModule>`)                  |      39.5 | Counted by the test, **never downloaded by a modern browser** (P-2) |
| Next.js runtime and React                                       |     145.0 | Fixed cost                                                          |
| Motion (`motion-dom`, `framer-motion`, `motion-utils`)          |      16.7 | `LazyMotion` + `m`, in `MotionProvider` on every page               |
| Turbopack runtime                                               |       4.4 | Fixed cost                                                          |
| Consent banner, store, state and utils                          |       2.7 | Only when an analytics provider is set                              |
| `@vercel/analytics`                                             |       1.3 | `<Analytics />` in `site-shell.tsx:134`                             |
| Error boundaries (`(site)/error.tsx`, `global-error.tsx`)       |       1.2 |                                                                     |
| Site components (announcement bar, mobile menu, header bits)    |       1.1 |                                                                     |
| Page components (facades, lazy wrappers)                        |       1.0 |                                                                     |
| `next-sanity` + `@vercel/stega` + `@sanity/client` (stegaClean) |       0.9 | Only `announcement-bar.tsx:3` needs it                              |
| Pricing (`CheckoutButton` + its action stub)                    |       0.9 | On every page, though only pricing tables use it                    |
| Opening hours + Open now badge                                  |       0.9 |                                                                     |
| Search trigger, route progress, everything else                 |      ~2.9 |                                                                     |
| **Total in the HTML's `<script src>`**                          | **218.5** | of `JS_BUDGET_KB = 220`; **179.0** without the `noModule` polyfills |

In the browser, a further ~37 KB of lazy chunks load after first paint in both modes (Motion's `domMax` features and
similar), by design and outside the budget.

<a id="p-1"></a>**P-1 · Medium · A default (live mode) site loads 39 KB more than the budget test sees**
Evidence: the test build runs in webhook mode (`tests/e2e/constants.ts`, `SANITY_REVALIDATE_SECRET` set), so
`<SanityLive />` is not rendered for visitors (`src/app/(site)/site-shell.tsx:126-128`). Built and served in live
mode, the default, the same home page loads three extra chunks after hydration: **28.6 KB** (`@sanity/client` with its
EventSource listener, `next-sanity/dist/SanityLive.js`), **8.3 KB** and **2.0 KB**. That makes 256.5 KB in the browser
against 217.6 KB in webhook mode, and every page opens a connection to the Content Lake.
Why: the budget protects webhook mode, not the default a new site starts in. The cost is real on slow phones (the
Link page budget exists for exactly that visitor).
Fix: measure both modes in `performance.spec.ts` (Task E); consider loading `SanityLive` for visitors only after
the browser is idle, or recommending webhook mode for production sites with a performance budget (README "Live mode
vs. webhook mode" already lists the trade-offs). Size: Medium.

<a id="p-2"></a>**P-2 · Medium · The budget test counts a polyfill chunk modern browsers skip**
Evidence: `tests/e2e/performance.spec.ts:28` takes every `<script src>`, including
`<script src="/_next/static/chunks/0cz1d0mv5g_q7.js" noModule="">` (39.5 KB of the 218.5 KB). Browsers that run ES
modules never fetch a `noModule` script.
Why: the budget is 39.5 KB stricter than what visitors download, which is why it looks full: the README's "a new
client-side dependency of even 2 KB trips it" is true of the test, not of what visitors load.
Fix: skip `noModule` scripts in the test (one regex change) and decide, in the same pull request, whether
`JS_BUDGET_KB` should go back towards 200 so the real headroom stays deliberate. **Not changed here:** it moves the
budget, which is a decision. Size: Small.

**At least 10 KB to win back** (from the 179 KB a modern browser loads in webhook mode; each needs its own change and a
re-run of the performance, memory and Lighthouse checks):

| Change                                                                                                                                                                                                                                                                 | Saves (KB) | Size   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------: | ------ |
| Section reveals in CSS (`@starting-style` / `animation-timeline: view()`, with the reduced-motion rule) instead of `m.div`, so `MotionProvider` and Motion leave the shared bundle; keep Motion inside the already-lazy islands (parallax, count-up, slider, lightbox) |      ~16.7 | Large  |
| Consent banner: server-render it hidden and reveal it with an inline script (as the announcement bar does; README "Why `/about` has a looser LCP limit" already plans it), and load the interactive part with `next/dynamic` only when no choice is stored             |       ~2.0 | Medium |
| `@vercel/analytics`: the plain `<script defer src="/_vercel/insights/script.js">` it injects, without the React wrapper                                                                                                                                                |       ~1.3 | Small  |
| `CheckoutButton`: render through a dynamic import in the page route, as `PanelsView` already does (`src/app/(site)/[[...slug]]/page.tsx:39-46`)                                                                                                                        |       ~0.9 | Small  |
| Announcement bar: clean the stega markers in its server parent (`site-announcement.tsx`) and pass plain strings, so the client component drops `next-sanity`                                                                                                           |       ~0.9 | Small  |
| **Total without Motion**                                                                                                                                                                                                                                               |   **~5.1** |        |
| **Total with Motion**                                                                                                                                                                                                                                                  |    **~22** |        |

Without the Motion change, the small items alone don't reach 10 KB. Motion is the one large lever left on a page
whose remaining weight is mostly Next and React.

### 9. Tests

**Checked:** which logic modules have no unit test; skipped, `fixme` and `only` tests; the e2e baseline; visual
baselines against the gallery's ids.

**Found:** coverage is broad. Every skip is conditional with a reason (device-only behaviour, Linux-only baselines);
there are no `.only`, `fixme` or `todo` tests.

<a id="t-1"></a>**T-1 · High · Fixed · The "stays put" background test could never pass**
Evidence: `tests/e2e/section-background-image.spec.ts:84`; `playwright.config.ts` sets `reducedMotion: 'reduce'`
for every test, so `lg:motion-safe:fixed` never applied.
Why: it failed on desktop and mobile in every run, so CI's e2e job was red (and when it lands in shard 1, Lighthouse
CI, the step after it, is skipped). Locally the `experiments` project depends on both, so 53 more tests (A/B tests,
Brand colours, their screenshots) did not run at all; CI runs those in their own job with `--no-deps`.
Fix (done, `af26639`): the test emulates `reducedMotion: 'no-preference'` first, as other motion tests do.

<a id="t-2"></a>**T-2 · High · Fixed · A "stays put" background was not clipped to its section**
Evidence: `src/components/ui/section-background.tsx:60` rendered `overflow-hidden[clip-path:inset(0)]`, one class
that matches nothing. Found by T-1's next assertion.
Why: with _Stays put while scrolling_ on, the fixed picture could show through other sections on large screens.
Fix (done, `fd6e30d`): restore the space. The unit test (`section-background.test.ts:116`) now checks the class
stands alone. This is the audit's only product-code change: it was the cause of a failing test, it is one character,
and it restores the documented behaviour. Visual baselines are unaffected (they run with reduced motion).

<a id="t-3"></a>**T-3 · High · Thirteen visual baselines are missing**
Evidence: no Linux baseline for gallery entries `hero-heading-custom-gradient` and `link-list-glass-rows`
(desktop and mobile, `tests/e2e/visual.spec.ts:94-99`), nor for `{light,dark}-link-glass-{375,768,1280}`
(`tests/e2e/design-settings-visual.spec.ts:96-105`). `tests/e2e/link-list-glass.spec.ts:176-189` also needs `link-glass-{375,768,1280}-desktop-linux.png`; the first version of this audit missed that fourth visual spec, and CI shard 1 shows it failing. Every other gallery id has both baselines; none is orphaned.
Why: on Linux CI, `toHaveScreenshot` fails when there is no baseline.
Fix: **manual**, run the **Update visual baselines** workflow on this branch (or after merging), then check the 13
new images.

<a id="t-4"></a>**T-4 · High · Fixed · Three unit test files never ran**
Evidence: `vitest.config.mts:9` matched `src/**/*.test.ts` only, so `src/components/ui/badge-icon.test.tsx`,
`src/components/ui/rich-heading.test.tsx` and `src/features/pages/components/sections/location/index.test.tsx`
(33 tests, including the custom-gradient CSS injection checks) were skipped silently. One assertion had gone stale:
`Mon–Tue`, where the code deliberately lists two days as `Mon, Tue` (`src/lib/opening-hours.ts:105`).
Fix (done, `eab7ec1`): include `*.test.tsx`; correct the assertion; README "Tests" says so.

<a id="t-5"></a>**T-5 · Low · Logic with no unit test**
Evidence: `src/lib/edge-config-sync.ts` (writes the production redirect map through the Vercel API) has no test at
all. `src/features/experiments/utils/experiment-flag.ts` (signed A/B codes), `src/lib/consent/consent-store.ts`,
`src/lib/sanity/live-action.ts` and `src/lib/ops/fetch-notices.ts` are covered only end to end.
Fix: unit tests with `fetch` mocked for `edge-config-sync` first, then `experiment-flag` (a forged or stale code
must decode to null). Size: Small.

<a id="t-6"></a>**T-6 · Low · `npm run check` leaves out two offline checks CI runs**
Evidence: `package.json` `check` runs typecheck, lint, format and tests; CI also runs `check:version` and
`check:studio-brand` (`.github/workflows/ci.yml`). (The audit brief assumed `check` includes them; the README is
right that it doesn't.) `check:dataset` needs real credentials and rightly stays out.
Why: a local `npm run check` can pass while CI fails on the changelog version or `studio-brand.json`.
Fix: append `&& npm run check:version && npm run check:studio-brand` to `check`; both are offline and take under a second.
Size: Small.

Known flaky: `tests/e2e/releases.spec.ts` sometimes fails in a full run and passes alone (team notes).

### 10. Docs drift

**Checked:** README sections on data fetching, request budget, webhook mode, tests, budgets, code quality and the
Sanity workflow; `migrations/README.md` against the migration folders; the `CHANGELOG.md` Unreleased entries
against fixtures and code; `docs/template-packaging.md`.

**Found:** the README is detailed and mostly accurate. `migrations/README.md` matches the four migrations.
CHANGELOG claims spot-checked (the `/links-*` fixtures, `hero-heading-custom-gradient`, Glass rows fields, retired
gradients) all match the code.

<a id="c-2"></a>**C-2 · High · Fixed (docs) · The webhook filter left out `experiment`**
Evidence: `src/lib/sanity/live.ts:93` (`TAGS.experiment`), `src/features/experiments/api/get-experiment.ts:12`; the
README filter (now README:691) listed every other tag. `tests/e2e/experiments.spec.ts:16` posts the tag to the
webhook itself, so the tests could not catch it.
Why: in webhook mode, publishing or stopping an experiment never expired the cached `/api/experiments` answer the
proxy reads, so A/B tests never started or stopped until the next deploy.
Fix (done, `06585d4`): add `"experiment"` to the filter. **Proposed:** a unit test that parses the README filter
and compares it with `Object.values(TAGS)`, so the two can't drift again. Size: Small.

<a id="dd-1"></a>**DD-1 · Low · Fixed · README numbers had drifted**
"About 216 KB" (it is 218.5), "Lighthouse budgets on `/` and `/about`" (four pages), "proves the section
generator's output" (all four generators). Fixed in `5df507b`.

<a id="dd-2"></a>**DD-2 · Medium · The Unreleased CHANGELOG lists a migration but says "None"**
Evidence: `CHANGELOG.md:26` asks every project to run `section-titles-to-heading-text` "on every dataset, dry run
first"; `CHANGELOG.md:47-49`, _Breaking changes / migration steps_, says "None".
Why: the changelog's own rule (`CHANGELOG.md:8-16`) is that this section is where a merging project looks for what
to do. The code reads the old `title` until the migration runs, so it isn't breaking, but it is a migration step.
Fix: list the migration (and the dry-run command) under _Breaking changes / migration steps_, and decide whether
the release is minor (optional migration) or major. A versioning decision, so not changed here. Size: Small.

### 11. Consistency

**Checked:** file naming (kebab-case), `// new-*:` generator markers, Australian English in Studio titles,
descriptions and docs.

**Found:** file names are consistent, and every generator marker is intact (`src/lib/sanity/live.ts:99`,
`eslint.config.mjs:47`, `sanity.config.ts:65`, `:115`). Studio titles and descriptions use Australian English
throughout (checked by pattern for about 40 US spellings).

<a id="q-1"></a>**Q-1 · Medium · The Tailwind Prettier plugin can silently glue two classes together**
Evidence: the root cause of T-2. `prettier-plugin-tailwindcss` trims a leading space inside a string literal in a
`className` template, so `` `a${cond ? ' b' : ''}` `` is rewritten to `` `a${cond ? 'b' : ''}` ``. `npm run format`
re-broke the first attempt at the fix.
Why: the result type-checks, lints and passes `toContain` tests, and only shows in the browser.
Fix: write the space in the template (`` `a ${cond ? 'b' : ''}` ``), as the fix does; say so in the README
("Code quality", the Prettier paragraph); optionally a unit test over all sources that flags `[\w\])-]\$\{` inside `className` templates.
(A scan found no other case today.) Size: Small.

<a id="q-2"></a>**Q-2 · Low · Fixed · US spellings in copy**
The AI Assist prompt "Summarize this page…" (`src/features/studio/assist-presets.ts:30`, code-only, nothing
stored) and three docs lines (README "summarizes", "customizations"; `docs/template-packaging.md` "Behavior").
Fixed in `c50ed0c`.

<a id="q-3"></a>**Q-3 · Low · "Customize files" is a defined term in US spelling**
Evidence: README "Customize vs core files" (README:3809-3826, 9 uses), `docs/template-packaging.md`.
Fix: rename to "Customise files" across README, `docs/template-packaging.md` and the CHANGELOG in one change, so
search still finds it. `studio-brand.json`'s `colors` key is a public config name and should stay. Size: Small.

### Other

<a id="d-1"></a>**D-1 · Medium · AI Assist "Write meta description" reads a field that doesn't exist**
Evidence: `src/features/studio/assist-presets.ts:38` references `path: 'sections'`; the page's sections field is
`pageBuilder` (`src/features/pages/schemas/page.ts:78`). README:113-115 promises it "summarises the page title and
sections".
Why: the instruction most likely gets the title only, so descriptions are generic. Not confirmed in a running
Studio (see _Not checked_).
Fix: `path: 'pageBuilder'`, then try it on a fixture page in a dev Studio. Size: Small.

<a id="o-1"></a>**O-1 · Low · Fixed · Split doc comments**
`src/app/(site)/[[...slug]]/page.tsx` and `src/app/ab/[code]/[[...slug]]/page.tsx` stacked two JSDoc blocks on
`PanelsView`; tools show only the second. Merged in `fe7ee5c`.

---

## Fixes made on this branch

Each is its own commit on `audit/code-audit-2026-10-18`.

| Commit    | Change                                                                                                                 | Finding  |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| `eab7ec1` | Vitest runs `*.test.tsx`; the stale Location assertion is corrected; README "Tests" updated                            | T-4      |
| `af26639` | The stays-put e2e test turns motion on before checking                                                                 | T-1      |
| `fd6e30d` | `section-background.tsx`: the clip class gets its space back; the unit test checks it stands alone                     | T-2, Q-1 |
| `06585d4` | README webhook filter lists `experiment`                                                                               | C-2      |
| `5df507b` | README: JS total, Lighthouse pages, generator CI jobs                                                                  | DD-1     |
| `c50ed0c` | Australian English: AI Assist prompt, README, packaging doc                                                            | Q-2      |
| `4901105` | `next.config.ts`: `partialPrefetching: false`, explicitly (unset already behaves the same; silences the build warning) | P-3      |
| `fe7ee5c` | Merged split doc comments on the page routes                                                                           | O-1      |
| `3e6af11` | `ci.yml` comment lists the four Lighthouse pages                                                                       | DD-1     |
| (this)    | This report, and a CHANGELOG Unreleased entry                                                                          |          |

`fd6e30d` is the only change to rendered output, and only for sections with _Stays put while scrolling_ on, on
large screens, with motion allowed. It restores what the README and the test describe.

## Verification

| Check                                    | Before (main `a2e0a91`)                                     | After (this branch)                                       |
| ---------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| `npm run check`                          | passed: 213 files, 2,338 unit tests                         | **passed**: 216 files, 2,371 unit tests                   |
| `npm run test:e2e` (full, clean `.next`) | 1,567 passed, **2 failed**, 381 skipped, **53 did not run** | **1,594 passed, 0 failed**, 409 skipped, 0 did not run    |
| `next build` warnings                    | `partialPrefetching` warning on every build                 | none                                                      |
| Home page JS, `<script src>` gzip        | 218,499 B                                                   | 218,500 B; a second build of the same code gave 218,498 B |

The skipped tests are the visual baselines (Linux only; this ran on macOS) and device-specific tests. The home page
total differs by one or two bytes between builds of identical code: the server-action reference chunk (raw size
7,466 B in every build) compresses differently, so the branch adds no JavaScript. `fd6e30d` adds one space to
server-rendered HTML only.

Afterwards the working tree was clean: the scratch builds' temporary `next.config.ts` edit and the paths Next added
to `tsconfig.json` were reverted, and scratch output stayed in `node_modules/.cache/audit`.

## Not checked

- **Studio at runtime.** No Studio was started (it needs a real project). D-1 and the Studio-side casts were judged
  by reading the code. Studio speed and its 2.1 MB download are task 91's.
- **Lighthouse** (`npm run test:lighthouse`) was not run; CI runs it.
- **Visual baselines** were not compared: they are Linux-only and this audit ran on macOS.
- **Dark Brand colours palettes** were not swept with axe beyond `design-settings.spec.ts`.
- **Draft mode and Presentation** end to end (they need a real dataset and a signed-in editor).
- **Third-party packages** were not audited for vulnerabilities (`npm audit` and Dependabot cover that).
- **Setup wizard, launch check, release and backup scripts** were read only where another finding led there.
- **Sanity dataset permissions and roles** (`docs/studio-roles-test-script.md` is a manual script).
- **Real Stripe, Resend, Turnstile, Mailchimp, Loops, Edge Config and IndexNow calls**: only their mocks were exercised.
- **Load and concurrency** (the in-memory rate limiters and the 1,000 live-connection cap) were not tested.

## Proposed plan tasks

For each High finding that still needs work, plus the Medium items worth planning. None has been added to the plan.

**Task A · Close the draft-mode open redirect (S-1) · High · Small**

- What: `/api/draft-mode/disable` uses `safePath` for `?redirect=`; move `safePath` to `src/lib/safe-path.ts` (A-1)
  and import it from auth and the route; an e2e test that `?redirect=/%5Cevil.example` lands on `/`.
- Why: today the route is an open redirect on every client's domain.
- Files: `src/app/api/draft-mode/disable/route.ts`, `src/features/auth/utils/safe-path.ts` (+ test) → `src/lib/`,
  `src/features/auth/api/actions.ts`, `src/features/auth/components/sign-in-view.tsx`, `tests/e2e/pages.spec.ts`.

**Task B · Pricing tables follow Stripe in webhook mode (C-1) · High · Small**

- What: add `TAGS.stripePrice` to `PAGE_QUERY`'s tags; a unit test that each fetch's tags cover the document types
  its query dereferences (at least for `PAGE_QUERY`); an e2e test that a signed `stripePrice` webhook changes the
  `/pricing` page.
- Why: a price changed or archived in Stripe stays on the site until some other page change.
- Files: `src/features/pages/api/get-page.ts`, `src/features/pages/api/get-page.test.ts` (new), `tests/e2e/pricing.spec.ts`.

**Task C · Keep the webhook filter in step with `TAGS` (C-2) · High · Small**

- What: a unit test that reads the filter from README "Live mode vs. webhook mode" and compares it with
  `Object.values(TAGS)`; have `npm run new:document`'s instructions point at it; optionally print the filter from a
  script so the setup wizard and docs share one source.
- Why: the filter had already drifted once (A/B tests never started in webhook mode); nothing caught it.
- Files: `src/lib/sanity/webhook-filter.test.ts` (new), `README.md`, `scripts/new-document.mjs`.

**Task D · Error pages that can actually retry, and actions that fail gracefully (E-1, E-2) · Medium · Small**

- What: `retry` instead of `reset` in `(site)/error.tsx` and `global-error.tsx`; `try` around the Sanity reads in
  `submitForm` and `startCheckout`, returning their existing error states; e2e: a page that fails while the fake
  Content Lake is down recovers with "Try again" once it is back.
- Why: "Try again" can't recover from the outage it is shown for; a form loses what was typed.
- Files: `src/app/(site)/error.tsx`, `src/app/global-error.tsx`, `src/features/forms/api/submit-form.ts`,
  `src/features/pricing/api/checkout.ts`, `tests/e2e/fake-sanity.mjs`, a new e2e spec.

**Task E · Measure the JavaScript budget truthfully, then win back 10 KB (P-1, P-2) · Medium · Medium**

- What: first make `performance.spec.ts` skip `noModule` scripts and add a live-mode measurement, then set
  `JS_BUDGET_KB` from the real numbers (a decision, made in that pull request); then the changes in the
  "10 KB to win back" table, one pull request each, measured with the performance, memory and Lighthouse checks.
- Why: the test shows 1.5 KB of headroom while modern browsers load 39.5 KB less, and a default live-mode site
  loads 39 KB the test never sees. Neither number is the one visitors get.
- Files: `tests/e2e/performance.spec.ts`, `playwright.config.ts`, `README.md` ("Performance budgets"), then the
  files named in the table.

**Task F · Content Security Policy for the public site (S-2) · Medium · Medium**

- What: `Content-Security-Policy-Report-Only` on non-Studio routes with hashes for the static inline scripts,
  the analytics and embed hosts; a report endpoint or Sentry CSP reporting; enforce after a release with no
  reports. Studio keeps its current headers.
- Why: defence in depth against injected scripts; today there is none.
- Files: `next.config.ts`, `src/lib/analytics/track-script.ts`, `src/features/site/components/announcement-bar.tsx`,
  `src/features/forms/components/form-view.tsx`, `src/features/consent/components/analytics-scripts.tsx`,
  `src/config/embed-providers.ts`, a new e2e spec.

**Task G · Adopt Partial Prefetching (P-3) · Medium · Medium**

- What: follow Next's "Adopting Partial Prefetching" guide: review the three `prefetch={false}` links, set
  `partialPrefetching: true`, check the dev insights per route, re-run the memory and performance specs.
- Why: the option is removed in the next major release (both on everywhere); one shared App Shell per route
  (every CMS page is one route) should also cut prefetch requests.
- Files: `next.config.ts`, `src/features/search/components/quick-search.tsx`,
  `src/features/styleguide/components/*`, `tests/e2e/memory.spec.ts`.

**Task H · AI Assist meta description reads the page (D-1) · Medium · Small**

- What: `path: 'pageBuilder'` in the preset, then confirm in a dev Studio on a fixture page.
- Files: `src/features/studio/assist-presets.ts`.
