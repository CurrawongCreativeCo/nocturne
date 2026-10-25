# Nocturne Integrated Master Plan — Revision 3

**Status:** a proposal, **revision 3**, dated 25 October 2026. It follows the owner's Revision 3 brief.

- **What revision 3 changes:** only what the "Revision 3 at a glance" table below lists. Every other section is revision 2's text and remains current.
- **How it relates to revision 2:** it **supersedes revision 2**, which is archived unchanged at `docs/nocturne/history/2026-10-25-r2-NOCTURNE_INTEGRATED_MASTER_PLAN.md`. Revision 1 is kept in the same folder.
- **Companion documents:**
  - [integration review](./NOCTURNE_R3_INTEGRATION_REVIEW.md) (Document A);
  - [roadmap and tasks](./NOCTURNE_ROADMAP_PROPOSAL.md) (Document C);
  - [next sessions](./NOCTURNE_NEXT_SESSIONS.md) (Document D).

- The canonical _Currawong Build Plan_ (artifact version 18, 186 tasks) **has not been changed**.

**Founder context, which drives this revision:**

- You are a sole trader running Currawong Creative Co. alongside a full-time job.
- Nocturne is a personal investment in a better development system. You enjoy building it, and it doesn't need to pay back within 12–24 months.
- Commercial value should **emerge** from a product that proves itself in your own work.
- Sustainability and maintainability matter more than speed or sophistication.

**Repository:** `CurrawongCreativeCo/nocturne` at `297110d` (template 1.8.0), unchanged since revision 1.

**What was done for this revision:**

- Re-researched the three points you challenged: Cloudflare, Sanity roles and Sanity plans.
- Ran an **isolated local Cloudflare build and runtime test** on a throwaway copy of the repo (§2.7). Nothing was deployed, no Cloudflare account was used, and your working tree is untouched.
- Made no provider changes and no canonical-plan changes.

**Labels and currency:** as in revision 1. The labels are `[Code]`, `[Doc]`, `[Search]`, `[Rec]`, `[Hyp]` and `[Unknown]` (meaning NOT VERIFIED). Vendor prices are in US$; Currawong's prices are in A$, excluding GST.

**Terms in sections reused from revision 1:** **Stage A** means the Foundation app running locally (version 0). **Stage B** means the same app, hosted.

## Revision 3 at a glance: what changed and why

| #   | Revision 2 said                                                                                                              | Revision 3 says                                                                                                                                                                                                                                                            | Why                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | A publish gate in Phase 0 (spike E1 first)                                                                                   | **For now, clients are Contributors and Currawong publishes their drafts**, made practical by task 205 (an allowlist registry) and task 206 (agency publish review). Secure today, with no new server code (§5.5)                                                          | Sanity enforces drafts-only for Contributors `[Doc]`                        |
| 2   | The gate trusted knowledge of `draftRev`, used an `AGENCY_ONLY` denylist, and published with `createOrReplace` plus `delete` | **A hardened gate.** It works from an allowlist; checks each author and their current role; publishes through the Actions API with both revision guards; and sends new documents, deletes and releases to review. **Built only when a client needs to publish themselves** | The security review (Document A §4)                                         |
| 3   | E1 in Phase 0                                                                                                                | E1 (task 190) is re-scoped as a security verification. It sits in Phase 2, run when triggered                                                                                                                                                                              | It doesn't block the real site                                              |
| 4   | Tasks of 4–15 sessions                                                                                                       | **Split into tasks of 1–4 sessions**, with new IDs 207–214                                                                                                                                                                                                                 | Resumable part-time work                                                    |
| 5   | —                                                                                                                            | **New tasks 205 and 206**                                                                                                                                                                                                                                                  | Permissions must fail safe; agency publishes mustn't leak protected changes |
| 6   | "Additive" edits to the canonical plan                                                                                       | Records for 187–214, plus stages `f` and `fx`, **validated against the canonical schema** (Document C, Appendix 1). Prompts are written on approval                                                                                                                        | A safe plan update                                                          |
| 7   | —                                                                                                                            | The "new artifact" link was the **unchanged canonical plan (version 18)**. No new requirements were found (Document A §1)                                                                                                                                                  | Transparency                                                                |

Everything else in revision 2 stands: the verdict (BUILD, staged), the architecture, ownership, plan safety, the Cloudflare findings, content contract v2 and the Foundation local-first approach.

## Revision 2 at a glance: what changed and why

| #   | Revision 1 said                                                     | Revision 2 says                                                                                                                                                                                                         | Why                                                                       |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1   | **NARROW**, driven by the launcher's weak ROI                       | **BUILD, staged and led by real projects.** Narrow the next increment, never the vision                                                                                                                                 | Founder context; personal value; dependency order                         |
| 2   | Opportunity cost dominated the analysis; a 25–30% platform-time cap | A **value ledger** across seven lines (§10.1); effort in **sessions**; sustainability guardrails instead of a cap (§12.2)                                                                                               | Founder context                                                           |
| 3   | Pause new design features until M1                                  | **No freeze.** Necessary Design Engine improvements happen now, driven by real use; optional polish waits (§9.2–9.3)                                                                                                    | The Design Engine is central; a freeze would block the first site's needs |
| 4   | A CLI-first launcher (`nocturne launch`) with a local wizard        | **Foundation is a browser app from version 0**: a Next.js app run locally, and later the same app hosted (§5.4)                                                                                                         | Don't redefine the product as CLI-first                                   |
| 5   | Create a `nocturne-foundation` monorepo after gate G1               | **No new repo until Phase 3** (provisioning code); then one repo holding one Next.js app, not a monorepo (§5.3)                                                                                                         | The owner's question; fewer moving parts while unproven                   |
| 6   | Accept Studio-only hiding of agency controls as a residual risk     | **Enforce it with a publish gate**: clients are Contributors (Sanity enforces drafts-only), and a server-side policy publishes only allowed changes. Spike first (§5.5)                                                 | The owner's correction; Growth roles can't scope datasets or fields       |
| 7   | Cloudflare "not supported: OpenNext lacks Node middleware"          | **OpenNext supports `proxy.ts` since 1.20.3.** Locally, the precise blockers are bug #1400 (with a one-line patch), a size limit we only fit when minified, and a page-render hang under the default cache (§2.7, §4.2) | The owner's correction, plus a local test                                 |
| 8   | Two ownership modes                                                 | **One: Currawong-managed and transfer-ready** (§5.6)                                                                                                                                                                    | Owner direction                                                           |
| 9   | Growth plan noted only as a cost                                    | **Plan-safety rules.** No trials for client projects; never downgrade; daily privacy checks. A downgrade makes private datasets public (§5.6)                                                                           | New evidence                                                              |
| 10  | `service` and `location` only "when needed"                         | **Content contract v2** makes services, locations and their relationships standard, behind profile flags (§9.7)                                                                                                         | SEO is foundational                                                       |
| 11  | Search Console gated on data                                        | Same gate, but the deterministic SEO checks are extended **now**, and the Search Health design is kept ready (§9.8–9.9)                                                                                                 | Owner priority                                                            |
| 12  | Mobile gated                                                        | Still gated, and explicitly **architecture-ready**: project type, blueprint spec, content API pattern, token export                                                                                                     | Owner direction                                                           |
| 13  | A 14-day research schedule of eight spikes                          | **Four essential checks** before implementation; the other spikes move to the phase that needs them (§12.3)                                                                                                             | "Forward progress, not endless research"                                  |
| 14  | Gates G1–G3 with launch-count and payment conditions                | Success is your 90-day list (§12.6), plus **readiness checks**, not ROI tests (§12.7)                                                                                                                                   | Owner direction                                                           |
| 15  | Proposed tasks 187–202                                              | Proposed tasks **187–204**, re-sequenced, with a mapping (§13.5)                                                                                                                                                        | Follows from all of the above                                             |

---

## 1. Executive verdict

### Verdict: **BUILD — staged, led by real projects** (replaces NARROW)

**Does NARROW still hold?** Only for the _next increment_, not for the product.

- **Still true:**
  - no multi-tenant SaaS yet;
  - no second host or mobile infrastructure yet;
  - launch a real website first;
  - verify everything.
- **No longer true:** the ROI framing, and the conclusion that Nocturne should shrink to a deployment script.
- **The right call for your goals:** build the whole ecosystem deliberately:
  - Foundation, the Design Engine and Content Intelligence, on shared contracts;
  - in increments that each make the next real website easier;
  - each small enough to finish in short sessions.

**First job.** Launch the active client's full website on the existing system, with:

- verification;
- a friction log;
- a timed baseline.

Then turn what hurt into:

1. necessary Design Engine improvements;
2. content contract v2, with SEO foundations;
3. a proven, repeatable provisioning flow;
4. the first Foundation app that runs that flow from the browser.

**Product identity:** _Nocturne is a design-led website system that proves its sites work and keeps them that way._

- **Foundation** launches and manages verified, client-owned sites.
- **The Design Engine** turns distinctive design into configuration instead of code edits.
- **Content Intelligence** keeps content truthful, structured and measurably improving.

Verification is the thread that runs through all three.

### Three existential risks, revised for a solo builder with a full-time job

1. **Scope that outgrows one part-time maintainer.**
   - **The load:** a 128k-line starter, a new Foundation app, provider integrations and Design Engine migrations, all on fast-moving dependencies (Next 16.x, Sanity 6.x, OpenNext, Expo).
   - **Mitigation:**
     - few modules and strong conventions;
     - tests with every change;
     - no always-on infrastructure until there is a reason;
     - a monthly maintenance session;
     - milestones that leave the system usable if you stop for weeks (§12.2).
2. **Platform depth keeps displacing the first real website.**
   - Without a live site there is no friction log, no Search Console data and no proof.
   - **Mitigation:** Phase 1 _is_ the real site. Design Engine work during Phase 1 is limited to what that site needs.
3. **Trust failures in the foundations.** Any of these would damage client trust more than any missing feature:
   - **privacy:** a lapsed or downgraded Sanity plan makes private datasets public, and enquiries are personal data;
   - **permissions:** clients publishing design or agency-only changes;
   - **deployments** that nobody verified.
   - **Mitigation:** plan-safety rules (§5.6), the publish gate (§5.5) and the verification contract, all early in the plan.

---

## 2. Evidence and source inventory

Sections 2.1–2.4 are unchanged from revision 1, and their evidence still stands. Sections 2.5–2.7 are revised or new.

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
  - 42 (provisioning script) merges into the Phase 3 provisioning proof, task 199 (revision 2 wording).
  - The "currawong-ops" app in 37–41 becomes "Foundation, hosted (later)". The task IDs are kept (revision 2 wording).
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
| An A$100/month managed website is viable                      | None                    | Untested. §10.4 shows it is probably loss-making with Growth seats plus support |
| Clients want mobile apps from Currawong                       | None                    | Untested                                                                        |
| Customers need Cloudflare                                     | Prompt requirement only | Untested                                                                        |

### 2.5 Missing materials (revised)

- **Your typical availability:** sessions per week and how long a session is. This turns the effort estimates in §12 into dates. It is open question 1.
- **The state of the active client project:**
  - the Sanity plan: paid Growth, a trial, or Free? **This is urgent** (§2.7);
  - whether the link page is live (task 124);
  - when the full site's content will be ready.
- **Account inventory:** the Vercel team and plan, GitHub organisation settings, and the Search Console properties you can use.
- **Dropped as no longer decision-critical:** pipeline and fee projections, and an hourly opportunity-cost rate.

### 2.6 Conflict-resolution table (revised)

| #   | Conflict                                                                  | Revision 1 resolution                                                           | **Revision 2 resolution**                                                                                                                                                                                                                                     | Why it changed                                                                         | Approval           |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------ |
| C1  | The strategy doc assumes "one week, unaudited"                            | Treat the template as Blueprint 1                                               | Unchanged                                                                                                                                                                                                                                                     | Not applicable                                                                         | No                 |
| C2  | When to build Foundation                                                  | A CLI launcher in 30 days; hosted after G3, with launch-count and payment gates | <ul><li>The real site first (Phase 1).</li><li>Content and design fixes (Phase 2).</li><li>A provisioning proof (Phase 3).</li><li>**The Foundation app** (Phase 4).</li><li>Hosting when you need it.</li><li>No ROI gates.</li></ul>                        | Founder context                                                                        | **Yes**            |
| C3  | Cloudflare as a host                                                      | "Not supported: Node middleware unsupported"                                    | <ul><li>**OpenNext supports `proxy.ts` since 1.20.3 (experimental).**</li><li>Our precise blockers: bug #1400 (build), size (fits only minified) and a page-render hang under the default cache.</li><li>A bounded experiment after Phase 1 (§4.2).</li></ul> | New evidence, plus the owner's correction                                              | **Yes** (sequence) |
| C4  | Mobile                                                                    | Gated                                                                           | Still gated, but **architecture-ready**: project type, blueprint spec, content API pattern and token export are defined now                                                                                                                                   | Owner direction                                                                        | **Yes**            |
| C5  | Repositories                                                              | A new Foundation monorepo after G1                                              | **No new repo until Phase 3.** Then one repo holding one Next.js app, not a monorepo (§5.3)                                                                                                                                                                   | The owner's question; fewer moving parts                                               | **Yes**            |
| C6  | Agency-only design and settings                                           | Accept Studio-only hiding (risk A6)                                             | **Enforce it with a publish gate**: the Contributor role plus a server-side policy (§5.5). Fallback: a separate design project                                                                                                                                | The owner rejected Studio-only hiding, and Growth roles can't scope datasets or fields | **Yes**            |
| C7  | Ownership                                                                 | Two modes                                                                       | **One:** Currawong-managed, transfer-ready (§5.6)                                                                                                                                                                                                             | Owner direction                                                                        | **Yes**            |
| C8  | Repository creation                                                       | Template history up to the tag, plus a configuration commit                     | Unchanged                                                                                                                                                                                                                                                     | Not applicable                                                                         | No                 |
| C9  | Browser-first versus CLI                                                  | A CLI that opens a local wizard                                                 | **Foundation is browser-first from version 0**: a local Next.js app, later hosted unchanged (§5.4)                                                                                                                                                            | The owner's correction                                                                 | **Yes**            |
| C10 | Design work while the first site is built                                 | Pause new design features until M1                                              | **No pause.** Necessary improvements go ahead, driven by real use; optional polish waits (§9.2–9.3)                                                                                                                                                           | The Design Engine is central                                                           | **Yes**            |
| C11 | Cron versus a durable executor                                            | An executor once hosted                                                         | Unchanged; decide when hosting                                                                                                                                                                                                                                | Not applicable                                                                         | No                 |
| C12 | Search Console access                                                     | A service account internally                                                    | Unchanged                                                                                                                                                                                                                                                     | Not applicable                                                                         | No                 |
| C13 | The home page JS budget text                                              | Fix the wording                                                                 | Unchanged                                                                                                                                                                                                                                                     | Not applicable                                                                         | No                 |
| C14 | **New:** Sanity plan state                                                | Not covered                                                                     | **Plan-safety rules.** A trial expiry or downgrade makes private datasets public and turns members into Viewers. So: no trials for client projects, never downgrade, monitor daily (§5.6)                                                                     | New evidence                                                                           | **Yes**            |
| C15 | **New:** "clients are Editor or Contributor on Growth" (14 Oct direction) | Unchanged                                                                       | **Clients are Contributors by default** and publish through the gate. The Editor role only by explicit agreement                                                                                                                                              | Follows from C6                                                                        | **Yes**            |

### 2.7 New evidence since revision 1 (all 25 Oct 2026)

**Cloudflare and OpenNext**

- **Proxy support.** OpenNext added Node.js middleware (`proxy.ts`) support in PR #1309, merged 25 Aug 2026 and shipped in **1.20.3 (26 Aug)**.
  - It is described as "experimental… not officially maintained".
  - The latest release is **1.20.13 (21 Oct)**, which needs `next >=16.4.1` `[Doc/Search]`.
- **Issue #1400**, open since 25 Sep 2026: bundling the proxy fails with `Could not resolve "@opentelemetry/api"` whenever `@opentelemetry/api` is installed, for example through `@sentry/nextjs`. The fix, PR #1430, is not released `[Doc]`.
- **Cloudflare's recommendation.** Its own Next.js guide (updated 25 Aug 2026) now recommends **vinext** (beta), and lists "Middleware and proxy routes: Supported". But vinext's README says full `cacheComponents` behaviour is still incomplete, and this starter depends on it `[Doc]`.

**Local reproduction on this repository.**

- **Set-up:** an isolated copy, with OpenNext 1.20.13, Wrangler 4.152.0, Next 16.4.2 and the e2e fake Content Lake.
- Nothing was deployed. `[Code: spike]`

| Step                                                       | Result                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next build` inside `opennextjs-cloudflare build`          | **Passes.** The proxy is recognised (`ƒ Proxy (Middleware)`), with the "experimental" warning                                                                                                                                                                                                                                                                   |
| Bundling the Node.js middleware                            | **Fails with bug #1400** at `next/dist/server/lib/trace/tracer.js:55`. **Cause:** `hasOpentelemetry` in OpenNext's `bundle-node-middleware.js` skips the alias to Next's compiled copy whenever `@opentelemetry/api` is installed (here via Sentry)                                                                                                             |
| The same step, with a one-line patch that forces the alias | **The build completes**                                                                                                                                                                                                                                                                                                                                         |
| Worker size (`wrangler deploy --dry-run`)                  | <ul><li>**10,501 KiB gzipped, which is over the 10 MiB Workers Paid limit.**</li><li>Minified: **9,473 KiB, which fits Paid** with about 0.75 MiB to spare.</li><li>The Free plan (3 MiB) is impossible.</li><li>The embedded Studio is a large part of the server bundle.</li></ul>                                                                            |
| Running locally in workerd (`wrangler dev --local`)        | <ul><li>`/api/site-info`, `/sitemap.xml`, `/robots.txt` and `/api/experiments` return **200**.</li><li>**Every dynamically rendered page** (`/`, `/about`, `/blog`, `/studio`) and `/api/og` returns **500**; workerd reports "code had hung and would never generate a response".</li></ul>                                                                    |
| Isolating the hang                                         | <ul><li>**It is not the proxy:** the same pages hang when the proxy's experiment lookup is skipped (crawler user-agent).</li><li>The likely cause is rendering under OpenNext's default "dummy" cache with Cache Components `[Unknown]`.</li><li>The incremental, tag and queue cache bindings were not configured. That is the next experiment step.</li></ul> |

**What this means**

- Cloudflare is **neither proven nor shown to be impossible**.
- So far there are three blockers:
  - a known adapter bug with a workaround;
  - a size limit we only just fit;
  - an unexplained render hang.
- Each has a defined next step (§4.2).
- The spike's copy and logs stay in the session scratchpad. Nothing is committed.

**Sanity**

- When a **Growth trial ends without payment**, or a project **is downgraded**:
  - "Private datasets will become public";
  - non-admin members become Viewers;
  - Growth features stop.
- Failed payments are retried for three days. After that, the project "may be temporarily deactivated".
- Sanity advises **archiving a project, rather than downgrading it**, to keep private datasets `[Doc]`.
- **Built-in roles apply to every dataset in a project.** Dataset- or document-scoped permissions need custom roles, which are Enterprise only `[Search: Sanity roles docs]`.

**Founder context:** your revised direction, 25 Oct 2026.

---

## 3. Customer and competitive strategy (revised)

### 3.1 Who Nocturne is for, now

**You, first.** Nocturne is Currawong's production system:

- distinctive sites, faster;
- fewer repetitive edits;
- safe client editing;
- verified launches;
- sites that stay healthy.

**Agency revenue benefits from it**, through faster delivery, credible care plans and better SEO outcomes.

**A SaaS is an optional future**, worth considering only once you'd recommend Nocturne to a peer without caveats.

### 3.2 External audience (a hypothesis, unchanged)

If Nocturne is ever commercialised, the likely audience is design-led web agencies of 2–15 people that:

- already work in Next.js with a headless CMS;
- hand ownership to their clients;
- sell care plans.

Nothing in this plan is built for them yet.

### 3.3 Competitors and substitutes

| Option                                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                | Beats Nocturne on                    | Gap Nocturne fills                                                                                             | Real competition?                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **Starter only (this repo)**                            | Template, wizard, checklist, `launch:check` `[Code]`                                                                                                                                                                                                                                                                                                                                        | Cost, simplicity                     | Resumable automation, a run ledger, verification on every launch                                               | **Yes, the main rival**                          |
| **Vercel Deploy Button + Sanity on Vercel Marketplace** | <ul><li>The button clones a repo and deploys it.</li><li>The Marketplace integration creates a Sanity project (and an account if needed) and sets project, dataset and read/write token environment variables.</li><li>Free and Growth plans are billed through Vercel. Projects are managed from the Vercel integration dashboard and can't be deleted in Sanity manage. `[Doc]`</li></ul> | Speed, zero build cost               | Ownership in the client's organisation, private-dataset defaults, seed content, CORS, verification, pre-launch | Yes for a first launch; weak on fleet care       |
| **Cloudflare Deploy Button**                            | Copies a repo into the user's GitHub or GitLab, provisions D1, KV and R2 from the Wrangler config, builds with Workers Builds and posts preview URLs for branches `[Search: 2025 changelog]`                                                                                                                                                                                                | Same, for Workers                    | Next.js and Sanity fidelity (proxy experimental; blocked locally by bug #1400, §4.2), verification             | For Workers-native apps                          |
| **Sanity Blueprints**                                   | Infrastructure as code for CORS origins, webhooks, robot tokens, roles and functions, on project or organisation stacks, with a plan step before deploy `[Doc]`                                                                                                                                                                                                                             | Declarative Sanity configuration     | Not an end-to-end launcher                                                                                     | A complement: **adopt it**                       |
| **Expo Launch (beta) + EAS Workflows**                  | <ul><li>Launch: a browser flow from a public GitHub repo to the App Store; Play is "coming soon" `[Search]`.</li><li>Workflows: a REST API to dispatch runs and poll their status `[Doc]`.</li></ul>                                                                                                                                                                                        | Mobile publishing from a browser     | Content contract, web and mobile coherence                                                                     | Yes for mobile: **don't rebuild it**             |
| **Backstage / Spotify Portal**                          | Software Templates (scaffolder) for engineering organisations `[Search]`                                                                                                                                                                                                                                                                                                                    | Catalogue, plugin ecosystem          | Far too heavy for a 1–5 person agency                                                                          | No                                               |
| **Port**                                                | Internal developer portal, free up to 15 seats, 10k entities and 500 automation runs `[Search: port.io]`                                                                                                                                                                                                                                                                                    | A ready-made portal interface        | You still write every provider automation; wrong buyer                                                         | No                                               |
| **Railway templates**                                   | One-click infrastructure templates, Hobby US$5 and Pro US$20 per seat `[Search: third-party]`                                                                                                                                                                                                                                                                                               | Backend services                     | Marketing sites with a CMS                                                                                     | Adjacent                                         |
| **Webflow, Framer and similar**                         | Not researched this session                                                                                                                                                                                                                                                                                                                                                                 | Speed and price for small businesses | Ownership, code-level craft, Sanity editing                                                                    | The end client's alternative to hiring an agency |

### 3.4 The wedge, broadened

**Design-led, verified, client-owned websites.** The combination is what matters:

- the Design Engine (distinctive design as configuration);
- verification (proven before it's called done);
- the content contract (truthful structured data);
- client-safe editing (the publish gate).

Each piece alone is easy to copy. The combination, refined on real projects, is not.

### 3.5 The commercial path: signals, not deadlines

1. **Internal use.** Every Currawong site runs on Nocturne.
2. **Care plans** that use Foundation's verification and Search Health (§10.4).
3. **Possibly a concierge service:** launching and caring for other agencies' sites.
4. **Possibly SaaS.**

Move to step 3 only when you'd recommend Nocturne without caveats **and** someone asks for it. Revision 1's interview plan (its §10.6) becomes useful at that point, not before.

---

## 4. Current provider feasibility

Unchanged from revision 1, except for:

- the **Sanity** and **Cloudflare** entries;
- §4.2, which is rewritten;
- the additions to §4.3.

Every vendor page cited was read on 25 Oct 2026.

The spike names in the entries below (S1–S7) are revision 1's. In revision 2 they live in task 199 (S1, S2, S4), task 202 (S6), task 203 (S3, now steps C-1 to C-4) and task 204 (S7).

### 4.1 Feasibility and permissions matrix

#### Sanity (CMS) — confidence: medium for configuration, **high for plan risks**, low for delegated project creation

- **Verified capability, endpoints and workflows:** as in revision 1. That covers:
  - Access API robots, users, roles and invites (`v2025-07-11`);
  - organisation robot tokens;
  - **Blueprints** (CORS origins, webhooks, robot tokens, roles and functions; project and organisation stacks);
  - the CLI commands the repo already uses;
  - the Vercel Marketplace integration.
- **Roles (new)** `[Search: Sanity roles docs]`:
  - built-in roles **apply to every dataset in a project**, so there is no per-dataset role assignment on Growth;
  - dataset- and document-scoped permissions need custom roles, which are Enterprise only;
  - **Contributor** (drafts only, no publishing) is available on Growth `[Doc: pricing]`.
- **Plans and risks (new)** `[Doc]`:
  - Free has public datasets only; Growth is **US$15 per seat per month** and allows private datasets;
  - **when a trial expires or a project is downgraded, private datasets become public** and non-admin members become Viewers;
  - failed payments are retried for three days, after which the project may be deactivated;
  - archive a project rather than downgrade it.
- **Authorisation and permissions:** no documented third-party OAuth `[Unknown]`. The options are:
  - the operator's CLI session;
  - organisation or project robots;
  - the Marketplace integration.
- **Programmable:** robots, roles, invites, datasets, CORS, schema deploy and seed import.
- **Manual:**
  - creating the organisation and **paying for Growth before any real content is imported**;
  - possibly creating the project `[Unknown]`;
  - accepting a project transfer.
- **First proof needed:**
  - **E3** (§12.3): a plan-safety check of the active client project, **now**;
  - **S1** (delegated project creation) follows in Phase 3.

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

#### Cloudflare — confidence: medium for the platform, **low but improving for this starter**

- **Verified capability:**
  - self-managed OAuth clients, generally available since 3 Jun 2026 `[Doc]`;
  - **OpenNext supports `proxy.ts` since 1.20.3**, as experimental support `[Search/Doc]`;
  - Worker limits: **3 MiB compressed on Free, 10 MiB on Paid** `[Doc]`;
  - Cloudflare now **recommends vinext (beta)** for Next.js `[Doc]`;
  - a Pages Direct Upload project can never switch to Git `[Search]`.
- **For this starter specifically** (the local test in §2.7):
  - the build fails on bug #1400, and a one-line patch fixes it;
  - the Worker fits only when minified (9.47 of 10 MiB);
  - dynamically rendered pages hang under the default cache configuration.
- **Authorisation and permissions:** an OAuth token or API token with Workers, KV, R2 and D1 permissions `[Unknown: exact scopes]`.
- **Prerequisites and cost:**
  - **Workers Paid, US$5 a month, is required**, because of the size limit;
  - build minutes are included `[Search]`.
- **Programmable:** deploying with OpenNext and Wrangler from GitHub Actions; secrets and bindings.
- **Manual:** creating the account and the paid plan. Custom domains may need the zone moved to Cloudflare `[Unknown]`.
- **First proof needed:** the bounded experiment, steps C-1 to C-4 (§4.2).

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

### 4.2 Vercel versus Cloudflare for this starter (rewritten)

| Capability the starter uses                                                                           | Vercel                                                                               | Cloudflare (OpenNext 1.20.13, tested locally on 25 Oct)                                                                                                                                               | What to do                                                                     |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Next.js integration                                                                                   | Native. The Next 16.4 docs say Vercel's adapter uses the public Adapter API `[Code]` | <ul><li>OpenNext is not a verified adapter; Cloudflare is working on one `[Code: Next docs]`.</li><li>vinext is what Cloudflare now recommends, but it lacks full Cache Components `[Doc]`.</li></ul> | Stay on OpenNext. Recheck vinext once its Cache Components support is complete |
| `src/proxy.ts`                                                                                        | Supported                                                                            | <ul><li>**Supported, experimental**, since 1.20.3.</li><li>The build is **blocked by bug #1400**, and a one-line patch fixes it `[Code: spike]`.</li></ul>                                            | Wait for PR #1430, or keep a `patch-package` patch in the Cloudflare profile   |
| Bundle size                                                                                           | Not a constraint                                                                     | **10.25 MiB gzipped, which is over the limit. 9.25 MiB minified, which is under it** `[Code: spike]`                                                                                                  | Always minify. Hosting Studio separately (task 61) would give real headroom    |
| Cache Components, `'use cache'`, `revalidateTag`, `updateTag`                                         | Supported                                                                            | <ul><li>**Dynamic pages hang** under the default dummy cache `[Code: spike]`.</li><li>The incremental-cache, tag-cache and queue bindings still need configuring and testing `[Unknown]`.</li></ul>   | Experiment step C-2                                                            |
| `next/og` images                                                                                      | Supported                                                                            | **500** in the local test, cause unknown `[Code: spike]`                                                                                                                                              | Experiment step C-3                                                            |
| Edge Config redirects; A/B tests (`flags` plus a proxy rewrite)                                       | Supported                                                                            | <ul><li>Edge Config is Vercel-only; redirects fall back to page-level handling.</li><li>A/B tests depend on the proxy working end to end.</li></ul>                                                   | Turn A/B tests off in the Cloudflare profile at first                          |
| Environment and secrets, preview protection, commit identity (`VERCEL_*` in 10 files), rollback, logs | As in revision 1                                                                     | As in revision 1                                                                                                                                                                                      | Add `deploy-env.ts` (§13.3) when Cloudflare work starts                        |
| Who pays                                                                                              | Pro, US$20 per member plus usage `[Search]`                                          | **Workers Paid, US$5 a month, is required** because of the size `[Search]`                                                                                                                            | Not applicable                                                                 |

**The bounded Cloudflare experiment** (after Phase 1; about 3–6 sessions in total)

| Step    | Question                                                                                                                                                            | Pass                                                                      | Effort       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------ |
| **C-1** | Can the #1400 patch live in a reproducible `patch-package` patch, or has the upstream fix been released?                                                            | A clean build from CI                                                     | 1 session    |
| **C-2** | With an R2 (or KV) incremental cache, a D1 or Durable Object tag cache and the queue configured, do pages render locally in workerd, and does `revalidateTag` work? | Every e2e page route returns 200, and a tag revalidation shows within 5 s | 1–2 sessions |
| **C-3** | Do `next/og`, Studio at `/studio`, the pre-launch gate in the proxy, Auth.js and Sentry work on workerd?                                                            | Each works, or is listed as a degradation                                 | 1–2 sessions |
| **C-4** | Does a real deploy to a scratch Workers Paid account pass the verification suite? (**US$5 a month; needs approval**)                                                | Verified, with latency and cost recorded                                  | 1 session    |

**Recommendation**

- Vercel stays the default, and the only supported host, until steps C-1 to C-4 pass.
- If C-2 fails for reasons upstream can't fix, Cloudflare waits for a verified adapter.
- Hosting Studio separately (task 61) is the main structural lever if size becomes the constraint.

### 4.3 What breaks the 15-minute website promise

- **First-time accounts:**
  - a Sanity organisation on Growth needs payment, because private datasets and the Editor role are Growth-only;
  - a Vercel Pro team, because Hobby is non-commercial;
  - GitHub organisation owner approval to install the App.
- **Provider queue time:** build-queue spikes. Measure, and report queue time separately.
- **Anything outside the window:** custom domains, DNS and certificates. They come after the preview, by design.
- **Cloudflare:** zone onboarding, if a custom domain is needed `[Unknown]`.
- **Errors:** a failed blueprint build. Prevented by gating releases on CI **before** a client launch, so per-launch checks stay smoke-level.

- **New: the Sanity plan state.** A project on Free or on a trial can't hold private data safely. The run stays `blocked` until the organisation has paid Growth, and that check comes before any real content is imported.

---

## 5. Architecture decision

### 5.1 Decision criteria, reweighted for a solo, part-time builder

| Criterion                                                                                       | Weight | Change from revision 1                            |
| ----------------------------------------------------------------------------------------------- | -----: | ------------------------------------------------- |
| Reliability and trust (privacy, permissions, verified deployments)                              |     25 | Was 30                                            |
| **Solo maintainability**: few modules, strong conventions, easy recovery after a pause          |     25 | New. It replaces "build and maintenance cost"     |
| **Creative capability and daily usefulness**: does it make your work better and more enjoyable? |     20 | New. It replaces "differentiation"                |
| Evolvability: hosted, Cloudflare, mobile and SaaS without rewrites                              |     15 | Was 10                                            |
| Time to the first useful result                                                                 |     10 | Was 20, and was framed as time-to-value under ROI |
| Cash cost                                                                                       |      5 | Unchanged                                         |

Each option is scored 1–5 per criterion. The total is Σ(weight × score)/100, out of 5.00. Only the decisions that changed are re-scored here. Every other decision in revision 1 stands (§11.1).

**D-01 Product shape**

| Option                                                                            | Rel | Maint | Create | Evolve | Time | Cash | **Total** | Why                                                                                                                      |
| --------------------------------------------------------------------------------- | --: | ----: | -----: | -----: | ---: | ---: | --------: | ------------------------------------------------------------------------------------------------------------------------ |
| Starter and scripts only                                                          |   3 |     4 |      2 |      1 |    5 |    5 |      2.95 | Cheapest, but the vision stops at the template                                                                           |
| CLI-first launcher (revision 1)                                                   |   4 |     4 |      2 |      3 |    4 |    5 |      3.40 | Reliable, but it redefines Foundation as a command                                                                       |
| **A Foundation browser app: local first, the same app hosted later (revision 2)** |   4 |     4 |      4 |      5 |    3 |    5 |  **4.05** | Browser-first from version 0. There is no hosted operations work until you want it. The UI and steps carry straight over |
| A hosted control plane now                                                        |   3 |     2 |      4 |      5 |    1 |    3 |      3.00 | Adds auth, secrets, uptime and multi-user work before the steps are proven                                               |
| An internal developer portal (Backstage or Port)                                  |   3 |     2 |      2 |      3 |    2 |    4 |      2.45 | Wrong shape for one person; you still write every automation                                                             |

**D-06 Repositories**

| Option                                                                                                          | Rel | Maint | Create | Evolve | Time | Cash | **Total** |
| --------------------------------------------------------------------------------------------------------------- | --: | ----: | -----: | -----: | ---: | ---: | --------: |
| A new Foundation monorepo now (revision 1, after G1)                                                            |   4 |     3 |      3 |      4 |    3 |    5 |      3.55 |
| **No new repo until provisioning code exists (Phase 3), then one repo holding one Next.js app, not a monorepo** |   4 |     5 |      3 |      4 |    4 |    5 |  **4.15** |
| Foundation inside the template repo                                                                             |   3 |     2 |      3 |      2 |    4 |    5 |      2.70 |
| Convert the template into a monorepo                                                                            |   2 |     1 |      3 |      4 |    1 |    5 |      2.25 |

Two notes on the rejected options:

- **Foundation inside the template** would copy launcher code and its dependencies into every client repo, and every template update would then conflict on it.
- **Converting the template into a monorepo** breaks every client's `git merge <tag>` update path.

**D-15 Enforcing agency-only design and settings** (changed: revision 1 accepted Studio-only hiding)

| Option                                                                                                                                    | Rel | Maint | Create | Evolve | Time | Cash | **Total** | Why                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | --: | ----: | -----: | -----: | ---: | ---: | --------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Studio hiding only (today)                                                                                                                |   1 |     5 |      4 |      3 |    5 |    5 |      3.20 | **Rejected by the owner.** It is not a boundary                                                                                                                                   |
| **Publish gate: clients are Contributors (Sanity enforces drafts-only), and a server-side publish policy publishes only allowed changes** |   4 |     4 |      4 |      4 |    4 |    5 |  **4.05** | Enforced on Sanity's and our servers. No data migration. Every existing Studio design control stays as it is. One policy also covers slugs, redirects, A/B tests and SEO settings |
| A separate agency-only Sanity project for design values and section look assignments                                                      |   5 |     2 |      4 |      4 |    2 |    5 |      3.60 | Strongest boundary, but a large migration of about 25 section types, plus cross-project preview and live updates. **The fallback** if the gate fails                              |
| Design configuration in the repo, with a new visual editor                                                                                |   5 |     2 |      2 |      3 |    1 |    5 |      2.95 | Rebuilds the Studio design UI that already works                                                                                                                                  |
| Sanity Enterprise custom roles                                                                                                            |   4 |     4 |      4 |      4 |    3 |    1 |      3.60 | Document-level filters only, so a design-store split would still be needed. Custom pricing                                                                                        |

**Revision 3 note on D-15.** The publish gate is now **staged**:

1. **First:** clients are Contributors, and Currawong reviews and publishes (tasks 205 and 206).
2. **Later:** a hardened self-service gate, built only when a client needs to publish themselves (§5.5).

**D-20 Ownership** (changed: revision 1 had two modes)

| Option                                          | Rel | Maint | Create | Evolve | Time | Cash | **Total** |
| ----------------------------------------------- | --: | ----: | -----: | -----: | ---: | ---: | --------: |
| **One mode: Currawong-managed, transfer-ready** |   4 |     5 |      3 |      4 |    5 |    4 |  **4.20** |
| Two modes (managed and client-owned)            |   4 |     2 |      3 |      5 |    3 |    4 |      3.35 |
| Client-owned accounts only                      |   3 |     3 |      3 |      4 |    2 |    5 |      3.10 |

**Still valid from revision 1 and unchanged** (detail in §11.1):

- D-02: a modular monolith.
- D-03: Next.js for the UI.
- D-04: Postgres (Neon) with Drizzle.
- D-07: independent client repos.
- D-08: one starter with isolated host modules.
- D-09: Vercel as the default host.
- D-10: Cloudflare via Workers, OpenNext and GitHub Actions.
- D-11: a history-preserving repo creation.
- D-13: Sanity Blueprints, if confirmed.
- D-14: independent verification.
- D-16: Studio and Presentation for clients.
- D-17: Expo for mobile.
- D-18: Search Console through a service account.
- D-19: no Supabase yet.
- D-21: the timing definitions.
- D-22: concrete provider modules.

**Revised:** D-05, the executor, is now deferred until hosting. Locally, a simple in-process runner over the Postgres ledger is enough.

### 5.2 How Foundation, the Design Engine and Content Intelligence fit together

**They share contracts, not code paths.** The contracts live in the template repo and are versioned with each release. Each part consumes them in its own place.

```
            CONTRACTS — template repo, versioned with every release
            blueprint.json · content contract (schemas, GROQ, types) · section contract (slots + looks)
            design tokens + look library schema · SEO contract (metadata + JSON-LD rules) · verification spec
            publish policy (which roles may change which fields)
                 │                              │                                   │
   FOUNDATION (one Next.js app)          DESIGN ENGINE                       CONTENT INTELLIGENCE
   local first, hosted later             runtime ships inside every site     deterministic half ships inside every site
   • creates sites from a blueprint      • renderer, tokens, looks, motion   • JSON-LD, metadata, sitemap from content
   • seeds content from site recipes     • authoring in Studio (agency)      • launch:check SEO and structured-data audits
   • verifies: marker, SEO, design,      • enforced by the publish policy    insight half lives in Foundation
     privacy, publish policy             • changes reach clients by release  • Search Console import, URL → document map
   • versions, health, update PRs                                            • opportunity cards, change history
   • links into Studio; never edits      ◄──────── all edits happen in Studio drafts, published through the gate ────────►
     content or design itself
```

**Two worked flows**

- **"Make the brand blue and keep everything readable"**
  1. In Studio, you change Brand colours. The publish policy treats this as agency-only.
  2. Presentation previews it, and the contrast hints flag any combination that would fail.
  3. You publish, and the site re-renders.
  4. Foundation's next verification run records the design version and runs the contrast and design contract checks.
- **"This service page gets impressions but few clicks"**
  1. Foundation's Search Health shows the card, with its evidence.
  2. **Open in Studio** opens the page as a Presentation draft.
  3. The client edits the title. The publish policy allows `seo.title`, so it publishes straight away.
  4. Foundation records the revision and tracks the 28-day comparison.

**Three rules keep the parts from tangling**

1. **One editor per kind of thing.** Content and design are edited in Studio. Code is edited in the repo. Foundation **never becomes a second editor**: it shows, verifies, provisions and links.
2. **Sites never depend on Foundation at runtime.** Every check Foundation runs is also runnable from the client repo (`launch:check`, the health workflow).
3. **Contracts change only through template releases**, with tests and CHANGELOG migration steps, so Foundation can tell which contract version each site uses.

### 5.3 Repository architecture

| Repo                                      | When                                                     | Contains                                                                                                                                                                                                                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CurrawongCreativeCo/nocturne` (template) | Now (exists)                                             | <ul><li>Blueprint 1 (`web-next-sanity`), the contracts (§5.2), the Design Engine runtime and its Studio authoring, the content contract, the SEO utilities and the verifier.</li><li>New: `blueprint.json`, the verification marker, the publish policy route and action, a `health.yml` workflow template.</li></ul>                     |
| Client repos                              | Per site                                                 | The template history up to the pinned tag, plus one configuration commit. Updates arrive by merging tags (task 30, later task 53)                                                                                                                                                                                                         |
| `CurrawongCreativeCo/nocturne-foundation` | **Start of Phase 3**                                     | <ul><li>**One Next.js 16 app**, not a monorepo. Its folders are `app/`, `blueprints/`, `steps/`, `providers/`, `verify/`, `ledger/` and `credentials/`.</li><li>It is created when the first provisioning code is written, so that code is versioned and survives pauses. Nothing Foundation-specific needs a repo before then.</li></ul> |
| `nocturne-mobile` (Expo starter)          | Only when mobile starts                                  | The mobile blueprint                                                                                                                                                                                                                                                                                                                      |
| Extracted packages                        | Only when the `docs/template-packaging.md` triggers fire | For example `@currawong/sanity-next-core`. The Design Engine stays copy-in source until a second consumer needs it                                                                                                                                                                                                                        |

**Answer to "a Foundation repo now, or later?" Later.** Phases 0–2 change only the template (contracts, verification, design and content work). Phase 3 creates the repo with the provisioning proof as its first code, and Phase 4 adds the browser UI to the same app. **A monorepo is only justified if a second deployable appears**, such as a separate worker. With a managed workflow executor, that may never happen.

### 5.4 Foundation: browser-first from version 0, hosted when you want it

| Concern           | Version 0 (local, Phases 3–4)                                                                                                    | Hosted (later, when there is a reason)                                                        | Why there's no rewrite                                               |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| App               | Next.js 16 on `localhost`, bound to 127.0.0.1, one operator                                                                      | The same app on Vercel                                                                        | The same routes, server actions and components                       |
| Sign-in           | None, because it is local only                                                                                                   | Auth.js with a Google Workspace allow-list and database sessions (the approved 14 Oct design) | Every action already records `actor`                                 |
| State             | **Neon Postgres from day 1**, with Drizzle: runs, steps, resources, timings, audit                                               | The same database                                                                             | Nothing to migrate, and the data survives a laptop change or a pause |
| Long-running work | An in-process runner over the ledger; resume after a restart                                                                     | Vercel Workflows (or Inngest), wrapping the **same** step functions                           | Steps are idempotent and executor-agnostic (Appendix B.2)            |
| Credentials       | `.env.local`, never committed: a fine-grained GitHub token, a Vercel team token, the Sanity CLI session or an organisation robot | A GitHub App, a Vercel integration, a Sanity organisation robot; encrypted at rest            | All access goes through one `credentials/` module                    |
| Scheduled health  | A "Run checks" button, plus each client repo's own `health.yml` workflow                                                         | Vercel Cron calls the same check functions                                                    | Checks are pure functions                                            |

**Signals that it's time to host.** These are not ROI tests:

- you need Foundation away from your laptop;
- health checks must run without it;
- you have more than about three live sites to watch;
- a collaborator joins.

**Hosting adds the operational load you have so far avoided:** uptime, authentication, secret custody and backups.

### 5.5 Client publishing: enforceable now, self-service later (revised in revision 3)

**The problem (unchanged)**

- Studio hiding is not a boundary.
- On Growth, roles apply to every dataset.
- Field- and document-scoped permissions need Enterprise custom roles `[Search: Sanity roles docs]`.

**Stage 1, now: Contributors plus agency review.** It's secure, and it needs no new server code.

1. **Clients become Contributors.**
   - Sanity enforces drafts-only: Contributors "can write but not publish" `[Doc: Sanity roles]`.
   - Studio already hides Publish and Unpublish for them (`src/features/studio/utils/document-access.ts`) `[Code]`.
2. **Task 205: one classification registry, as an allowlist.**
   - It lists, per document and section type, the fields clients may change.
   - Client-mode hiding reads from it.
   - A CI test **fails when a field is unclassified**, so a field added later is never client-editable by accident.
3. **Task 206: agency publish review.**
   - An agency Publish lists the protected-field changes made since the last publish, **with their authors**, and asks for confirmation. This closes the gap where an agency publish would release a client's hidden change.
   - An agency-only "Waiting for review" list.
   - Messaging for Contributors.
4. **What remains (the residual):**
   - Clients can still read everything in the dataset, as Editors can today, so keep secrets out of Sanity.
   - Client changes wait for Currawong to publish them. That's a service-level choice.

**Stage 2, when a client needs to publish themselves: the hardened gate** (tasks 190, then 196, then 214)

| Requirement                                                                                                                                                                                                                                                                                                             | Why                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Deny by default:** <ul><li>the policy reads 205's allowlist;</li><li>on a new document, protected fields must equal their initial values;</li><li>deletes, unpublishes and slug changes without a redirect go to review;</li><li>required fields and slug uniqueness are checked on the server.</li></ul>             | Fails safe; doesn't depend on Studio-only validation                                                     |
| **Identity comes from Sanity's history.** Take the authors of every transaction since the last publish; each must **currently** hold a Contributor, Editor or agency role (checked through the Access API)                                                                                                              | Viewers (suspended clients) and non-members can't push a change live. Knowing `draftRev` is not identity |
| **Publish exactly the validated revision**, through the Actions API with `ifDraftRevisionId` and `ifPublishedRevisionId` `[Doc]`                                                                                                                                                                                        | Race-safe: nothing can change between the check and the publish                                          |
| Releases and scheduled publishing stay agency-only, and go through 206's review                                                                                                                                                                                                                                         | Closes the other publishing paths                                                                        |
| **Rate limiting**, plus an **audit log line** per publish (requester, authors, revision, changed paths)                                                                                                                                                                                                                 | Accountability, because Sanity's history shows the robot as the publisher                                |
| **E1 (task 190) first**, on a scratch project. It proves:<ul><li>what a robot with the Contributor role can do through the API (non-draft writes, release versions, assets, deletes);</li><li>the Actions API guards with the Editor robot;</li><li>History API authors;</li><li>Access API reads by a robot.</li></ul> | All `[Unknown]` until tested                                                                             |

**If E1 fails:** keep Stage 1 permanently, or move design values into a separate agency-only Sanity project (§5.1, D-15 row 3).

### 5.6 Ownership: one Currawong-managed, transfer-ready model

| Resource           | Where it lives                                                                                               | Who pays                                                        | How it transfers at the end                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Code               | Private repo in the `CurrawongCreativeCo` organisation, with the template history                            | Currawong                                                       | GitHub repository transfer to the client's organisation                                                             |
| Content and Studio | A Sanity organisation **per client**, with Currawong as the only administrator; **paid Growth from day one** | Currawong pays it and passes it through on the client's invoice | Make the client an administrator, or transfer the project to the client's organisation `[Search]`; remove Currawong |
| Deployments        | A Vercel project in Currawong's Pro team                                                                     | Currawong passes it through                                     | Project transfer to the client's team `[Unknown: verify]`                                                           |
| Domain             | The client's registrar account                                                                               | Client                                                          | Already the client's                                                                                                |
| Search Console     | A property owned by the client, with Currawong's service account as a user                                   | Free                                                            | Remove the service account                                                                                          |
| Mobile (later)     | **The client's** Apple, Google and Expo accounts, because store ownership has to sit with the publisher      | Client                                                          | Nothing to move                                                                                                     |

**Offboarding is unchanged from revision 1** (§8.7): detach, never destroy; Foundation deletes nothing. A second, client-owned mode can be added later if a client insists. It is no longer built speculatively.

**Sanity plan safety.** These rules are new, and they exist because a downgrade makes private datasets public:

1. **No trials for client projects that will ever hold enquiries, members-only content or form settings.** Upgrade to Growth with a payment method **before** importing real content.
2. **Never downgrade a project that holds private data.** Archive it, or transfer it. Sanity itself advises archiving to stop paying without losing private datasets `[Doc]`.
3. **Monitor it daily.**
   - Each site's `health.yml` runs `check:dataset`, which already exists, and opens a GitHub issue if the dataset becomes public.
   - `launch:check` fails if `ENQUIRIES_STORE` is on while the dataset is public.
4. **Treat payment failures as urgent.** Sanity retries for three days, then may deactivate the project `[Doc]`. Billing emails go to a monitored address, and the runbook says to pause enquiry storage and export before any plan change.

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
- The Sanity organisation exists **and is on paid Growth, not a trial**. Free can't create private datasets or the Editor and Contributor roles, and an expiring trial makes private datasets public `[Doc]`.
- The repo and Vercel project names are free.
- The blueprint tag exists and its CI is green.

**Inputs.** The wizard has six fields; everything else is under _Advanced_.

| Field               | Default                  | Notes                                                                                                                                                                                                               |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client name         | none                     | Becomes `site.profile.ts` → `client.name`                                                                                                                                                                           |
| Project slug        | Derived from the name    | One slug for the repo, the Vercel project and the Sanity project label (`<slug> · nk-<runKey>`)                                                                                                                     |
| GitHub owner        | Currawong's organisation | One managed, transfer-ready model (§5.6)                                                                                                                                                                            |
| Sanity organisation | Picked from a list       | Must be on Growth                                                                                                                                                                                                   |
| Start as            | Pre-launch link page     | Matches plan task 127. The alternative is "full site"                                                                                                                                                               |
| _Advanced_          | none                     | Blueprint version, Vercel team, function region (`syd1` suggested for Australian audiences `[Unknown: verify the region list]`), site URL, feature switches from `site.profile.ts`, live or webhook mode, CMS brand |

**Ordered steps.** Each step has `plan`, `apply`, `verify` and, where it makes sense, `compensate`.

| #   | Step             | What it does                                                                                                                                                                                                                                                                                                                                                                                                             | Reconcile before creating                                                                | Verify                                                     | Compensate (only resources this run created, before handover)                                      |
| --- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1   | `preflight`      | The read-only checks above                                                                                                                                                                                                                                                                                                                                                                                               | Not applicable                                                                           | All pass, or the run is `blocked` with fix links           | Not applicable                                                                                     |
| 2   | `sanity.project` | Creates the project in the organisation, labelled with the run nonce                                                                                                                                                                                                                                                                                                                                                     | List the organisation's projects and match the nonce                                     | `GET` project                                              | Delete only if it holds nothing but seed documents, after confirmation                             |
| 3   | `sanity.dataset` | Creates `production` as **private**                                                                                                                                                                                                                                                                                                                                                                                      | List datasets                                                                            | `aclMode` is private (the `check:dataset` logic)           | Same as step 2                                                                                     |
| 4   | `sanity.access`  | <ul><li>Creates robots: a Viewer (site reads), a Deploy token (Editor, for CI schema deploy), a Migration read token (Viewer), and an Editor (server writes for forms, pricing and enquiries, **and the publish gate**). Because the gate needs it, it is always created.</li><li>Each token value is written **straight into** Vercel env or GitHub secrets **within the same step**.</li></ul>                         | List robots by label                                                                     | Token works (`GET` a query returns 200)                    | If a value was lost (a crash between create and store): revoke that robot and create a new one     |
| 5   | `sanity.cors`    | Adds `http://localhost:3000` (with credentials) and the production URL (with credentials). Uses Blueprints if S1 confirms them                                                                                                                                                                                                                                                                                           | `cors list`                                                                              | The origin appears in the list                             | Remove the origin                                                                                  |
| 6   | `sanity.seed`    | Imports the template's seed (`scripts/setup/seed.mjs`, from the pinned checkout) with `--missing`. **Adds `siteIdentity.verificationMarker = nk-<runKey>`**                                                                                                                                                                                                                                                              | `--missing` already makes it idempotent                                                  | A GROQ query returns the marker                            | Not applicable (content stays)                                                                     |
| 7   | `github.repo`    | Creates an empty private repo `<owner>/<slug>`                                                                                                                                                                                                                                                                                                                                                                           | `GET` repo: it is ours if the ledger says so; a stranger's repo is a collision, so block | The repo exists and is empty                               | Delete only if it has no commits other than ours, after confirmation                               |
| 8   | `github.config`  | Sets Actions variables (`NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`) and secrets (`SANITY_AUTH_TOKEN`, `SANITY_DEPLOY_TOKEN`, `SANITY_MIGRATION_READ_TOKEN`, plus `SANITY_WRITE_TOKEN` if needed). Enables Dependabot                                                                                                                                                                                  | List variables and secret names                                                          | Names present                                              | Not applicable                                                                                     |
| 9   | `vercel.project` | <ul><li>`POST /v11/projects` with `gitRepository`, `framework: "nextjs"` and **all build-time and runtime environment variables before the first push**, because `NEXT_PUBLIC_*` values are inlined at build.</li><li>Generates `PREVIEW_ACCESS_SECRET` and `PRELAUNCH_PREVIEW_TOKEN`.</li><li>Sets `NEXT_PUBLIC_SITE_URL` from the project's production alias.</li></ul>                                                | `GET` the project by name                                                                | Environment variable keys present (values never read back) | Delete only if it has no deployments of commits other than ours                                    |
| 10  | `github.push`    | Pushes the **template history up to the pinned tag**, plus one commit "Configure <client> from web-next-sanity@x.y.z" containing `site.profile.ts`, `studio-brand.json`, `nocturne.json` (blueprint ID, version, run ID; never secrets) and the same removals the wizard makes. **History is kept on purpose**: the README's update path (`git merge <tag>`) needs a merge base, and GitHub's template-generate drops it | The remote `main` SHA is either empty or ours                                            | Remote `main` equals the expected SHA                      | Not applicable                                                                                     |
| 11  | `vercel.wait`    | The push triggers a production deployment. Find it by commit SHA, then poll `readyState` (with webhooks speeding it up later) until `READY`, `ERROR` or `CANCELED`, with a 20-minute timeout                                                                                                                                                                                                                             | Find the deployment by SHA                                                               | `READY`, and the alias resolves                            | On `ERROR`: classify it as retryable (queue, quota) or terminal (build) and attach the log excerpt |
| 12  | `github.rules`   | Applies the "Protect main history" ruleset (no deletion, no force-push) and the "Require CI" ruleset (`check`, `e2e`), after the initial push                                                                                                                                                                                                                                                                            | List rulesets                                                                            | Present                                                    | Remove                                                                                             |
| 13  | `verify`         | The independent checks below                                                                                                                                                                                                                                                                                                                                                                                             | Not applicable                                                                           | All required checks pass                                   | Not applicable                                                                                     |
| 14  | `report`         | <ul><li>Links: the website, Studio (`/studio`), the repository, Sanity manage and the Vercel project.</li><li>The timing breakdown.</li><li>Next actions: invite the client as a **Contributor** through the Access API; client publishing then goes through the publish gate (§5.5); connect a domain (runbook task 123); brand basics; a rehearsal (task 128).</li></ul>                                               | Not applicable                                                                           | Not applicable                                             | Not applicable                                                                                     |

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
- In version 0 (the local Foundation app), operator credentials come from `.env.local`, which is never committed.
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

### 6.2 Website on Cloudflare (deltas only, after the C-1 to C-4 experiment)

- **Same blueprint**, with `host: "cloudflare"` in `blueprint.json` and in the site profile.
- **What's added:**
  - an OpenNext configuration, using the cache bindings proven in C-2;
  - `wrangler.jsonc` with `nodejs_compat`;
  - `.github/workflows/deploy-cloudflare.yml`, which builds and deploys with `--minify`;
  - the #1400 patch through `patch-package`, until the fix ships upstream.
- **Never** Pages, and never Direct Upload.
- **Verification is identical,** except that previews are authenticated per host `[Unknown]`, and `/api/site-info` reports `host` and `degraded: [...]`.
- **Workers Paid is required** because of the Worker size.

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

**First login, connections and preflight (hosted; the local version 0 shows the same Integrations page, reading credentials from `.env.local`)**

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
3. **Ownership** is fixed: Currawong-managed and transfer-ready (§5.6). The review screen shows what would transfer at the end.
4. **Host:** _Vercel (recommended)_. _Cloudflare_ is shown but disabled, with "Not yet supported for this blueprint — what's missing" linking to the degradation list.
5. **Start as:** _Pre-launch link page_.
6. **Review** lists exactly what will be created, in which account, and who pays:
   - "Sanity project in the _Acme Physio_ organisation (paid Growth; Currawong passes the cost through)";
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
  - clients (Contributors) see content fields and approved sections, and publish through Presentation via the publish gate (§5.5).
- Foundation's **Design** screen does not edit design (that would compete with Studio). It shows:
  - the blueprint's tokens;
  - the active Brand colours, read-only;
  - the contrast report from the last verification;
  - a link into Studio's Design area.
- A **code capability change** (a new section type) is shown as "Needs a code change: open an issue in the repo".

**Search Health (Stage E).**

- Four tabs: **Health** (deterministic errors first), **Opportunities**, **Search performance** and **Change history**.
- Each opportunity card shows the evidence (query, page, period, impressions, CTR and position), the data's caveats (top rows only, freshness), the suggested action and the effort.
- **Preview the change** opens Presentation on a draft. Publishing is a human action in Studio. The change is then recorded with its Sanity document revision and date (§9.9).

### 7.2 Screen map

In the stage column, **A** means the Foundation app running locally (version 0) and **B** means the same app hosted. Neither stage is CLI-first.

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
 Ownership                Currawong-managed, transfer-ready                     (?)
 Host                     (•) Vercel (recommended)  ( ) Cloudflare — not yet supported (why?)
 Start as                 (•) Pre-launch link page  ( ) Full site
 ▸ Advanced (blueprint version, Vercel team, region, features, site URL)
                                              [ Review what will be created → ]

RUN  acme-physio · nk-7f3a                              wall-clock 06:41 · hands-on 00:52
 ✓ Preflight                         0:14
 ✓ Sanity project + private dataset  0:38   (Acme Physio org · paid Growth)
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

- **Version 0** is the Foundation app on your own machine. Start it once (`npm run dev` in `nocturne-foundation`, or a desktop shortcut), and everything after that happens in the browser. It is browser-first from the start; only where it's hosted changes later.
- **Hosted,** it needs no terminal at all.
- **Experts (optional, later):** a thin CLI can call the same step functions (`launch`, `resume`, `status`, `verify`, `detach`), dry-run first and `--yes` to write. It is a convenience, never the product.

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

| Threat                                            | Impact                                                                                                             | Mitigation                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation's credential store is stolen (Stage B) | Every client's providers                                                                                           | <ul><li>Prefer short-lived tokens: GitHub App installation tokens last 1 h; Vercel and Cloudflare OAuth refresh flows.</li><li>Envelope encryption: AES-256-GCM per secret with a KMS-held key; plaintext only in memory.</li><li>No Sanity robot token values stored (they live in Vercel and GitHub).</li><li>Least-privilege scopes, and quarterly rotation.</li></ul> |
| Secrets leak into logs, the ledger or reports     | Credential exposure                                                                                                | <ul><li>A structured logger with a deny-list redactor.</li><li>Unit tests asserting that no token pattern ever reaches logs.</li><li>Token values never written to the database in Stage A.</li><li>Secret scanning on both repos.</li></ul>                                                                                                                              |
| Confused deputy across clients (Stage B, SaaS)    | One client acting on another's resources                                                                           | `org_id` on every row; every provider call resolves credentials from the project's own connection; authorisation checked server-side on every action; row-level security at SaaS.                                                                                                                                                                                         |
| A malicious or broken blueprint                   | Bad code reaches every new site                                                                                    | Blueprints are pinned to a tag **and SHA**; CI must be green; quarantine; `npm ci` from the lockfile; Actions pinned to SHAs (already done); Dependabot.                                                                                                                                                                                                                  |
| Spoofed webhooks                                  | False status                                                                                                       | Signature checks, re-fetching from the provider, idempotent event IDs.                                                                                                                                                                                                                                                                                                    |
| SSRF through the verifier                         | Internal network access                                                                                            | Fetch only hostnames on an allow-list (`*.vercel.app`, `*.workers.dev`, the project's registered domains); no redirects to private IPs; timeouts.                                                                                                                                                                                                                         |
| A client changes agency-only design or settings   | A broken design or behaviour                                                                                       | **Enforced:** clients are Contributors, so Sanity blocks direct publishing, and the publish gate publishes only allowed fields (§5.5). Document history and restore remain.                                                                                                                                                                                               |
| A Sanity trial expires or the plan is downgraded  | Private datasets become public (enquiries, members-only content, form settings), and client editors become Viewers | No trials for client projects; paid Growth before real content; never downgrade (archive or transfer instead); a daily `check:dataset` in `health.yml`; billing alerts (§5.6)                                                                                                                                                                                             |
| Operator account takeover                         | Full control                                                                                                       | Google Workspace SSO with enforced 2-step verification or passkeys; database sessions that can be revoked (the approved Ops design); owner-only destructive actions; a second confirmation.                                                                                                                                                                               |
| Spending abuse                                    | Cost blow-out                                                                                                      | Vercel Spend Management; EAS build caps; at most N launches a day per operator; dry runs by default.                                                                                                                                                                                                                                                                      |
| Privacy (client contacts, enquiries)              | APP or GDPR breach                                                                                                 | <ul><li>Foundation stores only names and emails of client contacts and metadata, never site content or enquiries.</li><li>Retention rules.</li><li>The site's enquiry retention already runs weekly.</li><li>Legal review sits in tasks 49 and 64.</li></ul>                                                                                                              |

### 8.4 Who holds which permissions

| Actor                         | Holds                                                                                                                                                                                                                                                       | Must never hold                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **Nocturne Foundation**       | <ul><li>Stage A: the operator's own tokens, held locally.</li><li>Stage B: GitHub App installations, Vercel and Cloudflare OAuth grants, Sanity organisation robots (if S1 passes), the GSC service account, Expo robots per client organisation.</li></ul> | Site content, signing keys, client passwords, Stripe secrets of client sites |
| **The generated website**     | <ul><li>A Viewer token for reads.</li><li>An Editor token, server-only, for forms, Stripe, enquiries and the publish gate.</li><li>Its own Stripe, Resend and Turnstile secrets.</li></ul>                                                                  | Any Foundation credential; organisation-level Sanity tokens                  |
| **The Sanity CMS (people)**   | Currawong: Administrator or Developer. Clients: **Contributor** (drafts only), publishing through the gate. The Editor role only by explicit agreement                                                                                                      | A client with the Administrator role, or publish rights that bypass the gate |
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

## 9. Design Engine and Content Intelligence execution (rewritten)

### 9.1 What already works: keep it, don't rebuild it `[Code]`

| Area                     | What exists                                                                                                                                                                                                                              | Tasks                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Tokens and theme**     | <ul><li>A tokens pipeline (`tokens.json` generates CSS and TS).</li><li>Brand colours (`designSettings`) with contrast badges and suggested accessible shades.</li><li>Tone remapping; light and dark appearance.</li></ul>              | 2, 78, 109, 140                       |
| **Sections and presets** | <ul><li>Section style, variants, and four hero layouts.</li><li>A visual preset picker with thumbnails.</li><li>Hero presets and slots.</li><li>Backgrounds: gradients, images, positioning, wash, overlays.</li><li>Dividers.</li></ul> | 4, 5, 74–76, 80–83, 114, 154          |
| **Motion**               | <ul><li>The lightweight Motion foundation.</li><li>Motion presets with intensity.</li><li>Element-level animation.</li><li>Parallax.</li><li>Cursors and interaction feedback.</li></ul>                                                 | 3, 6, 70, 84, 85, 101                 |
| **Link list**            | The deepest component: design controls, overrides, glass rows, depth and glow, and icon containers. It is the pattern to roll out elsewhere                                                                                              | 99, 113, 136, 142, 145, 149, 153, 155 |
| **Pictures**             | Adjust picture, a shape-aware framing editor                                                                                                                                                                                             | 175, 176                              |
| **Studio for clients**   | Role-aware client mode, Start here, validation that explains itself, Presentation                                                                                                                                                        | 26, 27, 160–166, 181–183              |

### 9.2 Necessary improvements: do these as real use demands them

These come from your stated frustrations, checked against the code.

| #   | Improvement                                                                                                                         | Frustration it removes                                                         | Existing task                                          | New task            |         Effort (sessions) |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | ------------------- | ------------------------: |
| N1  | Finish **see and reset overrides**                                                                                                  | Simple design changes take hours because you can't see what's overridden       | 167 (in progress)                                      | Not applicable      |                       2–3 |
| N2  | **Contrast that adapts and explains**: after a global colour change, text, glass and buttons stay legible, with fixes suggested     | "Global colours … dependent sections adapt intelligently"                      | 168, building on 140                                   | 194 (contract test) |                       3–4 |
| N3  | **Section contract v2, starting with the split and hero families** (see the list below)                                             | "Adding a button or video to an existing section"; "glass effects or parallax" | Builds on 4, 5, 80, 81                                 | 193                 |                       4–6 |
| N4  | **Roll-outs when needed**: Link list patterns spread to the components the real site uses                                           | "Repeatedly writing similar components"                                        | 137, 146–148, 151, 156–159, 177 (the "as needed" rule) | Not applicable      |                  Per need |
| N5  | **The publish gate**: an enforceable boundary for design and settings                                                               | "Changing content through complicated CMS workflows", made safe                | Not applicable                                         | 190, 196            | Spike 2–3, then build 4–6 |
| N6  | **Site recipes**: seed profiles that create a whole site structure for a business type (pages, sections, content types, navigation) | "Recreating project architecture and content models"                           | 120 and 127 (pre-launch only); 22 (per site)           | 197                 |                       3–5 |
| N7  | A keyboard and narrow-screen check of the custom inputs                                                                             | Quality                                                                        | 173                                                    | Not applicable      |                         2 |

What N3 adds to the split and hero families:

- `supportingMedia`, for example a video below the image;
- consistent `actions`;
- a rule for glass surfaces;
- motion and hover presets on the shared style.

**When Design Engine work counts as "necessary":** when a real site needs it, or when it removes a code edit you've made twice. Everything else is polish.

### 9.3 Optional polish: wait until a site needs it

- **Motion:** 108 (a parallax preset with strength and direction, beyond what exists) and 86 (saved motion presets).
- **Navigation:** 87 and 7 (submenus and the navigation drawer), unless the site's navigation needs them.
- **Studio chrome:** 185 (a page breadcrumb) and 184 (the left rail).
- **Content features:** 98 (the month calendar) and 144 (rich text in long fields).
- **Visual extras:** 141 (a wordmark hero), 178 (per-placement framing) and 139 (avatar presets).
- **Anything else:** new divider, icon or animation variants with no client behind them.

### 9.4 Section contract v2

**Starting point.** Keep revision 1's contract: content, media, layout, surface, motion and frame.

**Additions**

1. **Looks.** A look is a named preset (layout, surface, motion and hover) resolved from tokens.
   - A section stores a look ID, plus optional overrides by the agency.
   - The renderer ignores look IDs it doesn't know.
   - Looks make the Studio UI simpler and the publish policy clearer. They also make AI proposals possible later (§9.6).
2. **Slots are optional and typed:** `media`, `supportingMedia`, and `actions` (at most 2). Unsupported combinations are hidden in Studio, and rejected server-side by the publish gate.
3. **Families migrate one at a time,** each when a real site first touches it:
   - each with a migration in `migrations/` and its own e2e and visual tests;
   - in this order: split, hero, cards, call-to-action, editorial.

**Unchanged:** the theme and override hierarchy from revision 1 §9.2, from lowest to highest:

1. tokens;
2. brand;
3. tone;
4. element overrides (with Reset);
5. code.

Its contract test is now task 194.

### 9.5 Enforceable design boundaries (revised in revision 3)

**The boundary:**

- **Now:** Sanity's **Contributor** role plus agency review.
- **Later:** the hardened publish gate (§5.5).

**One registry (task 205)** lists what clients may change. Studio hiding, the agency review (task 206) and any future gate all read from it, and **new fields stay agency-only until they're classified**.

**Who keeps what:**

- **Agency staff** keep every Studio control.
- **Clients** keep content editing and Presentation. Until the gate exists, their changes wait for Currawong's review.

### 9.6 AI interpretation of a design reference: a bounded experiment

- **When:** only once section contract v2 covers the split, hero and card families, because the AI has to target that grammar.
- **Method:**
  - give a model a reference image;
  - it proposes a page as families, looks, slots and token suggestions;
  - a designer corrects the proposal.
- **Measure:** correction time against building it by hand. Stop if correction takes more than 70% of the manual time `[Hyp]`.
- **Human review:** asset rights, accessibility and content accuracy.
- **Placement:** Phase 6 (§12.7), not earlier.

### 9.7 Content contract v2: structured data as a foundation

**Standard entities.** Each one sits behind a site-profile flag, so a small site doesn't carry types it doesn't use.

| Entity                         | Status  | Key fields                                                                                                   | Relationships                                                   | JSON-LD                                                                                 |
| ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `siteIdentity` (organisation)  | Exists  | Legal and trading name, logo, social profiles, canonical URL, language                                       | Not applicable                                                  | `Organization` or a LocalBusiness subtype, `@id` `/#organization`                       |
| `businessInfo` (primary place) | Exists  | Address, hours, phone, area served                                                                           | `location` documents                                            | LocalBusiness details, `OpeningHoursSpecification`                                      |
| **`location`**                 | **New** | Name, address, geo, hours, phone, area served, page path                                                     | Services offered there; team members there                      | A LocalBusiness branch with `parentOrganization`, or a `Place`, each with its own `@id` |
| **`service`**                  | **New** | Name, summary, description, audience, evidence (testimonials, case links), price range (optional), page path | Locations; team members (as `provider`); FAQs; related articles | `Service`, with `provider` → `#organization` and `areaServed` → locations               |
| `page`                         | Exists  | Path, title, summary, social image, canonical, sections                                                      | Not applicable                                                  | `WebPage`, `BreadcrumbList`                                                             |
| `post` (article)               | Exists  | Title, dates, author, categories, body                                                                       | Services, topics                                                | `Article`, with `author` → `#person`                                                    |
| `author` and `teamMember`      | Exist   | Name, role, credentials, profile path                                                                        | Services, locations                                             | `Person`, with `worksFor` → `#organization`                                             |
| FAQ (a section)                | Exists  | Questions and answers                                                                                        | Pages, services                                                 | `FAQPage`, only where the FAQ is visible                                                |
| `event`                        | Exists  | As today                                                                                                     | Locations                                                       | `Event`                                                                                 |

**Rules**

- Every string in JSON-LD is visible on the page, or in the visible business facts.
- `@id`s are stable and unique, and the graph links pages to `#website` and `#organization`.
- Types follow the real business. Never mark every page with every type.
- No promise of rich results.

**Site recipes (N6)** build on these entities. For example, a local service business recipe: Home, Services (service documents and their pages), Locations, About, Team, Contact and Journal.

### 9.8 SEO foundations: deterministic, tested, in every site

| Check                                                                                       | Where                                              | Status                  |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------- |
| JSON-LD **matches visible content**; unique `@id`s; required properties per type            | Unit and e2e tests (fixtures), plus `launch:check` | **New** (188)           |
| Canonical, sitemap and robots consistency; noindex rules; a single H1; unique metadata      | `launch:check`                                     | Exists                  |
| **The internal-link graph**: orphan pages, broken internal links, services no page links to | `launch:check`, crawling the sitemap               | **New** (195)           |
| Breadcrumbs, heading order, image alt text                                                  | e2e and axe                                        | Mostly exists           |
| Performance budgets                                                                         | Lighthouse and the JS budget                       | Exists (no JS headroom) |

### 9.9 Search Health with Search Console: later, once there's data

- **The design is unchanged from revision 1 §9.5:**
  - service-account access;
  - a 28-day import;
  - mapping URLs to documents;
  - deterministic opportunity cards: CTR gap, declining page, indexing anomaly, structured-data issue and stale facts, plus the heuristic "query without a matching page";
  - changes made through Studio drafts and the publish gate;
  - before-and-after tracking, with caveats.
- **Data needed first:** at least 28 days from a live site. Build the data model only when Phase 5 starts.
- **Bing AI Performance** stays a manual source that covers Microsoft products only.

### 9.10 Hard limits on AI claims (unchanged)

- No SEO scores and no "LLM rank".
- No AI that publishes automatically.
- No promises of rich results or AI Overview inclusion.
- Readiness checks are labelled as readiness, never as ranking.

---

## 10. Value: personal first, commercial later (rewritten)

### 10.1 A value ledger, replacing the ROI test

Revision 1 judged the launcher by hours resold at a billable rate. That isn't how you are deciding. Instead, **track value on seven separate lines**. None of them needs converting into dollars.

| Line                               | What counts                                                                        | How you'll notice (a short note per site)                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1. Personal tooling                | A system you enjoy using and trust                                                 | You reach for Nocturne first, not around it                                                |
| 2. Hours and frustration saved     | Setup, repeated components, design tweaks, content workflows                       | The friction log shrinks from site to site; code edits made for design changes are counted |
| 3. Design quality and range        | More distinctive sites for the same effort                                         | Looks and section families you reuse; less bespoke code per site                           |
| 4. Learning and capability         | Provisioning, durable workflows, structured data, Cloudflare, mobile               | New things you can offer clients                                                           |
| 5. Less repetition and maintenance | Template releases instead of per-site fixes; verification instead of manual checks | Update PRs merge cleanly; health issues are caught before clients notice                   |
| 6. Agency revenue                  | Faster delivery, credible care plans, SEO outcomes                                 | Care-plan uptake; delivery time per site                                                   |
| 7. Future commercial potential     | A product others would pay for                                                     | You'd recommend it without caveats; interest arrives unprompted                            |

- **Lines 1–5 are short-term personal value. Lines 6–7 are commercial potential.**
- Both matter, but **lines 1–5 decide what gets built next.**

### 10.2 Money that still matters

- **Keep running costs near zero until there's a reason:**
  - Neon's free tier;
  - the Vercel Pro plan you already have;
  - no Cloudflare or Expo plans until those experiments;
  - US$5 a month of Workers Paid only for Cloudflare step C-4.
- **Per-client Sanity Growth seats** (US$15 per seat) are a real, recurring cost.
  - Pass the cost through to the client.
  - Never let a client project lapse to a trial or to Free (§5.6).
- **Revision 1's ROI tables** (archived, §10.1 there) are still correct arithmetic. They no longer drive the plan.

### 10.3 Time, not money, is the constraint

- **Effort is estimated in sessions.** A session is one focused block of about 2–3 hours.
- §12 gives the estimates and dependencies; you set the pace.
- **There is no fixed percentage for platform work.** Instead, use the guardrails in §12.2:
  - one platform task in progress at a time;
  - finish each task to a usable state;
  - write a resume note at the end of every session.

### 10.4 Client offers (from revision 1 §10.2, condensed)

- **An A$100-a-month "managed website": don't sell it as stated.** Growth seats plus even one hour of support a month cost more than that.
- **Instead, offer a care and improvement plan at roughly A$300–600 a month, excluding GST.** It covers:
  - updates and monitoring;
  - a monthly Search Console review with 2–4 evidenced opportunities;
  - a capped number of hours.
- **Foundation's verification and Search Health make the care offer credible.** That is a commercial benefit, but a downstream one.

### 10.5 Personal value now versus commercial potential later

| Now (personal)                                             | Later (commercial, only if it emerges)                                    |
| ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| One reliable way to start, build, launch and verify a site | Offering the same flow to other agencies, starting as a concierge service |
| Design changes without code edits                          | A design system other studios license                                     |
| Truthful structured data by default                        | Search Health as part of paid care plans                                  |
| A Foundation app on your laptop                            | A hosted, multi-user Foundation, then possibly SaaS                       |
| Cloudflare and mobile as learning experiments              | Hosting choice and app delivery as client services                        |

---

## 11. Decision register and risk register (revised)

### 11.1 Decision register (changes in **bold**)

| ID       | Decision                               | Selected (revision 2)                                                                                                                                                                | Rejected                                                                                                      | Revisit when                                                    |
| -------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| D-01     | Product shape                          | **A browser-first Foundation app, local in version 0 and hosted later, built in stages led by real projects**                                                                        | A CLI-first launcher (revision 1); a hosted control plane now; an internal developer portal; the starter only | You need remote or scheduled operation (then host it)           |
| D-02     | Architecture                           | A modular monolith                                                                                                                                                                   | Microservices                                                                                                 | Only with operational evidence                                  |
| D-03     | UI framework                           | Next.js 16                                                                                                                                                                           | Not applicable                                                                                                | Not applicable                                                  |
| D-04     | Data                                   | **Neon Postgres and Drizzle from version 0**, with `org_id` and `actor` on every record                                                                                              | SQLite (lost to pauses or a laptop change)                                                                    | Not applicable                                                  |
| D-05     | Executor                               | **Deferred.** An in-process runner locally; Vercel Workflows (or Inngest) once hosted                                                                                                | Temporal; a Postgres queue                                                                                    | Hosting                                                         |
| D-06     | Repositories                           | **No new repo until Phase 3; then one repo with one Next.js app**                                                                                                                    | A monorepo now; Foundation inside the template                                                                | A second deployable appears                                     |
| D-07     | Client runtime                         | An independent repo and resources per client                                                                                                                                         | A shared runtime                                                                                              | Never                                                           |
| D-08     | Starter across hosts                   | One starter, isolated host modules, contract tests per host                                                                                                                          | Forked variants                                                                                               | Cloudflare differences exceed about 10 files                    |
| D-09     | Default host                           | Vercel                                                                                                                                                                               | Not applicable                                                                                                | Cloudflare steps C-1 to C-4 pass                                |
| D-10     | Cloudflare mechanism                   | **OpenNext on Workers, minified, on Workers Paid, deployed from GitHub Actions.** vinext rechecked later                                                                             | Pages; Direct Upload                                                                                          | vinext gains full Cache Components, or a verified adapter ships |
| D-11     | Repo creation                          | Template history up to the tag, plus a configuration commit                                                                                                                          | Template generate                                                                                             | A core package replaces merges                                  |
| D-12     | Sanity provisioning                    | The operator's CLI session (the wizard's logic); an organisation robot if S1 passes                                                                                                  | Not applicable                                                                                                | S1, in Phase 3                                                  |
| D-13     | Sanity configuration as code           | Blueprints, if S1 confirms them                                                                                                                                                      | Not applicable                                                                                                | S1                                                              |
| D-14     | Verification                           | The content marker, `launch:check --json`, and the `site-info` commit SHA                                                                                                            | Trusting provider status alone                                                                                | Never weaker                                                    |
| D-15     | Agency-only boundary                   | **Staged: Contributors plus agency review now (205, 206); the hardened publish gate (190, 196, 214) when a client needs to publish themselves.** Fallback: a separate design project | Studio-only hiding; revision 2's unhardened gate                                                              | E1 fails, or a client needs self-publishing                     |
| D-16     | Client editing                         | Studio and Presentation                                                                                                                                                              | A custom editing UI                                                                                           | Not applicable                                                  |
| D-17     | Mobile                                 | Expo with EAS, a separate repo, content through the web API. **Architecture-ready, not built**                                                                                       | Bare React Native; shared web and native UI                                                                   | A real use case                                                 |
| D-18     | Search data                            | A Search Console service account; Bing reviewed manually                                                                                                                             | Scores                                                                                                        | SaaS                                                            |
| D-19     | Supabase                               | Not yet                                                                                                                                                                              | Not applicable                                                                                                | An app needs auth or data                                       |
| D-20     | Ownership                              | **One mode: Currawong-managed and transfer-ready**                                                                                                                                   | Two modes                                                                                                     | A client insists on owning the accounts                         |
| D-21     | Timing                                 | The definitions from revision 1                                                                                                                                                      | Not applicable                                                                                                | Not applicable                                                  |
| D-22     | Abstractions                           | Concrete modules; an interface only alongside its second implementation                                                                                                              | Generic adapters                                                                                              | Not applicable                                                  |
| **D-23** | **Sanity plan safety**                 | **No trials for client projects; paid Growth before real content; never downgrade; a daily privacy check**                                                                           | Assuming settings stay private                                                                                | Never weaker                                                    |
| **D-24** | **Content contract v2**                | **`service` and `location` entities and relationships, behind profile flags; JSON-LD built from visible facts**                                                                      | Adding them only when needed (revision 1)                                                                     | Not applicable                                                  |
| **D-25** | **Design Engine priority**             | **Necessary improvements continuously; polish deferred**                                                                                                                             | A design freeze (revision 1)                                                                                  | Not applicable                                                  |
| **D-26** | **Field classification**               | **An allowlist registry with a completeness test (205)**                                                                                                                             | A denylist of agency-only fields                                                                              | Never weaker                                                    |
| **D-27** | **Agency publishing of client drafts** | **Show protected-field changes and their authors before publishing (206)**                                                                                                           | Publishing whole drafts unseen                                                                                | Never weaker                                                    |

### 11.2 Risk register (revised)

| ID       | Risk                                                                                  | Probability         | Impact      | Mitigation                                                                                               | Early warning                                              |
| -------- | ------------------------------------------------------------------------------------- | ------------------- | ----------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| R-01     | **Scope and maintenance outgrow one part-time builder** (replaces "opportunity cost") | High                | High        | The guardrails in §12.2; few modules; no always-on infrastructure until hosting; tests with every change | Two sessions in a row spent on upkeep rather than progress |
| R-02     | Sanity can't delegate project creation                                                | Medium              | Low for now | The operator's CLI session; a manual gate                                                                | S1 fails                                                   |
| R-03     | Upstream churn breaks things                                                          | High                | Medium      | CI on tags; Dependabot; a monthly maintenance session                                                    | Red dependency PRs                                         |
| R-04     | Client repos drift from the template                                                  | Medium              | Medium      | Customise-versus-core discipline; update PRs                                                             | A merge takes more than an hour                            |
| R-05     | Cloudflare stays blocked                                                              | Medium              | Low         | The bounded C-1 to C-4 experiment; Vercel stays the default                                              | C-2 fails                                                  |
| R-06     | Secrets leak                                                                          | Low                 | High        | A redactor with tests; nothing secret in Git; scanning                                                   | A scanner alert                                            |
| R-07     | Orphaned resources after a failed run                                                 | Medium              | Medium      | A write-ahead ledger; reconciliation; undo                                                               | An orphan appears in the ledger                            |
| R-08     | **Clients publish agency-only changes**                                               | Low (with the gate) | Medium      | The publish gate; document history                                                                       | A spike in policy refusals                                 |
| R-09     | Mobile expectations outrun reality                                                    | Medium              | Medium      | A separate lifecycle; no store dates promised                                                            | "An app by Friday"                                         |
| R-10     | Search data is misread                                                                | Medium              | Medium      | Caveats in the UI; deterministic rules                                                                   | Cards accepted without review                              |
| R-11     | Vendor price changes                                                                  | Medium              | Medium      | Pass costs through                                                                                       | An invoice more than 20% over plan                         |
| R-12     | Bus factor and **long pauses**                                                        | High                | High        | Resume notes; runbooks; a reproducible ledger; tasks small enough to finish                              | You can't resume within 15 minutes                         |
| R-13     | The executor proves immature                                                          | Low                 | Low         | The decision is deferred                                                                                 | Not applicable                                             |
| R-14     | The JS budget has no headroom                                                         | Medium              | Low         | Every addition stays server-only                                                                         | The performance spec fails                                 |
| R-15     | A dispute over who owns what                                                          | Low                 | High        | The agreement (task 64); one ownership mode                                                              | Not applicable                                             |
| **R-16** | **A Sanity trial expires or a plan is downgraded, exposing private data**             | Medium              | **High**    | The D-23 rules; `check:dataset` in `health.yml`; billing alerts                                          | A dataset reported public                                  |
| **R-17** | **The publish gate breaks client publishing**                                         | Medium              | Medium      | Spike first; fall back to agency publishing; e2e tests                                                   | Clients report they can't publish                          |
| **R-18** | **Section contract migrations damage existing content**                               | Medium              | Medium      | Migration dry runs (CI already does this); one family at a time; fixtures                                | A dry-run diff surprises you                               |

---

## 12. Execution plan (rewritten)

### 12.1 Your sequence, and where I'd change it

**Revision 3 change to this order:**

- Phase 0 now includes tasks 205 and 206 (Contributors plus agency review) **instead of** the publish-gate spike.
- E1 (task 190) moves to Phase 2, and runs only when a client needs to publish themselves.
- The total effort is unchanged.

Your sequence is right in spirit. Three changes:

1. **Verify from the first launch.** Move the verification contract ahead of the real launch: the marker, the JSON-LD tests and the health workflow. Then the first site is verified the same way every later site will be. It's small: 2–3 sessions.
2. **Settle the schema-shaping questions before the full site's content goes in.** Two decisions shape the schema:
   - the publish gate (E1);
   - content contract v2 (`service` and `location`).
     Changing the schema after real content exists means migrations, and that cost grows with every site.
3. **Design Engine work isn't a later phase.** It runs **continuously from Phase 1**, driven by the real site's friction log. Phase 6 is only where the _larger_ roll-out of contract v2 lands.

**Revised order**

| Phase | Name                      | What it covers                                                                                                             |
| ----: | ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
|     0 | Readiness                 | Plan safety, a timed baseline, the verification contract, E1 (publish-gate spike), the content contract v2 design          |
|     1 | The real website          | Build and launch the active client's full site on the system, keeping a friction log                                       |
|     2 | Fixes from real use       | Necessary Design Engine improvements, content contract v2, building the publish gate, SEO checks                           |
|     3 | Repeatable provisioning   | **Create the Foundation repo.** Spikes S1, S2 and S4 merged into one proof, plus `blueprint.json` and a documented runbook |
|     4 | Foundation app, version 0 | Projects, a new-site wizard, a run timeline, verification and health views. Used for site #2                               |
|     5 | Search Health             | Once a live site has 28 days of Search Console data                                                                        |
|     6 | Design Engine at scale    | Contract v2 across the remaining families, site recipes, then the AI design-reference experiment                           |
|     7 | Bounded experiments       | Cloudflare steps C-1 to C-4, mobile (when there's a use case), hosting Foundation (when needed), commercial signals        |

### 12.2 Working sustainably, instead of a time cap

**What a session is.** One focused block of about 2–3 hours. Every task in §13.5 fits in one to three sessions.

**Guardrails**

1. **One platform task in progress at a time**, alongside client work.
2. **Finish to a usable state:** `main` stays green, and nothing is left half-migrated.
3. **Write a resume note at the end of every session**, in that task's notes in the plan artifact: what's done, what's next, any traps.
4. **No new always-on infrastructure** until hosting has been chosen.
5. **Tests with every change.** The repo already works this way.
6. **One maintenance session a month:** dependencies, Dependabot, a template release.
7. **Coming back after a pause:** read the resume note, run `npm run check`, pick the next task. Aim to be productive within 15 minutes.

**Effort converted into calendar time.** This is a conversion, not a prescription.

| Sessions a week | Phases 0–2 (about 30–45 sessions) | Phases 0–4 (about 50–70 sessions) |
| --------------: | --------------------------------: | --------------------------------: |
|               2 |                 About 15–22 weeks |                 About 25–35 weeks |
|               3 |                 About 10–15 weeks |                 About 17–23 weeks |
|               4 |                  About 8–11 weeks |                 About 13–18 weeks |

**If time runs short, cut in this order:**

1. the Cloudflare experiment;
2. site recipes;
3. section families beyond split and hero;
4. the Foundation app (keep the scripted provisioning proof).

**Never cut** verification, plan safety or the publish gate.

### 12.3 Essential checks before implementation (revised in revision 3)

| ID     | Check                                                                  | Why it can't wait                                                                                                                                                                            | Effort             | Output                                                               |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| **E3** | Plan safety on the active client project (now part of tasks 11 and 31) | A trial or Free plan would expose enquiries if the dataset flipped to public                                                                                                                 | 30–60 minutes      | Paid Growth confirmed; dataset private; `ENQUIRIES_STORE` consistent |
| **E4** | Timed launch rehearsal (task 128)                                      | It's the baseline for every later improvement                                                                                                                                                | 1 session          | Times, clicks, failures                                              |
| **E2** | Content contract v2 note (task 191)                                    | The full site's content should go in on the final model                                                                                                                                      | 1 session          | An approved note                                                     |
| —      | **The publishing model: no spike needed now**                          | Clients must be safe before they edit. Contributors plus agency review rely only on documented Sanity behaviour `[Doc]`. Our side is verified by 205's completeness test and 206's e2e tests | Inside 205 and 206 | Tests                                                                |

**E1 (task 190)** moves to Phase 2. It runs only when a client needs to publish themselves.

### 12.4 The first 14 days (revised in revision 3)

[Document D](./NOCTURNE_NEXT_SESSIONS.md) specifies the next 10 sessions. In short:

|     Order | Work                                                                        | Sessions |
| --------: | --------------------------------------------------------------------------- | -------: |
|         1 | E3 plan safety; set the client as a Contributor once 206 lands              |        1 |
|         2 | Verification: 187, 188, 189                                                 |      3–4 |
|         3 | E4: the timed rehearsal (task 128)                                          |        1 |
|         4 | Contributors plus agency review: 205, 206                                   |      3–4 |
|         5 | E2: the content contract v2 note (191)                                      |        1 |
| Alongside | Client work: the active client's link page (task 124), if it isn't live yet |        — |

### 12.5 The 30-day vertical slice: from the real site to a verified launch

**Scope.** The active client's full site, built on the system, with:

- the verification contract;
- the publish gate if E1 passes, or agency-only publishing for now if it doesn't;
- the content contract v2 entities the site needs;
- the necessary Design Engine fixes from its friction log;
- a written runbook for setup and deployment.

**Done when:**

- the site passes pre-launch QA (task 31), and `launch:check` passes **with the marker**;
- the friction log has been triaged into Design Engine, Content and Foundation work;
- the runbook covers everything from setup to a verified preview.

**The launch itself (task 125)** lands in this window or soon after, depending on when the client's content is ready.

### 12.6 90-day milestones, matched to your definition of success

| Your criterion                                                        | Milestone                                                                                                   | Evidence                                                                                               |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| A real website launched using the system                              | **M1** (existing): the full site is live                                                                    | Task 125 done; `launch:check` passes with the marker on production                                     |
| A repeatable, documented setup and deployment process                 | **MF1**: the scripted provisioning proof passes twice, failure injection included; the runbook is published | Task 199 done; two verified runs on scratch accounts                                                   |
| A reusable content model with reliable publishing and structured data | **MP**: safe publishing (Contributors plus agency review). **MC**: content contract v2 and SEO checks       | Tasks 205 and 206 done; tasks 191 and 195 done, plus 192 and 212 when the site needs them              |
| A Design Engine that makes meaningful changes easier                  | **MD**: overrides with reset, contrast that adapts, section contract v2 for split and hero                  | Tasks 167, 168, 193 and 194 done; the friction log counts which design changes still needed code edits |
| Reliable previews, testing and verification                           | **MV**: the marker, `health.yml`, launch checks in CI                                                       | Tasks 187–189 done                                                                                     |
| A technical foundation you can maintain confidently                   | **MM**: CI green, resume notes on every task, one maintenance session a month                               | Two pauses resumed within 15 minutes                                                                   |
| A clear next milestone                                                | **MN**: the scope of Foundation app version 0 (Phase 4) agreed, or started if time allows                   | An approved task list for Phase 4                                                                      |

### 12.7 Phases, with effort and dependencies

| Phase                        | Content                                                                                                                                                                     | Depends on                          | Effort (sessions) `[Hyp]` |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------: |
| 0. Readiness                 | E2–E4; the verification contract (187–189); Contributors plus agency review (205, 206)                                                                                      | Not applicable                      |                       6–9 |
| 1. The real website          | System work during the build: fixes, the runbook. The site build itself is client work                                                                                      | 0                                   |     4–8, plus client work |
| 2. Fixes from real use       | Content contract v2 (192, 212); section contract v2 (193, 213); contrast (167, 168, 194); SEO checks (195); the self-service gate (190, 196, 214) only if a client needs it | 0, 1                                |                     15–25 |
| 3. Repeatable provisioning   | **Create the Foundation repo**; spikes S1, S2 and S4; `blueprint.json`; the runbook                                                                                         | 1                                   |                      6–10 |
| 4. Foundation app, version 0 | A local Next.js app: project list (existing sites imported), new-site wizard, run timeline, verification and health views                                                   | 3                                   |                     10–15 |
| 5. Search Health             | Search Console import, URL mapping, opportunity cards, change history                                                                                                       | A live site with 28 days of data; 4 |                      6–10 |
| 6. Design Engine at scale    | The remaining families on contract v2; site recipes; the AI design-reference experiment                                                                                     | 2                                   |                     10–20 |
| 7. Experiments               | Cloudflare C-1 to C-4; mobile (S7, then the mobile stage); hosting; commercial signals                                                                                      | Varies                              |                    Varies |

**Readiness checks** replace revision 1's investment gates. None of them is an ROI test.

| Before        | Ready when                                                             |
| ------------- | ---------------------------------------------------------------------- |
| Phase 3       | The first site is launched and its friction log is triaged             |
| Phase 4       | The provisioning proof has passed twice, failure injection included    |
| Hosting       | You need remote or scheduled operation                                 |
| Cloudflare    | Steps C-1 to C-4 pass                                                  |
| Mobile        | There's a real use case, and the client owns the accounts              |
| Search Health | A live site has 28 days of data                                        |
| Commercial    | You'd recommend Nocturne without caveats, and there's outside interest |

### 12.8 DO NOT BUILD (revised)

- A hosted control plane before you need remote operation; SaaS sign-in, billing or multi-tenancy.
- **Multiple ownership models.**
- **A second design or content editor outside Studio.**
- Generic provider adapters, or a provider marketplace.
- A visual page builder or arbitrary layouts.
- Image-to-site before contract v2 exists. After that, only the experiment in §9.6.
- AI that publishes; SEO scores or "LLM rank".
- A shared runtime serving several client sites.
- Your own app-signing system; shared web and native UI components.
- Cloudflare Pages or Direct Upload projects; forked host variants.
- Supabase before an app needs it.
- Automatic DNS changes or automatic suspension.

**Withdrawn from revision 1's list:** the design-feature freeze.

---

## 13. Repository and roadmap reconciliation (revised)

Section 13.1 is unchanged from revision 1. The rest of this section is revised.

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

### 13.2 Missing contracts (revised)

- `blueprint.json`.
- The verification marker and its spec.
- **The publish policy:** agency-only field tags plus the server rules.
- **Content contract v2:** `service`, `location`, their relationships and the JSON-LD rules.
- **Section contract v2:** looks and slots.
- The design ownership table, and the contrast contract test.
- **Site recipes.**
- The ledger schema (Phase 3).
- The mapping from Search Console URLs to documents (Phase 5).

### 13.3 Proposed template changes

Each is a small PR, made only after approval.

1. **The verification marker**, as in revision 1 §13.3, item 1.
2. **A `health.yml` workflow**, run daily:
   - it runs `launch:check --json` and `check:dataset` against production;
   - it opens or updates a GitHub issue on failure;
   - its README notes that GitHub pauses scheduled workflows on repos inactive for 60 days.
3. **SEO tests:** JSON-LD visible-content and `@id` tests, plus internal-link checks in `launch:check`.
4. **The publish gate:**
   - schema tags and a policy module (pure, with unit tests);
   - the `/api/publish` route and the Contributor Publish action;
   - e2e tests against the fake Content Lake;
   - README role tables.
5. **Content contract v2:** `service` and `location` documents and templates, profile flags, JSON-LD, migrations and fixtures.
6. **Section contract v2**, one family at a time: split, then hero.
7. **`blueprint.json`**, generated by `release.mjs` (Phase 3).
8. **`deploy-env.ts`**, only when Cloudflare work starts.

### 13.4 Existing tasks: revised dispositions

This is a proposal. Nothing changes in the plan artifact without your approval.

| Existing IDs                                     | Revision 1 proposal          | **Revision 2 proposal**                                                                                |
| ------------------------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| 124, 125, 128, 11, 30, 31, 32, 63, 64            | Prioritise                   | **Prioritise** (Phase 1). Task 128 gains timing capture (E4)                                           |
| 167, 168, 173                                    | Finish 167; keep 168         | **Necessary Design Engine work:** do it in Phases 1–2                                                  |
| 137, 146–148, 151, 156–159, 177                  | Pause until M1               | **No pause.** Necessary when the real site needs them (the existing "as needed" rule)                  |
| 108, 86, 87, 7, 98, 185, 184, 141, 144, 178, 139 | Pause until M1               | **Optional polish:** later, unless a site needs it                                                     |
| 42                                               | Merge into the launcher (F1) | **Merge into Phase 3** (the provisioning proof); keep 42 as an alias                                   |
| 37–41, 43, 44                                    | Retarget to hosted (Stage B) | **Retarget to "Foundation, hosted (later)".** The local version 0 (Phase 4) covers what you need first |
| 129–135                                          | After Stage B                | Unchanged                                                                                              |
| 45–49                                            | Deferred                     | Unchanged                                                                                              |
| 52                                               | Merge into Stage E           | **Merge into Phase 5** (Search Health)                                                                 |
| 53, 54                                           | Retain                       | Retain. Update PRs support the care offer                                                              |
| 61                                               | Trigger-based                | Trigger-based, and **also the lever for Cloudflare's size limit** (§4.2)                               |
| 50, 58, 57, 59, 60, 62                           | Trigger-based                | Unchanged                                                                                              |
| 94–96, 102–105                                   | Retain                       | Unchanged                                                                                              |
| 77, 180                                          | Retain                       | Retain. Task 77 measures client editing (MC, MD)                                                       |

### 13.5 Proposed new tasks (revision 3)

**The authoritative task list is [Document C](./NOCTURNE_ROADMAP_PROPOSAL.md).** It has the full specifications, acceptance criteria and validated canonical records, and its §6 lists what changed from revision 2. In summary:

| ID  | Task                                                           | Phase | Sessions | Depends on |
| --- | -------------------------------------------------------------- | ----: | -------: | ---------- |
| 187 | Verification marker                                            |     0 |      1–2 | —          |
| 188 | JSON-LD visible-content and `@id` tests                        |     0 |        1 | —          |
| 189 | Daily health workflow                                          |     0 |        1 | 187        |
| 205 | Field classification registry (an allowlist)                   |     0 |      1–2 | —          |
| 206 | Agency publish review for Contributor drafts                   |     0 |      2–3 | 205        |
| 191 | Content contract v2 note                                       |     0 |        1 | —          |
| 198 | Setup and deployment runbook                                   |     1 |        1 | 125        |
| 192 | Content contract v2: services                                  |     2 |      2–3 | 191        |
| 212 | Content contract v2: locations                                 |     2 |      2–3 | 192        |
| 193 | Section contract v2: the split family                          |     2 |      2–3 | 205        |
| 213 | Section contract v2: the hero family                           |     2 |      2–3 | 193        |
| 194 | Theme-adaptation contract test                                 |     2 |      1–2 | 168        |
| 195 | SEO internal-link checks                                       |     2 |        2 | 188        |
| 190 | Spike: publish gate security (only when needed)                |     2 |        2 | 205        |
| 196 | Publish gate: server (only when needed)                        |     2 |      2–3 | 190        |
| 214 | Publish gate: Studio (only when needed)                        |     2 |        2 | 196        |
| 199 | Foundation repo and scripted launch (**repo approval needed**) |     3 |      3–4 | 125, 187   |
| 211 | Provisioning hardening                                         |     3 |      2–4 | 199        |
| 200 | `blueprint.json`                                               |     3 |        1 | 199        |
| 201 | Foundation app version 0: core                                 |     4 |      3–4 | 211, 200   |
| 207 | Projects list and import                                       |     4 |        2 | 201        |
| 208 | New-site wizard and timeline                                   |     4 |        3 | 201        |
| 209 | Verification and health views                                  |     4 |        2 | 201, 189   |
| 202 | Search Console import and mapping                              |     5 |      3–4 | 201        |
| 210 | Opportunity cards and history                                  |     5 |      3–5 | 202        |
| 197 | Site recipes                                                   |     6 |      3–5 | 192, 212   |
| 203 | Cloudflare experiment                                          |     7 |      3–6 | 125        |
| 204 | Mobile proof                                                   |     7 |      1–2 | A use case |

### 13.6 Versions and milestones (revised)

**Template**

- v1.9.0: the existing P1 scope, plus tasks 187–189.
- v1.10.0: tasks 192, 193 and 196, or spread across several minor releases.

**Foundation**

- 0.1: the Phase 3 proof.
- 0.2: the local app (Phase 4).
- 0.3: Search Health.
- 1.0: hosted.

**Milestones**

- Existing: M0 and M1.
- New: **MV, MC, MD, MF1, MM and MN** (§12.6).

### 13.7 Moving to the new plan safely (unchanged)

- Changes to the plan artifact are **additive only**, made after approval, using the version 18 build method.
- Revision 1 is archived, unchanged, in `docs/nocturne/history/`.

---

## 14. Final recommendation (revision 3)

**Verdict: unchanged.** BUILD, in stages, led by real projects.

**What changes:** client publishing becomes **safe immediately**:

- clients are Contributors and Currawong reviews their drafts (tasks 205 and 206);
- the self-service gate comes later, hardened, and only when a client needs it.

**The five highest-value next tasks**

1. **E3 plan safety**, then **187**, the verification marker.
2. **188** (JSON-LD tests) and **189** (daily health).
3. **128**, the timed rehearsal: the baseline.
4. **205 and 206**: safe client publishing, before the client starts editing.
5. **191**, the content contract note, then the real site (124, then 125).

**Approvals requested.** These are detailed in Document C §1:

| #     | Approval                                                                       |
| ----- | ------------------------------------------------------------------------------ |
| R3-A1 | Interim publishing: Contributors plus agency review                            |
| R3-A2 | The hardened gate, built only when needed                                      |
| R3-A3 | New tasks 205 and 206, plus the splits that create 207–214                     |
| R3-A4 | Changes to canonical tasks 11, 31, 32, 64, 77, 128 and 180                     |
| R3-A5 | New stages `f` and `fx`, the renamed Ops context and the JS-budget wording fix |
| R3-A6 | Creating the Foundation repo, at Phase 3                                       |

**Carried over from revision 2:** R2-A7, the US$5-a-month scratch Workers Paid account for Cloudflare step C-4, is still pending.

**What would change this plan**

- **E1 fails.** Stage 1 becomes permanent, or design values move to a separate project.
- **A client needs to publish themselves sooner.** Run 190, 196 and 214 earlier.
- **A different requirements artifact exists.** Document A gets extended.

---

## Appendix A — Traceability matrix (revision 3)

| Item                    | Pain addressed                                                             | Decision               | Test                                                              | Milestone      |
| ----------------------- | -------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------- | -------------- |
| 187–189                 | "Deployed" isn't proof that it works; silent privacy drift                 | D-14, D-23             | Marker e2e, `health.yml`, `check:dataset`                         | MV             |
| 205, 206                | Clients could change design; agency publishes could leak protected changes | D-15, D-26, D-27       | Completeness test; e2e for the agency review and for Contributors | MP             |
| 190, 196, 214           | Clients need to publish themselves                                         | D-15                   | Policy, race and suspended-author tests                           | When triggered |
| 191, 192, 212           | Content models rebuilt each time; weak structured data                     | D-24                   | JSON-LD visible-content tests; migration dry runs                 | MC             |
| 193, 213, 194, 167, 168 | Code edits for layout, glass and colour changes                            | D-25                   | Visual baselines; contrast contract test                          | MD             |
| 195                     | Orphan pages, broken links                                                 | D-24                   | `launch:check` fixtures                                           | MC             |
| 198, 199, 211, 200      | Manual, error-prone setup                                                  | D-06, D-11, D-12, D-14 | Two verified scripted runs; the failure-injection matrix          | MF1            |
| 201, 207–209            | No single place to set up and watch projects                               | D-01, D-04, D-05       | Version 0 sets up a site from the browser                         | MN             |
| 202, 210                | Vague SEO advice                                                           | D-18                   | URL mapping ≥ 95%; cards judged useful                            | Phase 5        |
| 197                     | Rebuilding site architecture                                               | D-25                   | Recipe seed and e2e tests                                         | Phase 6        |
| 203, 204                | Choice of host; app delivery                                               | D-09, D-10, D-17       | C-1 to C-4; APK installed with the marker                         | Phase 7        |

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

### B.8 Section contract v2: the split family, with looks and `supportingMedia` (a Sanity schema sketch)

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
    defineField({ name: 'supportingMedia', type: 'mediaItem', group: 'content' }), // e.g. a video below the image
    defineField({
      name: 'look', // a named preset: layout + surface + motion + hover, resolved from tokens
      type: 'string',
      group: 'design',
      options: {
        list: ['split-media-right', 'split-media-left', 'split-stacked', 'split-glass-accent'],
      },
      initialValue: 'split-media-right',
    }),
    defineField({ name: 'style', type: 'sectionStyle', group: 'design' }), // agency overrides on top of the look
  ],
})

// src/lib/sanity/client-editable.ts — ONE allowlist (task 205) for client-mode hiding, the agency
// publish review (task 206) and any future publish gate. Unlisted fields are agency-only by default;
// a CI test fails when a field in a client-editable type is unclassified.
export const CLIENT_EDITABLE: Record<string, readonly string[]> = {
  split: ['heading', 'body', 'actions', 'media', 'supportingMedia'], // not 'look' or 'style'
  page: ['title', 'sections', 'seo.title', 'seo.description'], // a published slug changes only with a redirect
  post: ['title', 'summary', 'body', 'mainImage', 'categories', 'author'],
}
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

### B.10 Client publishing contract (revised in revision 3: deny-by-default, author-checked, revision-guarded)

```ts
import type { SanityDocument } from 'sanity'

export interface PublishRequest {
  documentId: string
  draftRev: string // used for optimistic locking only; it is not identity
}

export type ReviewRule =
  | 'field_not_client_editable' // from the CLIENT_EDITABLE allowlist (task 205)
  | 'type_not_client_publishable'
  | 'section_not_approved'
  | 'new_document_protected_field_set'
  | 'slug_without_redirect'
  | 'delete_or_unpublish'
  | 'author_not_currently_permitted' // History API authors + Access API current roles
  | 'server_validation_failed' // required fields, slug uniqueness

export type PublishDecision =
  | { action: 'publish'; changedPaths: string[]; authors: string[] }
  | { action: 'review'; reasons: Array<{ path?: string; rule: ReviewRule }> }

/** Pure and unit-tested. Shared with the agency publish review (task 206). */
export declare function decide(
  draft: SanityDocument,
  published: SanityDocument | null,
  authors: Array<{
    userId: string
    currentRole: 'contributor' | 'editor' | 'agency' | 'viewer' | 'none'
  }>,
): PublishDecision

// POST /api/publish (server-only; Editor robot; built only when a client needs self-publishing):
// 1. Load draft + published; collect transaction authors since the last publish (History API) and
//    their current project roles (Access API).
// 2. decide(); on 'review', notify Currawong and return the reasons.
// 3. On 'publish': Actions API `sanity.action.document.publish` with ifDraftRevisionId = draftRev and
//    ifPublishedRevisionId = published?._rev, so exactly the validated revision goes live or nothing does.
// 4. Rate-limit per document and per IP; log { documentId, draftRev, authors, changedPaths, at }.
```

### B.11 Content contract v2: `service` (new in revision 2, a sketch)

```ts
import { defineField, defineType } from 'sanity'

export const service = defineType({
  name: 'service',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'name' } }),
    defineField({ name: 'summary', type: 'text', rows: 3 }), // visible on the page and in listings
    defineField({ name: 'body', type: 'blockContent' }),
    defineField({
      name: 'locations',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'location' }] }],
    }),
    defineField({
      name: 'people',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'teamMember' }] }],
    }),
    defineField({ name: 'faqs', type: 'array', of: [{ type: 'faqItem' }] }),
  ],
})

// JSON-LD (only from visible fields):
// { '@type': 'Service', '@id': `${pageUrl}#service`, name, description: summary,
//   provider: { '@id': `${siteUrl}/#organization` }, areaServed: locations.map((l) => ({ '@id': l.id })) }
```

---

## Appendix C — Quality gates

| Gate                            | What                                                                                                                                                                                                                                                                                                                                          | Where                            | Blocks                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------------------------- |
| Unit                            | Pure logic (steps, reconcile, redaction, mapping, card rules), with providers mocked                                                                                                                                                                                                                                                          | Both repos, CI                   | Merge                               |
| Provider contract               | Each provider module replays recorded fixtures; a nightly run against the sandbox accounts                                                                                                                                                                                                                                                    | Foundation CI                    | Release                             |
| Security                        | Secret scanning; "no token in logs" tests; webhook signature tests; SSRF allow-list tests; dependency audit; Actions pinned to SHAs (already done)                                                                                                                                                                                            | Both repos                       | Merge                               |
| End-to-end                      | The template's existing suite (about 2,000 tests, fake Content Lake, axe); the control plane's own Playwright flows at Stage B                                                                                                                                                                                                                | CI                               | Blueprint approval                  |
| Failure and recovery            | The S4 injection matrix: kill after each create; 429 and 5xx; token revoked; webhook lost                                                                                                                                                                                                                                                     | Foundation, on demand and weekly | Foundation release                  |
| CMS content                     | Schema extract and typegen current (exists); migration dry runs (exists); seed import idempotent; `--missing` re-run is a no-op                                                                                                                                                                                                               | Template CI                      | Blueprint approval                  |
| Accessibility                   | axe on every section gallery entry (exists); WCAG 2.2 AA on the control plane; keyboard paths                                                                                                                                                                                                                                                 | CI                               | Merge                               |
| Rich results and schema         | JSON-LD parses; required IDs; `@id` unique across the sitemap; visible-content match; type choice matches `businessInfo`                                                                                                                                                                                                                      | Template CI, `launch:check`      | Blueprint approval, launch          |
| Real HTTP preview               | The marker, `site-info` SHA and version, metadata, JSON-LD, `/studio`, CORS, privacy, `launch:check --json`                                                                                                                                                                                                                                   | The verifier, every launch       | Reporting "verified"                |
| Mobile install                  | Emulator install plus Maestro marker test; a physical device confirmed by a named tester                                                                                                                                                                                                                                                      | Mobile CI plus a human           | Reporting "mobile preview verified" |
| **Client publishing** (revised) | <ul><li>**Now:** 205's completeness test (every field classified); 206's e2e (an agency publish of a client-modified draft shows the protected-change dialog; Contributors have no Publish button).</li><li>**When the gate is built:** policy unit tests, race tests (a stale revision is refused) and a suspended-author refusal.</li></ul> | Template CI                      | Merge                               |
| **Plan safety** (new)           | `health.yml` runs `check:dataset` daily. `launch:check` fails if enquiry storage is on while the dataset is public                                                                                                                                                                                                                            | Each client repo                 | An alert, as a GitHub issue         |
| **Content contract v2** (new)   | Migration dry runs; JSON-LD visible-content tests for `service` and `location`; template e2e                                                                                                                                                                                                                                                  | Template CI                      | Blueprint approval                  |

---

## Appendix D — Open questions and confidence (revision 2)

**Questions, ordered by how much each answer would change the plan:**

1. **Availability.** How many sessions a week can you usually manage, and how long is a typical session? This turns §12's estimates into dates.
2. **The active client project:**
   - What is its Sanity plan: paid Growth, a trial, or Free?
   - Is the link page live?
   - When will the full site's content be ready?
3. **Client publishing.** Are you comfortable with clients starting as Contributors, with Currawong publishing their drafts from the review list? Self-publishing would then be offered later, through the hardened gate.
4. **The content model.** Which entities do your typical clients need: services, multiple locations, team, articles, events? This scopes content contract v2.
5. **Search data.** Is there a live property with Search Console data (Currawong's own site, or another) that could be used to build Search Health before the client site has 28 days of data?

**Confidence**

| Area                            | Confidence                            | Why                                                                                                 |
| ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Repository facts                | High                                  | Read directly; tests run                                                                            |
| Sanity plan and downgrade risk  | **High**                              | Sanity's own docs                                                                                   |
| Feasibility of the publish gate | Medium                                | Built from documented roles and an existing write token. The Studio action and UX are untested (E1) |
| Cloudflare for this starter     | Medium on the facts, low on viability | The blockers are precise, from a local test. The render hang is unexplained                         |
| Sanity delegated provisioning   | Low                                   | No documented OAuth. Project creation by an organisation robot is unconfirmed                       |
| Effort estimates in sessions    | Low to medium                         | No timed baseline yet (E4)                                                                          |
| Apple and Google manual steps   | Medium                                | As in revision 1                                                                                    |

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

**Added in revision 2** (read on 25 October 2026)

- OpenNext issue #1400 (proxy bundling fails when `@opentelemetry/api` is installed) `[Doc]`: https://github.com/opennextjs/opennextjs-cloudflare/issues/1400
- OpenNext PR #1309 (Node.js middleware, which is what `proxy.ts` compiles to; merged 25 Aug 2026) `[Doc]`: https://github.com/opennextjs/opennextjs-cloudflare/pull/1309
- npm registry: `@opennextjs/cloudflare` release history, latest 1.20.13 on 21 Oct 2026, peer `next >=16.4.1` `[Doc: npm view]`: https://www.npmjs.com/package/@opennextjs/cloudflare
- Cloudflare's Next.js guide (updated 25 Aug 2026; recommends vinext, "Middleware and proxy routes: Supported") `[Doc]`: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- Sanity: the Growth plan trial (private datasets become public when a trial ends) `[Doc]`: https://www.sanity.io/docs/platform-management/growth-plan-trial
- Sanity: plans and payments (downgrades, failed payments, "archive it instead") `[Doc]`: https://www.sanity.io/docs/platform-management/plans-and-payments
- Sanity: roles, and roles and permissions (built-in roles apply to every dataset; custom roles scope datasets) `[Search]`: https://www.sanity.io/docs/user-guides/roles · https://www.sanity.io/docs/content-lake/roles-concepts
- The local Cloudflare spike (this session; not committed):
  - an isolated copy of `297110d` with OpenNext 1.20.13 and Wrangler 4.152.0;
  - the build log showing the #1400 failure, and the build log with the patch applied;
  - `wrangler deploy --dry-run` sizes, with and without `--minify`;
  - `wrangler dev --local` route results.

**Added in revision 3** (read on 25 October 2026)

- Sanity's roles user guide: Contributor "can write but not publish", with drafts-only access to all datasets `[Doc]`: https://www.sanity.io/docs/user-guides/roles
- The Sanity client reference for `PublishAction`, which has `ifDraftRevisionId` and `ifPublishedRevisionId` for optimistic locking `[Search: reference snippet]`: https://reference.sanity.io/_sanity/client/PublishAction. The HTTP Actions reference `[Search]`: https://www.sanity.io/docs/http-reference/actions
- The Sanity History API (transactions report author user IDs; history retention is 90 days on Growth) `[Search]`: https://www.sanity.io/docs/http-reference/history
