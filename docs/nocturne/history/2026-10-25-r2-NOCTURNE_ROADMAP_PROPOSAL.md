# Nocturne Roadmap Proposal — Revision 2

**Status:** a proposal, revision 2, dated 25 October 2026. It is the short handoff for [NOCTURNE_INTEGRATED_MASTER_PLAN.md](./NOCTURNE_INTEGRATED_MASTER_PLAN.md) (revision 2).

- It **replaces revision 1's proposal**, which is archived unchanged at `history/2026-10-25-r1-NOCTURNE_ROADMAP_PROPOSAL.md`.
- **Nothing here is in the canonical _Currawong Build Plan_ yet** (artifact version 18, 186 tasks).
- New task numbers start at **187**, the plan's next free number. Existing IDs, statuses and notes are untouched.

## How to use this

1. Approve, change or reject each item under **Approvals**.
2. Approved items are added to the plan artifact as a new stage, **"F · Foundation, Design Engine and Content Intelligence (real-project-led)"**, after "Now". Each card gets a repo-specific prompt in the usual format.
3. **Work in phase order.** Effort is given in **sessions**: one focused block of about 2–3 hours. You set the pace.
4. **End every session with a resume note** in the task's notes: what's done, what's next, any traps.

## Approvals

| #     | Approve                                                                                                      | Unlocks                               |
| ----- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| R2-A1 | The verdict (**BUILD, staged by real projects**) and the phase order                                         | Everything below                      |
| R2-A2 | **The publish gate:** clients become Contributors and publish through a server policy. Spike first           | 190, then 196                         |
| R2-A3 | **One ownership model:** Currawong-managed, transfer-ready; paid Growth from day one; never downgrade        | 189, 199                              |
| R2-A4 | **Content contract v2:** `service` and `location` become standard, behind profile flags                      | 191, then 192                         |
| R2-A5 | **Foundation:** a browser-first local app (version 0); the repo created in Phase 3; one Next.js app          | 199, 201                              |
| R2-A6 | **Design Engine:** necessary improvements now, polish later, no freeze                                       | 193, 194, plus existing 167, 168, 173 |
| R2-A7 | **Cloudflare:** a bounded experiment after Phase 1, including a scratch Workers Paid account at US$5 a month | 203                                   |
| R2-A8 | Add tasks 187–204 to the canonical plan (additively, using the version 18 method)                            | Tracking                              |

## Phase 0 — Readiness (about 6–9 sessions)

| ID               | Task                                                                                                                                                                            | Sessions | Done when                                                                                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| E3 (manual)      | **Plan-safety check** of the active client project                                                                                                                              |      0.5 | <ul><li>Paid Growth is confirmed.</li><li>The dataset is private (`npm run check:dataset`).</li><li>`ENQUIRIES_STORE` matches the plan.</li></ul> |
| **128** (extend) | **E4: a timed launch rehearsal**                                                                                                                                                |        1 | Every checklist step has its wall-clock time, hands-on time, clicks and failures recorded in the task notes                                       |
| **187**          | The verification marker: `siteIdentity.verificationMarker`, a server-rendered meta tag, the seed, `launch:check --expect-marker`                                                |      1–2 | Unit, e2e and launch-check fixture tests pass, and the home page JS is unchanged                                                                  |
| **188**          | JSON-LD visible-content and `@id` uniqueness tests                                                                                                                              |        1 | Pass on every fixture page, and are documented in the README                                                                                      |
| **189**          | `health.yml`: daily `launch:check --json` and `check:dataset` against production, opening or updating a GitHub issue on failure                                                 |        1 | A red run opens an issue; the README covers GitHub's 60-day pause of scheduled workflows on inactive repos                                        |
| **190**          | **E1: the publish-gate spike** (a Contributor's Publish action, `/api/publish` with `{id, draftRev}`, policy diff, atomic publish, refusal UX, assets, Presentation, under 2 s) |      2–3 | A written go or no-go, the shape of the policy, and a fallback decision                                                                           |
| **191**          | **E2: the content contract v2 note** (entities, relationships, JSON-LD, page templates, migration plan, profile flags)                                                          |        1 | You have approved the note                                                                                                                        |

## Phase 1 — The real website (4–8 sessions of system work, plus client work)

| ID                               | Task                                                                                                           | Done when                                                                                     |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 124, 12, 13, 14, 22, 31, 125, 32 | Existing client-lane tasks: build and launch the active client's site on the system                            | **M1:** the site is live, and `launch:check` passes with the marker on production             |
| **198**                          | The setup and deployment runbook, written from the real launch                                                 | The runbook covers everything from setup to a verified preview, and is linked from the README |
| (practice)                       | A **friction log**: each code edit made for a design change, each content-workflow pain, each deployment issue | Triaged into the Design Engine, Content and Foundation tasks below                            |

## Phase 2 — Fixes from real use (about 15–25 sessions)

| ID                              | Task                                                                                                                               |   Sessions | Depends on |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------: | ---------- |
| 167 (in progress), 168, 173     | Existing necessary Design Engine work: see and reset overrides; contrast that says what to fix; a keyboard and narrow-screen check | as planned | —          |
| **192**                         | Content contract v2: `service` and `location` documents and templates, JSON-LD, migrations, fixtures                               |        4–6 | 191        |
| **193**                         | Section contract v2 for the split family (`supportingMedia`, looks, actions, a glass rule), then hero                              |        4–6 | 190        |
| **194**                         | Theme-adaptation contract test (after a global colour change, contrast holds, glass included)                                      |        1–2 | 168        |
| **195**                         | SEO checks: internal-link graph, orphan pages and broken internal links in `launch:check`                                          |          2 | 188        |
| **196**                         | Build the publish gate (policy module, `/api/publish`, Contributor action, e2e tests, README role tables)                          |        4–6 | 190        |
| 137, 146–148, 151, 156–159, 177 | Existing roll-outs, **only when the real site needs them** (the "as needed" rule)                                                  |   per need | —          |

## Phase 3 — Repeatable provisioning (about 6–10 sessions)

| ID      | Task                                                                                                                                                                                          | Sessions | Depends on |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ---------- |
| **199** | **Create the `nocturne-foundation` repo** and prove provisioning: S1 (Sanity authorisation), S2 (a scripted launch to a verified preview, run twice), S4 (failure injection). Absorbs task 42 |      5–8 | 125, 187   |
| **200** | `blueprint.json`, generated by `release.mjs` and validated by `check:version`                                                                                                                 |        1 | 199        |

## Phase 4 — Foundation app, version 0 (about 10–15 sessions)

| ID      | Task                                                                                                                                                                                         | Depends on |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **201** | A local Next.js app: Neon ledger, step runner, providers (from 199), verifier, project list (existing sites imported), new-site wizard (Vercel), run timeline, verification and health views | 199, 200   |

**Done when** it sets up site #2, or a full rehearsal, end to end in the browser.

## Later phases (unnumbered work is numbered when its phase starts)

| Phase                     | Work                                                                                                                                | Ready when                                     | Existing or new IDs |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------- |
| 5. Search Health          | **202:** Search Console import, URL-to-document mapping, opportunity cards, change history                                          | A live site has 28 days of data                | 202 (absorbs 52)    |
| 6. Design Engine at scale | Remaining families on contract v2; **197** site recipes; the AI design-reference experiment                                         | Phase 2 is done                                | 197                 |
| 7. Experiments            | **203:** Cloudflare steps C-1 to C-4. **204:** an Expo Android APK proof. Hosting Foundation (37–41 retargeted). Commercial signals | Each one's readiness check (master plan §12.7) | 203, 204, 37–41     |

## Existing tasks: what this proposal changes

- **Prioritised:** 124, 125, 128, 11, 30, 31, 32, 63 and 64.
- **Necessary Design Engine work, now:** 167, 168 and 173, plus the "as needed" roll-outs when the site needs them.
- **Optional polish, later:** 108, 86, 87, 7, 98, 185, 184, 141, 144, 178 and 139.
- **Merged, with their IDs kept as aliases:**
  - 42 into 199;
  - 52 into 202.
- **Retargeted, with IDs kept:** 37–41, 43 and 44 move to "Foundation, hosted (later)".
- **Note added to 61:** it is also the lever for Cloudflare's size limit.
- **Nothing is archived, deleted or renumbered.**

## How revision 1's proposed numbers map to revision 2

| Revision 1 | Revision 2                                |
| ---------- | ----------------------------------------- |
| 187        | 200                                       |
| 188        | 187                                       |
| 189–191    | 199                                       |
| 192–197    | 199, 201                                  |
| 198        | 193, 194                                  |
| 199        | 188, 202                                  |
| 200        | 203                                       |
| 201        | 204                                       |
| 202        | Dropped until there's a commercial signal |

## Milestones

| Milestone | Meaning                                                                                                  | Status             |
| --------- | -------------------------------------------------------------------------------------------------------- | ------------------ |
| M0        | The active client's link page is live on the client's own domain (task 124)                              | Existing           |
| M1        | The first full site is live, with a branded CMS (after task 32), **verified with the marker**            | Existing, extended |
| MV        | Verification and health checks are in the template (187–189)                                             | New                |
| MC        | Content contract v2, the publish gate, and SEO tests in CI (191, 192, 195, 196)                          | New                |
| MD        | Design Engine necessities are done (167, 168, 193, 194)                                                  | New                |
| MF1       | The provisioning proof has passed twice, with failure injection, and the runbook is published (198, 199) | New                |
| MM        | Maintainability: CI is green, resume notes are kept, and two pauses were each resumed within 15 minutes  | New                |
| MN        | The scope of Foundation app version 0 is agreed (201)                                                    | New                |
