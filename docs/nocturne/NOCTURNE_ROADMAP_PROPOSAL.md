# Nocturne Roadmap and Task Proposal — Revision 3 (Document C)

**Status:** a proposal, dated 25 October 2026. It replaces revision 2's proposal, which is archived unchanged at `history/2026-10-25-r2-NOCTURNE_ROADMAP_PROPOSAL.md`. Revision 1 is also kept there.

**Related documents:**

- [Integration review](./NOCTURNE_R3_INTEGRATION_REVIEW.md) (Document A);
- [Master plan](./NOCTURNE_INTEGRATED_MASTER_PLAN.md) (Document B, revision 3);
- [Next sessions](./NOCTURNE_NEXT_SESSIONS.md) (Document D).

**The canonical _Currawong Build Plan_ is unchanged.**

- The records in Appendix 1 follow its exact schema and have been validated.
- Prompts are written only after you approve.

**Units and markers**

- **Session:** one focused block of about 2–3 hours.
- **✓** means the task directly improves delivery of a real client project.
- **Priorities:**
  - **P0:** now (Phase 0);
  - **P1:** Phases 1–2;
  - **P2:** Phases 3–4;
  - **P3:** later phases and experiments.

---

## 1. Approvals this proposal needs

| #     | Approve                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R3-A1 | **Interim client publishing:** clients become **Contributors** (Sanity blocks them from publishing), and Currawong publishes their drafts, supported by tasks 205 and 206                  |
| R3-A2 | **The hardened self-service gate** (tasks 190, 196 and 214), built **only when a client needs to publish themselves**. It replaces revision 2's gate                                       |
| R3-A3 | **New tasks 205 and 206**, plus the **task splits** that create IDs 207–214                                                                                                                |
| R3-A4 | **Changes to existing canonical tasks** 11, 31, 32, 64, 77, 128 and 180 (§4)                                                                                                               |
| R3-A5 | **Two new canonical stages, `f` and `fx`.** Also: rename the Ops context to `nocturne-foundation` and describe the local-first approach; fix the JS-budget wording in the template context |
| R3-A6 | **Creating the `nocturne-foundation` repository**, asked for again when Phase 3 starts (task 199)                                                                                          |

---

## 2. Milestones

| Milestone               | Meaning                                                                                                                         | Tasks                        | ✓                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------- |
| M0 (existing)           | The active client's link page is live on the client's own domain                                                                | 124                          | ✓                          |
| **MV**                  | Every launch is verified: marker, JSON-LD tests, daily health checks                                                            | 187, 188, 189                | ✓                          |
| **MP** (new)            | Client publishing is safe: Contributor role, classification registry, agency review                                             | 205, 206                     | ✓                          |
| M1 (existing, extended) | The first full site is live, **verified with the marker**                                                                       | 125, 32 (plus 198)           | ✓                          |
| **MC**                  | Content contract v2 (services, locations) and SEO structure checks                                                              | 191, 192, 212, 195           | ✓ when the site needs them |
| **MD**                  | The Design Engine essentials are done                                                                                           | 167, 168, 173, 193, 213, 194 | ✓                          |
| **MF1**                 | Two verified scripted launches, failure injection included; runbook published                                                   | 198, 199, 211, 200           |                            |
| **MN**                  | Foundation app version 0 sets up a site end to end, in the browser                                                              | 201, 207, 208, 209           |                            |
| Later                   | Search Health (202, 210); site recipes (197); Cloudflare (203); mobile (204); the self-service gate (190, 196, 214) when needed | Various                      |                            |

---

## 3. Recommended execution order

| Phase                             | Tasks, in order                                                                                                                       | Notes                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **0. Ready** (about 6–9 sessions) | E3 plan safety (folded into tasks 11 and 31) → 187 → 188 → 189 → 128 (E4, timed) → 205 → 206 → 191                                    | ✓ all of them                     |
| **1. The real site**              | 124 → 12, 13, 14, 22 → 30 → 31 → 125 → 32 → 198                                                                                       | ✓. Keep a friction log throughout |
| **2. Fixes from real use**        | 192 → 212 (if the site needs them); 167 → 168 → 194; 193 → 213; 195; 173. **Only if a client needs self-publishing:** 190 → 196 → 214 | ✓ where the site needs it         |
| **3. Repeatable provisioning**    | 199 (**repo approval**) → 211 → 200                                                                                                   |                                   |
| **4. Foundation app, version 0**  | 201 → 207 → 208 → 209                                                                                                                 |                                   |
| **5. Search Health**              | 202 → 210                                                                                                                             | Needs 28 days of data             |
| **6. Design Engine at scale**     | 197; further section families; the AI design-reference experiment                                                                     |                                   |
| **7. Experiments**                | 203 (Cloudflare); 204 (mobile, with a use case); hosting Foundation (37–41 retargeted)                                                |                                   |

**Running several at once.** Keep one platform task in progress at a time, alongside client work.

**Can a task run on its own?** "Independent: yes" means it can be built, tested and merged by itself, on its own branch.

---

## 4. Changes to existing canonical tasks

All of these add to the existing task. None replaces it. IDs, statuses and notes are kept.

| Task                                             | Change                                                                                                                                                                                         | Why                          |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **11** Create the client project                 | Add to the checklist: **paid Growth before real content** (no trial); dataset private (`npm run check:dataset`); invite the client as a **Contributor**; record the plan state in the register | Plan safety; safe publishing |
| **31** Pre-launch QA                             | Add: the marker check (`launch:check --expect-marker`), `health.yml` enabled, the JSON-LD tests from 188 passing, `ENQUIRIES_STORE` consistent with dataset privacy                            | Verification                 |
| **32** Go live and hand over                     | Client role is **Contributor**; explain the "Waiting for review" routine; plan-safety rules in the handover notes                                                                              | Safe publishing              |
| **64** Basic client agreement                    | Add: who owns what, transfer at exit, and how publishing works (Contributor drafts are reviewed and published by Currawong; self-publishing is offered later)                                  | Ownership and expectations   |
| **77** Studio usability test                     | Add a Contributor-publishing scenario and one "no live instructions" run                                                                                                                       | Measures MP and MD           |
| **128** Launch rehearsal                         | Add timing capture (E4): wall-clock, hands-on time, clicks and failures per step. Once 187 is merged, add the marker check                                                                     | Baseline                     |
| **180** Spike: e2e specs for one browser project | Run it in the first maintenance session                                                                                                                                                        | CI time hurts part-time work |

---

## 5. Proposed tasks: specifications

**Common to every task:**

- The **definition of done** includes `npm run check` (and `npm run test:e2e` where routes or rendering change) passing, the README updated, and a CHANGELOG "Unreleased" entry for template work.
- Each session ends with a **resume note** in the task's notes.

### Phase 0 — Ready (P0)

**187 · Verification marker in the site shell**

|                 |                                     |
| --------------- | ----------------------------------- |
| Area            | Foundation and Content Intelligence |
| Priority        | P0                                  |
| Effort          | 1–2 sessions                        |
| Client delivery | ✓                                   |
| Independent     | Yes                                 |

- **Problem.** A deployment ID or a build log isn't proof that CMS content renders.
- **Scope:**
  - `siteIdentity.verificationMarker`, a string that is agency-only through task 205's registry, or hidden from clients until 205 lands;
  - the site shell renders `<meta name="nocturne:marker" content>` when the field is set;
  - the seed sets a marker;
  - `launch:check --expect-marker=<value>`.
- **Expected behaviour:**
  - the marker is on every page, including the pre-launch link page;
  - nothing is rendered when it's unset;
  - no client-side JavaScript.
- **Acceptance:**
  - unit tests for the render;
  - an e2e fixture shows the meta tag in both live and pre-launch modes;
  - launch-check fixture tests for a pass and a fail;
  - the home page JS size is unchanged (performance spec).
- **Depends on:** none.
- **Files:** `src/features/site/schemas/site-identity.ts`, `src/app/(site)/site-shell.tsx`, `scripts/setup/seed.mjs`, `scripts/launch-check/html.mjs` and `scripts/launch-check.mjs`, `tests/e2e/fixtures/dataset.mjs`.
- **Done when:** merged, with the README "Launch check" section updated.

**188 · JSON-LD visible-content and `@id` tests**

|                 |                      |
| --------------- | -------------------- |
| Area            | Content Intelligence |
| Priority        | P0                   |
| Effort          | 1 session            |
| Client delivery | ✓                    |
| Independent     | Yes                  |

- **Problem.** Nothing proves the structured data describes visible content.
- **Scope.** e2e and unit tests asserting that:
  - every JSON-LD name, address, opening-hours entry and FAQ question or answer appears in the visible text, after normalising;
  - `@id`s are unique across the sitemap fixtures;
  - every `WebPage` references `#website` and `#organization`.
- **Expected behaviour:** a failing test names the page and the property.
- **Acceptance:** the tests pass on every fixture page, and deliberately broken fixtures fail.
- **Depends on:** none.
- **Files:** `src/features/site/components/site-json-ld.tsx`, `src/features/site/utils/business-json-ld.ts`, `tests/e2e/`.
- **Done when:** merged and documented in the README's SEO notes.

**189 · Daily health workflow**

|                 |                |
| --------------- | -------------- |
| Area            | Foundation     |
| Priority        | P0             |
| Effort          | 1 session      |
| Client delivery | ✓              |
| Independent     | Yes, after 187 |

- **Problem.** A plan downgrade or a broken deploy would go unnoticed.
- **Scope:**
  - `.github/workflows/health.yml` runs daily, plus on manual dispatch;
  - it runs `launch:check --json` against the production URL, and `check:dataset`;
  - it **fails when `ENQUIRIES_STORE` is on and the dataset is public**;
  - it opens or updates a single issue on failure.
- **Expected behaviour:**
  - it skips with a notice when secrets are missing, matching the existing workflow pattern;
  - the README notes that GitHub pauses scheduled workflows on repos inactive for 60 days.
- **Acceptance:**
  - a dry run on a fork, with a public test dataset, opens an issue;
  - a green run closes it.
- **Depends on:** 187.
- **Files:** `.github/workflows/health.yml`, `scripts/check-dataset.mjs`, `scripts/launch-check.mjs`.
- **Done when:** merged, and enabled on the active client's repo through task 30.

**205 · Field classification registry (an allowlist)**

|                 |                                        |
| --------------- | -------------------------------------- |
| Area            | Design Engine and Content Intelligence |
| Priority        | P0                                     |
| Effort          | 1–2 sessions                           |
| Client delivery | ✓                                      |
| Independent     | Yes                                    |

- **Problem.**
  - Agency-only fields are a UI denylist today (`hiddenFromClients` used 32 times, plus the `design` group).
  - **New fields default to client-editable.**
- **Scope:**
  - `src/lib/sanity/client-editable.ts` declares, per document type and section type, the fields clients may change;
  - client-mode hiding reads from it;
  - a unit test walks `schema.json` and **fails when a field in a client-editable type is unclassified**.
- **Expected behaviour:** today's client view is unchanged; this is a refactor to a single source.
- **Acceptance:**
  - the completeness test is green;
  - existing client-view e2e passes;
  - adding a field without classifying it fails CI.
- **Depends on:** none.
- **Files:** `src/lib/sanity/roles.ts`, `src/features/studio/utils/document-access.ts`, the section schemas.
- **Done when:** merged, and the README documents how to classify a new field.

**206 · Agency publish review for Contributor drafts**

|                 |                                        |
| --------------- | -------------------------------------- |
| Area            | Content Intelligence and Design Engine |
| Priority        | P0                                     |
| Effort          | 2–3 sessions                           |
| Client delivery | ✓                                      |
| Independent     | Yes, after 205                         |

- **Problem:**
  - with clients as Contributors, an agency publish could unknowingly push a client's protected-field change live;
  - reviewing drafts has no home in Studio.
- **Scope:**
  - **(a)** extend `confirm-publish.tsx` so an agency publish lists the protected-field changes made since the last publish, with their authors from document history, and requires a confirmation;
  - **(b)** an agency-only "Waiting for review" structure list of documents with drafts by Contributors;
  - **(c)** Contributor messaging: "Your changes are saved as a draft and sent to Currawong to publish";
  - **(d)** update the README role tables.
- **Expected behaviour:**
  - publishes with no protected changes behave as today;
  - protected changes need one extra confirmation.
- **Acceptance:**
  - unit tests for the diff, using task 205's registry;
  - e2e as an agency user publishing a fixture draft with a protected change shows the dialog;
  - e2e as a Contributor shows the message and no Publish button.
- **Depends on:** 205.
- **Files:** `src/features/studio/actions/confirm-publish.tsx`, `src/features/studio/utils/structure-access.ts`, `src/features/studio/utils/document-access.ts`, `README.md`.
- **Done when:** merged, and clients can be moved to Contributor (task 11 or 32).

**191 · Content contract v2 design note**

|                 |                      |
| --------------- | -------------------- |
| Area            | Content Intelligence |
| Priority        | P0                   |
| Effort          | 1 session            |
| Client delivery | ✓                    |
| Independent     | Yes                  |

- **Problem.** The full site's content should go in on the final model.
- **Scope.** A note in `docs/` covering:
  - the `service` and `location` entities, their fields and relationships;
  - the JSON-LD mapping and `@id`s;
  - page templates;
  - profile flags;
  - the migration plan;
  - which parts the active client's site needs.
- **Acceptance:** you have approved the note.
- **Depends on:** none.
- **Done when:** approved, and tasks 192 and 212 are scoped from it.

### Phase 1 — The real site (P1)

**198 · Setup and deployment runbook**

|                 |            |
| --------------- | ---------- |
| Area            | Foundation |
| Priority        | P1         |
| Effort          | 1 session  |
| Client delivery | ✓          |
| Independent     | Yes        |

- **Problem.** The process lives in your head and in the README's checklists.
- **Scope.** A runbook from new project to verified preview and launch, with the real timings from task 128 and the launch, and the known traps.
- **Acceptance:** a dry read-through, by you, of the next project's setup.
- **Depends on:** 125.
- **Done when:** linked from the README.

### Phase 2 — Fixes from real use (P1)

**192 · Content contract v2: services**

|                 |                                       |
| --------------- | ------------------------------------- |
| Area            | Content Intelligence                  |
| Priority        | P1                                    |
| Effort          | 2–3 sessions                          |
| Client delivery | ✓ if the site sells distinct services |
| Independent     | Yes, after 191                        |

- **Scope:**
  - a `service` document with a page template and relationships (team members, FAQs);
  - `Service` JSON-LD built only from visible fields;
  - a profile flag, fixtures and tests (188 covers the visible-content rule);
  - `TAGS` updated, plus the webhook filter.
- **Acceptance:** e2e for the service page and its JSON-LD; schema and typegen are current.
- **Depends on:** 191.
- **Files:** a new feature folder, `src/lib/sanity/fragments.ts`, `src/lib/sanity/live.ts` (`TAGS`), `tests/e2e/fixtures/dataset.mjs`.
- **Done when:** in a template release.

**212 · Content contract v2: locations and relationships**

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| Area            | Content Intelligence                              |
| Priority        | P1                                                |
| Effort          | 2–3 sessions                                      |
| Client delivery | ✓ if there are several locations or service areas |
| Independent     | Yes, after 192                                    |

- **Scope:**
  - a `location` document (branch or service area);
  - relationships to services and team members;
  - LocalBusiness branch JSON-LD (`parentOrganization`, stable `@id`s);
  - `areaServed` on services.
- **Acceptance:** e2e and JSON-LD tests; a migration dry run, if any existing `businessInfo` data moves.
- **Depends on:** 192.
- **Files:** `src/features/site/schemas/business-info.ts`, `src/features/site/utils/business-json-ld.ts`.
- **Done when:** in a template release.

**193 · Section contract v2: the split family**

|                 |                |
| --------------- | -------------- |
| Area            | Design Engine  |
| Priority        | P1             |
| Effort          | 2–3 sessions   |
| Client delivery | ✓              |
| Independent     | Yes, after 205 |

- **Scope:**
  - `supportingMedia` (for example a video below the image);
  - named **looks** (layout, surface, motion and hover, resolved from tokens);
  - consistent `actions` (at most 2);
  - a glass legibility rule (a wash or a solid fallback over images);
  - the new fields classified in task 205's registry;
  - a dry-run migration from `mediaText` and `imageSide` options to looks.
- **Acceptance:**
  - visual baselines for each look;
  - a dry-run migration with no data loss;
  - existing pages render the same until a look is changed.
- **Depends on:** 205.
- **Files:** `src/features/pages/schemas/sections/media-text.ts`, `src/features/pages/schemas/sections/image-side.ts`, their components, `migrations/`.
- **Done when:** in a template release.

**213 · Section contract v2: the hero family**

|             |                |
| ----------- | -------------- |
| Area        | Design Engine  |
| Priority    | P1             |
| Effort      | 2–3 sessions   |
| Independent | Yes, after 193 |

- **Scope.** Looks and slot conventions for the hero, keeping its presets and its supporting slot.
- **Acceptance:** visual baselines unchanged for existing presets.
- **Depends on:** 193.
- **Files:** `src/features/pages/schemas/sections/hero.ts`.
- **Done when:** in a template release.

**194 · Theme-adaptation contract test**

|                 |                |
| --------------- | -------------- |
| Area            | Design Engine  |
| Priority        | P1             |
| Effort          | 1–2 sessions   |
| Client delivery | ✓              |
| Independent     | Yes, after 168 |

- **Scope.** A fixture changes Brand colours. The test asserts that every section's resolved variables change, and that text contrast stays at least 4.5:1 on every surface, glass on the accent tone included.
- **Acceptance:** the test fails on a deliberately low-contrast palette.
- **Depends on:** 168.
- **Files:** `src/lib/color/`, `tests/e2e/`.
- **Done when:** merged.

**195 · SEO checks: internal links and orphan pages**

|                 |                      |
| --------------- | -------------------- |
| Area            | Content Intelligence |
| Priority        | P1                   |
| Effort          | 2 sessions           |
| Client delivery | ✓                    |
| Independent     | Yes, after 188       |

- **Scope.** `launch:check` crawls the sitemap and reports:
  - orphan pages;
  - broken internal links;
  - services that no page links to.
- **Acceptance:** fixture-based unit tests; a run on the active client's preview.
- **Depends on:** 188.
- **Files:** `scripts/launch-check/seo.mjs`.
- **Done when:** merged and used in task 31.

**190 · Spike: publish gate security verification** (only when a client needs self-publishing)

|             |                      |
| ----------- | -------------------- |
| Area        | Content Intelligence |
| Priority    | P1 when triggered    |
| Effort      | 2 sessions           |
| Independent | Yes                  |

- **Scope.** On a **scratch** Sanity project, with **no real data**, using a Growth trial or Growth, which needs approval if it costs anything, determine:
  1. what a robot with the **Contributor role** can do through the API: create or update non-draft documents, release versions, assets, deletes;
  2. whether an Actions API publish **with both revision guards** works with the Editor robot;
  3. whether the History API returns transaction authors;
  4. whether an Access API members read works with a robot;
  5. how a prototype Contributor Publish action behaves.
- **Acceptance:** a findings note with a go or no-go for tasks 196 and 214, and the exact robot permissions needed.
- **Depends on:** 205.
- **Done when:** the note is approved.

**196 · Publish gate: server policy and route**

|             |                      |
| ----------- | -------------------- |
| Area        | Content Intelligence |
| Priority    | P1 when triggered    |
| Effort      | 2–3 sessions         |
| Independent | Yes, after 190       |

- **Scope:**
  - **a pure policy:**
    - task 205's allowlist;
    - a new document's protected fields must equal their initial values;
    - deletes, unpublishes and slug changes without a redirect go to review;
    - required fields and slug uniqueness are checked on the server;
  - **`POST /api/publish`:**
    - loads the draft;
    - checks the authors of every transaction since the last publish, and **their current roles**;
    - publishes **exactly the validated revision** through the Actions API, with `ifDraftRevisionId` and `ifPublishedRevisionId`;
    - is rate-limited and writes an audit log line.
- **Acceptance:**
  - unit tests per document type;
  - race tests (the draft changes mid-request, so the publish fails safely);
  - a suspended-author test (refused).
- **Depends on:** 190.
- **Files:** `src/lib/sanity/write-client.ts`, a new `src/app/api/publish/route.ts`, the policy module.
- **Done when:** merged behind a profile flag.

**214 · Publish gate: Studio action and experience**

|                 |                      |
| --------------- | -------------------- |
| Area            | Content Intelligence |
| Priority        | P1 when triggered    |
| Effort          | 2 sessions           |
| Client delivery | ✓ when used          |
| Independent     | Yes, after 196       |

- **Scope:**
  - a Contributor **Publish** action calling the route;
  - refusal reasons shown ("Sent to Currawong for review", naming the fields);
  - the "Waiting for review" list (from 206) shows refused items;
  - README role tables.
- **Acceptance:** e2e tests: an allowed edit publishes; a protected edit goes to review; a stale revision is refused.
- **Depends on:** 196.
- **Done when:** in a template release and offered to a client.

### Phase 3 — Repeatable provisioning (P2)

**199 · Foundation repo and scripted launch to a verified preview**

|             |                        |
| ----------- | ---------------------- |
| Area        | Foundation             |
| Priority    | P2                     |
| Effort      | 3–4 sessions           |
| Independent | Yes, after 125 and 187 |

- **Approval:** **creating the repo needs your approval at this point.**
- **Scope.** Create `nocturne-foundation`, then script these steps on **scratch accounts**:
  1. an empty client repo;
  2. the **template history up to a pinned tag**, plus one configuration commit;
  3. the Sanity project, private dataset, robots, CORS origins and seed, using the CLI session;
  4. the Vercel project **with its environment variables set before the push**;
  5. wait for the deployment by commit;
  6. verify, using the marker, `site-info` and `launch:check --json`.

  This absorbs task 42.

- **Acceptance:** two clean runs reach **verified**, with timings recorded and no secrets in the logs.
- **Depends on:** 125, 187.
- **Done when:** both runs are documented in the repo.

**211 · Provisioning hardening: Sanity authorisation, failure injection, resume**

|             |                |
| ----------- | -------------- |
| Area        | Foundation     |
| Priority    | P2             |
| Effort      | 2–4 sessions   |
| Independent | Yes, after 199 |

- **Scope:**
  - **S1:** can an organisation robot provision Sanity, or does the CLI session stay?
  - **S4:** kill the run after every create step and revoke a token mid-run; resume must leave 0 duplicates and 0 orphaned tokens;
  - "undo" removes only resources this run created.
- **Acceptance:** the injection matrix is all green.
- **Depends on:** 199.
- **Done when:** the matrix is in the repo's tests and docs.

**200 · `blueprint.json` from the release script**

|             |                |
| ----------- | -------------- |
| Area        | Foundation     |
| Priority    | P2             |
| Effort      | 1 session      |
| Independent | Yes, after 199 |

- **Scope.** `scripts/release.mjs` writes `blueprint.json`:
  - the tag and commit;
  - the required environment (scope, and whether each value is secret);
  - seed profiles;
  - the verification spec;
  - `projectTypes`, which keeps mobile possible later.

  `check:version` validates it.

- **Acceptance:** unit tests; the next release includes the file.
- **Depends on:** 199.
- **Files:** `scripts/release.mjs`, `scripts/check-version.mjs`.

### Phase 4 — Foundation app, version 0 (P2)

**201 · Foundation app version 0: core**

|             |                        |
| ----------- | ---------------------- |
| Area        | Foundation             |
| Priority    | P2                     |
| Effort      | 3–4 sessions           |
| Independent | Yes, after 211 and 200 |

- **Scope:**
  - a local Next.js 16 app;
  - **Neon** Postgres through Drizzle, with `org_id` and `actor` on every row;
  - an in-process step runner with resume;
  - the provider modules and verifier from tasks 199 and 211;
  - one `credentials` module (`.env.local`).
- **Acceptance:**
  - migrations apply;
  - a scripted launch runs through the app's runner;
  - after a restart, the run resumes.
- **Depends on:** 211, 200.

**207 · Foundation: projects list and import**

|             |                |
| ----------- | -------------- |
| Area        | Foundation     |
| Priority    | P2             |
| Effort      | 2 sessions     |
| Independent | Yes, after 201 |

- **Scope.** Every project with its links, template version and last verification; imports the client register (task 63).
- **Acceptance:** existing sites are imported; links open.
- **Depends on:** 201.

**208 · Foundation: new-site wizard and run timeline**

|             |                |
| ----------- | -------------- |
| Area        | Foundation     |
| Priority    | P2             |
| Effort      | 3 sessions     |
| Independent | Yes, after 201 |

- **Scope:**
  - a five-field wizard for Vercel;
  - a live timeline with blocked reasons, resume, and undo of resources this run created.
- **Acceptance:** a rehearsal launch from the browser reaches **verified**.
- **Depends on:** 201.

**209 · Foundation: verification and health views**

|             |                        |
| ----------- | ---------------------- |
| Area        | Foundation             |
| Priority    | P2                     |
| Effort      | 2 sessions             |
| Independent | Yes, after 201 and 189 |

- **Scope.** Verification and health results per project (the same functions as `launch:check` and `health.yml`), with a **Run checks** button.
- **Acceptance:** results match the CLI output for the same site.
- **Depends on:** 201, 189.

### Phases 5–7 — Later (P3)

**202 · Search Console import and URL mapping**

|            |                                           |
| ---------- | ----------------------------------------- |
| Area       | Content Intelligence                      |
| Effort     | 3–4 sessions                              |
| Depends on | 201, and a live site with 28 days of data |

- **Scope:**
  - service-account access;
  - 28-day windows of `final` data, paged up to 25,000 rows, with truncation flagged;
  - URLs mapped to Sanity documents, unmatched URLs listed.

**210 · Search Health: opportunity cards and change history**

|            |                      |
| ---------- | -------------------- |
| Area       | Content Intelligence |
| Effort     | 3–5 sessions         |
| Depends on | 202                  |

- **Scope:**
  - deterministic cards with evidence and caveats;
  - "Open in Studio" to make a draft;
  - before-and-after tracking by revision;
  - **no scores, and no automatic publishing.**
- **Merges task 52.**

**197 · Site recipes**

|            |                                        |
| ---------- | -------------------------------------- |
| Area       | Design Engine and Content Intelligence |
| Effort     | 3–5 sessions                           |
| Depends on | 192, 212                               |

- **Scope.** Seed profiles that create a whole site structure for a business type (pages, sections, content types, navigation).

**203 · Cloudflare experiment**

|            |                       |
| ---------- | --------------------- |
| Area       | Foundation            |
| Effort     | 3–6 sessions in total |
| Depends on | 125                   |

- **Scope.** C-1 to C-4, each 1–2 sessions and each resumable:
  - C-1: the #1400 patch, through `patch-package` or the upstream fix;
  - C-2: cache bindings, so pages render;
  - C-3: `next/og`, Studio, the proxy gate, Auth.js and Sentry;
  - C-4: one **approved** Workers Paid deploy (US$5 a month) running the verification suite.

**204 · Mobile proof**

|            |                 |
| ---------- | --------------- |
| Area       | Foundation      |
| Effort     | 1–2 sessions    |
| Depends on | a real use case |

- **Scope.** An Expo SDK 58 starter builds an Android internal APK on the free plan. It is installed on an emulator and a phone, and shows the content marker.

---

## 6. Superseded, merged and duplicated

| Item                                               | Disposition                    | Traceable to                                                                     |
| -------------------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------- |
| Canonical 42 (provisioning script)                 | Merged                         | 199, 211 (42 kept as an alias)                                                   |
| Canonical 52 (monthly report)                      | Merged                         | 202, 210                                                                         |
| Canonical 39 and 40 (provider status, health)      | Partly covered locally         | 189, 209. 39 and 40 centralise this at the hosted stage                          |
| Canonical 37 and 38 (Ops scaffold, clients)        | Retargeted to the hosted stage | 201, 207 cover the local need                                                    |
| Revision 2's proposed 190 (E1 in Phase 0)          | Re-scoped, moved to Phase 2    | 190 (security verification)                                                      |
| Revision 2's proposed 192, 193, 196, 199, 201, 202 | Split                          | 192 and 212; 193 and 213; 196 and 214; 199 and 211; 201 and 207–209; 202 and 210 |
| Revision 2's B.8 `AGENCY_ONLY` denylist            | Superseded                     | 205 (allowlist)                                                                  |
| Revision 1's proposed 187–202                      | Already mapped in revision 2   | `history/`                                                                       |

## Appendix 1 — Proposed canonical records (validated, not applied)

These records follow the canonical page's `STAGES` and `TASKS` schema exactly. A validation script checked them against the live plan's data (version `1792820552-7bbf`). It confirmed:

- **IDs:** 187–214 are contiguous, and none reuses one of the 186 canonical IDs. The next free ID after this proposal is 215.
- **Values:** every `w`, `ctx` and `size` value is one the canonical plan already uses.
- **Stages:** every stage reference resolves; the new `f` and `fx` stages carry exactly the canonical stage fields.
- **Dependencies:** none dangling, and no cycles.

**Result: VALID.** Each record still needs its own prompt (`p-187` to `p-214`). Those are written when you approve, using the version 18 build method: strip the platform wrapper, assert each replacement matches once, run `node --check` on the data script, then a headless render check.

```json
{
  "stages": [
    {
      "id": "f",
      "n": "F",
      "ws": "Website building",
      "title": "Verified foundations (real-project-led)",
      "where": "Template repo and client site",
      "desc": "Verification, privacy and safe client publishing first, then the content and design contracts the real site needs. Each task fits in 1–3 sessions of about 2–3 hours.",
      "milestone": "MV: every launch verified (marker, health checks). MC: content contract v2 and safe publishing. MD: Design Engine necessities done."
    },
    {
      "id": "fx",
      "n": "F",
      "ws": "Agency platform",
      "title": "Nocturne Foundation app (local first, hosted later)",
      "where": "nocturne-foundation repo (created in Phase 3, with approval)",
      "desc": "Proven provisioning first (scripted, verified, resumable), then one Next.js app that runs it from the browser on your machine. Hosting comes later, when there is a reason.",
      "milestone": "MF1: two verified scripted launches with failure injection. MN: Foundation app version 0 sets up a site end to end."
    }
  ],
  "tasks": [
    {
      "n": 187,
      "s": "f",
      "first": true,
      "t": "Verification marker in the site shell",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "An agency-only siteIdentity.verificationMarker rendered as <meta name=\"nocturne:marker\"> on every page, seeded by the wizard and checked by launch:check --expect-marker.",
      "why": "\"Deployed\" is not proof that CMS content renders; a unique marker proves CMS → query → render on real HTTP.",
      "files": [
        "src/features/site/schemas/site-identity.ts",
        "src/app/(site)/site-shell.tsx",
        "scripts/setup/seed.mjs",
        "scripts/launch-check/html.mjs"
      ],
      "deps": []
    },
    {
      "n": 188,
      "s": "f",
      "first": true,
      "t": "JSON-LD visible-content and @id tests",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "Tests that every JSON-LD string appears in visible page text, @ids are unique across the sitemap, and every WebPage links #website and #organization.",
      "why": "Structured data must describe visible content; today nothing proves it.",
      "files": [
        "src/features/site/components/site-json-ld.tsx",
        "src/features/site/utils/business-json-ld.ts",
        "tests/e2e"
      ],
      "deps": []
    },
    {
      "n": 189,
      "s": "f",
      "first": true,
      "t": "Daily health workflow (launch check and dataset privacy)",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "A scheduled health.yml runs launch:check --json and check:dataset against production daily and opens or updates a GitHub issue on failure, including enquiry storage on a public dataset.",
      "why": "A plan downgrade makes private datasets public; nothing would notice today.",
      "files": [
        ".github/workflows/health.yml",
        "scripts/check-dataset.mjs",
        "scripts/launch-check.mjs"
      ],
      "deps": [187]
    },
    {
      "n": 205,
      "s": "f",
      "first": true,
      "t": "Field classification registry (client-editable allowlist)",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "One registry of client-editable fields per document and section type, used by client-mode hiding, the agency publish review and any future publish gate, with a CI test that fails when a field is unclassified.",
      "why": "Agency-only marking is a UI denylist today; a new field would be client-editable by default.",
      "files": [
        "src/lib/sanity/roles.ts",
        "src/features/studio/utils/document-access.ts",
        "src/features/pages/schemas/sections"
      ],
      "deps": []
    },
    {
      "n": 206,
      "s": "f",
      "first": true,
      "t": "Agency publish review for Contributor drafts",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "Agency Publish lists protected-field changes since the last publish with their authors and asks for confirmation; an agency-only \"Waiting for review\" list; Contributors see that their changes go to Currawong.",
      "why": "Clients become Contributors (Sanity blocks their publishing); agency publishing must not leak protected changes and review must be easy.",
      "files": [
        "src/features/studio/actions/confirm-publish.tsx",
        "src/features/studio/utils/structure-access.ts",
        "src/features/studio/utils/document-access.ts",
        "README.md"
      ],
      "deps": [205]
    },
    {
      "n": 191,
      "s": "f",
      "first": true,
      "t": "Content contract v2 design note",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "A short decision note: service and location entities, relationships, JSON-LD mapping, page templates, profile flags and a migration plan.",
      "why": "The full site's content should go in on the final model, not be migrated later.",
      "files": ["docs/"],
      "deps": []
    },
    {
      "n": 192,
      "s": "f",
      "first": false,
      "t": "Content contract v2: services",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A service document type with page template, relationships to team members and FAQs, Service JSON-LD from visible fields, fixtures and tests, behind a profile flag.",
      "why": "Services are core to most client businesses and to truthful structured data.",
      "files": ["src/features", "src/lib/sanity/fragments.ts", "tests/e2e/fixtures/dataset.mjs"],
      "deps": [191]
    },
    {
      "n": 212,
      "s": "f",
      "first": false,
      "t": "Content contract v2: locations and relationships",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A location document type (branches or service areas) related to services and team members, LocalBusiness branch JSON-LD with stable @ids, fixtures and tests.",
      "why": "Multi-location businesses and area-served data need first-class entities.",
      "files": [
        "src/features/site/schemas/business-info.ts",
        "src/features/site/utils/business-json-ld.ts"
      ],
      "deps": [192]
    },
    {
      "n": 193,
      "s": "f",
      "first": false,
      "t": "Section contract v2: split family",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "The split section gains supportingMedia (for example a video below the image), named looks, consistent actions and a glass legibility rule, with a dry-run migration and visual tests.",
      "why": "Adding a button or video to an existing layout should not need code.",
      "files": [
        "src/features/pages/schemas/sections/media-text.ts",
        "src/features/pages/schemas/sections/image-side.ts",
        "migrations/"
      ],
      "deps": [205]
    },
    {
      "n": 213,
      "s": "f",
      "first": false,
      "t": "Section contract v2: hero family",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "The hero adopts the same looks and slot conventions as the split family, keeping its presets and supporting slot.",
      "why": "One grammar across families keeps the Design Engine learnable.",
      "files": ["src/features/pages/schemas/sections/hero.ts"],
      "deps": [193]
    },
    {
      "n": 194,
      "s": "f",
      "first": false,
      "t": "Theme-adaptation contract test",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "A test that a global Brand colours change updates every section and keeps text contrast of at least 4.5:1 on every surface, glass included.",
      "why": "Global colour changes must adapt dependent sections intelligently.",
      "files": ["src/lib/color", "tests/e2e"],
      "deps": [168]
    },
    {
      "n": 195,
      "s": "f",
      "first": false,
      "t": "SEO checks: internal links and orphan pages",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "launch:check crawls the sitemap and reports orphan pages, broken internal links and services no page links to.",
      "why": "Search-friendly structure needs deterministic checks.",
      "files": ["scripts/launch-check/seo.mjs"],
      "deps": [188]
    },
    {
      "n": 190,
      "s": "f",
      "first": false,
      "t": "Spike: publish gate security verification",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "On a scratch Sanity project with no real data: probe what a Contributor-role robot can do by API, Actions API publish with revision guards, History API authors and Access API role reads, and a prototype Contributor Publish action.",
      "why": "The self-service gate must be proven safe before it is built.",
      "files": ["docs/"],
      "deps": [205]
    },
    {
      "n": 196,
      "s": "f",
      "first": false,
      "t": "Publish gate: server policy and route",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A pure policy (allowlist from task 205) and POST /api/publish that checks authors and their current roles, publishes the exact validated revision through the Actions API with both revision guards, rate-limits and audit-logs.",
      "why": "Lets clients publish allowed changes themselves without trusting the Studio UI.",
      "files": ["src/lib/sanity/write-client.ts", "src/app/api"],
      "deps": [190]
    },
    {
      "n": 214,
      "s": "f",
      "first": false,
      "t": "Publish gate: Studio action and experience",
      "w": "Template",
      "ctx": "template",
      "size": "Medium",
      "what": "A Contributor Publish action calling the route, clear refusal reasons (\"Sent to Currawong for review\"), README role tables and end-to-end tests.",
      "why": "Client publishing should feel normal while staying enforced.",
      "files": ["src/features/studio/actions", "README.md"],
      "deps": [196]
    },
    {
      "n": 198,
      "s": "f",
      "first": false,
      "t": "Setup and deployment runbook from the real launch",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "A runbook from new project to verified preview and launch, written from the real launch and its timings.",
      "why": "A repeatable, documented process is a 90-day success criterion.",
      "files": ["README.md", "docs/"],
      "deps": [125]
    },
    {
      "n": 199,
      "s": "fx",
      "first": false,
      "t": "Foundation repo and scripted launch to a verified preview",
      "w": "Ops",
      "ctx": "ops",
      "size": "Large",
      "what": "Create nocturne-foundation (with approval) and script: empty repo plus template history to a pinned tag plus a configuration commit, Vercel project and environment before the push, wait by commit, verify with the marker.",
      "why": "Setup is manual and error-prone; prove repeatable provisioning first. Absorbs task 42.",
      "files": ["(new repo) providers/", "steps/", "verify/"],
      "deps": [125, 187]
    },
    {
      "n": 211,
      "s": "fx",
      "first": false,
      "t": "Provisioning hardening: Sanity authorisation, failure injection, resume",
      "w": "Ops",
      "ctx": "ops",
      "size": "Medium",
      "what": "Test Sanity organisation-robot provisioning (or keep the CLI session), inject failures after every create step and prove resume makes no duplicates or orphaned tokens.",
      "why": "Partial failures must never leave billed or unsafe resources.",
      "files": ["(new repo) steps/", "ledger/"],
      "deps": [199]
    },
    {
      "n": 200,
      "s": "fx",
      "first": false,
      "t": "blueprint.json from the release script",
      "w": "Template",
      "ctx": "template",
      "size": "Small",
      "what": "scripts/release.mjs writes blueprint.json (tag, commit, required environment, seed profiles, checks); check:version validates it.",
      "why": "Foundation needs a machine-readable, versioned blueprint.",
      "files": ["scripts/release.mjs", "scripts/check-version.mjs"],
      "deps": [199]
    },
    {
      "n": 201,
      "s": "fx",
      "first": false,
      "t": "Foundation app version 0: core",
      "w": "Ops",
      "ctx": "ops",
      "size": "Large",
      "what": "A local Next.js 16 app with a Neon Postgres ledger (Drizzle; org_id and actor on every row), an in-process step runner with resume, the provider modules and verifier from tasks 199 and 211.",
      "why": "Browser-first Foundation without hosted operations yet.",
      "files": ["(new repo) app/", "ledger/", "steps/"],
      "deps": [211, 200]
    },
    {
      "n": 207,
      "s": "fx",
      "first": false,
      "t": "Foundation: projects list and import of existing sites",
      "w": "Ops",
      "ctx": "ops",
      "size": "Medium",
      "what": "Projects screen listing every site with links and versions, importing the client register (task 63).",
      "why": "One place to see every project.",
      "files": ["(new repo) app/"],
      "deps": [201]
    },
    {
      "n": 208,
      "s": "fx",
      "first": false,
      "t": "Foundation: new-site wizard and run timeline",
      "w": "Ops",
      "ctx": "ops",
      "size": "Medium",
      "what": "A five-field wizard (Vercel) and a live run timeline with blocked reasons, resume and undo of resources this run created.",
      "why": "Fast, verified setup from the browser.",
      "files": ["(new repo) app/"],
      "deps": [201]
    },
    {
      "n": 209,
      "s": "fx",
      "first": false,
      "t": "Foundation: verification and health views",
      "w": "Ops",
      "ctx": "ops",
      "size": "Medium",
      "what": "Per-project verification results and health checks (the same functions as launch:check and health.yml), with a Run checks button.",
      "why": "See problems before clients do.",
      "files": ["(new repo) app/", "verify/"],
      "deps": [201, 189]
    },
    {
      "n": 202,
      "s": "fx",
      "first": false,
      "t": "Search Console import and URL mapping",
      "w": "Ops",
      "ctx": "ops",
      "size": "Large",
      "what": "A service-account import of 28-day windows (final data, paged to 25,000 rows, truncation flagged) and mapping of URLs to Sanity documents, listing unmatched URLs.",
      "why": "Recommendations need real search data tied to documents. Absorbs task 52 with task 210.",
      "files": ["(new repo) app/"],
      "deps": [201]
    },
    {
      "n": 210,
      "s": "fx",
      "first": false,
      "t": "Search Health: opportunity cards and change history",
      "w": "Ops",
      "ctx": "ops",
      "size": "Large",
      "what": "Deterministic opportunity cards with evidence and caveats, opening Studio drafts, and before-and-after tracking by document revision. No scores, no automatic publishing.",
      "why": "Evidence-based SEO improvements without invented scores.",
      "files": ["(new repo) app/"],
      "deps": [202]
    },
    {
      "n": 197,
      "s": "p6",
      "first": false,
      "t": "Site recipes: seed profiles per business type",
      "w": "Template",
      "ctx": "template",
      "size": "Large",
      "what": "Seed profiles that create a whole site structure (pages, sections, content types, navigation) for a business type, built on content contract v2.",
      "why": "Stop recreating architecture and content models per project.",
      "files": ["scripts/setup/seed.mjs"],
      "deps": [192, 212]
    },
    {
      "n": 203,
      "s": "p6",
      "first": false,
      "t": "Cloudflare experiment (C-1 to C-4)",
      "w": "Template",
      "ctx": "template",
      "size": "Large",
      "what": "Patch for OpenNext #1400 via patch-package or upstream fix, cache bindings so pages render, next/og, Studio and proxy checks, then one approved Workers Paid scratch deploy running the verification suite.",
      "why": "Cloudflare is a long-term hosting choice; prove it before supporting it.",
      "files": ["open-next.config.ts", "wrangler.jsonc"],
      "deps": [125]
    },
    {
      "n": 204,
      "s": "p6",
      "first": false,
      "t": "Mobile proof: Expo Android internal APK (with a use case)",
      "w": "Manual",
      "ctx": "none",
      "size": "Small",
      "what": "An Expo SDK 58 starter builds an Android internal APK on the free plan, installed on an emulator and a phone showing the content marker.",
      "why": "Mobile stays architecture-ready; prove the first step only when there is a use case.",
      "files": [],
      "deps": []
    }
  ]
}
```
