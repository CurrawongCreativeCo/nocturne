# Nocturne Roadmap Proposal

**Status:** proposal, 25 October 2026. It is the short handoff for [NOCTURNE_INTEGRATED_MASTER_PLAN.md](./NOCTURNE_INTEGRATED_MASTER_PLAN.md).

**Not yet in the canonical plan.** Nothing here has been added to the _Currawong Build Plan_ artifact (version 18, 186 tasks). Each item waits for the approvals below.

**Numbering.** New task numbers start at **187**, the plan's next free number. Existing IDs, statuses and notes stay as they are.

## How to use this

1. Approve, change or reject each item in **Approvals** below.
2. Approved items are added to the plan artifact as a new stage, **"F · Foundation (evidence-gated)"**, placed after "Now". Each gets a prompt written against the repository, in the same format as the other cards.
3. The work runs in gate order: G1 at day 14, G2 at day 45, G3 at day 90 (master plan §12.4). An item is never started before its gate.

## Approvals

| #   | Approve                                                                                                                                    | Unlocks                                  | Cost or risk            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------- |
| A1  | Run the spikes S0, S2, S4, S5 and S6 on scratch or own accounts                                                                            | Tasks 128 (extended), 190, 191, 198, 199 | A$0 on existing plans   |
| A2  | Run S1, which may need one Growth seat for a month                                                                                         | 189                                      | About US$15–30          |
| A3  | Create the private `nocturne-foundation` repo, a scratch GitHub organisation and a scratch Vercel team                                     | 190–197                                  | Low                     |
| A4  | Pause new design-feature starts until M1                                                                                                   | Time for delivery                        | Delays P1 and P2 polish |
| A5  | Add stage F to the canonical plan (additive, using the version 18 build method)                                                            | Tracking                                 | None                    |
| A6  | Accept that agency-only design fields are enforced by Studio only                                                                          | The design contract                      | Recoverable edits       |
| A7  | Sequencing: CLI before hosted; Vercel only in the MVP; mobile gated; keep the template repo and add a Foundation repo; two ownership modes | All of the above                         | Master plan §2.6        |

## Stage F0 — Evidence (days 1–14, gate G1)

| ID               | Task                                                      | Where             | Size    | Depends on    | Done when                                                                                                                                                                                                                                                                                               |
| ---------------- | --------------------------------------------------------- | ----------------- | ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **128** (extend) | **S0**: a timed baseline of the existing launch rehearsal | Manual            | 2 h     | 117, 118, 119 | Wall-clock, hands-on, clicks and failures for every checklist step are recorded in the run notes                                                                                                                                                                                                        |
| **189**          | **S1**: Sanity authorisation and Blueprints               | Spike             | Small   | A2            | <ul><li>A findings doc covering whether an organisation robot can create a project, a private dataset, CORS origins and robots.</li><li>Whether Blueprints apply CORS, webhooks and robots.</li><li>The Marketplace transfer and offboarding facts.</li><li>The customer's unavoidable steps.</li></ul> |
| **190**          | **S2**: a scripted Vercel launch with verification        | Spike, Foundation | Medium  | A1, A3        | <ul><li>Two clean runs from template `v1.8.0` reach **verified** (marker over real HTTP, `launch:check --json` clean).</li><li>Timings are recorded.</li><li>No secrets appear in the logs.</li></ul>                                                                                                   |
| **191**          | **S4**: failure injection and resume                      | Spike, Foundation | Small   | 190           | Every kill point resumes with 0 duplicates and 0 orphaned tokens. "Undo" removes only this run's resources.                                                                                                                                                                                             |
| **198**          | **S5**: the design and content contract run               | Template          | Small   | 190           | <ul><li>A Brand colours change updates every section, and contrast stays ≥ 4.5:1 including glass.</li><li>A client-role Presentation edit publishes.</li><li>The `supportingMedia` gap is confirmed.</li><li>A contract test is drafted (master plan §9.2).</li></ul>                                   |
| **199**          | **S6**: SEO contract tests and the Search Console mapping | Template, Spike   | Medium  | A1            | <ul><li>JSON-LD visible-content and `@id` uniqueness tests pass on the fixtures.</li><li>A read-only 28-day import from Currawong's own property maps ≥ 95% of URLs with clicks; the unmatched ones are listed.</li></ul>                                                                               |
| **200**          | **S3**: a local Cloudflare portability check              | Spike             | Small   | None          | A matrix of what works and what degrades on current OpenNext. Worker size measured. **No paid deploy without approval.**                                                                                                                                                                                |
| **201**          | **S7**: an Expo Android internal APK (optional)           | Spike             | Small   | None          | An APK from an Expo SDK 58 starter on the Free plan is installed on an emulator and a phone, showing the marker. Timings recorded.                                                                                                                                                                      |
| **202**          | **S8**: agency interviews and the value comparison        | Manual            | Ongoing | None          | At least 5 interviews by day 14 and at least 10 by day 90, scored against the master plan's §10.6 thresholds. The checklist and S2 timings are compared.                                                                                                                                                |

## Stage F1 — Launcher, Foundation 0.2–0.3 (days 15–45, gate G2)

| ID      | Task                                                                                                                                                                                                                      | Where              | Size   | Depends on | Done when                                                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **187** | `blueprint.json` written by `scripts/release.mjs`, validated by `check:version`                                                                                                                                           | Template           | Small  | G1         | The tag, SHA, required env (scope and whether secret), seed profiles and verification spec are generated and tested. CHANGELOG entry. |
| **188** | The verification marker: `siteIdentity.verificationMarker`, a server-rendered `<meta name="nocturne:marker">`, the seed, and `launch:check --expect-marker`                                                               | Template           | Small  | G1         | Unit, e2e and launch-check fixture tests. The home page JavaScript size is unchanged.                                                 |
| **192** | The `nocturne-foundation` scaffold and ledger (Drizzle: runs, steps, resources, timings, audit; `org_id` on every row)                                                                                                    | Foundation         | Medium | G1, A3     | Migrations apply to Neon. Typecheck, lint and tests pass.                                                                             |
| **193** | The step framework: idempotency keys, write-ahead intent, reconcile-before-create, retries, timeouts, a redacting logger, timing capture                                                                                  | Foundation         | Medium | 192        | Unit tests, including "no token in logs" and the injection hooks.                                                                     |
| **194** | Provider modules: `sanity` (CLI session, wizard logic), `github` (empty repo, then template history to the tag, then a config commit; variables, secrets, rules), `vercel` (project and env before the push; wait by SHA) | Foundation         | Large  | 193, 187   | Recorded-fixture contract tests, plus one sandbox run.                                                                                |
| **195** | The verifier: the marker, `site-info`, metadata, JSON-LD and Studio checks, plus `launch:check --json` run from the clone                                                                                                 | Foundation         | Medium | 188, 193   | Fixture tests. A run is reported `verified` only when every required check passes.                                                    |
| **196** | `nocturne launch` with a local browser wizard and run timeline; `resume`, `status`, `verify`, `detach`                                                                                                                    | Foundation         | Medium | 194, 195   | Five consecutive rehearsal launches verified. The S4 matrix passes.                                                                   |
| **197** | Runbooks and **the first real client launch through Foundation (MF2)**                                                                                                                                                    | Manual, Foundation | Medium | 196, 11    | One real client verified, with timings recorded against S0. Launch, recovery and offboarding runbooks are in the Foundation repo.     |

**Merged into F1:** task **42** (provisioning script). Keep 42 as the parent and alias, and add a note pointing to 187–197.

## Later stages: unnumbered until their gate passes

| Stage                               | Content                                                                                                                                                                  | Gate                                               | Existing IDs used                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------- |
| B. Hosted internal (Foundation 1.0) | The `apps/web` control plane, a GitHub App, a Vercel integration, Vercel Workflows (or Inngest after the S4 comparison), the project, run, integration and audit screens | G3                                                 | **37–41, 43, 44** (retargeted), 129, then 130–135 |
| C. Cloudflare (1.1)                 | `deploy-env.ts`, host modules, the Cloudflare profile and its degradations, the OpenNext deploy workflow, the contract suite on Cloudflare previews                      | G2 plus the Cloudflare gate (master plan §4.2 a–e) | 61 (as an option)                                 |
| D. Mobile beta (2.0)                | The `mobile-expo` blueprint repo, Android path, iOS TestFlight path, web content API, deep-link files                                                                    | G2 plus the mobile gate                            | None                                              |
| E. Content Intelligence             | The Search Console importer, URL-to-document mapping, opportunity cards, change history, the monthly report                                                              | The Search Console gate                            | **52** (merged)                                   |
| F. SaaS validation                  | A design-partner pilot. Billing stays deferred                                                                                                                           | The SaaS gate                                      | 45–48 (deferred)                                  |

## Existing tasks: what this proposal asks to change

- **Prioritise:** 124, 125, 128, 11, 30, 31, 32, 63 and 64. These are the client and launch lanes.
- **Merge, keeping the IDs:** 42 into F1, and 52 into Stage E.
- **Retarget, keeping the IDs:** 37–41, 43 and 44 move to Stage B ("Foundation (hosted)", with `currawong-ops` renamed to `nocturne-foundation/apps/web`).
- **Pause new starts until M1** (approval A4): 137, 139, 146–148, 151, 156–159, 177, 185, 7, 86, 87, 98 and 108. Exceptions: blockers, and anything a signed client needs. Finish 167; keep 168 and 173.
- **Unchanged:** everything else.
- **Nothing is archived, deleted or renumbered.**

## Milestones

| Milestone | Meaning                                                                     | Status   |
| --------- | --------------------------------------------------------------------------- | -------- |
| M0        | The active client's link page is live on the client's own domain (task 124) | Existing |
| M1        | The first full site is live, with a branded CMS (after task 32)             | Existing |
| MF1       | The first verified scripted launch, a rehearsal (190, G1)                   | New      |
| MF2       | The first real client launched through Foundation (197, G2)                 | New      |
| MF3       | The G3 decision on a hosted control plane (day 90)                          | New      |
