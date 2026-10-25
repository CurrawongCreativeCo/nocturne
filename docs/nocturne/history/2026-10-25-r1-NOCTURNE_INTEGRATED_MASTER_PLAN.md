# Nocturne Integrated Master Plan

**Status:** proposal for the owner's review. This is not the canonical roadmap. The canonical plan is still the _Currawong Build Plan_ artifact (version 18, 186 tasks), and this document changes nothing in it.

**Date:** 25 October 2026 · **Repository:** `CurrawongCreativeCo/nocturne` at `297110d` (branch `feat/link-list-summary`; template version 1.8.0, package version 1.7.1)

**Read in full:**

- `docs/Nocturne_Foundation_Architecture_and_SEO_Strategy.docx`, dated 25 Oct 2026. No Markdown copy exists.
- This repository.
- The build-plan artifact and its progress database.
- _Currawong Creative Platform Strategy_ (14 Oct 2026), the "Platform strategy" tab.

**Not re-read:**

- The 18 Oct _Pre-launch pages, domains and launch_ design doc. Its decisions are taken from the build plan's version 8 notes.
- The _Idea catalogue_ tab of the 14 Oct strategy.

**Scope of this pass:** research, repository audit and planning only. Nothing was provisioned, deployed, purchased or changed in any provider account. The only test run was the offline unit suite: 291 files and 3,417 tests, which passed in 52 s with CI placeholder environment values.

**Labels used throughout**

| Label       | Meaning                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| `[Code]`    | Verified in this repository at `297110d`.                                                                    |
| `[Doc]`     | Confirmed in a primary vendor page fetched on 25 Oct 2026 (see Sources, Appendix E).                         |
| `[Search]`  | Taken from search snippets or secondary sources, so the primary page was not read. Treat it as NOT VERIFIED. |
| `[Rec]`     | Reasoned recommendation.                                                                                     |
| `[Hyp]`     | Numerical hypothesis, to be measured.                                                                        |
| `[Unknown]` | NOT VERIFIED. Each one becomes a spike or a question.                                                        |

Vendor prices are list prices in US$. Currawong's own prices are in A$, exclusive of GST, unless stated otherwise. Where a conversion is needed, this plan assumes **A$1.50 per US$1** (an assumption; check the current rate).

---

## 1. Executive verdict

### Verdict: **NARROW**

Nocturne already exists, as a strong, heavily tested website starter. It also quietly contains most of the proposed Design Engine and the deterministic half of Content Intelligence. What does not exist is the thing the strategy calls Foundation. The evidence does not yet justify building Foundation as a hosted, multi-provider, web-and-mobile control plane.

The most valuable next step is not architecture. It is launching client sites repeatably and verifiably, and measuring how long that really takes.

**First narrow job.**

- **The job:** take a signed Currawong client from "project approved" to a verified preview URL of an independently owned Next.js + Sanity site on Vercel. It starts from a pinned Nocturne release, and every step is recorded, resumable and timed.
- **How it ships:** first as `nocturne launch`, a local command that opens a browser wizard and drives the provider APIs with the operator's own credentials.
- **Where it is used:** on the real client launches already in the plan (tasks 11, 124, 125 and 128). `[Rec]`

**Strongest product identity: _verified launch and care for client-owned websites._**

- Nocturne doesn't host sites and doesn't lock clients in. It proves a site works before saying it works, and keeps proving it afterwards.
- The Vercel, Cloudflare and Sanity deploy flows already provide "one click to a URL". None of them checks that:
  - CMS content actually renders;
  - metadata and JSON-LD are truthful;
  - the dataset is private;
  - the client can edit safely.
- That gap is real, and it is where Currawong's craft already sits. `[Rec]`

**Kept as long-term product commitments, each behind a verifiable gate (§12):** the hosted browser control plane, Cloudflare as a second host, React Native mobile, and Search Console intelligence. None of them is in the 30-day slice.

### Three existential risks

1. **Opportunity cost.**
   - 108 of the 186 plan tasks are done, and nearly all of them deepen the template. Yet the first client site has not launched: tasks 11, 30–32, 124, 125 and 128 are still `todo` in the progress database `[Code: plan db]`.
   - A control plane with two hosts and mobile is roughly 6–12 months of solo work `[Hyp]`.
   - One more A$3,000 project is worth more this quarter than any platform saving (§10.4).
2. **Provider authorisation reality.** Parts of every "15-minute" journey are manual consent, payment or review, and if those gates dominate, automation saves little:
   - Sanity documents no third-party OAuth.
   - Sanity's Vercel Marketplace path puts project management and billing behind the Vercel account `[Doc]`.
   - Apple's App Store Connect API is not known to create app records `[Search]`.
   - Google Play makes new personal developer accounts run a 14-day closed test with 12 testers `[Search]`.
3. **Maintenance surface.**
   - Today the stack is a 128k-line starter on fast-moving Next.js 16 and Sanity 6, merged into every client repo.
   - The proposal would add a Cloudflare variant, an Expo starter (Expo shipped SDK 56, 57 and 58 between May and October 2026 `[Doc]`), a control plane and eight provider integrations.
   - That is more than one maintainer can keep green. Every addition has to remove more work than it creates.

---

## 2. Evidence and source inventory

### 2.1 What the strategy document says

Read in full: 12 sections, a decision register, eight sources and a footer. Its positions are:

- **Priorities.**
  - Internal agency value first; external SaaS demand is unproven (Executive decision, §12).
  - Three capabilities share contracts but are not one subsystem: Foundation (provisioning and operations), the Design Engine (structured creative freedom) and Content Intelligence (content, structured data and search evidence) (§1–2).
- **Architecture.**
  - Generated sites are independent: their own repo, CMS and deployment. Nocturne is never their runtime, and sites survive a Foundation outage or a lapsed subscription (§2).
  - One Nocturne monorepo with packages (`design-engine`, `page-renderer`, `content-contracts`, `seo`, `provider-*`) plus one independent repository per client (§3).
- **Change model.** Three kinds of change: a content edit, a design-configuration edit and a code-capability change. There must be no competing masters for design settings (§3).
- **Golden path and timing.**
  - The golden path is Next.js, Sanity, GitHub and Vercel. Supabase comes later and does not replace Sanity (§4).
  - A preview is reported only after a real HTTP request shows the seeded content marker.
  - The 15-minute window runs from the first launch action to the verified preview.
  - Provisional targets for connected accounts: median ≤ 8 minutes, p90 ≤ 15 minutes (§4).
- **Prove first.** Customer-owned Sanity authorisation, the GitHub App, Vercel readiness and pinned starter contract tests (§4).
- **Design Engine.**
  - Roughly six section families, semantic tokens, a site theme that sections inherit, local overrides with "Reset to theme", and accessible motion presets.
  - Image-to-site is a bounded later experiment.
  - Clients edit in Studio and the Presentation tool (§5).
- **Content contract and audits.**
  - Canonical entities (`siteSettings`, `page`, `service`, `person`, `article`, `location`) feed metadata, Open Graph tags, sitemaps and a JSON-LD `@id` graph (§6).
  - Five audit areas, never one mysterious score (§6).
- **AI search.**
  - "LLM SEO" means a transparent readiness audit. Google says AI features need no special requirements, and their traffic sits inside the Web Performance data.
  - Bing AI Performance is a separate preview product with stated coverage limits (§7).
- **Search Console.** A read-only integration, a six-step opportunity workflow, and a Search Health view with four tabs (§8).
- **Mobile.** A future blueprint family with distinct lifecycle states (web preview, mobile preview, mobile testing, mobile production). No 15-minute promise. An Android internal APK is the first proof (§9).
- **Reliability and security.** A modular TypeScript monolith with a durable worker, idempotent persisted steps, least privilege, signed webhooks and audit logs. Offboarding must never delete client resources (§10).
- **Phases and verdict.**
  - 14-day, 30-day and 90-day phases, with explicit exclusions (§11).
  - Default engineering verdict: "simplify and refactor selectively, pending code inspection" (§12).

The document also says the repository was **not audited** and that Nocturne had "roughly one week of development". Both statements are outdated (§2.2).

### 2.2 What the code proves `[Code]`

| Area                | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stack               | Next.js 16.4.2 (App Router, `cacheComponents: true`), Sanity 6.19.0, next-sanity 13.3.4, React 19, Tailwind 4, TypeScript strict. See `package.json` and `next.config.ts`.                                                                                                                                                                                                                                                                                                                          |
| Size and history    | 484 commits between 12 and 24 Oct 2026, tags `v1.0.0` to `v1.8.0`, about 1,689 tracked files and about 128k lines of TS/JS.                                                                                                                                                                                                                                                                                                                                                                         |
| Tests and CI        | <ul><li>291 unit test files; all 3,417 tests passed on 25 Oct.</li><li>77 Playwright specs run against a fake Content Lake (`tests/e2e/fake-sanity.mjs`), with axe, Linux visual baselines, Lighthouse CI, a JS budget and a memory test.</li><li>CI (`.github/workflows/ci.yml`) has `check`, five generator smoke jobs, four e2e shards and an isolated e2e job.</li></ul>                                                                                                                        |
| Setup automation    | <ul><li>`scripts/setup/index.mjs` serves a local browser form on `localhost:3333` and verifies credentials against the Content Lake.</li><li>With the operator's own `sanity login` it creates a project with a **private** dataset, a Viewer token, CORS origins and starter content (imported with `--missing`), writes `.env.local`, then deletes itself.</li><li>Project creation is retry-safe within one run (`createdProjectId`), but not across a crash.</li></ul>                          |
| Deployment          | README "Deploying (Vercel)" has an 8-step checklist and a Deploy with Vercel button that clones the repo. There is no GitHub or Vercel API automation.                                                                                                                                                                                                                                                                                                                                              |
| Verification        | <ul><li>`npm run launch:check` is dependency-free, made of pure unit-tested checks, and has `--json` ("for the future Ops dashboard"), `--prelaunch` and `--bypass` (the Vercel protection header).</li><li>It checks HTTP and headers, canonicals, robots, the sitemap, unique metadata, a single H1, OG images, template leftovers, Sanity CORS, dataset privacy, the revalidate webhook and PageSpeed.</li></ul>                                                                                 |
| Deployed identity   | `/api/site-info` returns the template version, tier, enabled and configured features, launch state, `VERCEL_GIT_COMMIT_SHA` and build time (`src/app/api/site-info/route.ts`).                                                                                                                                                                                                                                                                                                                      |
| Release discipline  | <ul><li>`template-version.json`, `check:version`, the `release` script and a CHANGELOG with migration steps.</li><li>Client sites update by merging tags.</li><li>`docs/template-packaging.md` sets the triggers for extracting a shared package.</li></ul>                                                                                                                                                                                                                                         |
| Content model       | <ul><li>24 document types, including `page`, `post`, `author`, `teamMember`, `event`, `businessInfo`, `siteIdentity`, `siteNavigation`, `designSettings`, `form`, `enquiry`, `redirect`, `experiment`, `sharedSection` and `panel`.</li><li>129 object types and about 25 section types.</li><li>No `service` document type and no multi-location `location` type.</li></ul>                                                                                                                        |
| SEO output          | <ul><li>A connected JSON-LD graph with stable `@id`s (`/#organization`, `#website`, `#person`, `#event`), emitting Organization or LocalBusiness subtypes, WebSite, WebPage, BreadcrumbList, Article, Person, Event and FAQPage.</li><li>Sitemap chunks, robots, `llms.txt`, an RSS feed, IndexNow and OG image routes.</li></ul>                                                                                                                                                                   |
| Caching and preview | <ul><li>`cachedSanityFetch` in `src/lib/sanity/live.ts` is the only `'use cache'` boundary.</li><li>Live mode uses `defineLive`; webhook mode is signed (`/api/revalidate` with `revalidateTag`, `after()`).</li><li>Draft mode and Presentation are wired in.</li><li>A documented "visitors cause zero Sanity requests" budget.</li></ul>                                                                                                                                                         |
| Design system       | <ul><li>`src/styles/tokens.json` holds colour, font, type, space, radius, shadow, emphasis, glass, edge and motion tokens, generated into CSS and TS.</li><li>The Sanity `designSettings` document (appearance, brand roles, gradients) overrides a subset as CSS variables.</li><li>Section style (tone, spacing, width, motion), variants, picture presets, motion presets, backgrounds, dividers and Link list overrides.</li><li>Precedence is documented in README "Colour systems".</li></ul> |
| Roles               | <ul><li>Studio has client and agency modes, based on Sanity roles.</li><li>The README says plainly that hiding something in Studio is a convenience. Real enforcement comes from Sanity roles (Editor or Contributor on Growth). Field-level enforcement would need Enterprise custom roles.</li></ul>                                                                                                                                                                                              |
| Host coupling       | <ul><li>`src/proxy.ts` runs on Node in Next 16. It holds the pre-launch gate, the style-guide token, Edge Config redirects (`@vercel/edge-config`) and A/B rewrites (`flags/next`).</li><li>`VERCEL_*` variables are read in 10 files; `@vercel/analytics` and `@vercel/stega` are dependencies.</li><li>README "Cloudflare (not supported yet)": OpenNext Cloudflare 1.20.10 builds the site but **fails to bundle `src/proxy.ts`**.</li></ul>                                                     |
| Operations          | Weekly dataset export (`backup.yml`), schema deploy and migration dry runs (`sanity.yml`), and enquiry retention. Each of them skips and passes when its secrets are missing, which is a silent-failure risk the 14 Oct strategy also noted.                                                                                                                                                                                                                                                        |
| Absent              | A Foundation or control-plane app, a database, durable workflows, GitHub or Vercel provisioning, Cloudflare deployment, any mobile code, and any Search Console or Bing integration.                                                                                                                                                                                                                                                                                                                |

**Earlier code audit** (`docs/code-audit/2026-10-18/report.md`): overall "good, with a handful of sharp edges in the seams". The home page JavaScript has almost no headroom left: about 218.5 KB of the 220 KB budget, of which 39.5 KB is a polyfill that modern browsers skip.

**Can the starter become a pinned golden-path blueprint without a rewrite?** Yes:

- It already has release tags, a version stamp, migration notes, CI gates, a seed, a verification tool and a deployed identity endpoint. `[Code]`
- Missing pieces: a machine-readable blueprint spec, a content marker for verification, and host-neutral environment detection (§13).

### 2.3 Active plans and decisions

| Source                                                                                                  | Status                                     | What it decides                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _Currawong Build Plan_, version 18, 24 Oct 2026 (https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL)     | **Canonical**                              | <ul><li>186 tasks. Progress database as read on 25 Oct: **108 done, 2 doing (167, 170), 1 skip (179), 75 todo**.</li><li>Stages: Shipped; Now (launch lane); P0; client lane; P1; P2; Contentful lane; P3 Ops (37–44); domains (129–135); billing and access (45–49); provisioning and fleet (42, 50, 52–54); triggered work (57–62, 141, 144, 178, 184).</li></ul>                                                                                                                |
| _Currawong Creative Platform Strategy_, 14 Oct 2026 (Claude Docs)                                       | **Approved direction**                     | <ul><li>Isolated fleet plus a separate Ops app, from about 3–5 live sites.</li><li>A Sanity organisation per client, with Currawong as sole administrator. Clients are Editor or Contributor on Growth.</li><li>Ops stack: Next.js 16, Postgres with Drizzle, Auth.js with Google Workspace, Vercel Cron, and no queue at 100 sites.</li><li>A `new:site` CLI.</li><li>The multi-tenant platform was rejected. The agency monorepo is to be "reconsidered at 30+ sites".</li></ul> |
| _Pre-launch pages, domains and launch_, 18 Oct 2026 (https://claude.ai/artifact/LHRjrsHaU9xrHDykauAEVo) | Approved; summarised from the plan's notes | Launch state lives in code. A launch is a PR plus a deployment, and rollback is Vercel Instant Rollback. Nothing cached depends on launch state. DNS stays manual until Ops exists.                                                                                                                                                                                                                                                                                                |
| `docs/template-packaging.md`                                                                            | Decision note                              | Stay with merges until conflicts are routine, fixes must reach untouched sites, or core files diverge (from about 5 projects). The package contents are already defined.                                                                                                                                                                                                                                                                                                           |
| Studio audit and redesign, 21–23 Oct (`docs/studio-audit/…`, `docs/Nocturne_Studio_*`)                  | Folded into plan versions 15–18            | P0 and P1 Studio work, mostly shipped.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `docs/Nocturne_Claude_Code_Planning_Handoff.md`                                                         | Completed handoff                          | Plan-maintenance rules: preserve IDs, edit additively, get approval before restructuring. This plan follows them.                                                                                                                                                                                                                                                                                                                                                                  |

**Classification of existing plan items**

- **Completed:** 108 tasks, including all of P0 (160–163), the Studio shell spike (174) and its follow-ups (181–183, 186).
- **In progress:** 167 (see and reset Link list overrides) and 170 (wordmark files, a manual task).
- **Superseded if this plan is approved:**
  - 42 (provisioning script) becomes the Foundation launcher, narrowed and pulled forward.
  - The "currawong-ops" app in 37–41 becomes the hosted Foundation, renamed and gated. The task IDs are kept.
- **Duplicated:** none found. The overlaps are of sequencing, not content.
- **Contradictory:** no task contradicts the strategy outright. The conflicts are in scope and order (§2.6).
- **Valuable and untouched:** the client lane (11–14, 22, 30–32, 63, 64) and the launch lane (124, 125, 128). They produce the baseline measurement this plan depends on.

### 2.4 Validated demand versus assumptions

| Claim                                                         | Evidence                | Status                                                                          |
| ------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------- |
| A A$3,000 site absorbed about 50 h, including 15 h of content | Founder, one project    | Self-reported, single data point                                                |
| Setup takes "about an hour by hand"                           | Plan task 42            | Estimate, never timed                                                           |
| An active client needs a link page now and a full site later  | Plan tasks 124 and 125  | Real, in progress                                                               |
| Other agencies would pay for Foundation                       | None                    | Untested                                                                        |
| Clients want a monthly SEO or analytics product               | None                    | Untested                                                                        |
| An A$100/month managed website is viable                      | None                    | Untested. §10.2 shows it is probably loss-making with Growth seats plus support |
| Clients want mobile apps from Currawong                       | None                    | Untested                                                                        |
| Customers need Cloudflare                                     | Prompt requirement only | Untested                                                                        |

### 2.5 Missing materials

- **Pipeline:** signed and likely projects for the next 6 and 12 months, with their fees. This is open question 1 in Appendix D.
- **Labour:** the founder's real build hours per week, and the hourly value to use for opportunity cost.
- **Account inventory:** Currawong's Vercel plan and team, GitHub organisation settings, the Sanity organisations created so far, the Search Console properties held, and any Apple or Google developer accounts. This plan assumes there are none.
- **Timings:** not a single timed launch exists.
- **Contract:** the client agreement (task 64), which governs ownership and offboarding.

### 2.6 Conflict-resolution table

| #   | Source                                                                        | Conflict                                                                                                                                                                                                                    | Proposed resolution                                                                                                                                                                                                                                                                                                       | Evidence                                                                                              | Downside                                                        | Approval needed                |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------ |
| C1  | Strategy doc vs code                                                          | The doc assumes "roughly one week" of unaudited work. The code is a 13-day, v1.8.0, heavily tested starter.                                                                                                                 | Treat the template as Blueprint 1, the Design Engine runtime and the content contract. No rewrite.                                                                                                                                                                                                                        | Git log, tags, test run                                                                               | The starter's 128k lines become every client's maintenance load | No (factual)                   |
| C2  | Strategy doc §11 vs build plan stages P3/p5                                   | The doc builds a minimal Foundation flow within 30 days. The plan defers Ops to 3–5 live sites and provisioning to 8–10.                                                                                                    | <ul><li>Run the doc's 14-day proofs; they are cheap.</li><li>Build the launcher as a CLI with a local browser wizard: task 42 v1, narrowed and pulled forward.</li><li>Gate the hosted UI on the day-90 evidence.</li></ul>                                                                                               | No sites launched yet; setup estimated at about 1 h                                                   | The browser experience comes later                              | **Yes**                        |
| C3  | Prompt vs strategy doc, code and README                                       | The prompt wants Vercel **and** Cloudflare as customer choices. The doc, the code and the README support only Vercel, and a Cloudflare build already failed.                                                                | Vercel is the only supported host in the MVP. Cloudflare becomes a gated second host with a capability profile and the same contract suite (§4.2, §12).                                                                                                                                                                   | OpenNext docs: Node middleware is not supported `[Doc]`. README attempt `[Code]`                      | Anyone who wants Cloudflare waits, and is told why              | **Yes**                        |
| C4  | Prompt vs strategy doc §9                                                     | The prompt makes mobile first-class. The doc puts it on the future roadmap.                                                                                                                                                 | <ul><li>Mobile is a first-class **project type in the data model** now, which is cheap.</li><li>No mobile build work until the web gates pass.</li><li>An Android internal APK is the first proof; iOS is gated on a real client.</li></ul>                                                                               | No mobile code, no mobile client                                                                      | The mobile product starts later                                 | **Yes**                        |
| C5  | Strategy doc §3 vs `docs/template-packaging.md` and task 58                   | The doc proposes one monorepo with `packages/design-engine`, `page-renderer` and `content-contracts`, with the template under `templates/`. The packaging note keeps template-as-source until its triggers fire.            | Keep the template repo as it is. Create **one new** `nocturne-foundation` monorepo. Extract a design or runtime package only when the packaging triggers fire (§5.3).                                                                                                                                                     | Client sites update with `git merge <tag>`, and moving the template into a subfolder breaks that      | Design Engine changes still reach clients by merge              | **Yes**                        |
| C6  | Strategy doc §3 vs code                                                       | The doc says "don't maintain competing masters" for design settings. The code has `tokens.json` defaults, Sanity `designSettings` overrides and section design fields in Sanity.                                            | <ul><li>Formalise **layered ownership**, with one owner per field and deterministic precedence (§9.2). These are not two masters.</li><li>Add a contract test.</li><li>Accept that agency-only design fields are enforced only by Studio (documented).</li></ul>                                                          | README "Colour systems" precedence `[Code]`                                                           | An Editor can still change a design field through the API       | Yes (accept the residual risk) |
| C7  | Strategy doc §4 ("customer-owned", native integrations) vs approved direction | The Marketplace integration ties Sanity project management and billing to the Vercel account, and projects can't be deleted in Sanity manage. The approved model is a client Sanity organisation administered by Currawong. | <ul><li>**Managed mode** (the default): the client's own Sanity organisation, billed to the client and administered by Currawong.</li><li>**Client-owned mode**: everything stays in the client's accounts.</li><li>Use the Marketplace only for client-owned Vercel teams, and only after an offboarding test.</li></ul> | Sanity Vercel integration doc `[Doc]`                                                                 | Two modes to support                                            | **Yes**                        |
| C8  | Strategy doc §4 (template repository) vs GitHub API                           | "Create a repository from the tested template" copies the template's default branch, or all branches, but never a chosen tag.                                                                                               | Create an empty repository, then push the **pinned release tree** as the first commit.                                                                                                                                                                                                                                    | GitHub REST docs: the only fields are `owner`, `name`, `private` and `include_all_branches` `[Doc]`   | A few more API calls                                            | No                             |
| C9  | Prompt (beautiful browser control plane) vs the prompt's own standards        | Premium UI is wanted, but not before provisioning is reliable.                                                                                                                                                              | <ul><li>A local browser wizard in 30 days, reusing the setup wizard's pattern.</li><li>The hosted UI only after gate G3.</li><li>Design the screens now (§7), build them later.</li></ul>                                                                                                                                 | §1 risk 1                                                                                             | The browser product feels less like one at first                | **Yes**                        |
| C10 | Strategy doc §5 vs code                                                       | The doc proposes about six section families. The code has about 25 section types and deep Link list controls.                                                                                                               | <ul><li>Keep everything that exists.</li><li>Define the **section contract** (slots, layout, surface, motion) and map the existing sections to it.</li><li>Add no new section types without a client need.</li></ul>                                                                                                      | `src/features/pages/schemas/sections` `[Code]`                                                        | Some sections stay outside the contract                         | Yes (design freeze, §12)       |
| C11 | 14 Oct strategy (Ops jobs on Vercel Cron, "no queue") vs this plan            | Provisioning needs multi-step, resumable runs with waits, which cron alone handles badly.                                                                                                                                   | Cron stays for health checks. Provisioning uses a durable executor once hosted (§5.1 D-05).                                                                                                                                                                                                                               | Long waits on builds and consent                                                                      | Another dependency                                              | No                             |
| C12 | Strategy doc §8 vs internal reality                                           | The doc's GSC design is OAuth with encrypted credentials. For agency-managed properties, a Google service account added as a Search Console user is simpler and avoids app verification.                                    | Use a service account internally. Use OAuth, with Google's verification, only for SaaS.                                                                                                                                                                                                                                   | Sensitive scopes need Google review `[Search]`; service-account access is common practice `[Unknown]` | A client must add one user to their property                    | No                             |
| C13 | Build plan context vs measured budget                                         | The prompt context says the home page JS limit is 200 KB. The memory and test say about 218.5 KB of 220 KB.                                                                                                                 | Fix the context text when the plan is next edited, and keep every verification addition server-only.                                                                                                                                                                                                                      | Memory note "JS budget has no headroom"                                                               | None                                                            | No (hygiene)                   |

---

## 3. Customer and competitive strategy

### 3.1 Agency-first economics, in brief (detail in §10)

- **The baseline competitor is Nocturne as it already is:** the template, GitHub's "Use this template", the setup wizard, the README checklist and `launch:check`. Plan task 42 estimates manual setup at about an hour. It has never been measured. `[Hyp]`
- **What Foundation can save per launch:**
  - provisioning time, roughly 0.5–2 h `[Hyp]`;
  - time recovering from launch-day failures (CORS, environment variables, preview protection, forgotten privacy settings).
- **What it cannot save:** the 15 h of content work or the design hours. The content workflow and the Design Engine address those.
- **So the launcher has to be cheap:**
  - roughly 10–15 development days;
  - reuses the setup wizard and `launch:check`;
  - pays back mainly through reliability, and by making the care offer credible (verified health, fleet updates).

### 3.2 ICP and job to be done

- **Now (internal):** Currawong itself. Its end clients are Australian small and medium businesses (local services, wellness, creative) who want a distinctive site they own, safe editing, and an ongoing care relationship.
- **Later (external, a hypothesis to test rather than build for):** design-led web agencies of 2–15 people in Australia, New Zealand or the UK. They already work in Next.js with a headless CMS, preferably Sanity, ship at least one marketing site a month, hand ownership to clients and sell care plans.
- **Job to be done:** _"When we sign a site, get us from contract to a client-owned, correctly structured, verified preview the same day. Then keep every site we've shipped updated and healthy, without our senior developer doing the plumbing."_
- **Honest reason to switch or pay:**
  - hours and launch-day failures removed across many sites;
  - fleet updates arriving as reviewed PRs;
  - verified SEO and structured data;
  - a client-safe Studio.
- **Honest reason not to:**
  - the Vercel, Sanity and Cloudflare deploy flows are free and good enough for one site;
  - most agencies already have a starter;
  - adopting someone else's starter costs a lot.
- **Conclusion:** a SaaS would have to sell the **fleet** (updates, health, verification) far more than the first launch.

### 3.3 Competitors and substitutes

| Option                                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                | Beats Nocturne on                    | Gap Nocturne fills                                                                                             | Real competition?                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Starter only (this repo)**                            | Template, wizard, checklist, `launch:check` `[Code]`                                                                                                                                                                                                                                                                                                                                        | Cost, simplicity                     | Resumable automation, a run ledger, verification on every launch                                               | **Yes, the main rival**                          |
| **Vercel Deploy Button + Sanity on Vercel Marketplace** | <ul><li>The button clones a repo and deploys it.</li><li>The Marketplace integration creates a Sanity project (and an account if needed) and sets project, dataset and read/write token environment variables.</li><li>Free and Growth plans are billed through Vercel. Projects are managed from the Vercel integration dashboard and can't be deleted in Sanity manage. `[Doc]`</li></ul> | Speed, zero build cost               | Ownership in the client's organisation, private-dataset defaults, seed content, CORS, verification, pre-launch | Yes for a first launch; weak on fleet care       |
| **Cloudflare Deploy Button**                            | Copies a repo into the user's GitHub or GitLab, provisions D1, KV and R2 from the Wrangler config, builds with Workers Builds and posts preview URLs for branches `[Search: 2025 changelog]`                                                                                                                                                                                                | Same, for Workers                    | Next.js and Sanity fidelity (proxy unsupported, §4.2), verification                                            | For Workers-native apps                          |
| **Sanity Blueprints**                                   | Infrastructure as code for CORS origins, webhooks, robot tokens, roles and functions, on project or organisation stacks, with a plan step before deploy `[Doc]`                                                                                                                                                                                                                             | Declarative Sanity configuration     | Not an end-to-end launcher                                                                                     | A complement: **adopt it**                       |
| **Expo Launch (beta) + EAS Workflows**                  | <ul><li>Launch: a browser flow from a public GitHub repo to the App Store; Play is "coming soon" `[Search]`.</li><li>Workflows: a REST API to dispatch runs and poll their status `[Doc]`.</li></ul>                                                                                                                                                                                        | Mobile publishing from a browser     | Content contract, web and mobile coherence                                                                     | Yes for mobile: **don't rebuild it**             |
| **Backstage / Spotify Portal**                          | Software Templates (scaffolder) for engineering organisations `[Search]`                                                                                                                                                                                                                                                                                                                    | Catalogue, plugin ecosystem          | Far too heavy for a 1–5 person agency                                                                          | No                                               |
| **Port**                                                | Internal developer portal, free up to 15 seats, 10k entities and 500 automation runs `[Search: port.io]`                                                                                                                                                                                                                                                                                    | A ready-made portal interface        | You still write every provider automation; wrong buyer                                                         | No                                               |
| **Railway templates**                                   | One-click infrastructure templates, Hobby US$5 and Pro US$20 per seat `[Search: third-party]`                                                                                                                                                                                                                                                                                               | Backend services                     | Marketing sites with a CMS                                                                                     | Adjacent                                         |
| **Webflow, Framer and similar**                         | Not researched this session                                                                                                                                                                                                                                                                                                                                                                 | Speed and price for small businesses | Ownership, code-level craft, Sanity editing                                                                    | The end client's alternative to hiring an agency |

### 3.4 The credible wedge

The wedge is not "launch in 15 minutes", which is free elsewhere. It is **"launch verified, stay verified"**:

- A launch counts only when the content marker, metadata, JSON-LD graph, dataset privacy, CORS and Studio access all pass.
- The same checks then run on every later release, across the fleet.
- It can be demonstrated in a three-minute screen recording, and measured as failures caught before a client noticed. `[Rec]`

### 3.5 When the starter on its own wins

The starter-only path wins if:

- Currawong delivers **fewer than about 12 sites a year** `[Hyp]`;
- a timed manual launch with the checklist takes **under about 45 minutes** and rarely fails;
- **none of 10 interviewed agencies** would pay for verified launch and care.

In that case: keep the template, add a dry-run-able launch script and the verification marker, and stop there.

---

## 4. Current provider feasibility

All "verified" items were read on the vendor's page on 25 Oct 2026. URLs are in Appendix E.

**Rule:** a capability this table marks `[Unknown]` is not designed in as automatic. It is treated as a manual gate until a spike proves otherwise.

### 4.1 Feasibility and permissions matrix

#### Sanity (CMS) — confidence: medium for configuration, low for delegated project creation

- **Verified capability, endpoints and workflows:**
  - **Access API (`v2025-07-11`):** `POST /access/{resourceType}/{resourceId}/robots` creates a robot with role grants, and its token is returned once only. There are endpoints for users, roles and invites. Permissions take the form `sanity.{resourceType}.tokens.create` and `….members.update`, and the allowed grants include `sanity.organization.projects`, `sanity.project.datasets` and `sanity.project.cors` `[Doc]`.
  - **Organisation-level robot tokens** are created in the manage UI (3 Jul 2025) `[Doc]`.
  - **Blueprints** declare CORS origins, webhooks, robot tokens, roles and functions:
    - Project stacks need an admin, or `sanity.project.blueprints.deploy`.
    - Organisation stacks (since 7 May 2026) need an organisation admin, or an organisation robot with `sanity.blueprints.deploy`.
    - There are at most 10 stacks per project or organisation `[Doc]`.
  - **CLI commands the repo already uses** `[Code]`: `projects create`, `tokens add`, `cors add`, `datasets import`, `schema deploy`, `dataset export` and `migration run --dry-run`.
  - **Vercel Marketplace** provisions the project, tokens and environment variables, and bills Free or Growth through Vercel. Its projects can't be deleted in Sanity manage `[Doc]`.
- **Authorisation and permissions:** no documented third-party OAuth `[Unknown]`. Today the options are the operator's CLI login, organisation or project robot tokens, or the Marketplace integration. Each client project needs:
  - a **Viewer** token for site reads;
  - an **Editor** token, server-side only, for forms and Stripe;
  - a deploy token (Editor) for schema deploy.
- **Prerequisites and cost** `[Doc]`:
  - Free has public datasets only and just the Administrator and Viewer roles.
  - **Growth is US$15 per seat per month**, adds five roles and allows private datasets.
  - An extra dataset costs US$999 a month.
  - Custom roles and SSO are Enterprise only.
- **Programmable:** robots, roles, invites, datasets, CORS, schema deploy and seed import.
- **Manual:**
  - creating the organisation and adding payment (Growth, needed for private datasets and the Editor role);
  - possibly creating the project itself `[Unknown]`;
  - accepting a project transfer `[Search]`.
- **Async behaviour and reconciliation:** mostly synchronous. Before creating anything, list projects in the organisation to look for the run's nonce.
- **First proof needed:** S1. Can an organisation robot with `sanity.organization.projects` create a project, a private dataset, CORS origins and tokens through the HTTP API? Do Blueprints apply CORS, webhooks and robots?

#### Supabase (database and auth backend) — confidence: medium; not needed in the MVP

- **Verified capability:** OAuth apps can act for a user on the Management API, and `POST /v1/projects` creates projects. The integrator must generate and keep the database password, because it can't be read back later. Rate limits apply per user, project and organisation `[Search: Supabase docs]`.
- **Authorisation and permissions:** OAuth2 with scopes the user approves; a published OAuth app.
- **Prerequisites and cost:** the user's Supabase organisation, region choice and billing. Pricing was not researched.
- **Programmable:** project creation, migrations through the API or CLI, Auth configuration, secrets.
- **Manual:** the user's consent, choosing the organisation, billing.
- **Async behaviour:** a newly created project takes a while to be ready; poll its status `[Unknown]`.
- **First proof needed:** only when a blueprint needs app data. It is not a replacement for Sanity.

#### GitHub — confidence: high

- **Verified capability** `[Doc]`:
  - Installation and user access tokens can create repositories (`POST /orgs/{org}/repos`, `POST /user/repos`, template generate) with **Administration** or **Repository creation** write permission.
  - Rulesets and branch protection need Administration write.
  - Actions secrets need Secrets write.
  - Template generate copies the default branch (or all branches) and can't select a tag.
- **Authorisation and permissions:**
  - Stage A: a fine-grained personal access token limited to the client organisations.
  - Stage B: a **GitHub App** with Administration, Contents, Secrets, Actions variables, Metadata, Workflows and Pull requests permissions.
- **Prerequisites and cost:** a client or Currawong organisation, whose owner must approve installing the App. The free tier is enough.
- **Programmable:** repository, contents, secrets, variables, rulesets and Dependabot.
- **Manual:** installing the App and its organisation policy (owner approval).
- **Async behaviour and reconciliation:** repository calls are synchronous; Actions runs are async. Reconcile by repository name, which is deterministic.
- **First proof needed:** S2. Push a pinned snapshot, set a ruleset and secrets with an installation token on a scratch organisation.

#### Vercel — confidence: high for the API, medium for third-party app authorisation

- **Verified capability:**
  - `POST /v11/projects` accepts `gitRepository {type, repo}`, `framework` and `environmentVariables` with `key`, `value`, `target`, an optional `gitBranch`, and a `type` of `encrypted`, `plain`, `sensitive` or `system` `[Doc]`.
  - **Sign in with Vercel** is generally available: OAuth 2.0 and OIDC, with access and refresh tokens, and scopes set per app `[Search: Vercel changelog]`.
  - Deployment `readyState` is one of `QUEUED`, `BUILDING`, `ERROR`, `INITIALIZING`, `READY` or `CANCELED` `[Search]`.
  - Protection Bypass for Automation uses the `x-vercel-protection-bypass` header `[Search]`, which the repo already uses `[Code]`.
  - **Vercel Workflows** is generally available `[Search]` (docs updated 4 Sep 2026 `[Doc]`).
- **Authorisation and permissions:**
  - Stage A: a team-scoped access token belonging to the operator.
  - Stage B: a Vercel Integration or a Sign in with Vercel app, with scopes chosen per app `[Unknown: exact scope names]`.
- **Prerequisites and cost:** **Pro is US$20 per member per month, including US$20 of usage. Hobby is for non-commercial use only** `[Search: third-party; verify on vercel.com]`.
- **Programmable:** project, environment variables, deployments, domains, protection, rollback.
- **Manual:** account and team creation, the Pro plan's payment details, connecting Vercel's GitHub integration to the organisation, DNS.
- **Async behaviour and reconciliation:** deployments are queued, then build. Use webhooks or polling with a timeout, and reconcile by project name.
- **First proof needed:** S2. Measure the time from `READY` to the first page served, and confirm the bypass header on protected previews.

#### Cloudflare — confidence: medium for the platform, **low for this starter**

- **Verified capability:**
  - **Self-managed OAuth clients have been generally available since 3 Jun 2026.** Scopes are chosen when the client is created and shown at consent. Clients are private until the domain is verified `[Doc]`. Users can choose specific accounts and revoke access (14 Apr 2026) `[Search]`.
  - **OpenNext** supports every Next 16 minor version, SSG, SSR, ISR, PPR, `'use cache'` and `after`. **It does not support Node middleware**, and Workers are limited to 3 MiB compressed on Free and **10 MiB on Paid** `[Doc]`.
  - **vinext** is "under active development" and "not yet a drop-in replacement". Its `cacheComponents` support is incomplete `[Doc]`.
  - Connecting Workers Builds to Git is documented only as a dashboard flow `[Search]`.
  - A Pages **Direct Upload project can never switch to Git** `[Search: Cloudflare docs]`.
- **Authorisation and permissions:** an OAuth token or API token with Workers Scripts, Workers KV, R2, D1 and Account Settings permissions `[Unknown: exact scope list]`.
- **Prerequisites and cost** `[Search: Cloudflare docs]`:
  - **Workers Paid is US$5 a month** and includes 10M requests and 30M CPU-ms.
  - CPU time is 30 s per invocation by default, up to 5 min.
  - Workers Builds include 3,000 minutes (Free) or 6,000 minutes (Paid), then US$0.005 a minute.
- **Programmable:** deploy with `opennextjs-cloudflare` and `wrangler` from CI; secrets and bindings.
- **Manual:** the account and the paid plan. Custom domains may need the zone moved to Cloudflare `[Unknown]`.
- **Async behaviour and reconciliation:** CI deploys are async. Wrangler versions support rollback `[Unknown: verify]`.
- **First proof needed:** S3. Re-run the README's failed build on current versions and record every degradation.

#### Expo / EAS — confidence: high for EAS, medium for Expo Launch

- **Verified capability** `[Doc]` unless marked:
  - **Plans:** Free gives 15 Android and 15 iOS builds in the low-priority queue. Starter is US$19 plus usage, with US$45 of credit. Production is US$199 with US$225 of credit. Builds then cost US$1–4 each.
  - **Workflows REST API** at `api.expo.dev`: `POST /v2/workflows/dispatch` and `GET /v2/workflows/runs/:id`. There is no documented cancel.
  - **Internal distribution:** Android gets an APK URL. iOS ad hoc needs a paid Apple team, works for at most 100 iPhones a year, and needs each device's UDID. A new membership can take 24–72 h before a device works.
  - **Submit to Android:** `eas submit` works for the first upload to the internal track, but the app must already exist in Play Console. It needs a Google service account key and an AAB.
  - **Submit to iOS:** needs the existing app record (`ascAppId`) and an App Store Connect API key for non-interactive runs. TestFlight processing takes about 10–15 minutes.
  - **SDK 58** was released on 15 Oct 2026.
  - Webhooks for BUILD and SUBMIT are signed with `expo-signature` `[Search]`.
  - Expo Launch is in beta `[Search]`.
- **Authorisation and permissions:** robot users, with role-limited access tokens, in the **client's** Expo organisation.
- **Prerequisites and cost:** an Expo account (Free tier for proofs). A paid Apple team for any iOS device build.
- **Programmable:** project init, builds, submissions, updates, workflow dispatch.
- **Manual:**
  - registering devices for iOS ad hoc;
  - the first Play Console app record;
  - App Store review.
- **Async behaviour and reconciliation:** builds are queued, then run. Use webhooks and polling. Build IDs are not success; a verified install is.
- **First proof needed:** S7. An Android APK built on the Free plan, installed on an emulator and a physical phone.

#### Apple — confidence: medium

- **Verified capability:**
  - **The Apple Developer Program is US$99 a year.** An organisation needs a **D-U-N-S number**, which is free but can take up to about 30 days `[Search]`.
  - The App Store Connect API can register bundle IDs. Community reports say **`POST /v1/apps` (creating the app record) is not allowed** `[Search, Unknown]`.
- **Authorisation and permissions:** an App Store Connect API key (Admin or App Manager role) in the **client's** team.
- **Prerequisites and cost:** organisation enrolment, a legal entity and the fee.
- **Programmable:** builds and TestFlight uploads through EAS, bundle IDs, profiles.
- **Manual:**
  - enrolment;
  - **creating the app record** `[Unknown]`;
  - store listing and privacy details;
  - Beta App Review for external testers `[Unknown]`;
  - App Review.
- **Async behaviour:** review queues (days) `[Unknown]`.
- **First proof needed:** iOS TestFlight prerequisites with a client-owned team (deferred).

#### Google Play — confidence: medium

- **Verified capability:**
  - **New personal accounts** (created after 13 Nov 2023) must run a closed test with **at least 12 testers opted in for 14 continuous days** before they can apply for production access `[Search: Google Play Help]`.
  - EAS Submit uploads to tracks `[Doc]`.
- **Authorisation and permissions:** a service account with Play Console access in the **client's** account.
- **Prerequisites and cost:** the registration fee and verification requirements `[Unknown]`. Prefer organisation accounts.
- **Programmable:** uploads to internal, closed and open testing and production tracks, and their release status, through EAS.
- **Manual:**
  - creating the app in Play Console;
  - the store listing, content rating and data-safety form;
  - recruiting closed-test testers;
  - review.
- **Async behaviour:** review queues `[Unknown]`.
- **First proof needed:** an internal-track upload (deferred).

#### Google Search Console — confidence: high for the API

- **Verified capability:**
  - **Search Analytics query** (page updated 11 Aug 2026) `[Doc]`:
    - dimensions are `country`, `device`, `page`, `query`, `searchAppearance`, `date` and `hour`;
    - `dataState` is `final`, `all` or `hourly_all`;
    - `rowLimit` is 1–25,000 and `startRow` pages through results;
    - the API "does not guarantee to return all data rows but rather top ones".
  - **Limits** (page updated 28 Aug 2025) `[Doc]`:
    - 1,200 queries a minute per site and per user;
    - 40,000 a minute and 30M a day per project;
    - **URL Inspection: 2,000 a day and 600 a minute per site**.
  - **Google's AI features guide** (updated 10 Dec 2025) `[Doc]`:
    - traffic from AI features is reported under **Performance → Web**;
    - "no special schema.org structured data" is needed;
    - appearing in AI features is not guaranteed.
- **Authorisation and permissions:** the `webmasters.readonly` scope. Sensitive scopes need Google verification `[Search]`; whether this scope counts as sensitive is `[Unknown]`. Alternatively, add a service account as a user on the property `[Unknown]`.
- **Prerequisites and cost:** a verified property owned by the client. The API is free.
- **Programmable:** analytics, sitemaps and URL Inspection.
- **Manual:** the client grants access, or adds the service account.
- **Async behaviour:** data arrives with a delay; `final` data lags.
- **First proof needed:** S6. A read-only import for one property, mapped to page IDs.

#### Bing Webmaster AI Performance — confidence: medium

- **Verified capability** (public preview since 10 Feb 2026) `[Doc]`:
  - it reports citations, average cited pages, grounding queries (a sample), page-level citations and trends;
  - it covers Copilot, Bing AI summaries and some partner integrations;
  - **no API or export is mentioned**.
- **Authorisation and permissions:** the Bing Webmaster account.
- **Prerequisites and cost:** a verified site. Free.
- **Programmable:** nothing confirmed.
- **Manual:** a monthly manual review.
- **Async behaviour:** not applicable.
- **First proof needed:** none needed. It is a manual source.

### 4.2 Vercel versus Cloudflare for _this_ starter

| Capability the starter uses                                   | Vercel                                                                                                            | Cloudflare (OpenNext)                                                                                                                               | Adapter can abstract?                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Next.js integration                                           | Native. The Next 16.4 docs say Vercel's adapter uses the public Adapter API `[Code: node_modules/next/dist/docs]` | OpenNext is not a verified adapter. Next's docs say Cloudflare is _working on_ one `[Code: Next docs]`                                              | No; it is a platform choice                                     |
| `src/proxy.ts` (pre-launch gate, style guide, redirects, A/B) | Supported                                                                                                         | **Not supported**: "Node Middleware … not yet supported" `[Doc]`. The README attempt failed `[Code]`                                                | **No.** It needs OpenNext support or a host-neutral gate design |
| Cache Components, `'use cache'`, `cacheLife`                  | Supported                                                                                                         | Listed as supported ("Composable Caching") `[Doc]`, but needs incremental-cache and tag-cache bindings (R2, KV, D1 or a Durable Object) `[Unknown]` | Partly: configuration differs, the code doesn't                 |
| `revalidateTag` and `updateTag` (webhook mode, live mode)     | Supported                                                                                                         | Depends on tag-cache bindings; consistency and latency unmeasured `[Unknown]`                                                                       | No; measure it                                                  |
| `after()` (IndexNow pings)                                    | Supported                                                                                                         | Listed as supported `[Doc]`                                                                                                                         | Yes                                                             |
| `next/og` OG images                                           | Supported                                                                                                         | Not mentioned `[Unknown]`                                                                                                                           | No; measure it                                                  |
| Images                                                        | The Sanity CDN loader bypasses the Next optimiser `[Code]`                                                        | The same loader works, so Cloudflare Images isn't needed                                                                                            | **Yes, already host-neutral**                                   |
| Edge Config redirects                                         | `@vercel/edge-config`                                                                                             | Not available. The README documents a fallback through PageView's `getRedirect` `[Code]`. KV is possible                                            | Yes, behind a small redirect-store module                       |
| A/B tests (`flags/next` plus a proxy rewrite)                 | Supported                                                                                                         | Blocked by the proxy                                                                                                                                | No. **Degrade: A/B off**                                        |
| Environment and secrets                                       | Variables per environment, with a `sensitive` type `[Doc]`                                                        | Worker secrets (runtime) plus build-time variables; `NEXT_PUBLIC_*` values are inlined at build                                                     | Partly: two places on Cloudflare                                |
| Preview URLs and protection                                   | Per-deployment and branch URLs. Deployment Protection with a bypass header `[Search, Code]`                       | Workers version preview URLs, protected through Access `[Unknown]`                                                                                  | Partly: the verifier needs a per-host auth strategy             |
| Deployed commit identity                                      | `VERCEL_GIT_COMMIT_SHA` in `/api/site-info` `[Code]`                                                              | A different variable, `[Unknown]`                                                                                                                   | Yes: map it to a neutral `DEPLOY_COMMIT_SHA`                    |
| Host detection                                                | `VERCEL_ENV` read in 10 files `[Code]`                                                                            | None                                                                                                                                                | Yes: a neutral `DEPLOY_ENV`                                     |
| Build trigger                                                 | Vercel's Git integration, or `POST /v13/deployments`                                                              | Workers Builds (Git connected in the dashboard) or **GitHub Actions + Wrangler** (fully scriptable)                                                 | Partly                                                          |
| Rollback                                                      | Instant Rollback, which the launch design depends on                                                              | Version rollback `[Unknown: verify]`                                                                                                                | No: a different runbook                                         |
| Limits                                                        | Function duration per plan `[Unknown]`                                                                            | **10 MiB compressed Worker**. CPU 30 s by default, up to 5 min `[Doc/Search]`. The embedded Studio's server bundle size is `[Unknown]`              | No                                                              |
| Logs                                                          | Runtime logs and Observability                                                                                    | Workers Logs, Tail Workers, Logpush `[Unknown: verify]`                                                                                             | No                                                              |
| Irreversibility                                               | Projects can be transferred between teams `[Unknown]`                                                             | **Pages Direct Upload can't switch to Git**. Don't use Pages for this starter                                                                       | Not applicable                                                  |
| Who pays                                                      | The team owner: Pro US$20 per member plus usage `[Search]`                                                        | The account owner: US$5 a month plus usage `[Search]`                                                                                               | Not applicable                                                  |

**What a host adapter cannot abstract:**

- runtime semantics (Node versus workerd with `nodejs_compat`), which affect Auth.js, Sentry and the Stripe SDK `[Unknown]`;
- middleware and proxy support;
- the cache store and how consistent revalidation is;
- whether environment variables are build-time or runtime;
- how preview URLs are authenticated;
- rollback mechanics, logs, limits and billing.

**Options for Cloudflare readiness, in order of preference:**

1. **Wait for support.** OpenNext gains Node middleware support, or Cloudflare ships its verified Adapter API adapter. Then re-run S3.
2. **Ship a "Cloudflare profile" with documented degradations:**
   - the pre-launch gate moves to a host-neutral implementation (needs a design spike: the 18 Oct decision says nothing cached may depend on launch state);
   - A/B tests are off;
   - KV redirects;
   - Studio may be deployed separately to `*.sanity.studio` to shrink the Worker (this overlaps plan task 61).
3. **A separate static-leaning variant.** Avoid it, because it doubles maintenance.

**Recommendation:**

- **Vercel is the only supported host in the MVP and the default once Cloudflare exists.** `[Rec]`
- Cloudflare becomes a supported choice only when **all** of these hold:
  - (a) the proxy works without a fork, or the profile in option 2 is approved;
  - (b) the full content, SEO and verification contract suite passes on Cloudflare preview URLs;
  - (c) revalidation latency is within 2× of Vercel's `[Hyp]`;
  - (d) the per-site cost and the degradations are written down;
  - (e) one real client or prospect asks for it.

### 4.3 What breaks the 15-minute website promise

- **First-time accounts:**
  - a Sanity organisation on Growth needs payment, because private datasets and the Editor role are Growth-only;
  - a Vercel Pro team, because Hobby is non-commercial;
  - GitHub organisation owner approval to install the App.
- **Provider queue time:** build-queue spikes. Measure, and report queue time separately.
- **Anything outside the window:** custom domains, DNS and certificates. They come after the preview, by design.
- **Cloudflare:** zone onboarding, if a custom domain is needed `[Unknown]`.
- **Errors:** a failed blueprint build. Prevented by gating releases on CI **before** a client launch, so per-launch checks stay smoke-level.

---

## 5. Architecture decision

### 5.1 Scored options

**Criteria and weights**, derived from the non-negotiable order of reliability, onboarding, speed, UX, maintainability and differentiation:

| Criterion                                 | Weight |
| ----------------------------------------- | -----: |
| Reliability and trust                     |     30 |
| Time to first value (within 30 days)      |     20 |
| Build and maintenance cost (solo)         |     20 |
| Operator UX                               |     10 |
| Extensibility (second host, mobile, SaaS) |     10 |
| Differentiation                           |      5 |
| Cash cost                                 |      5 |

Each option is scored 1–5 per criterion. The total is Σ(weight × score)/100, out of 5.00. All scores are `[Rec]` judgements, explained in a line.

**D-01 Product model**

| Option                                                                               | Rel | TTFV | Cost |  UX | Ext | Diff | Cash | **Total** | Why                                                                                                       |
| ------------------------------------------------------------------------------------ | --: | ---: | ---: | --: | --: | ---: | ---: | --------: | --------------------------------------------------------------------------------------------------------- |
| A1 Starter + scripts and Actions (status quo, extended)                              |   3 |    5 |    5 |   2 |   2 |    1 |    5 |      3.60 | Cheap and immediate, but an 8-step manual checklist fails silently (CORS, privacy, environment)           |
| A2 Hosted browser control plane with workers, now                                    |   3 |    1 |    1 |   5 |   5 |    4 |    3 |      2.65 | Best experience, but months away, and new code means new failure modes                                    |
| **A3 Lean hybrid: CLI + local browser wizard + ledger now, hosted later**            |   4 |    4 |    4 |   3 |   4 |    3 |    5 |  **3.90** | Reuses the wizard and `launch:check`, gives a resumable verified path, and the steps carry over to hosted |
| A4 Internal developer portal (Backstage or Port) as the front end                    |   3 |    2 |    2 |   3 |   3 |    1 |    4 |      2.55 | You still write every automation; built for engineering organisations                                     |
| A5 Vendor-native chain (Deploy Button + Sanity Marketplace + Blueprints + checklist) |   3 |    5 |    5 |   3 |   1 |    1 |    4 |      3.55 | Fast, but ownership and billing sit with Vercel, and there's no seed, pre-launch or verification          |

**Selected: A3.** Its lead depends on staying small. If the launcher grows beyond about 15 development days before gate G2, A1 or A5 wins.

**D-02 Shape and D-03 UI**

| Option                                                     | Rel | TTFV | Cost |  UX | Ext | Diff | Cash | **Total** |
| ---------------------------------------------------------- | --: | ---: | ---: | --: | --: | ---: | ---: | --------: |
| **Modular TypeScript monolith with a durable executor**    |   4 |    5 |    5 |   4 |   4 |    3 |    5 |  **4.40** |
| Microservices                                              |   3 |    1 |    1 |   3 |   5 |    3 |    3 |      2.40 |
| **Control-plane UI in Next.js 16 on Vercel** (when hosted) |   4 |    5 |    5 |   5 |   4 |    3 |    4 |  **4.45** |
| React Router 7 on any host                                 |   4 |    3 |    3 |   4 |   4 |    3 |    4 |      3.55 |
| SvelteKit                                                  |   4 |    2 |    2 |   4 |   4 |    3 |    4 |      3.15 |
| Vite SPA + Hono API                                        |   4 |    3 |    3 |   3 |   4 |    3 |    5 |      3.50 |

The two hosts that generated sites can target don't affect the control plane. It shares skills with the sites, not runtime code.

**D-04 Data, identity and tenancy**

| Option                                                                                     | Rel | TTFV | Cost |  UX | Ext | Diff | Cash | **Total** |
| ------------------------------------------------------------------------------------------ | --: | ---: | ---: | --: | --: | ---: | ---: | --------: |
| **Neon Postgres + Drizzle + Auth.js (Google Workspace allow-list), `org_id` on every row** |   4 |    4 |    4 |   4 |   4 |    3 |    5 |  **4.00** |
| Supabase (Postgres + Auth + RLS)                                                           |   4 |    4 |    4 |   4 |   4 |    3 |    4 |      3.95 |
| SQLite or libSQL file                                                                      |   3 |    5 |    4 |   3 |   2 |    3 |    5 |      3.60 |

- Neon with Drizzle matches the approved 14 Oct Ops stack. Supabase is a close alternative if SaaS arrives early.
- The ledger lives in Postgres **from Stage A**, so the CLI and the hosted app share one schema and nothing needs migrating.
- Tenancy is a single organisation (Currawong) until the SaaS gate, but every table carries `org_id`. Row-level security is added only for SaaS.

**D-05 Durable execution**

| Option                                                                  | Rel | TTFV | Cost |  UX | Ext | Diff | Cash | **Total** | Note                                                                                                             |
| ----------------------------------------------------------------------- | --: | ---: | ---: | --: | --: | ---: | ---: | --------: | ---------------------------------------------------------------------------------------------------------------- |
| **Stage A: no executor (a CLI state machine over the Postgres ledger)** |   4 |    5 |    5 |   2 |   2 |    3 |    5 |  **4.00** | One operator, one run at a time; resume = re-run with the same run ID                                            |
| **Stage B: Vercel Workflows (Workflow SDK)**                            |   4 |    4 |    5 |   4 |   4 |    3 |    4 |  **4.15** | Same platform, billing and observability. Open-source SDK. Generally available since about April 2026 `[Search]` |
| Inngest                                                                 |   4 |    4 |    4 |   4 |   4 |    3 |    4 |      3.95 | Most mature. One more vendor. **The fallback**                                                                   |
| Trigger.dev                                                             |   4 |    4 |    4 |   4 |   4 |    3 |    4 |      3.95 | Viable                                                                                                           |
| Temporal Cloud                                                          |   5 |    2 |    2 |   3 |   5 |    3 |    3 |      3.40 | Too much operational weight for one person                                                                       |
| Postgres queue (pg-boss or graphile-worker) with a long-running worker  |   3 |    3 |    3 |   2 |   3 |    3 |    4 |      2.95 | You rebuild durable sleeps and waits, and need a host that is always on                                          |

Steps are plain idempotent functions (Appendix B), so the executor can be swapped. Re-confirm the Stage B choice by running the S4 failure-injection harness against both Vercel Workflows and Inngest: about one day.

**D-06 Repositories**

| Option                                                                                                                     | Rel | TTFV | Cost |  UX | Ext | Diff | Cash | **Total** |
| -------------------------------------------------------------------------------------------------------------------------- | --: | ---: | ---: | --: | --: | ---: | ---: | --------: |
| **Keep the template repo. Add one new `nocturne-foundation` monorepo.**                                                    |   4 |    5 |    4 |   4 |   4 |    3 |    5 |  **4.20** |
| Big bang: convert the template into a monorepo (`apps/foundation`, `templates/next-sanity-site`, `packages/design-engine`) |   2 |    2 |    2 |   4 |   5 |    3 |    5 |      2.70 |
| Foundation inside the template repo (`scripts/foundation`)                                                                 |   3 |    5 |    3 |   3 |   2 |    3 |    5 |      3.40 |
| Separate repos for Foundation, a Design Engine package and content contracts, now                                          |   3 |    2 |    2 |   3 |   5 |    3 |    5 |      2.90 |

The big bang breaks every client's `git merge <tag>` update path and the CI generator jobs. Putting Foundation inside the template copies launcher code into every client site, which is why the wizard deletes itself.

**D-07 to D-11 in brief**

| Decision                           | Options and total                                                                                                                                                               | Selected                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| D-07 Client runtime                | Independent repo and resources per client **4.10**; shared multi-tenant runtime 2.55                                                                                            | Independent (every source agrees)                                                            |
| D-08 Web starter across hosts      | **One starter, isolated host modules, contract tests per host 4.00**; forked variants per host 3.20; lowest common denominator (drop the proxy and Edge Config everywhere) 3.35 | One starter. Fork only if the Cloudflare differences exceed about 10 files or 1 runtime path |
| D-09 Mobile framework              | **Expo managed workflow (CNG, config plugins, dev builds) + EAS 4.15**; bare React Native + Fastlane + hosted macOS CI 3.00                                                     | Expo. Escape hatch: `expo prebuild` and commit the native folders, still building on EAS     |
| D-10 Web + Mobile repository shape | **Two repos plus a versioned content API contract 3.90**; a combined client monorepo 3.30                                                                                       | Two repos. The web starter's shape and merge path stay identical                             |
| D-11 Client editing                | **Studio + Presentation + client mode 4.25**; a custom client content UI 2.65                                                                                                   | Studio (already built and audited)                                                           |
| D-12 Design configuration storage  | **Layered: repo defaults, then Sanity brand overrides, then Sanity section choices 4.25**; everything in the repo (a PR for every change) 3.60; everything in Sanity 3.40       | Layered, with one owner per field (§9.2)                                                     |

### 5.2 Control plane and resources

```
 Currawong operator ──browser──► NOCTURNE FOUNDATION  (repo: nocturne-foundation)
                                 Stage A: `nocturne launch` (CLI + local browser wizard, operator's own tokens)
                                 Stage B: hosted Next.js app on Vercel + Vercel Workflows (gated, G3)
                                 ├─ Blueprint registry ─ refers to template tag + commit SHA + blueprint.json
                                 ├─ Ledger (Neon Postgres): runs, steps, resources, timings, audit
                                 ├─ Steps: plan → apply → verify → (compensate)
                                 └─ Verifier: marker + `launch:check --json` + /api/site-info
                                       │            │             │              │ read-only
                    ┌──────────────────┘            │             │              └──────────────┐
                    ▼                               ▼             ▼                             ▼
          GitHub: client repo            Sanity: client org    Vercel project            Search Console
          (pinned snapshot, CI,          project, private      (env, protection,         property (client)
           rules, secrets)               dataset, robots,      deployments)              via service account
                    │                    CORS, schema, seed)        ▲
                    └──── push ─────────────────────────────────────┘ build
                                                                    ▼
          CLIENT WEBSITE (independent): Next.js + embedded Studio + Design Engine runtime + content
          contract + SEO utilities, all from the template release. Reads Sanity with a Viewer token.
          Never calls Foundation. Keeps running if Foundation is down or the relationship ends.
```

### 5.3 Repository boundary

**`CurrawongCreativeCo/nocturne` (this repo, the template)** is four things at once:

- **Blueprint 1** (`web-next-sanity`);
- the **Design Engine runtime** (sections, tokens, motion, presets);
- the **content contract** (schemas, fragments, migrations, typegen);
- the **SEO utilities** and the **verifier** (`launch:check`).

It keeps its tags, CHANGELOG and merge-based updates. Its additions are `blueprint.json` and a verification marker (§6.1).

**`CurrawongCreativeCo/nocturne-foundation` (new and private, created only after approval)**:

```
nocturne-foundation/
  apps/cli/                 `nocturne launch|resume|status|verify|detach` (Stage A)
  apps/web/                 hosted control plane (Stage B, gated)
  packages/blueprints/      registry: blueprint id → template repo, tag, SHA, spec
  packages/ledger/          Drizzle schema + migrations (runs, steps, resources, timings, audit)
  packages/steps/           Step contract, retry/backoff, idempotency, timing capture
  packages/providers/       github.ts, sanity.ts, vercel.ts (concrete; no generic interfaces yet)
  packages/verify/          marker check, launch:check JSON runner, site-info check
  tests/provider-contracts/ recorded fixtures + nightly sandbox runs
  tests/golden-path/        scripted launch against scratch accounts (manual trigger)
```

**When the Design Engine should become its own package or repo.** Use the triggers from `docs/template-packaging.md`, plus one more:

- merging updates routinely conflicts in Design Engine files across about 5 or more live sites;
- a fix must reach sites nobody is touching;
- **a second consumer needs it** (a mobile app needing tokens, or an outside agency).

Two cautions:

- Until a trigger fires, sections stay copy-in source code. The packaging note deliberately keeps section components project-owned.
- The strategy doc's phrase "Design Engine runtime ships as a versioned dependency" therefore describes Stage C+, not now (conflict C5).

### 5.4 How the Design Engine and Content Intelligence fit in

**Design Engine.**

- **Runtime:** inside each client repo, from the template release.
- **Authoring:** in Studio (the agency view).
- **Contract:**
  - the section contract (slots, layout, surface, motion) in `src/features/pages/schemas/sections`;
  - tokens in `tokens.json`;
  - overrides in `designSettings` (§9).
- **Foundation knows** only the blueprint version and whether the design contract tests passed.

**Content Intelligence.**

- **Deterministic checks** (structured data, metadata, crawlability) stay in the template (`launch:check`, JSON-LD utilities), so every site carries them.
- **Foundation adds** Search Console import, mapping to Sanity documents, opportunity cards and change history (Stage E). It reads Sanity read-only to map URLs to document IDs.

### 5.5 Provider boundaries

**Stage A: no generic interfaces.**

- Each provider module exports concrete steps.
- The only shared contracts are `Step` and `ResourceRecord` (Appendix B).

**Role interfaces arrive with their second implementation.**

| Proposed name (instead of)                             | Introduced when                           | Why this name                                                            |
| ------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------ |
| `WebHost` (WebDeploymentProvider)                      | Stage C, when Cloudflare joins Vercel     | It hosts and deploys; the capability flags carry the differences         |
| `CmsProvisioner` (ContentProvider)                     | A second CMS blueprint, which is unlikely | It provisions and verifies a content store; it doesn't "provide content" |
| `SourceHost` (GitProvider)                             | GitLab or another host is requested       | Repositories, CI secrets, rules                                          |
| `BackendProvisioner` (DatabaseProvider + AuthProvider) | A blueprint needs app data                | Supabase bundles both. Split only when a second vendor needs it          |
| `MobileBuildService` (MobileBuildProvider)             | The mobile stage                          | Builds and internal distribution (a capability)                          |
| `StoreChannel` (MobileDistributionProvider)            | The mobile stage                          | App Store and Play tracks through EAS Submit                             |
| `SearchDataSource` (SearchDataProvider)                | Stage E                                   | Search Console via API; Bing as a manual import                          |

**Every interface has:**

- a `capabilities` map, where an unsupported capability carries an explicit reason;
- lifecycle methods;
- `native()`, an escape hatch to the raw SDK;
- contract tests that run per implementation, against recorded fixtures and a nightly sandbox.

**The bounded second-provider experiment is Cloudflare as a `WebHost`** (S3, then Stage C). It is a stated product requirement and the hardest abstraction (runtime behaviour).

**A second CMS (Payload, Contentful, Strapi or Directus) is not an adapter.** It is a new blueprint:

- new schemas;
- a replacement for Studio and Presentation;
- a different preview protocol;
- a different client editing experience;
- a new mapping to the content contract;
- new migrations.

The Contentful lane (tasks 102–105) migrates content **into** Sanity, which is the right direction.

### 5.6 Sources of truth and ownership

**Two ownership modes.** Each project records its `ownershipMode`:

- **Managed** (the default, per the approved direction): the client's own Sanity organisation (client billing, Currawong administers it); the repo in Currawong's GitHub organisation and the Vercel project in Currawong's team, both transferable.
- **Client-owned:** every resource sits in the client's accounts, and Currawong is a member.

| Resource                                       | Source of truth                                    | Owner, managed                                                           | Owner, client-owned | Foundation stores                                                                    | Who pays                                        | On offboarding                                                          |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Runs, ledger, audit, timings                   | Foundation database                                | Currawong                                                                | Currawong           | Everything                                                                           | Currawong                                       | Export the client's records on request; keep the audit trail per policy |
| Source code, CI                                | GitHub repo                                        | Currawong organisation (transferable)                                    | Client organisation | Repo ID and URL, default branch, last verified SHA                                   | GitHub (free tier)                              | Transfer the repo; uninstall the App                                    |
| Content, brand colours, section design choices | Sanity dataset                                     | Client's Sanity organisation (client billing), administered by Currawong | Client organisation | Project ID, dataset, robot IDs. **No token values in Stage A**; encrypted in Stage B | Client (Growth seats)                           | Hand administration to the client; remove Currawong; revoke robots      |
| Design system defaults, section types, code    | Template release, in the client repo               | As for source code                                                       | As for source code  | Blueprint ID and version                                                             | Not applicable                                  | Already in the client's repo                                            |
| Deployments, environment variables, domains    | Vercel project (or Cloudflare Worker)              | Currawong team (transferable)                                            | Client team         | Project ID, deployment IDs, verified URLs                                            | Currawong passes it through, or the client pays | Transfer the project; remove Currawong                                  |
| Mobile builds, updates, credentials            | EAS project, in the client's Expo organisation     | Client organisation, with Currawong as a member                          | Client              | Project ID, build and submission IDs                                                 | Client                                          | Remove Currawong                                                        |
| Signing keys                                   | EAS credentials, Google Play App Signing, Apple    | Client accounts, always                                                  | Client              | **Never**                                                                            | Not applicable                                  | Already the client's                                                    |
| App records, listings                          | App Store Connect, Play Console                    | **Client developer accounts, always**                                    | Client              | App IDs, statuses                                                                    | Client (fees)                                   | Nothing to move                                                         |
| Search data                                    | Search Console property                            | Client                                                                   | Client              | Derived metrics, import dates                                                        | Free                                            | Remove the service account; delete derived data on request              |
| Per-client billing                             | Each provider's account, plus Currawong's invoices | Not applicable                                                           | Not applicable      | Plan and pass-through amounts                                                        | Not applicable                                  | Final invoice                                                           |

**Offboarding rule: detach, never destroy.**

- `nocturne detach <project>` revokes Foundation's tokens and app installations, writes a transfer checklist, and marks the project `detached`.
- It deletes no provider resource.
- Deleting provider resources is a separate manual act by the resource owner, with a second confirmation, and it is never triggered by billing state (as in the 14 Oct strategy, Part 6).

---

## 6. Golden-path specifications

### 6.1 Website on Vercel (the MVP path)

**Blueprint**

- `web-next-sanity@<template version>` resolves to a template tag, a commit SHA and a `blueprint.json` (Appendix B.1).
- A version can be launched only if CI on that tag is green: `check`, all generator jobs, four e2e shards, the isolated jobs and Lighthouse. Per-client launches then run smoke checks only, never the 20-minute suite. `[Rec]`

**Preconditions (preflight, read-only)**

- Tokens are valid and have the required scopes.
- The GitHub owner is reachable.
- The Vercel team exists, and its plan is Pro or the client accepts Hobby's non-commercial terms. Default: Pro.
- The Sanity organisation exists **and is on Growth**: Free can't make private datasets or Editor roles `[Doc]`.
- The repo and Vercel project names are free.
- The blueprint tag exists and its CI is green.

**Inputs.** The wizard has six fields; everything else is under _Advanced_.

| Field               | Default                  | Notes                                                                                                                                                                                                               |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client name         | none                     | Becomes `site.profile.ts` → `client.name`                                                                                                                                                                           |
| Project slug        | Derived from the name    | One slug for the repo, the Vercel project and the Sanity project label (`<slug> · nk-<runKey>`)                                                                                                                     |
| Ownership           | Managed                  | Managed or client-owned (§5.6)                                                                                                                                                                                      |
| GitHub owner        | Currawong's organisation | The client's organisation in client-owned mode                                                                                                                                                                      |
| Sanity organisation | Picked from a list       | Must be on Growth                                                                                                                                                                                                   |
| Start as            | Pre-launch link page     | Matches plan task 127. The alternative is "full site"                                                                                                                                                               |
| _Advanced_          | none                     | Blueprint version, Vercel team, function region (`syd1` suggested for Australian audiences `[Unknown: verify the region list]`), site URL, feature switches from `site.profile.ts`, live or webhook mode, CMS brand |

**Ordered steps.** Each step has `plan`, `apply`, `verify` and, where it makes sense, `compensate`.

| #   | Step             | What it does                                                                                                                                                                                                                                                                                                                                                                                                             | Reconcile before creating                                                                | Verify                                                     | Compensate (only resources this run created, before handover)                                      |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | `preflight`      | The read-only checks above                                                                                                                                                                                                                                                                                                                                                                                               | Not applicable                                                                           | All pass, or the run is `blocked` with fix links           | Not applicable                                                                                     |
| 2   | `sanity.project` | Creates the project in the organisation, labelled with the run nonce                                                                                                                                                                                                                                                                                                                                                     | List the organisation's projects and match the nonce                                     | `GET` project                                              | Delete only if it holds nothing but seed documents, after confirmation                             |
| 3   | `sanity.dataset` | Creates `production` as **private**                                                                                                                                                                                                                                                                                                                                                                                      | List datasets                                                                            | `aclMode` is private (the `check:dataset` logic)           | Same as step 2                                                                                     |
| 4   | `sanity.access`  | <ul><li>Creates robots: a Viewer (site reads), a Deploy token (Editor, for CI schema deploy), a Migration read token (Viewer), and an Editor (server writes) only when forms, pricing or enquiries are on.</li><li>Each token value is written **straight into** Vercel env or GitHub secrets **within the same step**.</li></ul>                                                                                        | List robots by label                                                                     | Token works (`GET` a query returns 200)                    | If a value was lost (a crash between create and store): revoke that robot and create a new one     |
| 5   | `sanity.cors`    | Adds `http://localhost:3000` (with credentials) and the production URL (with credentials). Uses Blueprints if S1 confirms them                                                                                                                                                                                                                                                                                           | `cors list`                                                                              | The origin appears in the list                             | Remove the origin                                                                                  |
| 6   | `sanity.seed`    | Imports the template's seed (`scripts/setup/seed.mjs`, from the pinned checkout) with `--missing`. **Adds `siteIdentity.verificationMarker = nk-<runKey>`**                                                                                                                                                                                                                                                              | `--missing` already makes it idempotent                                                  | A GROQ query returns the marker                            | Not applicable (content stays)                                                                     |
| 7   | `github.repo`    | Creates an empty private repo `<owner>/<slug>`                                                                                                                                                                                                                                                                                                                                                                           | `GET` repo: it is ours if the ledger says so; a stranger's repo is a collision, so block | The repo exists and is empty                               | Delete only if it has no commits other than ours, after confirmation                               |
| 8   | `github.config`  | Sets Actions variables (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`) and secrets (`SANITY_AUTH_TOKEN`, `SANITY_DEPLOY_TOKEN`, `SANITY_MIGRATION_READ_TOKEN`, plus `SANITY_WRITE_TOKEN` if needed). Enables Dependabot                                                                                                                                                                                  | List variables and secret names                                                          | Names present                                              | Not applicable                                                                                     |
| 9   | `vercel.project` | <ul><li>`POST /v11/projects` with `gitRepository`, `framework: "nextjs"` and **all build-time and runtime environment variables before the first push**, because `NEXT_PUBLIC_*` values are inlined at build.</li><li>Generates `PREVIEW_ACCESS_SECRET` and `PRELAUNCH_PREVIEW_TOKEN`.</li><li>Sets `NEXT_PUBLIC_SITE_URL` from the project's production alias.</li></ul>                                                | `GET` the project by name                                                                | Environment variable keys present (values never read back) | Delete only if it has no deployments of commits other than ours                                    |
| 10  | `github.push`    | Pushes the **template history up to the pinned tag**, plus one commit "Configure <client> from web-next-sanity@x.y.z" containing `site.profile.ts`, `studio-brand.json`, `nocturne.json` (blueprint ID, version, run ID; never secrets) and the same removals the wizard makes. **History is kept on purpose**: the README's update path (`git merge <tag>`) needs a merge base, and GitHub's template-generate drops it | The remote `main` SHA is either empty or ours                                            | Remote `main` equals the expected SHA                      | Not applicable                                                                                     |
| 11  | `vercel.wait`    | The push triggers a production deployment. Find it by commit SHA, then poll `readyState` (with webhooks speeding it up later) until `READY`, `ERROR` or `CANCELED`, with a 20-minute timeout                                                                                                                                                                                                                             | Find the deployment by SHA                                                               | `READY`, and the alias resolves                            | On `ERROR`: classify it as retryable (queue, quota) or terminal (build) and attach the log excerpt |
| 12  | `github.rules`   | Applies the "Protect main history" ruleset (no deletion, no force-push) and the "Require CI" ruleset (`check`, `e2e`), after the initial push                                                                                                                                                                                                                                                                            | List rulesets                                                                            | Present                                                    | Remove                                                                                             |
| 13  | `verify`         | The independent checks below                                                                                                                                                                                                                                                                                                                                                                                             | Not applicable                                                                           | All required checks pass                                   | Not applicable                                                                                     |
| 14  | `report`         | <ul><li>Links: the website, Studio (`/studio`), the repository, Sanity manage and the Vercel project.</li><li>The timing breakdown.</li><li>Next actions: invite the client through the Access API (Contributor or Editor, never Administrator); connect a domain (runbook task 123); brand basics; a rehearsal (task 128).</li></ul>                                                                                    | Not applicable                                                                           | Not applicable                                             | Not applicable                                                                                     |

The schema deploy runs in the client's own CI (`sanity.yml` on push to `main`, once `SANITY_DEPLOY_TOKEN` is set). It is **not on the critical path**: the site renders without a deployed schema. The run records it as a non-blocking check.

**Independent verification (step 13).** These run from Foundation's network, never by trusting a provider status:

1. **The marker.** `GET https://<production alias>/` returns 200, and the HTML has `<meta name="nocturne:marker" content="nk-<runKey>">`.
   - The marker comes **from Sanity content** (`siteIdentity`), so it proves that CMS → query → render works.
   - It is unique per run, so a stale cache can't fake it.
   - It works in pre-launch mode because the site shell renders on the link page too.
   - The site needs a small template change for this (§13.3). For the spikes, use the seeded site name with the nonce appended, which already shows up in `<title>`.
2. **The deployed identity.** `/api/site-info` reports:
   - a `templateVersion` equal to the blueprint version;
   - `commit` equal to the pushed SHA;
   - `launch.status` as expected.
3. **The metadata.**
   - `<title>` contains the client name;
   - the canonical URL equals `NEXT_PUBLIC_SITE_URL` plus the path;
   - pre-launch robots rules hold.
4. **The JSON-LD.**
   - it parses;
   - the `#organization` and `#website` nodes exist with unique `@id`s;
   - `name` matches `siteIdentity`.
5. `/studio` returns 200.
6. Sanity CORS includes the production URL.
7. The dataset is private.
8. `npm run launch:check -- <url> --prelaunch --json` reports no `fail`. This runs from the cloned client repo, so the pinned version's own checks are used.

**A "verified preview" is defined as** the production deployment on the `*.vercel.app` alias, still in pre-launch, passing checks 1–8.

- The private full-site preview link (`PREVIEW_ACCESS_SECRET`, from the 18 Oct design) is reported alongside it.
- Nothing is called verified because a deployment was queued, got an ID or finished building.

**Secrets**

- Token values never enter the ledger, logs, report or repository.
- In Stage A, operator credentials come from the environment or the OS keychain.
- In Stage B, provider tokens use envelope encryption (§8.3).

**Rollback**

- Before handover: an explicit, confirmed "Undo what this run created". It applies only to resources the run created that show no outside activity.
- After launch: Vercel Instant Rollback and the launch-by-PR process (18 Oct design).

**Timing definition**

| Measure                      | Starts                                                               | Ends                                                            |
| ---------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Wall-clock**               | The operator presses **Launch** (t0)                                 | Verification passes                                             |
| Form time (reported apart)   | The wizard opens                                                     | t0                                                              |
| **Hands-on**                 | Each interval where the run is `blocked` waiting on the user's input | Input received                                                  |
| **Consent and approval**     | `blocked` on a provider consent, payment or owner approval           | The provider confirms                                           |
| **Provider queue and build** | Push                                                                 | `READY` (split into queued and building from deployment events) |
| Nocturne processing          | The rest of the wall-clock time                                      | Not applicable                                                  |

**Targets.** `[Hyp]` until measured; the medians and p90s are reported once there are at least 10 runs.

- **Connected accounts:**
  - wall-clock median ≤ 8 minutes and p90 ≤ 15 minutes (the strategy doc's targets);
  - hands-on time ≤ 3 minutes.
  - If the build alone takes more than 6 minutes at the median, the target becomes "median ≤ build median + 4 minutes", and the report shows it.
- **First time:** there is no 15-minute promise.
  - Each manual gate (Growth payment, Pro team, App installation) is listed with who must do it.
  - Target: median ≤ 45 minutes **excluding** waits on a third party.
- **Tracked apart:** rehearsal runs on scratch accounts are counted separately from real launches.

### 6.2 Website on Cloudflare (deltas only, after the gate)

The blueprint is the same, with `host: "cloudflare"` in `blueprint.json` and the site profile.

**What's added:**

- OpenNext configuration and `wrangler.jsonc` bindings: R2 for the incremental cache, D1 or a Durable Object for the tag cache, and KV for redirects `[Unknown: exact set]`.
- `.github/workflows/deploy-cloudflare.yml`, which runs the build and deploy with `CLOUDFLARE_API_TOKEN` and the account ID as Actions secrets.
- Worker secrets set through Wrangler or the API, and build-time variables as Actions variables.
- A version preview URL for verification.

**What's different:**

- Workers only. Not Pages, and never Direct Upload.
- The verifier authenticates previews per host (a Cloudflare Access service token, or public previews) `[Unknown]`.
- `/api/site-info` reports `host` and `degraded: ["abTests", "edgeRedirects", …]`.

### 6.3 Mobile app: Expo and React Native (gated; Android first)

**Blueprint.** `mobile-expo@0.1.0`: Expo **SDK 58** (released 15 Oct 2026 `[Doc]`), Expo Router and EAS. It is a separate starter repository.

**Platform matrix.** "Tested" means CI and one real device per row.

| Target                 | Test basis                                                                                                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Android                | <ul><li>CI: an emulator with a Maestro smoke test.</li><li>A physical phone, with the model and OS recorded.</li><li>The minimum API level follows the SDK 58 defaults `[Unknown]`.</li></ul>     |
| iOS                    | <ul><li>A simulator build.</li><li>One physical iPhone through ad hoc or TestFlight once the iOS stage starts.</li><li>The minimum iOS version follows the SDK 58 defaults `[Unknown]`.</li></ul> |
| Web (React Native Web) | **Not offered.** The website is the Next.js site, which is better for SEO and editing                                                                                                             |

**Inputs**

- **Identity:** app name and slug.
- **Identifiers:** the bundle ID and package (reverse-DNS of the client's domain, format-checked).
- **Accounts:** the client's Expo organisation (a robot token with a limited role).
- **Brand:** an icon (1024 px) and a splash screen generated from brand assets.
- **Deep links:** a scheme, plus associated domains when a web project exists.
- **Permissions:** none by default. Each one added needs a written reason, for the store privacy forms.
- **Configuration:**
  - `eas.json` with development, preview and production profiles;
  - the content API base URL (§6.4).

**Lifecycle.** This is separate from the web vocabulary, and the UI never shows a single "Live" badge for both.

```
repo_ready → eas_linked → credentials_ready → build_queued → build_running → artifact_ready
  → install_verified (= "Mobile preview")
  → internal_distribution (link or QR to named testers)
  → store_testing (Play internal or closed track, TestFlight internal or external)
  → submitted → in_review → approved | rejected → resubmitted …
  → released (phased %) → superseded
```

**Verification**

- `artifact_ready` is **not** success. A build ID alone proves nothing.
- `install_verified` needs **both**:
  - (a) CI installs the APK on an emulator, and a Maestro test reads the content marker on the About screen;
  - (b) a named tester confirms the marker on a physical device, recorded with device model and OS and the time.

**Credential custody**

- The Android upload keystore is generated and held by EAS in the **client's** Expo organisation, with an exported backup in the client's password manager. The app signing key sits with Google Play App Signing.
- iOS certificates and profiles are managed by EAS using the client's App Store Connect API key.
- **Foundation holds no signing material.**

**Updates**

- EAS Update channels are kept per profile, and `runtimeVersion` uses the fingerprint policy:
  - a JavaScript-only change can ship over the air;
  - a native change forces a new binary and another store review.
- Store rules on over-the-air changes must be checked against Apple's and Google's current policies `[Unknown]`.
- **Rollback:** republish the previous update. A binary can't be reverted, so pause the phased release and ship a fixed build.

**An honest mobile timing table** `[Hyp]` unless marked:

| Milestone                                                    | Preconditions                                                                   | Wall-clock                                                                | Unavoidable manual steps                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------- |
| Android internal APK installed (connected Expo organisation) | Starter, robot token                                                            | 30–45 minutes (queue plus build `[Unknown]`)                              | Installing on the phone                         |
| iOS ad hoc install                                           | Paid Apple team, device registered                                              | About 60 minutes; **plus 24–72 h** for a new membership or device `[Doc]` | Registering the device UDID                     |
| TestFlight internal                                          | Apple team, app record, App Store Connect key                                   | Build + about 10–15 minutes of processing `[Doc]`                         | **Creating the app record** `[Unknown via API]` |
| Play internal testing                                        | Play account, app created                                                       | Build + upload                                                            | Creating the app, listing basics                |
| External TestFlight                                          | Beta App Review `[Unknown]`                                                     | Days `[Unknown]`                                                          | Review                                          |
| Play production (personal account)                           | **Closed test: 12 testers for 14 days** `[Search]`                              | **14 days or more**                                                       | Recruiting testers                              |
| App Store or Play release                                    | Listing, privacy and data-safety forms, review                                  | Days to weeks `[Unknown]`                                                 | Review and resubmission                         |
| First-time enrolment                                         | Apple organisation (D-U-N-S, up to about 30 days `[Search]`), Play verification | Days to weeks                                                             | Identity and business checks                    |

**What the mobile path promises:** "an installable test build on Android in under an hour with connected accounts". It promises **nothing** about store availability.

### 6.4 Web and mobile together (an optional blueprint)

- **Two repositories**, one per starter. The web starter keeps its shape and merge path.
- **What's shared:**
  - the content contract (GROQ queries and generated types);
  - validation schemas;
  - design tokens: `tokens.native.ts`, generated from `tokens.json` plus a `designSettings` snapshot;
  - a versioned **content API**.
- **No universal UI components.**
- **Data path.** A private dataset can't be read from an app without shipping a token, so a Sanity token must **never** be embedded in a mobile app. Instead:
  - The web app exposes `GET /api/content/v1/*` route handlers.
  - They serve public content only, are rate-limited, and are cached behind the same `'use cache'` boundary and tags, so the request budget holds.
  - The mobile app uses a typed client generated from those routes, published to GitHub Packages or vendored by a CI PR.
- **Deep links.** The web app serves `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json`, generated from the mobile app's identifiers. The blueprint declares this cross-project dependency.
- **Signed-in users.** Auth.js on the web is cookie-based, and a mobile app needs token auth. A mobile app with accounts is the trigger for a `BackendProvisioner` (for example, Supabase Auth). It is out of scope until a client needs it.

---

## 7. Browser-first UX

### 7.1 Journeys, narrated

**First login, connections and preflight (Stage B; Stage A asks for the same things on one local page)**

1. The operator signs in with Google Workspace (an allow-list) and lands on **Integrations**.
2. Four cards are shown, each with "Connected as …", its scopes, when it was last checked, and a **Test** button:
   - **GitHub:** install the App on an organisation;
   - **Vercel:** connect a team;
   - **Sanity:** paste an organisation robot token, or show the manual steps if S1 failed;
   - **Search Console:** shows the service-account email to add as a user.
3. Preflight then runs read-only checks. Each failure names its fix. For example: "Sanity organisation _Acme_ is on Free. Private datasets need Growth. Open billing →".

**Launching a website**

1. **New project → Website.** The blueprint card reads "Business website · 1.9.0 · tested 23 Oct · 2,000 e2e checks green".
2. The operator fills in **Client** _Acme Physio_ and **slug** `acme-physio`.
3. **Ownership:** _Managed_ (with an explanation).
4. **Host:** _Vercel (recommended)_. _Cloudflare_ is shown but disabled, with "Not yet supported for this blueprint — what's missing" linking to the degradation list.
5. **Start as:** _Pre-launch link page_.
6. **Review** lists exactly what will be created, in which account, and who pays:
   - "Sanity project in _Acme Physio_ (client pays Growth)";
   - "Repo `currawong/acme-physio`";
   - "Vercel project in _Currawong_".
7. **Launch.** The timeline streams each step's status.
8. At about 9 minutes: _"Verified. acme-physio.vercel.app shows the seeded marker nk-7f3a; 14 of 14 checks passed (metadata, structured data, privacy, Studio)."_
9. Links appear to Website, Studio, Repository, Sanity and Vercel.
10. Next actions: invite the client, connect a domain, set brand basics.

**Launching a mobile test build (gated)**

1. **New project → iOS + Android app.**
2. The blueprint card reads "App · Expo SDK 58 · tested on Android 15 / iOS 26" `[Unknown: versions]`.
3. Identifiers are suggested from the domain (`au.com.acmephysio.app`).
4. The Expo organisation is the client's; the robot token is checked.
5. **Build Android test app.** The timeline shows "queued (EAS)", then "building", then "artifact ready".
6. Status then moves to _Waiting for install check_. It shows a QR code, and a CI emulator test runs.
7. A tester taps "I see marker nk-91c2 on the About screen", and the status becomes **Mobile preview verified**.
8. iOS is shown as a checklist with owners:
   - "Apple Developer membership (client) — not yet";
   - "Register test devices (testers)";
   - "App record in App Store Connect (manual)".

**Submitting to the stores (gated)**

1. **Releases → Prepare store submission.**
2. A checklist covers listing text, screenshots, the privacy and data-safety answers, and the version and build number. Each item says which **account** it lives in and whether Nocturne can fill it in or the client must.
3. **Submit to TestFlight or Play internal** goes through EAS Submit.
4. Then **Submit for review**. For App Store submission, that step is a deep link into App Store Connect.
5. The store status (in review, rejected with the reason, approved, released at X%) is read back. A **rejection** opens a resubmission checklist with the store's reason quoted.

**Recovering from problems**

| Situation                                | What the user sees                                                                                                                                                     | What the system does                                                                                              |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Integration disconnected (token revoked) | "Vercel access for _Currawong_ was revoked at 10:42. Projects are unaffected; launches and checks are paused." **Reconnect**                                           | Marks the connection `revoked`, pauses runs at their next step, and changes nothing in the provider               |
| Provider outage                          | "GitHub is reporting problems (status link). Your run paused after _Sanity project created_. It resumes automatically when GitHub recovers, or you can resume it now." | Exponential backoff, a circuit breaker after N failures, and the run held as `blocked` with its next attempt time |
| Quota or rate limit                      | "Vercel asked us to wait 60 s (rate limit). No action needed."                                                                                                         | Honours `retry-after` and the GitHub `x-ratelimit-*` headers                                                      |
| Failed build                             | "Build failed: `NEXT_PUBLIC_SITE_URL` is missing (excerpt). Fixed automatically? No. **Set it and retry**"                                                             | Classifies the failure, attaches the log excerpt, and retries the build step only                                 |
| Invalid Sanity schema or seed            | "The starter content didn't import: field `heroTitle` isn't in schema 1.9. This blueprint is broken, so we've stopped. Nothing else was created after this step."      | Marks the blueprint release **quarantined** for new launches                                                      |
| Half-finished project                    | The project card shows "**Partially created**: repo and Sanity project exist; Vercel not linked." **Resume** · **Detach** · **Undo what this run created**             | Resume continues from the first incomplete step. Undo is limited to resources this run created, with confirmation |

**Managing a launched project.** The **Project Overview** shows:

- Links to everything.
- **Website lifecycle:** latest deployment and its verification, launch state, domains.
- **Content:** Studio link, last publish, content health.
- **Releases:** template version against the latest, with an "Update PR" button (plan task 53).
- **Environments:** variable _names_ and where each is set (values never shown).
- **Access:** Sanity members and roles, GitHub collaborators.
- **Activity:** every action, with actor and reason.
- **For mobile projects:** a second lane for builds, testers, store tracks and review status.

**Agency design editing versus client content editing.**

- **Both edit in Studio**:
  - agency staff see the Design tab, Brand colours, presets, variants and the advanced controls;
  - clients (Editor or Contributor) see content fields and approved sections, and publish through Presentation.
- Foundation's **Design** screen does not edit design (that would compete with Studio). It shows:
  - the blueprint's tokens;
  - the active Brand colours, read-only;
  - the contrast report from the last verification;
  - a link into Studio's Design area.
- A **code capability change** (a new section type) is shown as "Needs a code change: open an issue in the repo".

**Search Health (Stage E).**

- Four tabs: **Health** (deterministic errors first), **Opportunities**, **Search performance** and **Change history**.
- Each opportunity card shows the evidence (query, page, period, impressions, CTR and position), the data's caveats (top rows only, freshness), the suggested action and the effort.
- **Preview the change** opens Presentation on a draft. Publishing is a human action in Studio. The change is then recorded with its Sanity document revision and date (§9.4).

### 7.2 Screen map

| Screen                  | Purpose                                                                                                              | MVP stage                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Home / Projects         | Every project with lifecycle badges (web: verified, launched; mobile: preview, testing, store) and "needs attention" | B                         |
| New Project             | Type (Website, iOS + Android, Website + App), blueprint, host, ownership; six fields; Advanced collapsed             | **A (local)**, B          |
| Run timeline            | Live steps, timings, blocked reasons, resume and undo                                                                | **A (local)**, B          |
| Project Overview        | Links, both lifecycles, next actions                                                                                 | B                         |
| Deployments / Builds    | Web deployments with their verification; mobile builds with install checks                                           | B                         |
| Releases / Store status | Template update PRs; store tracks, review, rollout                                                                   | B (web), mobile stage     |
| Content / Data          | Studio links, content health, dataset privacy, backups                                                               | B                         |
| Design                  | Read-only tokens and Brand colours, contrast report, link to Studio                                                  | B                         |
| Search Health           | Health, Opportunities, Performance, Change history                                                                   | E                         |
| Environments / Secrets  | Variable names, scopes, where each is stored; rotate actions                                                         | B                         |
| Integrations            | Connections, scopes, test, revoke                                                                                    | **A (local, minimal)**, B |
| Team / Access           | Staff roles (owner, staff); client editors per site (Access API)                                                     | B                         |
| Templates (Blueprints)  | Versions, CI status, quarantine, release notes                                                                       | B                         |
| Activity / Audit        | Every write: actor, before, after, reason                                                                            | **A (ledger only)**, B    |
| Billing                 | Per-client pass-through view only. **No SaaS billing until the SaaS gate**                                           | Later                     |

### 7.3 Wireframes (concepts, not designs)

```
NEW PROJECT                                                     [Esc] Cancel
 What are you creating?   (•) Website   ( ) iOS + Android app   ( ) Website + app
 Blueprint                Business website · 1.9.0 · CI green 23 Oct      [change]
 Client name              [ Acme Physio                         ]
 Project slug             [ acme-physio            ]  ✓ free on GitHub and Vercel
 Ownership                (•) Managed by Currawong  ( ) Client-owned accounts   (?)
 Host                     (•) Vercel (recommended)  ( ) Cloudflare — not yet supported (why?)
 Start as                 (•) Pre-launch link page  ( ) Full site
 ▸ Advanced (blueprint version, Vercel team, region, features, site URL)
                                              [ Review what will be created → ]

RUN  acme-physio · nk-7f3a                              wall-clock 06:41 · hands-on 00:52
 ✓ Preflight                         0:14
 ✓ Sanity project + private dataset  0:38   (Acme Physio org · client pays Growth)
 ✓ Tokens → Vercel + GitHub secrets  0:09
 ✓ Repository + pinned 1.9.0         0:31
 ✓ Vercel project + environment      0:06
 ● Building on Vercel                4:52   queued 0:21 · building 4:31
 ○ Verify (marker, metadata, JSON-LD, privacy, Studio)
                                          [ Pause ] [ Open build log ]
```

### 7.4 Error-message pattern

Every error has four parts:

1. **What happened**, in plain words;
2. **What Nocturne did** (stopped, retried, nothing changed);
3. **What you can do**, as a single primary action;
4. a **reference** (run ID plus step) for support.

Never show only a raw provider error. Show it under "Details", the way Studio's input boundary already does for clients.

### 7.5 Accessibility and responsive behaviour

- WCAG 2.2 AA, as the repo's quality bar already requires.
- Full keyboard paths: Tab order follows the wizard, Esc cancels, the timeline is a live region.
- Status is never shown by colour alone.
- `prefers-reduced-motion` turns off timeline animation.
- Every screen works at 360 px.
- An empty state says what the screen is for and offers its first action. Studio's "Empty lists" work (task 165) already follows this pattern.

### 7.6 Without a terminal, and for experts

- **Stage A** needs one terminal command (`npx nocturne launch`). After that the browser wizard does everything. Internal operators are developers, so this is acceptable.
- **Stage B** needs no terminal at all.
- **Experts:** `nocturne launch --blueprint web-next-sanity@1.9.0 --slug acme --yes --json`, plus `resume`, `status`, `verify <url>` and `detach`. All of them are dry-run first and require `--yes` to write, matching the Ops context rules in the plan.

### 7.7 Timing budget for a website launch with connected accounts `[Hyp]`

| Phase                                        | Budget                  |
| -------------------------------------------- | ----------------------- |
| Preflight                                    | ≤ 30 s                  |
| Sanity: project, dataset, tokens, CORS, seed | ≤ 2 min                 |
| GitHub: repo, variables and secrets, push    | ≤ 1 min                 |
| Vercel: project and environment              | ≤ 20 s                  |
| **Build and deploy**                         | **4–8 min `[Unknown]`** |
| Verification                                 | ≤ 1 min                 |
| **Total**                                    | **About 8–12 min**      |

---

## 8. Reliability, security and lifecycle

### 8.1 State machines

**Run states**

- The path: `draft → preflight → provisioning → building → verifying → verified`.
- Terminal and exception states:
  - `blocked`: waiting on a user, a consent, a payment or an owner approval, with a reason and a resume token;
  - `failed_retryable`;
  - `failed_terminal`;
  - `cancelled`;
  - `detached`.
- **"Partially provisioned"** is derived, not stored: some resources exist and the run hasn't reached `verified`.

**Step states:** `pending → running → succeeded | skipped (already satisfied) | failed (attempt n) | compensated`.

**Resource states:**

- `desired` is one of `present`, `absent` or `transferred`;
- `observed` is one of `unknown`, `present`, `missing` or `drifted`;
- `owner` is `client`, `currawong` or `nocturne`;
- `createdByRun` is the ID of the run that created it, if any;
- `deletePolicy` is `never` (the default) or `on_undo_if_untouched`.

### 8.2 Mechanics

| Concern          | Rule                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Idempotency      | <ul><li>Every step has a deterministic key: `runId:step:resourceKind:logicalName`.</li><li>Names are deterministic (slug, label with nonce).</li><li>**Write-ahead intent:** record `create_requested` before calling a provider and `created(id)` after. On resume, a `create_requested` without an ID triggers **reconcile by listing**, never a blind second create.</li></ul> |
| Deduplication    | One active run per project slug (a database unique constraint). A second launch with the same slug joins the existing run.                                                                                                                                                                                                                                                        |
| Retries          | Exponential backoff with jitter (1 s, then 2, 4, 8 … capped at 5 min), at most 6 attempts. Only for 429, 5xx and network errors. A 4xx validation error fails the step terminally with an explanation.                                                                                                                                                                            |
| Rate limits      | Honour `retry-after`, the GitHub `x-ratelimit-remaining/reset` headers and Sanity 429s. Pace fleet-wide health checks across the hour (as the 14 Oct strategy does).                                                                                                                                                                                                              |
| Timeouts         | Per step: 60 s for an API call, 20 minutes for a build wait, 15 minutes for verification retries, and 7 days for user-blocked waits before the run expires to `cancelled` (resources kept).                                                                                                                                                                                       |
| Cancellation     | Cooperative: the run stops at the next step boundary. It **never** deletes automatically; it offers "Undo what this run created" with confirmation.                                                                                                                                                                                                                               |
| Compensation     | Only for resources with `createdByRun = this run` and no outside activity (no foreign commits, no custom domain, no non-seed documents). Logged as its own steps.                                                                                                                                                                                                                 |
| Resume           | Re-entering a run re-runs `verify` on completed steps, then continues. It is safe at any point.                                                                                                                                                                                                                                                                                   |
| Correlation      | A `runId` on every log line and audit row, carried in provider calls where they allow it (for example the Vercel deployment `meta`, the commit message and the Sanity robot label).                                                                                                                                                                                               |
| Webhooks         | <ul><li>Verify the signature over the raw body: GitHub HMAC-SHA256, Vercel's `x-vercel-signature`, Expo's `expo-signature`, Sanity's webhook signature (already done in the site's `/api/revalidate`).</li><li>Record event IDs for idempotency, **re-fetch state from the provider before acting**, and answer 2xx only after commit.</li></ul>                                  |
| Polling fallback | Every webhook-driven wait also polls (30 s, backing off to 2 min), so a lost webhook only slows a run down.                                                                                                                                                                                                                                                                       |
| Drift detection  | A nightly reconcile compares desired and observed: environment variable names present, CORS origins, rulesets, dataset privacy, robot existence, protection settings. Drift raises a "needs attention" item and is **never** auto-fixed in v1.                                                                                                                                    |

**Safe partial states**

| State                            | What it means                             | Safe to leave? | Resume path                                                             |
| -------------------------------- | ----------------------------------------- | -------------- | ----------------------------------------------------------------------- |
| Sanity project, nothing else     | No cost beyond the client's Growth seats  | Yes            | Continues at the repo step                                              |
| Repo exists, Vercel not linked   | Code is private; nothing is served        | Yes            | Creates the Vercel project, then pushes or redeploys                    |
| Vercel project, build failed     | Nothing public except an error deployment | Yes            | Fix, then redeploy                                                      |
| Deployed, not verified           | Something is serving, unproven            | Briefly        | Re-verify; the UI says "unverified" and it is never reported as success |
| Token created but its value lost | Orphan credential                         | **No**         | Revoke immediately (compensating step), then create a new one           |

**Scale assumptions** `[Hyp]`:

- Hundreds of workspaces mean about 10 launches a day at most, plus hourly health checks.
- A single Postgres database, one Vercel project and a managed executor are enough for thousands of workspaces. The limits will be provider rate limits and support, not compute.
- No sharding, multi-region deployment or microservices.

### 8.3 Threat model (main threats)

| Threat                                                        | Impact                                   | Mitigation                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation's credential store is stolen (Stage B)             | Every client's providers                 | <ul><li>Prefer short-lived tokens: GitHub App installation tokens last 1 h; Vercel and Cloudflare OAuth refresh flows.</li><li>Envelope encryption: AES-256-GCM per secret with a KMS-held key; plaintext only in memory.</li><li>No Sanity robot token values stored (they live in Vercel and GitHub).</li><li>Least-privilege scopes, and quarterly rotation.</li></ul> |
| Secrets leak into logs, the ledger or reports                 | Credential exposure                      | <ul><li>A structured logger with a deny-list redactor.</li><li>Unit tests asserting that no token pattern ever reaches logs.</li><li>Token values never written to the database in Stage A.</li><li>Secret scanning on both repos.</li></ul>                                                                                                                              |
| Confused deputy across clients (Stage B, SaaS)                | One client acting on another's resources | `org_id` on every row; every provider call resolves credentials from the project's own connection; authorisation checked server-side on every action; row-level security at SaaS.                                                                                                                                                                                         |
| A malicious or broken blueprint                               | Bad code reaches every new site          | Blueprints are pinned to a tag **and SHA**; CI must be green; quarantine; `npm ci` from the lockfile; Actions pinned to SHAs (already done); Dependabot.                                                                                                                                                                                                                  |
| Spoofed webhooks                                              | False status                             | Signature checks, re-fetching from the provider, idempotent event IDs.                                                                                                                                                                                                                                                                                                    |
| SSRF through the verifier                                     | Internal network access                  | Fetch only hostnames on an allow-list (`*.vercel.app`, `*.workers.dev`, the project's registered domains); no redirects to private IPs; timeouts.                                                                                                                                                                                                                         |
| A client Editor changes agency-only design fields via the API | Broken design (recoverable)              | Accepted and documented. Document history and restore, plus the agreement. Enterprise custom roles if a client funds them.                                                                                                                                                                                                                                                |
| Operator account takeover                                     | Full control                             | Google Workspace SSO with enforced 2-step verification or passkeys; database sessions that can be revoked (the approved Ops design); owner-only destructive actions; a second confirmation.                                                                                                                                                                               |
| Spending abuse                                                | Cost blow-out                            | Vercel Spend Management; EAS build caps; at most N launches a day per operator; dry runs by default.                                                                                                                                                                                                                                                                      |
| Privacy (client contacts, enquiries)                          | APP or GDPR breach                       | <ul><li>Foundation stores only names and emails of client contacts and metadata, never site content or enquiries.</li><li>Retention rules.</li><li>The site's enquiry retention already runs weekly.</li><li>Legal review sits in tasks 49 and 64.</li></ul>                                                                                                              |

### 8.4 Who holds which permissions

| Actor                         | Holds                                                                                                                                                                                                                                                       | Must never hold                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Nocturne Foundation**       | <ul><li>Stage A: the operator's own tokens, held locally.</li><li>Stage B: GitHub App installations, Vercel and Cloudflare OAuth grants, Sanity organisation robots (if S1 passes), the GSC service account, Expo robots per client organisation.</li></ul> | Site content, signing keys, client passwords, Stripe secrets of client sites |
| **The generated website**     | <ul><li>A Viewer token for reads.</li><li>An Editor token, server-only, for forms, Stripe and enquiries.</li><li>Its own Stripe, Resend and Turnstile secrets.</li></ul>                                                                                    | Any Foundation credential; organisation-level Sanity tokens                  |
| **The Sanity CMS (people)**   | Currawong: Administrator or Developer. Clients: Editor or Contributor on Growth, never Administrator (approved direction)                                                                                                                                   | A client with the Administrator role while the site is managed               |
| **The GitHub organisation**   | Currawong owners; the App with limited repository permissions; CI secrets per repo                                                                                                                                                                          | Organisation-wide classic personal access tokens in Foundation               |
| **Mobile developer accounts** | The client owns its Apple team, Play account and Expo organisation. Currawong is an App Manager or developer member; EAS holds signing credentials                                                                                                          | Foundation storing any certificate, keystore or Apple ID password            |

### 8.5 Operations

- **Backups:**
  - Foundation database: point-in-time recovery from Neon, plus a weekly logical export.
  - Client sites: datasets are backed up by the existing `backup.yml`. Silent skips become a health check (plan task 41).
- **Incident response:**
  - a runbook covering detection, containment (pause launches, revoke tokens), notification and post-incident review;
  - the provider-outage banner already exists in Studio Start here (`OPS_NOTICES_URL`).
- **Monitoring:**
  - Sentry on Foundation;
  - uptime checks on Foundation;
  - the run success rate and the p90 timing;
  - an alert when any run sits `blocked` for more than 24 h.
- **Provider outages:**
  - client sites are unaffected, because they are independent;
  - Foundation pauses and resumes runs;
  - nothing is retried in a tight loop.
- **Support cost** `[Hyp]`:
  - Target: under 0.5 h a month per live site for platform issues.
  - Track support contacts per launch (§12 metrics).

### 8.6 Ongoing upgrades

- **Blueprint lifecycle:** `candidate`, then `approved` (CI green, plus one rehearsal launch), then `deprecated` (the N-2 release), then `quarantined` (a known defect).
- **Updating client sites:**
  - client sites update through PRs: task 30 manually for now, task 53 automated later;
  - each update PR runs the client's CI plus verification against its preview deployment.
- **Mobile:**
  - Expo SDK upgrades run on their own cadence (three SDKs between May and October 2026 `[Doc]`);
  - budget about 1–2 days per app per SDK `[Hyp]`.

### 8.7 Offboarding and ending a plan

1. Freeze changes and export the content (`sanity dataset export`, already the backup tool).
2. Transfer the resources:
   - the Sanity project to the client's organisation, or the administrator role to the client (a project transfer between organisations exists `[Search]`);
   - the GitHub repo (transfer or a new owner);
   - the Vercel project (transfer to the client's team `[Unknown: verify the API or UI]`);
   - the EAS project (already the client's).
3. Revoke Foundation's access: App installations, OAuth grants, robots, the GSC service account.
4. Mark the project `detached` and keep the audit trail.
5. **Nothing is deleted by Foundation.**
6. A failed payment pauses CMS editing only, as approved: "A failed payment never takes a public site offline."

---

## 9. Design Engine and Content Intelligence execution

### 9.1 Minimum editable component grammar

**Definition.** Keep the roughly 25 section types that exist. Define one **section contract** that each section family satisfies. Write it down in the template README, and test it with a schema-shape unit test.

| Contract part | Fields                                                                                                         | Already in the code `[Code]`                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `content`     | eyebrow, heading (heading text with highlights), body (block content or paragraph-aware plain text), `actions` | Yes: `mediaText` has `eyebrow`, `heading`, `body` and `ctas`; typed link actions (task 92) |
| `media`       | the primary image or video, and **`supportingMedia`** (optional)                                               | Primary: yes. Supporting: **only in the hero's `supporting` slot**                         |
| `layout`      | a variant enum per family (for example `media-left`, `media-right`, `stacked`), plus ratio                     | Yes (`imagePosition`, hero variants and presets)                                           |
| `surface`     | tone (`surface`, `alt`, `inverse`, `accent`), background (none, gradient, image with a wash), glass level      | Yes (section style, backgrounds, glass tokens, gradient overlay)                           |
| `motion`      | a preset with intensity, parallax strength and direction                                                       | Yes (motion presets). One parallax preset with strength is still open (task 108)           |
| `frame`       | spacing, width, align, `anchorId`, members visibility                                                          | Yes (`sectionStyle`, access)                                                               |

**Families mapped to existing sections**

| Family                | Existing sections                                                  |
| --------------------- | ------------------------------------------------------------------ |
| Hero                  | `hero`                                                             |
| Split media and text  | `mediaText`, `imageSide`                                           |
| Grid                  | `featuresGrid`, `process`, `stats`, `team`, `gallery`, `logoCloud` |
| Editorial             | `richText`, `faq`, `video`, `embed`                                |
| Proof                 | `testimonials`, `stats`                                            |
| Call to action        | `ctaBanner`, `newsletterSignup`, `formSection`                     |
| Special               | Link list, events, location, pricing                               |
| Navigation and footer | `siteNavigation`                                                   |

**The strategy's worked example, checked against the code**

| Requirement                                                           | Status                                                                                                                       | Kind of change                  |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Text left, image right                                                | `imagePosition` ✓                                                                                                            | Content or design configuration |
| An optional action button                                             | `ctas` ✓                                                                                                                     | Content                         |
| Video below the image                                                 | ✗ Needs a `supportingMedia` slot in the split family, reusing the hero slot pattern                                          | **Code change (small)**         |
| Glass that stays legible on a blue background                         | Glass tokens and tones ✓. A contrast rule for glass over a coloured or image background is partial (task 140 done, 168 open) | Code change (rule and test)     |
| Parallax or hover                                                     | Motion presets ✓, parallax ✓; a strength and direction preset is task 108                                                    | Design configuration            |
| Change the background or theme site-wide without editing each section | `designSettings` and tone remapping ✓                                                                                        | Design configuration            |

**Three kinds of change: where each lives and how it is previewed**

| Change                                                                   | Kind                               | Lives in                         | Who                     | Preview                                                   | Publish                                             |
| ------------------------------------------------------------------------ | ---------------------------------- | -------------------------------- | ----------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| Copy, images, links, approved sections                                   | Content                            | Sanity                           | Client (Editor), agency | Presentation (draft)                                      | Studio Publish, live in about a second in live mode |
| A section's variant, tone, spacing, motion preset or background          | Design configuration (one section) | Sanity page document, Design tab | Agency (Studio-gated)   | Presentation                                              | Publish                                             |
| Brand colours, gradients, appearance                                     | Design configuration (site-wide)   | Sanity `designSettings`          | Agency                  | Brand preview mock-up, Presentation                       | Publish (live immediately)                          |
| Type scale, spacing rhythm, radii, glass recipe values, motion durations | Design system                      | Repo `tokens.json`               | Developer               | A Vercel preview of the PR, section gallery, visual tests | Merge and deploy; reaches clients by release        |
| A new slot, family, effect or integration                                | Code capability                    | Repo (template or client)        | Developer               | A PR preview, the gallery and the tests                   | A template release, then client update PRs          |

### 9.2 Theme and override hierarchy, with one owner per field

Precedence, from lowest to highest. This is already the documented behaviour in the README's "Colour systems" `[Code]`:

| Layer | Source                                                                                                   | Owner          |
| ----: | -------------------------------------------------------------------------------------------------------- | -------------- |
|     0 | `tokens.json` defaults (every role)                                                                      | Repo           |
|     1 | `designSettings` brand role overrides                                                                    | Sanity, agency |
|     2 | Section tone and background remaps                                                                       | Sanity, agency |
|     3 | Element overrides (for example Link list `layerDesign`), with **Reset to theme** (task 167, in progress) | Sanity, agency |
|     4 | Rare code overrides                                                                                      | Repo           |

**Rules**

1. **One owner per field.** For example:
   - type and spacing scales are repo-only;
   - the brand `primary` is layer 1, with layer 0 as its default;
   - no field has two writable masters at the same layer.
2. **Every override shows where its value comes from, and offers Reset.**
3. **Contrast is computed after resolution.** Glass over an image background needs a wash, or falls back to solid.
4. **Unsupported combinations are hidden.** Hidden settings never block publishing (task 162, done).

**Contract test (new).** Using a fixture that changes `designSettings.primary` to blue, assert that:

- every section's resolved variables change;
- text on every surface, **including glass on the accent tone**, keeps ≥ 4.5:1 contrast;
- the visual baselines change only where expected.

### 9.3 Client editing in Sanity

- **Keep:** Studio, Presentation and client mode, which are built and audited.
- **Measure:** the usability test in task 77 (scenarios A–J). Add a "client with no live instructions" run at the 90-day gate, as the strategy doc asks.
- **Enforce:**
  - **Sanity** enforces the role (Editor publishes; Contributor writes drafts only);
  - **Studio** enforces agency-only design, which is documented as a convenience, not a control;
  - real field-level enforcement needs Enterprise custom roles `[Doc]`.

### 9.4 Structured data and the SEO contract

**Sources of the data**

- **Rule:** every JSON-LD string must come from a field rendered visibly on the same page, or from `siteIdentity` and `businessInfo` facts shown in the header, footer or contact page.
- **Test (new):** for each fixture page, every JSON-LD name, address, opening-hours entry and FAQ question or answer appears in the visible text, after normalising it.
- **`@id` strategy** (already in place: `/#organization`, `#website`, `#person`, `#event`):
  - test that the IDs are unique across the sitemap;
  - test that every `WebPage` points to `#website` and `#organization`.

**Choosing types**

- Organization or a LocalBusiness subtype, from `businessInfo` (exists);
- `Article` for posts, `Event` for events;
- `Service` **only once `service` documents exist**. This is a gap: add it when a client sells distinct services;
- multi-location `location` documents only for multi-site businesses.

**Validation**

- Local JSON-LD parsing and rule checks in CI and in `launch:check`.
- The Rich Results Test is manual. No API for it is assumed `[Unknown]`.

**Promises.** Never promise rich results. Google says structured data makes a page eligible but doesn't guarantee anything, and AI features need no special schema `[Doc]`.

### 9.5 The Search Console opportunity workflow (Stage E)

1. **Access.** Add a Currawong service account as a user on the client's property, which avoids OAuth app verification `[Unknown: confirm this is supported]`. For SaaS later, use OAuth with the `webmasters.readonly` scope and Google's verification.
2. **Import.**
   - **Windows:** the last complete 28 days and the 28 days before them.
   - **Query settings:** `dataState: final`; dimensions `[page, query]`, `[page]` and `[date]`; `rowLimit` 25,000 with `startRow` paging.
   - **Stored with each import:** the import date, the freshness, and a **truncation flag** when the row count reaches the limit. The API returns top rows only `[Doc]`.
3. **Mapping.** Match each Search Console URL to a canonical URL, then a path, then a Sanity document, using the site's own path functions (`slugToPath`, `postPath`) and the sitemap. **Unmatched URLs are listed**: they are old-site URLs (suggest redirects), parameters, or non-canonical hosts.
4. **Opportunity cards.** These are deterministic rules. Every threshold is `[Hyp]` and gets tuned on real data:

| Card                          | Rule                                                                                                                                  | Evidence shown                                 | Labelled               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------- |
| CTR gap                       | Impressions ≥ 100 in 28 days, average position ≤ 10, and CTR more than 50% below **the site's own** median CTR for that position band | Query, page, period, current title and snippet | Deterministic          |
| Declining page                | Clicks down ≥ 30% on the previous window while impressions are ≥ 200                                                                  | Both windows; a seasonality caveat             | Deterministic          |
| Query without a matching page | Impressions ≥ 50, where the ranking page's title and H1 lack the query's main term                                                    | Query, ranking page                            | **Heuristic**          |
| Indexing anomaly              | A sitemap URL that URL Inspection reports as not indexed (quota: 2,000 a day per site `[Doc]`)                                        | Verdict, last crawl                            | Deterministic          |
| Structured-data issue         | A failure from the site's own JSON-LD contract tests                                                                                  | Field, page                                    | Deterministic          |
| Stale or inconsistent facts   | Business facts that differ across pages, or haven't been confirmed in 12 months                                                       | Values found                                   | Needs a human to judge |

5. **Changes.** Each card opens a Presentation draft. A human publishes the change in Studio. Foundation records the card ID, document ID, `_rev` before and after, and the publish time.
6. **Outcomes.**
   - Compare the 28-day windows before and after, next to the site's overall trend.
   - The UI always shows "Search results move for many reasons; this compares, it doesn't prove cause."
   - Add conversion data only from a consented analytics source (the site already supports Plausible, PostHog and GA with consent `[Code]`).

**AI readiness (labelled "readiness, not ranking")**

- Key content is crawlable HTML text.
- Entity facts are consistent between the page, the JSON-LD and the business info.
- Service explanations are concise.
- Authorship and dates appear on articles.
- Robots rules allow the chosen AI crawlers. The site already has the setting (`ai-crawlers` spec `[Code]`).
- `llms.txt` is present but **not claimed to help**: Google says AI text files aren't needed `[Doc]`.

**Observed AI citations**

- Use **Bing AI Performance** only, reviewed manually each month. It covers Microsoft surfaces only `[Doc]`.
- Google has no separate AI metric; AI-feature traffic sits inside the Web numbers `[Doc]`.
- **Never** generalise either source to "all AI assistants".

### 9.6 Hard limits on AI claims

- No SEO score out of 100, and no "LLM rank" or "chance of being recommended".
- No automatic publishing. AI can suggest drafts, never publish them.
- No promise of rich results, AI Overview inclusion or CTR gains.
- Synthetic prompt sampling, if it is ever used, is labelled a sample by prompt, place, model and time, and is never used as a market truth.

### 9.7 Image to website: a bounded experiment, after gate G3

- **Method:**
  - three reference designs;
  - a model proposes section families, tokens and slots **within the grammar**;
  - a designer corrects the result.
- **Measure:** the correction time against building it by hand.
- **Human review checklist:** asset rights, responsiveness, accessibility, content accuracy and visual fidelity.
- **Stop if** the correction time is over 70% of the manual time `[Hyp]`.

---

## 10. Commercial analysis

### 10.1 Internal ROI

**Formula**

```
Net(year) = Σ_sites (h_launch + h_rework_avoided) × V  −  (H_build + 12 × H_maint) × V  −  C_tools
```

- **V** is the value of a freed hour. It equals the billable rate **only if the hour is resold**; otherwise it is close to zero.
- **Anchor:** A$60 an hour realised (A$3,000 ÷ 50 h, a single self-reported project). Use A$90–120 an hour only when the pipeline is full.
- **Don't credit the Design Engine to Foundation.** Its savings come from template work that is already done. Foundation's own savings are launch setup plus launch-day failures avoided.

**Foundation-only scenarios** `[Hyp]`

| Assumption                                        | Conservative |       Base |        Optimistic |
| ------------------------------------------------- | -----------: | ---------: | ----------------: |
| Sites a year                                      |            6 |         12 |                24 |
| Hours saved per site (setup)                      |            1 |          2 |                 3 |
| Hours saved per site (failures, rework)           |          0.5 |          1 |                 2 |
| V (A$ an hour)                                    |           60 |         90 |               120 |
| **Annual savings**                                |      **540** |  **3,240** |        **14,400** |
| Build hours (launcher; hosted only in Optimistic) |           60 |         80 | 250 (with hosted) |
| Maintenance hours a month                         |            2 |          3 |                 8 |
| Year 1 cost (build + maintenance) × V             |        5,040 |     10,440 |            41,520 |
| Tools a year (Neon, executor)                     |            0 |        150 |             1,200 |
| **Net, year 1**                                   |   **−4,500** | **−7,350** |       **−28,320** |
| **Net, year 2** (maintenance only)                |     **−900** |   **−150** |        **+1,680** |

**Reading this honestly:**

- The launcher's direct time savings **do not pay back** in any scenario within two years. Only the optimistic case turns slightly positive, in year 2, and its cumulative total is still negative.
- It is worth building only if:
  - it stays tiny (≤ 60–80 h);
  - it is justified by **reliability** (avoiding embarrassing launch failures that cost client trust);
  - it underpins a **care offer** (§10.2), because verification and fleet updates are what make care sellable at scale;
  - or it validates a SaaS cheaply.
- The **whole system** is a different story. The starter plus the Design Engine plus the content workflow saving 10–18 h on a 50-hour project would be A$7–26k a year at 12–24 sites. But that value is mostly already built. The work now is to **use it on real projects and measure it**.

### 10.2 Managed client website economics

**Monthly cost per client** `[Hyp]`, at A$1.50 per US$1:

| Item                                                                                           |                                A$ a month |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------: |
| Sanity Growth: one client editor seat, plus Currawong's admin seat if it is billed `[Unknown]` |                               22.50–45.00 |
| Vercel: marginal usage for a small site in Currawong's Pro team (the seat is fixed overhead)   |                                    0–7.50 |
| Domain and email                                                                               | Paid by the client, or 2–3 passed through |
| Monitoring, backups, storage                                                                   |                                   Under 1 |
| **Labour:** support and maintenance, 0.75–1.5 h at A$90                                        |                                 67.50–135 |
| **Total**                                                                                      |                          **About 90–190** |

**Offers.** Prices exclude GST; add 10% for Australian clients.

| Offer                                                        | Price hypothesis                  | Includes                                                                                                         | Expected margin                                  | Verdict                                                                          |
| ------------------------------------------------------------ | --------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- |
| **A$100 a month managed website** (the unvalidated proposal) | A$100                             | Hosting, CMS, undefined "support"                                                                                | **About −A$90 to +A$10**                         | **Don't sell it as stated.** It loses money once support passes about 30 minutes |
| CMS-only access                                              | Client pays Sanity directly       | Nothing from Currawong                                                                                           | Not applicable                                   | Clean ownership, no recurring revenue                                            |
| Hosting at cost plus light care                              | A$60–90 plus costs passed through | Uptime, backups, security and template updates as PRs, **no content changes**                                    | Positive once update PRs are automated (task 53) | Viable once fleet updates are automated                                          |
| **Care and improvement**                                     | **A$300–600**                     | Everything above, plus a monthly Search Console review with 2–4 evidenced opportunity cards and 1–3 h of changes | Positive while hours are capped                  | **Test with 3 clients.** The software is an aid; the service is the product      |

**Support boundaries**

- **Included:** template bug fixes, security updates, monitoring and the stated hours.
- **Excluded:** new sections or features (quoted separately).
- Each plan states its response times.

**Churn and offboarding**

- A transfer pack is provided at cost, and content export is always free (the approved direction).
- Suspending a client's account pauses editing only. It never takes the site down.

### 10.3 Future SaaS unit economics (unvalidated hypotheses)

- **ICP:** see §3.2.
- **Value metric:** **active verified sites under care**, priced per site per month, because that tracks the value of the fleet.
- **Price hypotheses:** A$39–79 per active site a month, or A$249–499 per agency a month for up to 10 sites `[Hyp]`.
- **Cost of goods** `[Hyp]`:
  - A$150–400 a month for control-plane infrastructure, shared across customers;
  - about A$1–3 per site a month (runs, checks);
  - **support at 1–2 h per agency a month to begin with, which is the dominant cost**.
- **Acquisition channels:** Sanity and Vercel communities and partner directories, agency communities, verified-launch case studies, and a marketplace listing later.
- **Why existing options fail this ICP:** deploy buttons stop at the launch; IDPs are heavy; agency starters lack verification and fleet updates.
- **Before any SaaS investment:**
  - 10–15 agency interviews (§10.6);
  - a **concierge pilot**: Currawong launches and cares for a design partner's site using Foundation, for a fee;
  - a pricing landing page with a waitlist;
  - **three or more paying design partners**.

### 10.4 Client acquisition versus platform work next quarter

- One more A$3,000 project is A$3,000 of **revenue**. The launcher slice is 60–80 h, which costs A$3,600–4,800 in forgone delivery at A$60 an hour.
- The launcher's savings in the quarter are under A$1,000 (three launches or fewer).
- **Revenue work dominates.**
- **Recommendation:**
  - spend no more than about **25–30% of available hours** (about 1–1.5 days a week) on platform work, and only on the 14-day spikes and the 30-day slice;
  - spend the rest on delivery and sales;
  - if the pipeline is empty, sales come before the slice.

### 10.5 Red-team critique (an investor's view)

1. **"This is a feature, not a company."** Vercel and Sanity already provision in a click; Cloudflare's button does the same. _Response:_ agreed for the first launch. Only the fleet (verify, update, care) is defensible, and it is unproven.
2. **"Your customer is yourself."** There is no external signal. _Response:_ that's why internal ROI and the care offer must stand on their own.
3. **"The provider surface is a treadmill."** Eight providers, monthly upstream changes, one maintainer. _Response:_ Vercel only, Sanity only and GitHub only until the gates pass, and providers are added only with a paying reason.
4. **"Mobile is a different business."** Different buyers, store politics, multi-week timelines. _Response:_ mobile stays gated and limited to internal and testing builds until a client pays.
5. **"Agencies won't adopt your starter."** Adoption costs a lot. _Response:_ SaaS would need a "bring your own starter" verification-only mode, so test demand for that first. Verification is starter-agnostic.
6. **"The template is huge for a two-week-old codebase."** 128k lines, with JS budget headroom at zero. _Response:_ freeze new design features until M1 and invest in the seams (§12).

**The simpler starter wins if** Currawong launches fewer than about 12 sites a year, timed manual launches are under about 45 minutes and reliable, and the interviews show no willingness to pay. In that case, stop after the launcher's verification marker and dry-run script.

### 10.6 Validating demand with agencies

- **Who:** 10–15 interviews with agency owners or leads who use Next.js and a headless CMS.
- **Ask:**
  - how many sites they launch a month;
  - how long a launch takes;
  - their last launch-day failure;
  - how they update shipped sites;
  - what a care plan costs;
  - whether they would pay for verified launch and care, and how much.
- **Show:** a three-minute recording of a verified launch and a fleet health view.
- **Thresholds to keep investing:**
  - ≥ 5 of 15 report launch or update pain ≥ 2 h a site;
  - ≥ 3 would join a paid pilot;
  - ≥ 1 pre-pays.
- **No fabricated market sizes.**

---

## 11. Decision register and risk register

### 11.1 Decision register

| ID   | Decision                     | Selected                                                                                                                                                           | Rejected (why)                                                                                                                   | Key assumption                                    | Reversibility                   | Revisit when                                            |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| D-01 | Product model                | Lean hybrid: CLI with a local browser wizard, a ledger, verification; hosted later                                                                                 | Hosted control plane now (time, risk); an internal developer portal (wrong fit); vendor-native only (ownership, no verification) | Launches ≥ about 12 a year eventually             | High                            | G3, or demand evidence                                  |
| D-02 | Shape                        | Modular TypeScript monolith with a durable executor                                                                                                                | Microservices                                                                                                                    | Scale is in the hundreds or low thousands         | High                            | Never, without operational evidence                     |
| D-03 | Control-plane UI             | Next.js 16 on Vercel                                                                                                                                               | React Router 7, SvelteKit, SPA + Hono                                                                                            | Same skills as the sites                          | Medium                          | If not hosted on Vercel                                 |
| D-04 | Data and identity            | Neon Postgres, Drizzle, Auth.js with Google Workspace, `org_id` everywhere                                                                                         | Supabase (fine); SQLite (no shared ledger)                                                                                       | Internal users only until SaaS                    | Medium                          | SaaS gate (choose a SaaS identity provider then)        |
| D-05 | Executor                     | Stage A: none. Stage B: Vercel Workflows, with Inngest as fallback                                                                                                 | Temporal (operational weight); a Postgres queue (rebuilding durability)                                                          | Steps stay executor-agnostic                      | High                            | Stage B entry: run S4 against both                      |
| D-06 | Repositories                 | Keep the template; add a new `nocturne-foundation` monorepo                                                                                                        | Big-bang monorepo (breaks merges); Foundation in the template (copied into clients)                                              | Merge-based updates continue                      | Medium                          | Packaging triggers fire                                 |
| D-07 | Client runtime               | Independent repo and resources per client                                                                                                                          | Shared multi-tenant runtime                                                                                                      | Client ownership matters                          | Low (later migration is costly) | Never for client sites                                  |
| D-08 | Starter across hosts         | One starter, isolated host modules, contract tests per host                                                                                                        | Forked variants; lowest common denominator                                                                                       | Cloudflare differences stay small                 | Medium                          | If the Cloudflare differences exceed about 10 files     |
| D-09 | Default host                 | **Vercel**                                                                                                                                                         | Cloudflare in the MVP (proxy blocker)                                                                                            | Unchanged until OpenNext supports Node middleware | High                            | Cloudflare gate                                         |
| D-10 | Cloudflare mechanism         | Workers, deployed by OpenNext from GitHub Actions                                                                                                                  | Pages; Direct Upload (irreversible); the Workers Builds dashboard link (not scriptable)                                          | The OpenNext CLI stays stable                     | High                            | A verified Cloudflare adapter ships                     |
| D-11 | Repo creation                | An empty repo, then the template **history** up to the tag, plus one configuration commit                                                                          | Template generate (no tag, no history)                                                                                           | Clients update by merging tags                    | High                            | If a core package replaces merges                       |
| D-12 | Sanity provisioning          | Stage A: the operator's CLI session (wizard logic). Stage B: an organisation robot if S1 passes, otherwise a manual gate. Marketplace only for client-owned Vercel | Pretending CLI login equals delegated authorisation                                                                              | Growth plan per client                            | High                            | S1 result                                               |
| D-13 | Sanity configuration as code | Adopt **Blueprints** for CORS, webhooks and robots if S1 confirms them                                                                                             | A bespoke API call for each                                                                                                      | Blueprints stay generally available               | High                            | S1                                                      |
| D-14 | Verification                 | A CMS-sourced marker meta tag, `launch:check --json`, a `site-info` commit match                                                                                   | Provider "ready" status alone                                                                                                    | The marker stays server-rendered                  | High                            | Never weaker                                            |
| D-15 | Design configuration         | Layered, one owner per field                                                                                                                                       | Everything in the repo; everything in Sanity                                                                                     | Studio gating is acceptable                       | Medium                          | A client abuses the API, or demand for Enterprise roles |
| D-16 | Client editing               | Studio and Presentation                                                                                                                                            | A custom UI                                                                                                                      | Sanity keeps Presentation                         | Medium                          | Narrow quick-action demand (task 59)                    |
| D-17 | Mobile                       | Expo managed with EAS; a separate repo; content through the web API; Android internal build first                                                                  | Bare React Native with Fastlane; universal UI; a token in the app                                                                | A client needs an app                             | Medium                          | Mobile gate                                             |
| D-18 | Search data                  | Search Console read-only via a service account (internal); Bing as a manual source                                                                                 | OAuth for internal use (verification overhead); any score                                                                        | Clients will add a user                           | High                            | SaaS gate (OAuth plus verification)                     |
| D-19 | Supabase                     | Not in the MVP                                                                                                                                                     | Using it as a substitute for Sanity                                                                                              | No blueprint needs app data                       | High                            | A mobile or app blueprint needs auth or data            |
| D-20 | Ownership                    | Managed (default) and client-owned modes; detach, never destroy                                                                                                    | Automatic deletion at offboarding                                                                                                | The agreement (task 64) matches                   | Medium                          | The legal review                                        |
| D-21 | Timing                       | The definitions in §6.1; medians and p90s after ≥ 10 runs                                                                                                          | Counting a queued deploy as done                                                                                                 | Not applicable                                    | Not applicable                  | Never weaker                                            |
| D-22 | Provider abstractions        | Concrete modules; a role interface only alongside its second implementation                                                                                        | Generic adapters in v1                                                                                                           | Not applicable                                    | High                            | When a second implementation arrives                    |

### 11.2 Risk register

| ID   | Risk                                                                       | Probability | Impact | Mitigation                                                                                              | Early warning                             |
| ---- | -------------------------------------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| R-01 | Platform work displaces revenue work                                       | High        | High   | The 25–30% time cap (§10.4); spikes before builds; gates                                                | Weeks with no client delivery             |
| R-02 | Sanity delegated provisioning isn't possible                               | Medium      | Medium | An explicit manual gate, or the operator's CLI session; Marketplace for client-owned mode               | S1 fails                                  |
| R-03 | Upstream churn (Next 16.x, Sanity 6.x, Expo SDKs) breaks pinned blueprints | High        | Medium | CI on every tag; Dependabot; quarantine; monthly dependency release (task 90 pattern)                   | Red CI on a dependency PR                 |
| R-04 | Client repos drift, so updates hurt                                        | Medium      | Medium | Customise-versus-core discipline; update PRs; packaging triggers                                        | A merge takes more than 1 h               |
| R-05 | Cloudflare incompatibility persists                                        | High        | Medium | Gate it; document the degradations; Vercel stays the default                                            | S3 fails                                  |
| R-06 | Secrets leak through logs or the ledger                                    | Low         | High   | A redactor and tests; no stored token values in Stage A; secret scanning                                | A scanner alert                           |
| R-07 | Orphaned billed resources after partial failures                           | Medium      | Medium | Write-ahead intent; reconcile by listing; undo; nightly drift check                                     | Ledger rows of resources with no run      |
| R-08 | An Editor bypasses Studio-only design gating                               | Medium      | Low    | Documented; history and restore; the agreement                                                          | Unexpected design-field edits in history  |
| R-09 | Mobile store and account delays miss client expectations                   | High        | Medium | Separate lifecycle, honest timing table, no store dates promised                                        | A client asks for "an app by Friday"      |
| R-10 | Search Console data is misread, leading to bad advice or claims            | Medium      | Medium | Caveats shown in the UI; deterministic rules; no causality claims                                       | Opportunity cards accepted without review |
| R-11 | Vendor price changes (Sanity seats, Vercel usage, EAS)                     | Medium      | Medium | Pass costs through in contracts; a cost view per client (task 62)                                       | Invoices more than 20% over plan          |
| R-12 | One-developer bus factor                                                   | High        | High   | Runbooks in the repos; dry runs; everything reproducible from the ledger; the client owns the resources | Any undocumented manual fix               |
| R-13 | The executor is immature or locks in                                       | Low         | Medium | Executor-agnostic steps; an Inngest fallback                                                            | Workflow incidents                        |
| R-14 | No JavaScript budget headroom                                              | Medium      | Low    | All verification code server-only; the budget test                                                      | The performance spec fails                |
| R-15 | An ownership dispute at offboarding                                        | Low         | High   | Agreement (task 64), with modes recorded per project                                                    | A client asks "who owns what?"            |
| R-16 | Google OAuth verification delays the SaaS Search Console integration       | Medium      | Medium | Service account internally; plan verification ahead of SaaS                                             | A submission is rejected                  |

---

## 12. Execution plan

### 12.1 The 14-day spikes

**No paid or spend-changing spike runs without your approval.** The ones that may cost money are marked.

| Spike                                   | Question                                                                                                                                                                                                                         | Setup                                                                                                                                                                                                                                                  | Maximum cost and time                                                                                                                   | Permissions                                                                   | Pass                                                                                                                                                                                                                                | Fail                                                               | Failure injection                                                                                | Fallback                                                     | Unlocks                             |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ----------------------------------- |
| **S0 Baseline** (extends task 128)      | How long does a launch take by hand today?                                                                                                                                                                                       | <ul><li>The README checklist on a scratch Vercel project and subdomain.</li><li>Stopwatch, a click log, failures noted.</li></ul>                                                                                                                      | A$0 (within existing plans); half a day                                                                                                 | Existing accounts                                                             | A recorded baseline: wall-clock, hands-on and failures                                                                                                                                                                              | Not applicable                                                     | Not applicable                                                                                   | Not applicable                                               | Gives every comparison its baseline |
| **S1 Sanity authorisation**             | <ul><li>Can an **organisation robot** create a project, a private dataset, CORS origins and robots over HTTP?</li><li>Do **Blueprints** apply CORS, webhooks and robots?</li><li>What must the customer do themselves?</li></ul> | <ul><li>A throwaway Sanity organisation, plus an organisation robot with the `sanity.organization.projects` grant.</li><li>A Blueprints project stack.</li><li>A desk review of the Marketplace transfer and offboarding docs.</li></ul>               | **Possible cost:** a Growth seat for one month to test a private dataset (about US$15–30). Free is enough for everything else. 1–2 days | An organisation admin on the scratch organisation                             | <ul><li>Each call succeeds, or its exact refusal is documented.</li><li>A written list of the customer's unavoidable actions.</li></ul>                                                                                             | Project creation needs a human, so that step becomes a manual gate | Revoke the robot mid-run; expect 401 handling                                                    | The operator's CLI session (today's wizard) or a manual gate | D-12, D-13; Stage B design          |
| **S2 Repo and host**                    | Does a scripted launch produce a verified URL on Vercel, with customer-owned resources?                                                                                                                                          | <ul><li>A throwaway CLI in a scratch Foundation repo.</li><li>A scratch GitHub organisation, Vercel team and Sanity organisation.</li><li>The template tag `v1.8.0`.</li><li>The marker is the seeded site name plus the nonce.</li></ul>              | A$0 on existing Pro and Free plans (Growth only if S1 needed it); 2–3 days                                                              | A fine-grained personal access token, a Vercel team token, a Sanity CLI login | <ul><li>Two clean runs give **verified previews**, with the marker over real HTTP and `launch:check --json` clean.</li><li>Timings recorded.</li><li>No secrets in the logs.</li></ul>                                              | Any verification check fails, or a manual fix is needed            | Kill the process after the repo is created, then after the Vercel project; expect a clean resume | Starter plus checklist (A1)                                  | The 30-day slice                    |
| **S3 Portability**                      | Can the same contract pass on Cloudflare?                                                                                                                                                                                        | <ul><li>A local `opennextjs-cloudflare` build of the current template; record the proxy failure.</li><li>Prototype the Cloudflare profile (no proxy) on a scratch branch.</li><li>Local `wrangler dev`; **no paid deploy**.</li></ul>                  | A$0 locally; 1–2 days. **Deploying needs approval** (Workers Paid, US$5)                                                                | None for local work                                                           | <ul><li>A list of what works and what degrades.</li><li>Worker size against the 10 MiB limit.</li><li>Revalidation behaviour noted.</li></ul>                                                                                       | The build fails without a fork                                     | Not applicable                                                                                   | Keep the "not supported" status, with the reason             | Cloudflare gate inputs              |
| **S4 Durability**                       | Do retries and resume avoid duplicates and orphans?                                                                                                                                                                              | On the S2 harness, inject failures after each create; revoke a token; simulate a GitHub 5xx and a Vercel 429                                                                                                                                           | A$0; 1–2 days                                                                                                                           | As S2                                                                         | <ul><li>For every injection point: resume completes, there are 0 duplicate resources and 0 orphan tokens.</li><li>Undo removes only this run's resources.</li></ul>                                                                 | Any duplicate or orphan                                            | **This is the injection**                                                                        | Fix the step design before going on                          | Executor choice; the D-05 test      |
| **S5 Design and content contract**      | Does a global theme change plus a compound section edit preview safely and stay legible?                                                                                                                                         | <ul><li>On the S2 site, change Brand colours to blue and edit a split section (text, image, button, glass on accent, parallax).</li><li>A client-role edit through Presentation.</li><li>Check revalidation.</li></ul>                                 | A$0; 1 day                                                                                                                              | Scratch Studio users (agency and Editor)                                      | <ul><li>Every section updates.</li><li>Contrast ≥ 4.5:1 everywhere, including glass.</li><li>The client edit publishes and the live page updates within the expected time.</li><li>The supporting-media gap is confirmed.</li></ul> | A contrast failure, or a hidden field blocks publishing            | Publish with the client role while an agency-only field is invalid                               | Fix the contract (task 168)                                  | The §9.2 contract test              |
| **S6 SEO correctness**                  | Is the metadata and JSON-LD truthful, and can Search Console data be mapped to pages read-only?                                                                                                                                  | <ul><li>Contract tests on fixtures.</li><li>A service account added to **Currawong's own** verified property; a 28-day import; mapping to Sanity document IDs.</li></ul>                                                                               | A$0; 1–2 days                                                                                                                           | Search Console owner on Currawong's property                                  | <ul><li>Every JSON-LD string is visible on its page.</li><li>`@id`s are unique.</li><li>At least 95% of URLs with clicks map to documents; the unmatched ones are listed.</li></ul>                                                 | The service account isn't allowed, or mapping is below 80%         | Remove the service account mid-import                                                            | OAuth in testing mode for the internal pilot                 | Stage E                             |
| **S7 Mobile** (optional within 14 days) | Can we get a signed Android preview onto a real device, and what does iOS need?                                                                                                                                                  | <ul><li>A versioned Expo starter (SDK 58) in a scratch Expo account.</li><li>An EAS Android internal build on the **Free plan** (15 builds included).</li><li>Install it on an emulator and a phone.</li><li>A desk review of the iOS steps.</li></ul> | A$0 on Free; 1–2 days. **iOS needs a paid Apple team (US$99 a year): approval required**                                                | An Expo account                                                               | The APK is installed and shows the marker; the times are recorded                                                                                                                                                                   | The build fails on the stock starter                               | Revoke the robot token during a build                                                            | Defer mobile                                                 | The mobile gate                     |
| **S8 Customer value**                   | Does Foundation beat the starter on real projects? Does anyone else want it?                                                                                                                                                     | <ul><li>Time real launches: the checklist versus the S2 harness.</li><li>Book 5 of the 10–15 agency interviews.</li></ul>                                                                                                                              | A$0; continuous                                                                                                                         | Not applicable                                                                | Foundation is at least 50% faster or catches at least 1 failure the checklist missed; the interview thresholds in §10.6                                                                                                             | No difference                                                      | Not applicable                                                                                   | Starter only                                                 | G2, G3, the SaaS gate               |

### 12.2 Day by day (about 3 h a day of platform time; the rest is delivery)

| Days  | Work                                                                     |
| ----- | ------------------------------------------------------------------------ |
| 1     | **S0** baseline rehearsal (task 128), timed. Book the interviews.        |
| 2–3   | **S1** Sanity authorisation and Blueprints.                              |
| 4–6   | **S2** scripted Vercel launch with the marker check.                     |
| 7–8   | **S4** failure injection on the S2 harness.                              |
| 9     | **S5** design and content contract run.                                  |
| 10–11 | **S6** SEO contract tests and the Search Console mapping.                |
| 12    | **S3** local Cloudflare build attempt.                                   |
| 13    | **S7** Android APK on Expo Free (optional).                              |
| 14    | **Gate G1**: write the results into §2 and §4 of this plan, then decide. |

### 12.3 The 30-day vertical slice (days 15–45)

**Scope:** Foundation 0.2, which is `nocturne launch` for Vercel, used on one real client project.

**Deliverables**

1. **Template:** `blueprint.json`, plus `siteIdentity.verificationMarker` rendered as a `<meta>` tag (server-only, no client JavaScript). It ships as a template minor version.
2. **Foundation repo:**
   - the ledger schema (runs, steps, resources, timings, audit);
   - the step framework;
   - the `sanity`, `github` and `vercel` modules;
   - the verifier;
   - the CLI with its local browser wizard and run timeline;
   - `resume`, `status`, `verify` and `detach`.
3. **Runbooks:** for launch, recovery and offboarding.

**Acceptance**

- Five consecutive rehearsal launches and **one real client launch** reach `verified`.
- Timings are recorded for all of them.
- S4 injections all pass.
- There are no secrets in logs.
- `npm run check` passes in both repos.

### 12.4 Gates

| Gate               | When                                          | Go if                                                                                                                                                                                                                                                                  | Otherwise                                                                        |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **G1**             | Day 14                                        | <ul><li>S2 gives verified previews twice.</li><li>S4 shows no duplicates or orphans.</li><li>S1 is either solved or an explicit manual gate is acceptable.</li></ul>                                                                                                   | Stay with the starter plus checklist, and add the marker and `launch:check` only |
| **G2**             | Day 45                                        | <ul><li>The slice is accepted (§12.3).</li><li>Connected wall-clock median ≤ 15 minutes.</li><li>Hands-on time ≤ 5 minutes.</li><li>At least 50% faster than S0, or it caught at least 1 real failure.</li></ul>                                                       | Freeze Foundation at 0.2 and keep it as a script                                 |
| **G3**             | Day 90                                        | <ul><li>Three or more real launches through the launcher.</li><li>Maintenance ≤ 4 h a month.</li><li>Clients complete ≥ 80% of usability tasks unaided.</li><li>**Either** at least 2 launches a month are projected **or** at least 3 paid design partners.</li></ul> | No hosted control plane; review again in 90 days                                 |
| **Cloudflare**     | After G2                                      | The §4.2 conditions (a)–(e)                                                                                                                                                                                                                                            | Cloudflare stays "not yet supported", with the reasons                           |
| **Mobile**         | After G2                                      | <ul><li>A real mobile opportunity (paid or internal).</li><li>S7 passes.</li><li>The client will own the Apple, Google and Expo accounts.</li></ul>                                                                                                                    | Mobile stays a planned type with no build work                                   |
| **Search Console** | After the first live site has 28 days of data | S6 passes, and at least 3 opportunity cards are judged useful by you or a client                                                                                                                                                                                       | Keep the deterministic audits only                                               |
| **SaaS**           | Not before day 90                             | §10.6 thresholds, plus one pre-payment                                                                                                                                                                                                                                 | It stays an internal tool                                                        |

**Metrics, kept from S0 onward**

- Launch completion rate without manual intervention.
- Median and p90 wall-clock time per host, plus hands-on, consent and queue time.
- Manual clicks, retries and support contacts per launch.
- API and build cost per launch.
- Agency hours saved against the baseline.
- Client editing success (task 77).
- For mobile: time to each state in the §6.3 table.

### 12.5 Staged MVP and v1 plan

| Stage                               | Content                                                                                                        | Depends on           | Effort `[Hyp]` |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------- | -------------- |
| 0. Evidence                         | S0–S8                                                                                                          | Approval             | 8–10 days      |
| A. Launcher (Foundation 0.2–0.3)    | The CLI with a local wizard, the ledger, verification; recovery and offboarding                                | G1                   | 10–15 days     |
| B. Hosted internal (Foundation 1.0) | Tasks 37–41 retargeted, a GitHub App, a Vercel integration, Vercel Workflows, projects UI, integrations, audit | G3                   | 25–40 days     |
| C. Cloudflare (1.x)                 | Host modules, the Cloudflare profile, contract suite, documentation                                            | G2 + Cloudflare gate | 5–15 days      |
| D. Mobile beta (2.0)                | Expo starter blueprint, Android path, iOS TestFlight path, web content API                                     | G2 + mobile gate     | 15–25 days     |
| E. Content Intelligence             | Search Console import, mapping, cards, change history; folds in task 52                                        | Search Console gate  | 8–12 days      |
| F. SaaS validation                  | Design-partner pilots; billing (45–48) stays deferred                                                          | SaaS gate            | Not applicable |

**Solo-developer assumptions**

- About 15–20 h a week available, of which at most 30% goes to platform work.
- A "day" means about 6 focused hours.

**Cash to the end of Stage A:**

- A$0–50 a month (Neon free tier, existing Vercel Pro);
- plus about US$15–30 if S1 needs a Growth seat.

### 12.6 Ranked by impact, risk and effort

| Rank | Item                                                                                 | Impact | Risk reduced    | Effort |
| ---: | ------------------------------------------------------------------------------------ | ------ | --------------- | ------ |
|    1 | Ship the active client's link page and site (tasks 124, 125) using the baseline (S0) | High   | High            | Low    |
|    2 | S2 + S4 (scripted verified launch, failure injection)                                | High   | High            | Medium |
|    3 | The verification marker and `blueprint.json` in the template                         | High   | High            | Low    |
|    4 | S1 Sanity authorisation                                                              | Medium | High            | Low    |
|    5 | The 30-day launcher slice                                                            | Medium | Medium          | Medium |
|    6 | SEO contract tests (S6, part 1)                                                      | Medium | Medium          | Low    |
|    7 | Agency interviews                                                                    | Medium | High (strategy) | Low    |
|    8 | The section contract and `supportingMedia` slot                                      | Medium | Low             | Low    |
|    9 | The Cloudflare local build (S3)                                                      | Low    | Medium          | Low    |
|   10 | Android APK proof (S7)                                                               | Low    | Medium          | Low    |

### 12.7 DO NOT BUILD (until the stated gate)

- A hosted control plane (until G3); SaaS authentication, billing or multi-tenancy (until the SaaS gate).
- A generic provider marketplace, plugin system, or adapters with a single implementation.
- A visual page builder, an arbitrary layout editor, a Figma clone, or image-to-site generation (§9.7 only, after G3).
- AI that publishes; SEO scores; "LLM rank"; promised uplifts.
- A shared runtime serving several client sites; a custom CMS editing UI replacing Studio.
- Your own iOS or Android signing or certificate management (use EAS); store automation beyond EAS Submit; universal web and native UI components.
- Cloudflare Pages or Direct Upload projects; forked host variants.
- Supabase integration (until a blueprint needs app data); automatic DNS changes (until the Ops domain tasks); automatic suspension (until the billing gate).
- **New Studio design features**, except blockers, until M1 (the first full site live). This needs your approval.
- Premium dashboard polish before G2 metrics exist.

---

## 13. Repository and roadmap reconciliation

### 13.1 Reusable code

| Asset                                                                                             | Path                                                                                                                                                                                                                                          | Reuse                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sanity setup steps: connection check, create project, Viewer token, CORS, import with `--missing` | `scripts/setup/index.mjs`, `scripts/setup/seed.mjs`, `scripts/setup/validate.mjs`                                                                                                                                                             | The Stage A `sanity` provider uses the same CLI-session approach. Seed documents are generated by importing `seed.mjs` from the **pinned checkout**, which is a pure module |
| Launch checks                                                                                     | `scripts/launch-check.mjs`, `scripts/launch-check/*.mjs`                                                                                                                                                                                      | The verifier runs `launch:check --json` inside the cloned client repo, so the pinned version's own checks apply                                                             |
| Dataset privacy check                                                                             | `scripts/check-dataset.mjs`                                                                                                                                                                                                                   | Verification step 7                                                                                                                                                         |
| Releases                                                                                          | `scripts/release.mjs`, `scripts/check-version.mjs`, `template-version.json`, `CHANGELOG.md`                                                                                                                                                   | The blueprint registry's source; `release` also writes `blueprint.json` (§13.3)                                                                                             |
| Deployed identity                                                                                 | `src/app/api/site-info/route.ts`                                                                                                                                                                                                              | Verification step 2                                                                                                                                                         |
| CI, backups, schema deploy                                                                        | `.github/workflows/*.yml`                                                                                                                                                                                                                     | Approving a blueprint (CI on the tag); client CI; schema deploy off the critical path                                                                                       |
| Fake Content Lake and fixtures                                                                    | `tests/e2e/fake-sanity.mjs`, `tests/e2e/fixtures/`                                                                                                                                                                                            | A harness for the content and SEO contract tests                                                                                                                            |
| JSON-LD, sitemap, robots                                                                          | `src/features/site/components/site-json-ld.tsx`, `src/features/site/utils/business-json-ld.ts`, `src/features/blog/components/article-json-ld.tsx`, `src/features/team/components/person-json-ld.tsx`, `src/features/events/utils/json-ld.ts` | The SEO contract                                                                                                                                                            |
| Tokens pipeline                                                                                   | `scripts/build-tokens.mjs`, `src/styles/tokens.json`                                                                                                                                                                                          | The design contract; later, `tokens.native.ts`                                                                                                                              |
| Roles                                                                                             | `src/lib/sanity/roles.ts`                                                                                                                                                                                                                     | Access semantics for invites                                                                                                                                                |
| Host coupling to isolate later                                                                    | `src/proxy.ts`, `src/lib/edge-config-sync.ts`, `src/config/site-url.ts`, `src/lib/styleguide-access.ts`, the 10 files reading `VERCEL_*`                                                                                                      | Cloudflare stage                                                                                                                                                            |

### 13.2 Missing contracts

- `blueprint.json` (B.1).
- The verification marker and verification spec (B.4).
- The host capability profile (B.5).
- The run and resource ledger (B.2, B.3).
- The **section contract** schema-shape test (§9.1).
- The **design ownership** table and its contract test (§9.2).
- The **JSON-LD visible-content** test (§9.4).
- The Search Console URL-to-document mapping (B.7).

### 13.3 Proposed refactors

These are small and additive. Each would be its own PR, made only after approval.

1. **Verification marker.**
   - Add `siteIdentity.verificationMarker`, an agency-only hidden string field.
   - The site shell renders `<meta name="nocturne:marker" content>` when it is set. This is a server component with no client JavaScript, and it doesn't touch the budget.
   - The seed sets it.
   - `launch:check` gains `--expect-marker=<value>`.
   - Tests: unit, e2e (fixture) and launch-check fixtures.
2. **`blueprint.json`**, written by `scripts/release.mjs` at release time. It holds the ID, version, tag, required environment variables (with their scope and whether they are secret), seed profiles and the verification checks. `check:version` validates it.
3. **Host-neutral deployment context.** A `src/config/deploy-env.ts` module derives `DEPLOY_ENV` and `DEPLOY_COMMIT_SHA` from `VERCEL_*` today, and from Cloudflare variables later. The 10 direct reads switch to it. Behaviour doesn't change.
4. **`supportingMedia` in the split family**, when a design calls for it.
5. **The JSON-LD visible-content contract test.**
6. **Later, at the Cloudflare stage:** move the Vercel-only modules behind `src/lib/host/`. Not now.

### 13.4 Existing tasks: retain, merge or archive

This is a **proposal only. Nothing has been changed in the plan artifact.**

| Existing IDs                                                                  | Proposed disposition                                                                                                                                            |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **124, 125, 128, 11, 30, 31, 32, 63, 64**                                     | **Retain and prioritise.** They are the real return on investment and the baseline. Add a timing capture to 11, 124 and 128 (S0).                               |
| 12, 13, 14, 22                                                                | Retain (client delivery).                                                                                                                                       |
| **42** (provisioning script)                                                  | **Merge into the Foundation launcher tasks.** Keep 42 as the parent ID and alias, so history and references survive.                                            |
| **37–41** (Ops scaffold, clients and sites, provider status, health, backups) | **Retain the IDs. Retarget them** to Stage B, "Foundation (hosted)", gated on G3. Note in the cards that `currawong-ops` is now `nocturne-foundation/apps/web`. |
| 43, 44                                                                        | Retain in Stage B.                                                                                                                                              |
| 129                                                                           | Retain. It can run at any time, and it feeds Stage B.                                                                                                           |
| 130–135                                                                       | Retain, after Stage B.                                                                                                                                          |
| 45–49                                                                         | Retain, deferred to the billing and SaaS gate.                                                                                                                  |
| 50                                                                            | Retain. Note: a single `nocturne` CLI later hosts `add`, `list` and `diff`.                                                                                     |
| **52** (monthly client report)                                                | **Merge into Stage E** (Search Console intelligence). Keep the ID.                                                                                              |
| 53, 54                                                                        | Retain. The care offer depends on 53.                                                                                                                           |
| 57–62, 141, 144, 178, 184                                                     | Retain as trigger-based. 61 is also an option for the Cloudflare Worker size limit. 58 is the trigger for a Design Engine package.                              |
| 167 (doing)                                                                   | Finish it.                                                                                                                                                      |
| 168, 173                                                                      | Retain. 168 (contrast) feeds S5.                                                                                                                                |
| 137, 139, 146–148, 151, 156–159, 177, 185, 7, 86, 87, 98, 108                 | Retain. **Pause new starts until M1** (needs approval). Exceptions: blockers, and anything a signed client needs.                                               |
| 94–96, 102–105                                                                | Retain the booking and Contentful lanes; they are triggered by clients.                                                                                         |
| 77, 180                                                                       | Retain. 77 feeds G3.                                                                                                                                            |
| 170 (doing, manual)                                                           | Retain.                                                                                                                                                         |

**Archived:** none. **Deleted:** none. **Renumbered:** none.

### 13.5 Proposed new tasks and versions

The new tasks are numbered 187 onward, following the plan's next-free-number rule. Details are in `docs/nocturne/NOCTURNE_ROADMAP_PROPOSAL.md`.

**Versions**

- **Template:** semantic versioning continues. The marker and `blueprint.json` join v1.9.0's scope, or ship as their own minor release if v1.9.0 is far away.
- **Foundation:**
  - 0.1: spikes;
  - 0.2: the Vercel launcher;
  - 0.3: recovery and offboarding;
  - 1.0: hosted, internal;
  - 1.1: Cloudflare;
  - 2.0: mobile beta.

**Milestones**

- **Kept:** M0 (the link page live) and M1 (the first full site live, with a branded CMS).
- **New:**
  - MF1: the first verified scripted launch (rehearsal);
  - MF2: the first real client launched through Foundation;
  - MF3: the G3 decision.

### 13.6 Moving from the current plan safely

1. This document and the roadmap proposal are new, uncommitted files. Nothing else changed.
2. On approval, add a stage, **"F · Foundation (evidence-gated)"**, after "Now".
   - It holds tasks 187 onward.
   - Text-only cross-references go into cards 42, 37–41 and 52.
   - Statuses, notes and IDs stay as they are.
3. Rebuild the artifact with the established method, as done for version 18:
   - strip the first and last lines;
   - assert that each replacement matches exactly once;
   - `node --check` the data script;
   - a headless render check.
4. Rollback: republish the previous artifact version.

---

## 14. Final recommendation

**The smallest product worth building:**

- Foundation 0.2, `nocturne launch`, for Vercel and internal use only;
- plus the template's verification marker and `blueprint.json`;
- plus `launch:check --json` as the verifier.

Everything else waits for a gate.

**The first end-to-end proof: S2 with S4.**

- From template `v1.8.0`, scripted on scratch accounts, reach a **verified preview twice**:
  - the marker is fetched over real HTTP;
  - `launch:check --json` is clean;
  - timings are recorded.
- Then kill the process after each create step, and show that resume completes without duplicates or orphaned tokens.

**The next five actions**

1. **This week:** run **S0**, the timed rehearsal (task 128), and keep the active client's launch (124, 125) moving. That is the real return on investment.
2. **Approve S1:** a throwaway Sanity organisation. It may need a Growth seat for one month, about US$15–30.
3. **Approve creating** the private `nocturne-foundation` repo and the scratch accounts for S2 and S4: a GitHub organisation, a Vercel team and a Sanity organisation.
4. **Book five agency interviews** (S8).
5. **Approve pausing new design features** until M1: finish 167, keep 168.

**Approvals requested**

| #   | Approval                                                                                                                                                                | Cost or risk                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| A1  | Run S0, S2, S4, S5 and S6 on scratch or own accounts                                                                                                                    | A$0 on existing plans; scratch resources only |
| A2  | Run S1, with a possible Growth seat                                                                                                                                     | About US$15–30                                |
| A3  | Create the private `nocturne-foundation` repo, a scratch GitHub organisation and a scratch Vercel team                                                                  | Low                                           |
| A4  | Pause new design features until M1                                                                                                                                      | Delays P1 and P2 polish                       |
| A5  | Add stage F and tasks 187 onward to the canonical plan artifact (additive, using the version 18 build method)                                                           | None if additive                              |
| A6  | Accept the residual risk that agency-only design fields are enforced by Studio only (C6)                                                                                | Recoverable edits                             |
| A7  | The sequencing decisions: C2 (CLI before hosted), C3 (Vercel only in the MVP), C4 (mobile gated), C5 (repo strategy), C7 (two ownership modes), C9 (local wizard first) | See §2.6                                      |

**New evidence that would overturn this plan**

- **S1 fails, and the Marketplace ownership model is unacceptable.** Then the launcher's Sanity half stays manual, and the case for automation weakens. Go back to A1 plus verification.
- **S0 shows a checklist launch under about 45 minutes with no failures,** and fewer than 12 sites a year are expected. Then stop after the marker and the verification work.
- **Five or more of 15 agencies show the pain, and three or more will pay for a pilot.** Then accelerate Stage B, and consider a verification-only SaaS mode that works with any starter.
- **A paying client wants an app.** Then run S7 and Stage D earlier, and keep Android first.
- **OpenNext adds Node middleware support, or Cloudflare ships a verified adapter, and the contract suite passes.** Then move Stage C earlier.

---

## Appendix A — Traceability matrix

| Proposed item                                  | Customer pain                                                        | Decision         | Test                                        | Evidence gate       |
| ---------------------------------------------- | -------------------------------------------------------------------- | ---------------- | ------------------------------------------- | ------------------- |
| S0 baseline (task 128, extended)               | Nobody knows what a launch costs                                     | D-21             | Timed run, click log                        | G1                  |
| 187 `blueprint.json`                           | You can't tell which release a launch used, or whether it was tested | D-11, D-14       | Schema test in `check:version`              | G1                  |
| 188 Verification marker                        | "It deployed" isn't "it works"                                       | D-14             | Unit, e2e and launch-check fixtures         | G1                  |
| 189 S1 Sanity authorisation                    | Manual Sanity setup and unclear ownership                            | D-12, D-13       | Scripted calls on the scratch organisation  | G1                  |
| 190 S2 scripted launch                         | An 8-step manual checklist                                           | D-01, D-11       | Golden-path run twice                       | G1                  |
| 191 S4 failure injection                       | Half-finished projects, orphaned resources                           | D-05, §8.2       | Injection matrix                            | G1                  |
| 192–197 Launcher slice                         | Setup takes time and fails silently                                  | D-01, D-04, D-22 | §12.3 acceptance                            | G2                  |
| 198 S5 design and content contract             | A theme change breaks legibility; client edits fail                  | D-15             | §9.2 contract test, Presentation run        | G2                  |
| 199 S6 SEO contract and Search Console mapping | Untruthful structured data; vague SEO advice                         | D-18             | JSON-LD visible-content test, mapping ≥ 95% | Search Console gate |
| 200 S3 Cloudflare portability                  | A customer wants Cloudflare                                          | D-08, D-09, D-10 | Contract suite on Cloudflare preview        | Cloudflare gate     |
| 201 S7 Android APK                             | A client wants an app                                                | D-17             | Install on an emulator and a device, marker | Mobile gate         |
| 202 S8 interviews and value comparison         | Unknown demand                                                       | D-01             | §10.6 thresholds                            | G3, SaaS gate       |
| 37–41 retargeted (Stage B)                     | Many sites, scattered dashboards                                     | D-02, D-03, D-05 | Hosted end-to-end launch, audit log         | G3                  |
| 52 merged into Stage E                         | Clients can't see the value of care                                  | D-18             | Opportunity cards judged useful             | Search Console gate |

---

## Appendix B — Technical contracts (illustrative designs, not committed code)

### B.1 Blueprint spec

```ts
/** Written by the template's release script; read by Foundation. Never contains secret values. */
export interface BlueprintSpec {
  id: 'web-next-sanity' | 'mobile-expo' // more only with a second real starter
  version: string // equals template-version.json
  source: { repo: string; tag: string; sha: string } // pinned: tag AND commit
  approved: { ci: 'green'; checkedAt: string; rehearsalRunId?: string } | { quarantined: string }
  projectTypes: Array<'website' | 'mobile' | 'website+mobile'>
  hosts: Record<'vercel' | 'cloudflare', HostSupport>
  env: Array<{
    key: string
    scope: 'build' | 'runtime' | 'both'
    secret: boolean
    source: 'sanity-robot' | 'generated' | 'operator' | 'derived'
    required: boolean
  }>
  sanity: {
    requiresPlan: 'growth' // private dataset + Editor role
    dataset: { name: string; visibility: 'private' }
    robots: Array<{ label: string; role: 'viewer' | 'editor'; purpose: string }>
    cors: Array<{ origin: 'localhost' | 'production' | 'preview'; credentials: boolean }>
    seedProfiles: Array<'prelaunch-links' | 'full-site'>
  }
  verification: VerificationSpec
  upgrade: { from: string; migrations: string[] } // semver range + migration IDs
}

export type HostSupport =
  | { status: 'supported'; degraded: Capability[] }
  | { status: 'unsupported'; reason: string; tracking?: string }

export type Capability =
  'proxyGate' | 'abTests' | 'edgeRedirects' | 'ogImages' | 'tagRevalidation' | 'instantRollback'
```

### B.2 Runs and steps

```ts
export type RunState =
  | 'draft'
  | 'preflight'
  | 'provisioning'
  | 'building'
  | 'verifying'
  | 'verified'
  | 'blocked'
  | 'failed_retryable'
  | 'failed_terminal'
  | 'cancelled'
  | 'detached'

export interface StepContext {
  runId: string
  orgId: string
  correlationId: string
  ledger: Ledger // write-ahead intents, resource records, timings
  signal: AbortSignal // cooperative cancellation
  log: RedactingLogger
}

/** Every provider action is a Step. Executors (CLI loop, Vercel Workflows, Inngest) only call these. */
export interface Step<I, O> {
  key: string // e.g. 'vercel.project'
  idempotencyKey(input: I): string
  plan(
    ctx: StepContext,
    input: I,
  ): Promise<{ action: 'create' | 'update' | 'noop'; detail: string }>
  apply(ctx: StepContext, input: I): Promise<O> // must reconcile-by-listing before any create
  verify(
    ctx: StepContext,
    input: I,
    output: O,
  ): Promise<{ ok: true } | { ok: false; reason: string }>
  compensate?(ctx: StepContext, input: I, output: O): Promise<void> // only for resources this run created
  retry: {
    maxAttempts: number
    baseMs: number
    capMs: number
    retryOn: Array<'429' | '5xx' | 'network'>
  }
  timeoutMs: number
}

export type Blocked = {
  kind: 'consent' | 'payment' | 'owner_approval' | 'user_input'
  provider: string
  howToFix: string
  url?: string
}
```

### B.3 Resource ledger

```ts
export interface ResourceRecord {
  id: string
  orgId: string
  projectId: string
  provider: 'github' | 'sanity' | 'vercel' | 'cloudflare' | 'expo' | 'apple' | 'google-play' | 'gsc'
  kind: string // 'repo' | 'sanity-project' | 'dataset' | 'robot' | 'cors-origin' | 'vercel-project' | ...
  externalId: string | null // null while 'create_requested'
  logicalName: string // deterministic: slug or label with nonce
  intent: 'create_requested' | 'created' | 'adopted' | 'transferred' | 'revoked'
  createdByRun: string | null
  owner: 'client' | 'currawong' | 'nocturne'
  deletePolicy: 'never' | 'on_undo_if_untouched'
  observed: { state: 'unknown' | 'present' | 'missing' | 'drifted'; at: string; detail?: string }
}
```

### B.4 Verification

```ts
export interface VerificationSpec {
  marker: { source: 'siteIdentity.verificationMarker'; selector: 'meta[name="nocturne:marker"]' }
  siteInfo: { templateVersion: true; commitSha: true; launchStatus: 'prelaunch' | 'live' }
  metadata: { titleIncludesClientName: true; canonicalMatchesSiteUrl: true }
  jsonLd: { requiredIds: ['#organization', '#website']; visibleContentMatch: true }
  studio: { path: '/studio'; expectStatus: 200 }
  sanity: { corsIncludesSiteUrl: true; datasetPrivate: true }
  launchCheck: { mode: 'prelaunch' | 'launch'; failOn: 'fail' }
}

export interface VerificationResult {
  url: string
  checkedAt: string
  fromNetwork: 'foundation' // never "provider says ready"
  checks: Array<{ id: string; status: 'pass' | 'warn' | 'fail'; evidence: string }>
  verified: boolean // true only if every required check passes
}
```

### B.5 Future role interface: `WebHost`, added with Cloudflare

```ts
export interface WebHost {
  id: 'vercel' | 'cloudflare'
  capabilities: Record<Capability, { supported: true } | { supported: false; reason: string }>
  ensureProject(
    ctx: StepContext,
    p: { name: string; repo: string; env: EnvSpec[] },
  ): Promise<{ projectId: string; productionUrl: string }>
  setEnv(ctx: StepContext, projectId: string, env: EnvValue[]): Promise<void> // build vs runtime handled per host
  awaitDeployment(
    ctx: StepContext,
    projectId: string,
    commitSha: string,
  ): Promise<{ deploymentId: string; url: string; state: 'READY' | 'ERROR' | 'CANCELED' }>
  previewAuth(
    ctx: StepContext,
    projectId: string,
  ): Promise<{ headers: Record<string, string> } | { public: true }>
  rollback(ctx: StepContext, projectId: string, toDeploymentId: string): Promise<void>
  native(): unknown // escape hatch to the provider SDK
}
```

### B.6 Future mobile interfaces

```ts
export type MobileState =
  | 'repo_ready'
  | 'eas_linked'
  | 'credentials_ready'
  | 'build_queued'
  | 'build_running'
  | 'artifact_ready'
  | 'install_verified'
  | 'internal_distribution'
  | 'store_testing'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'released'
  | 'superseded'

export interface MobileBuildService {
  startBuild(
    ctx: StepContext,
    p: { platform: 'android' | 'ios'; profile: 'preview' | 'production'; gitRef: string },
  ): Promise<{ buildId: string }>
  awaitArtifact(
    ctx: StepContext,
    buildId: string,
  ): Promise<{ url: string; kind: 'apk' | 'aab' | 'ipa' }>
  recordInstall(
    ctx: StepContext,
    e: { buildId: string; device: string; os: string; markerSeen: string; tester: string },
  ): Promise<void>
}

export interface StoreChannel {
  store: 'app-store' | 'google-play'
  submit(
    ctx: StepContext,
    p: { buildId: string; track: 'internal' | 'closed' | 'production' | 'testflight' },
  ): Promise<{ submissionId: string }>
  status(
    ctx: StepContext,
    submissionId: string,
  ): Promise<{ state: MobileState; storeMessage?: string }>
  manualSteps(): Array<{ step: string; owner: 'client' | 'currawong'; url: string }> // explicit, never hidden
}
```

### B.7 Future search data

```ts
export interface SearchDataSource {
  id: 'gsc' | 'bing-manual'
  importWindow(
    ctx: StepContext,
    p: { property: string; start: string; end: string },
  ): Promise<{ rows: SearchRow[]; truncated: boolean; dataState: 'final' }>
}

export interface OpportunityCard {
  id: string
  kind:
    | 'ctr_gap'
    | 'declining_page'
    | 'query_without_page'
    | 'indexing_anomaly'
    | 'structured_data'
    | 'stale_fact'
  basis: 'deterministic' | 'heuristic' | 'human_judgement'
  page: { url: string; sanityDocumentId: string | null }
  evidence: {
    window: [string, string]
    compareWindow?: [string, string]
    metrics: Record<string, number>
    caveats: string[]
  }
  suggestedAction: string
  effort: 'minutes' | 'hours'
  change?: { documentId: string; revBefore: string; revAfter: string; publishedAt: string }
}
```

### B.8 Section contract (the split family with `supportingMedia`) — a Sanity schema sketch

```ts
import { defineField, defineType } from 'sanity'

export const split = defineType({
  name: 'split',
  type: 'object',
  groups: [{ name: 'content', default: true }, { name: 'design' }],
  fields: [
    defineField({ name: 'heading', type: 'headingText', group: 'content' }),
    defineField({ name: 'body', type: 'blockContent', group: 'content' }),
    defineField({
      name: 'actions',
      type: 'array',
      of: [{ type: 'cta' }],
      validation: (r) => r.max(2),
      group: 'content',
    }),
    defineField({ name: 'media', type: 'mediaItem', group: 'content' }), // image or video
    defineField({ name: 'supportingMedia', type: 'mediaItem', group: 'content' }), // e.g. video below the image
    defineField({
      name: 'layout',
      type: 'string',
      group: 'design', // agency-only through client mode (Studio gating, not a permission)
      options: { list: ['media-right', 'media-left', 'stacked'] },
      initialValue: 'media-right',
    }),
    defineField({ name: 'style', type: 'sectionStyle', group: 'design' }), // tone, background, glass, motion
  ],
})
```

### B.9 Verification marker — the render sketch

```tsx
// In the site shell (a server component). Content-sourced, so it proves CMS → query → render.
{
  siteIdentity.verificationMarker ? (
    <meta name="nocturne:marker" content={siteIdentity.verificationMarker} />
  ) : null
}
```

---

## Appendix C — Quality gates

| Gate                    | What                                                                                                                                               | Where                            | Blocks                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------- |
| Unit                    | Pure logic (steps, reconcile, redaction, mapping, card rules), with providers mocked                                                               | Both repos, CI                   | Merge                               |
| Provider contract       | Each provider module replays recorded fixtures; a nightly run against the sandbox accounts                                                         | Foundation CI                    | Release                             |
| Security                | Secret scanning; "no token in logs" tests; webhook signature tests; SSRF allow-list tests; dependency audit; Actions pinned to SHAs (already done) | Both repos                       | Merge                               |
| End-to-end              | The template's existing suite (about 2,000 tests, fake Content Lake, axe); the control plane's own Playwright flows at Stage B                     | CI                               | Blueprint approval                  |
| Failure and recovery    | The S4 injection matrix: kill after each create; 429 and 5xx; token revoked; webhook lost                                                          | Foundation, on demand and weekly | Foundation release                  |
| CMS content             | Schema extract and typegen current (exists); migration dry runs (exists); seed import idempotent; `--missing` re-run is a no-op                    | Template CI                      | Blueprint approval                  |
| Accessibility           | axe on every section gallery entry (exists); WCAG 2.2 AA on the control plane; keyboard paths                                                      | CI                               | Merge                               |
| Rich results and schema | JSON-LD parses; required IDs; `@id` unique across the sitemap; visible-content match; type choice matches `businessInfo`                           | Template CI, `launch:check`      | Blueprint approval, launch          |
| Real HTTP preview       | The marker, `site-info` SHA and version, metadata, JSON-LD, `/studio`, CORS, privacy, `launch:check --json`                                        | The verifier, every launch       | Reporting "verified"                |
| Mobile install          | Emulator install plus Maestro marker test; a physical device confirmed by a named tester                                                           | Mobile CI plus a human           | Reporting "mobile preview verified" |

---

## Appendix D — Open questions and confidence

**Questions, ordered by how much each answer would change the plan:**

1. **Pipeline.** How many website projects do you realistically expect to sign in the next 6 and 12 months, and at what typical fee?
   - It decides whether anything beyond the launcher can ever pay back (§10).
2. **Ownership default.** For managed clients, do you keep the approved model, or do you want true client-owned GitHub, Vercel and Sanity accounts from day one?
   - The approved model: the client's Sanity organisation administered by Currawong, with the repo and Vercel project in Currawong's accounts, transferred at exit.
   - It changes how provisioning is authorised, and the offboarding work.
3. **Mobile demand.** Is there a concrete mobile client or revenue opportunity in the next six months?
   - It decides whether S7 and Stage D run early or wait.
4. **Why Cloudflare.** Is there a specific client or reason (cost, an existing Cloudflare account, policy), or is it product completeness?
   - It decides whether Stage C is worth a degraded profile or should wait for upstream support.
5. **Time split.** Will you commit to the roughly 25–30% platform cap, and to the design-feature pause until M1?
   - It decides the 14- and 30-day calendar.

**Confidence**

| Area                                                 | Confidence     | Why                                                                              |
| ---------------------------------------------------- | -------------- | -------------------------------------------------------------------------------- |
| Repository facts                                     | High           | Read directly; tests run                                                         |
| Vercel, GitHub, Search Console and Expo capabilities | High to medium | Primary docs were fetched; some pricing figures are third-party                  |
| Sanity delegated provisioning                        | **Low**        | No documented OAuth; creating projects with an organisation robot is unconfirmed |
| Cloudflare for this starter                          | **Low**        | Node middleware isn't supported; the earlier attempt failed                      |
| Apple and Google manual steps                        | Medium         | Partly verified; app-record creation and review times unknown                    |
| Economics                                            | Low            | One self-reported data point; every number is a hypothesis                       |
| Timing targets                                       | Low            | No timed launch exists yet                                                       |

---

## Appendix E — Sources

Primary pages fetched on **25 October 2026** carry `[Doc]`. `[Search]` entries come from search results whose primary page was not read in full.

**Strategy and repository**

- `docs/Nocturne_Foundation_Architecture_and_SEO_Strategy.docx`, 25 Oct 2026, extracted in full (no pandoc; a standard-library XML extraction, cross-checked with macOS `textutil`).
- Repository at `297110d`: `package.json`, `next.config.ts`, `src/proxy.ts`, `src/lib/sanity/live.ts`, `src/app/api/revalidate/route.ts`, `src/app/api/site-info/route.ts`, `scripts/setup/*`, `scripts/launch-check*`, `.github/workflows/*`, `README.md` (Deploying, Cloudflare, Colour systems, Studio roles), `docs/template-packaging.md`, `docs/code-audit/2026-10-18/report.md`, `schema.json`, `src/styles/tokens.json`.
- Next.js 16.4.2 local docs: `node_modules/next/dist/docs/02-pages/04-api-reference/06-adapters/*`, `…/adapterPath.md`.
- _Currawong Build Plan_, version 18: https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL (read only, with its progress database).
- _Currawong Creative Platform Strategy_, 14 Oct 2026: https://claude.ai/code/artifact/66a213b5-3f8c-4b3f-bfe8-f4f51c5292cc ("Platform strategy" tab read in full).

**Sanity**

- Vercel integration guide `[Doc]`: https://www.sanity.io/docs/developer-guides/vercel-integration
- Blueprints introduction `[Doc]`: https://www.sanity.io/docs/blueprints/blueprints-introduction
- Access API reference, `v2025-07-11` (the first 100k characters were read) `[Doc]`: https://www.sanity.io/docs/http-reference/access-api
- Pricing `[Doc]`: https://www.sanity.io/pricing
- Organisation-level tokens changelog, 3 Jul 2025 `[Doc]`: https://www.sanity.io/docs/changelog/0e67c42e-4b0f-47e3-bbd7-498318bdfb32
- CORS docs `[Search]`: https://www.sanity.io/docs/content-lake/cors · Projects, organisations and transfers `[Search]`: https://www.sanity.io/docs/projects · https://www.sanity.io/docs/developer-guides/agencies-navigating-the-spring-2025-organization-changes

**Vercel**

- Create a project (REST) `[Doc]`: https://vercel.com/docs/rest-api/reference/endpoints/projects/create-a-new-project
- Workflows, docs updated 4 Sep 2026 `[Doc]`: https://vercel.com/docs/workflows
- Sign in with Vercel `[Search]`: https://vercel.com/docs/sign-in-with-vercel · https://vercel.com/changelog/sign-in-with-vercel
- Sanity on the Marketplace `[Search]`: https://vercel.com/changelog/sanity-vercel-marketplace
- Pricing (Pro, Hobby) `[Search: third-party; verify]`: https://vercel.com/pricing

**Cloudflare**

- Public OAuth clients, 3 Jun 2026 `[Doc]`: https://developers.cloudflare.com/changelog/post/2026-06-03-public-oauth-clients/
- OAuth consent and revoke, 14 Apr 2026 `[Search]`: https://developers.cloudflare.com/changelog/post/2026-04-14-oauth-consent-and-revoke/
- OpenNext for Cloudflare `[Doc]`: https://opennext.js.org/cloudflare
- vinext `[Doc]`: https://github.com/cloudflare/vinext
- Workers Builds Git integration `[Search]`: https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/ · Pages Direct Upload `[Search]`: https://developers.cloudflare.com/pages/get-started/direct-upload/ · Deploy buttons `[Search]`: https://developers.cloudflare.com/workers/platform/deploy-buttons/ · Workers pricing and Builds limits `[Search]`: https://developers.cloudflare.com/workers/platform/pricing/ · https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/

**GitHub**

- Repositories REST API `[Doc]`: https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template
- Permissions for GitHub Apps `[Doc]`: https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps

**Expo, Apple and Google Play**

- Pricing `[Doc]`: https://expo.dev/pricing
- Changelog (SDK 56–58) `[Doc]`: https://expo.dev/changelog
- Workflows REST API `[Doc]`: https://docs.expo.dev/eas/workflows/rest-api/
- Submit to Android `[Doc]`: https://docs.expo.dev/submit/android/ · Submit to iOS `[Doc]`: https://docs.expo.dev/submit/ios/ · Internal distribution `[Doc]`: https://docs.expo.dev/build/internal-distribution/
- Webhooks `[Search]`: https://docs.expo.dev/eas/webhooks/ · Programmatic access `[Search]`: https://docs.expo.dev/accounts/programmatic-access
- Expo Launch `[Search]`: https://expo.dev/blog/introducing-expo-launch · https://launch.expo.dev/
- Google Play testing requirement for new personal accounts `[Search]`: https://support.google.com/googleplay/android-developer/answer/14151465
- App Store Connect API `[Search]`: https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api/ · a community report on `POST /v1/apps` `[Search]`: https://github.com/andrewralon/app-template/issues/2

**Search**

- Search Console API limits, updated 28 Aug 2025 `[Doc]`: https://developers.google.com/webmaster-tools/limits
- Search Analytics query, updated 11 Aug 2026 `[Doc]`: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- AI features and your website, updated 10 Dec 2025 `[Doc]`: https://developers.google.com/search/docs/appearance/ai-features
- Sensitive scope verification `[Search]`: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- Bing AI Performance, 10 Feb 2026 `[Doc]`: https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/
- Also cited by the strategy doc, not re-fetched: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data · https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect · https://www.sanity.io/docs/visual-editing/configuring-the-presentation-tool

**Other**

- Supabase OAuth integrations `[Search]`: https://supabase.com/docs/guides/integrations/build-a-supabase-oauth-integration
- Port pricing `[Search]`: https://port.io/pricing · Backstage Software Templates `[Search]`: https://backstage.io/docs/features/software-templates
- Railway, Inngest, Trigger.dev and Temporal pricing `[Search: mostly third-party; low confidence]`: https://docs.temporal.io/cloud/pricing · https://www.inngest.com/docs/steps
