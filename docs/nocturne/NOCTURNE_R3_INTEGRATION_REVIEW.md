# Nocturne — Revision 3 Strategic Integration Review (Document A)

**Status:** a proposal, dated 25 October 2026. It changes nothing in the canonical plan, and it pairs with:

- **Document B:** [NOCTURNE_INTEGRATED_MASTER_PLAN.md](./NOCTURNE_INTEGRATED_MASTER_PLAN.md) (revision 3);
- **Document C:** [NOCTURNE_ROADMAP_PROPOSAL.md](./NOCTURNE_ROADMAP_PROPOSAL.md) (revision 3);
- **Document D:** [NOCTURNE_NEXT_SESSIONS.md](./NOCTURNE_NEXT_SESSIONS.md).

**Revision 2 is archived unchanged** in [history/](./history/).

**Labels:** as in the master plan: `[Code]`, `[Doc]`, `[Search]`, `[Rec]`, `[Hyp]` and `[Unknown]` (NOT VERIFIED).

---

## 1. What the "new artifact" actually is

**The link is not a new artifact.** https://claude.ai/artifact/7kWst2fHcf2eZocg9h3xwL is the **canonical _Currawong Build Plan_, version 18**.

**What I checked on 25 October 2026:**

- **Page version:** `1792820552-7bbf` (566,991 bytes, 8,252 lines). That is **byte-for-byte the version read for revisions 1 and 2**.
- **Progress database:** 114 records, **identical** to the earlier snapshot. Nothing new was added in the notes.
- **Your account:** no newer artifact exists. The most recently updated one is this build plan, last updated 24 October.

**How it was read:**

- Programmatically, in full:
  - all 12 stages and 186 task records (`n`, `s`, `t`, `w`, `ctx`, `size`, `what`, `why`, `files`, `deps`, `first`);
  - all 186 prompts;
  - both context blocks;
  - the "Approved direction" panel;
  - the changelog footer.
- The prompts for open tasks were consulted where scope mattered.

**What this means:**

- **I found no new requirements**, and I'm not claiming to have reviewed any.
- The useful work this request asks for still stands, so this review does it:
  - map the canonical plan's open requirements against revision 2;
  - security-review the publishing design;
  - validate the canonical format;
  - specify the next sessions.
- **If you meant a different artifact, share it,** and Documents A–D will be extended from it.

---

## 2. What's already available `[Code]`, verified this session

| Capability                                                                   | Evidence                                                                                                                                                                                                        | Notes                                                                                                             |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Deployment verification tooling                                              | `scripts/launch-check.mjs` and `scripts/launch-check/*`, which include `--json`, `--prelaunch` and `--bypass`                                                                                                   | Proven by unit tests. Not yet run against a real Nocturne launch                                                  |
| Dataset privacy check                                                        | `scripts/check-dataset.mjs` reads the dataset's `aclMode` and fails when it's public                                                                                                                            | Exists                                                                                                            |
| Deployed identity                                                            | `/api/site-info` reports the template version, commit and launch state                                                                                                                                          | `VERCEL_GIT_COMMIT_SHA` only                                                                                      |
| Client and agency roles                                                      | `src/lib/sanity/roles.ts` has `agency`, `editor` and `contributor` audiences. `src/features/studio/utils/document-access.ts` hides Publish and Unpublish for contributors ("Sanity refuses it for them anyway") | **The Contributor experience exists in the UI.** There is no review queue and no contributor messaging            |
| Publish safeguards                                                           | `confirm-publish.tsx` wraps Sanity's Publish with an address-change dialog and an offer to redirect. `publish-validation.tsx` explains blocked publishes                                                        | Its natural extension is task 206                                                                                 |
| Agency-only marking                                                          | `hiddenFromClients` is used 32 times across 14 files, and 12 fields sit in the `design` group                                                                                                                   | **A UI denylist.** Not a security boundary                                                                        |
| Server-side writes                                                           | `src/lib/sanity/write-client.ts` (an Editor token), used by enquiries and the Stripe price sync                                                                                                                 | It can be reused by a publish route                                                                               |
| Enquiries in Sanity                                                          | `ENQUIRIES_STORE=1` stores `enquiry` documents (`store-enquiry.ts`)                                                                                                                                             | **These are personal data.** A plan downgrade would expose them (§5.6 of the master plan)                         |
| JSON-LD graph, tokens, Brand colours, Link list patterns, Adjust picture, CI | See master plan §2.2 and §9.1                                                                                                                                                                                   | Unit tests passed today (3,417). **e2e was not re-run this session**                                              |
| Cloudflare                                                                   | Local spike, earlier today                                                                                                                                                                                      | Blocked by OpenNext #1400, fits only when minified, dynamic pages hang under the default cache (master plan §2.7) |

**Working tree:** two untracked items are preserved and nothing is committed:

- `docs/Nocturne_Foundation_Architecture_and_SEO_Strategy.docx`;
- `docs/nocturne/`.

---

## 3. The canonical plan's requirements mapped against revision 2

**What the classes mean:**

| Class         | Meaning                         |
| ------------- | ------------------------------- |
| **EXISTING**  | Built, or the capability exists |
| **IMPROVE**   | Refine it                       |
| **EXTEND**    | Add to it                       |
| **NEW**       | A new task                      |
| **DUPLICATE** | Covered by another task         |
| **DEFER**     | Valuable, but later             |
| **REJECT**    | Not worth its complexity        |

**The ✓ column marks tasks that directly improve a real client project's delivery.**

### 3.1 Open canonical tasks (78)

| Canonical task(s)                                | Requirement                                         | Area                                 | Class                   | Phase (rev 3)          | ✓                      | Notes                                                                                  |
| ------------------------------------------------ | --------------------------------------------------- | ------------------------------------ | ----------------------- | ---------------------- | ---------------------- | -------------------------------------------------------------------------------------- |
| 124                                              | The client's link page live on their domain         | Delivery                             | EXISTING (capability)   | 1                      | ✓                      | Do it                                                                                  |
| 128                                              | A launch rehearsal on a scratch Vercel project      | Foundation                           | **IMPROVE**             | 0                      | ✓                      | Add timing capture (E4) and the marker check once 187 exists                           |
| 125                                              | Launch the full site from pre-launch                | Delivery                             | EXISTING                | 1                      | ✓                      | Do it, with marker verification                                                        |
| 11                                               | Create the client project (checklist)               | Foundation                           | **IMPROVE**             | 0–1                    | ✓                      | Add: paid Growth (no trial), dataset private, client role **Contributor**, seed marker |
| 12, 13, 14, 22                                   | Plan, brand, bespoke sections, page compositions    | Delivery / Design Engine             | EXISTING                | 1                      | ✓                      | Keep a friction log                                                                    |
| 30                                               | Pull a template release into a client site          | Foundation                           | EXISTING                | 1                      | ✓                      | Brings in 187–189 and 205–206                                                          |
| 31                                               | Pre-launch QA                                       | Content Intelligence                 | **IMPROVE**             | 1                      | ✓                      | Add: marker, `health.yml`, dataset privacy, the JSON-LD tests from 188                 |
| 32                                               | Go live and hand over                               | Delivery                             | **IMPROVE**             | 1                      | ✓                      | Client invited as **Contributor**; review-queue routine explained; plan-safety rules   |
| 63                                               | Client and site register                            | Foundation                           | EXISTING (manual)       | Now                    | ✓                      | Later imported by 207                                                                  |
| 64                                               | Basic client agreement                              | Delivery                             | **IMPROVE**             | 1                      | ✓                      | Add: who owns what, transfer at exit, how publishing works (Contributor review)        |
| 77                                               | Studio usability test                               | Design Engine / Content Intelligence | **IMPROVE**             | 1–2                    | ✓                      | Add a Contributor-publishing scenario and a "no live instructions" run                 |
| 180                                              | Spike: e2e specs that need only one browser project | Maintenance                          | **IMPROVE**             | Maintenance            |                        | A 20-minute CI hurts part-time work. Do it in the first maintenance session            |
| 179                                              | CI cache for e2e (skip)                             | Maintenance                          | Unchanged               | None                   |                        | Stays skipped                                                                          |
| 167 (doing), 168, 173                            | Override reset, contrast fixes, keyboard check      | Design Engine                        | **IMPROVE**             | 1–2                    | ✓                      | Necessary (master plan §9.2)                                                           |
| 170 (doing)                                      | Wordmark files (manual)                             | Brand                                | EXISTING                | Now                    |                        | Finish                                                                                 |
| 137, 146–148, 151, 156–159, 177                  | Roll out shared parts                               | Design Engine                        | **EXTEND**              | When needed            | ✓ if the site needs it | The "as needed" rule stands                                                            |
| 139, 141, 144, 178, 184, 185, 108, 86, 87, 7, 98 | Polish and triggered extras                         | Design Engine                        | **DEFER**               | Later                  |                        | Unless a site needs one                                                                |
| 94, 95, 96                                       | Booking                                             | Design Engine                        | **DEFER**               | On a client trigger    |                        | 96 ("only if justified") is a candidate for REJECT if no client need appears           |
| 102–105                                          | Contentful migration lane                           | Content Intelligence                 | **DEFER**               | On a client trigger    |                        |                                                                                        |
| 37, 38                                           | Ops scaffold; clients and sites                     | Foundation                           | **DEFER**               | Hosted stage           |                        | Locally superseded by 201 and 207. IDs kept                                            |
| 39, 40                                           | Provider status; health checks                      | Foundation                           | **DUPLICATE** (in part) | Hosted stage           |                        | 189 (per repo) and 209 (local view) cover the first need. 39 and 40 centralise later   |
| 41                                               | Central backups and restore tests                   | Foundation                           | **DEFER**               | Hosted stage           |                        | `backup.yml` exists per repo                                                           |
| 43, 44                                           | Support queue; Ask Currawong                        | Foundation                           | **DEFER**               | Hosted stage           |                        |                                                                                        |
| 129                                              | Spike: Vercel domains and token scopes              | Foundation                           | **DEFER**               | Phase 3+               |                        | Preview URLs don't need it                                                             |
| 130–135                                          | Domains, DNS, launch control                        | Foundation                           | **DEFER**               | After hosted           |                        |                                                                                        |
| 45–49                                            | Billing and access automation                       | Commercial                           | **DEFER**               | Commercial             |                        |                                                                                        |
| 42                                               | Provisioning script                                 | Foundation                           | **DUPLICATE**           | 3                      |                        | Merged into 199 and 211; ID kept as an alias                                           |
| 50                                               | Pattern registry and CLI                            | Design Engine                        | **DEFER**               | Design Engine at scale |                        | Overlaps 197 in spirit only                                                            |
| 52                                               | Monthly client report                               | Content Intelligence                 | **DUPLICATE**           | 5                      |                        | Merged into 202 and 210                                                                |
| 53, 54                                           | Update PRs; reusable CI                             | Foundation                           | **DEFER**               | After 3 or more sites  |                        | Important for care plans                                                               |
| 57                                               | Fleet content QA                                    | Content Intelligence                 | **DEFER**               | Later                  |                        | AI optional, never a dependency                                                        |
| 58                                               | Core package extraction                             | Architecture                         | **DEFER**               | On a trigger           |                        |                                                                                        |
| 59                                               | Client quick-actions assistant (AI)                 | Content Intelligence                 | **DEFER**               | Later                  |                        | A candidate for REJECT unless support data proves the need                             |
| 60                                               | Multilingual                                        | Content Intelligence                 | **DEFER**               | On a trigger           |                        |                                                                                        |
| 61                                               | Studio on its own origin, strict CSP                | Architecture                         | **DEFER**               | On a trigger           |                        | Also the lever for Cloudflare's size limit                                             |
| 62                                               | Cost and margin per client                          | Commercial                           | **DEFER**               | Commercial             |                        |                                                                                        |

**REJECT: none outright.** Two candidates, 96 and 59, are flagged for rejection at their trigger if no evidence appears.

### 3.2 Direction and context blocks in the artifact

| Item                                                      | Class                              | Revision 3 position                                                                                                                        |
| --------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| "A separate Ops app from about 3–5 live sites"            | **CHANGE** (already in revision 2) | Foundation is one Next.js app, local first (201, 207–209), hosted later. The Ops context's stack is kept as the hosted-stage specification |
| "Clients who edit are on Growth as Editor or Contributor" | **CHANGE** (needs approval)        | **Contributor by default.** Editor only by explicit agreement, and only once the hardened gate exists (§4)                                 |
| "CMS branding in code; client settings win"               | EXISTING                           | Unchanged                                                                                                                                  |
| "A failed payment never takes a public site offline"      | EXISTING (principle)               | Unchanged                                                                                                                                  |
| Template context: "home page JavaScript at most 200 KB"   | **IMPROVE** (hygiene)              | The measured budget is about 218.5 of 220 KB. Fix the wording at the next plan edit                                                        |
| Ops context: `currawong-ops` repo                         | **CHANGE** (needs approval)        | Rename to `nocturne-foundation`; describe the local-first version 0                                                                        |

### 3.3 Revision 2's proposed tasks (187–204)

| Revision 2 ID                                                                                                                                              | Revision 3 class                      | Change                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 187 marker, 188 JSON-LD tests, 191 content note, 194 theme test, 195 SEO links, 197 recipes, 198 runbook, 200 `blueprint.json`, 203 Cloudflare, 204 mobile | **RETAIN**                            | Scope unchanged. Full specs in Document C                                                                                                                             |
| 189 `health.yml`                                                                                                                                           | **IMPROVE**                           | Adds a check that `ENQUIRIES_STORE` is consistent with dataset privacy                                                                                                |
| 190 E1 spike                                                                                                                                               | **IMPROVE (re-scoped)**               | Now a **security verification** spike with the hardened criteria in §4. Moves to Phase 2. **No longer blocks the real site**                                          |
| 192 content contract v2                                                                                                                                    | **IMPROVE (split)**                   | 192 covers `service`; **212** covers `location` and relationships                                                                                                     |
| 193 section contract v2                                                                                                                                    | **IMPROVE (split; dependency fixed)** | 193 covers split; **213** covers hero. It depends on **205**, not 190                                                                                                 |
| 196 publish gate                                                                                                                                           | **IMPROVE (hardened, split)**         | 196 covers the server policy and route; **214** covers the Studio action and UX. Built **only when a client needs self-publishing**                                   |
| 199 Phase 3 proof                                                                                                                                          | **IMPROVE (split)**                   | 199 covers the repo and a scripted launch; **211** covers Sanity authorisation, failure injection and resume. **Creating the repo needs your approval** at that point |
| 201 Foundation app                                                                                                                                         | **IMPROVE (split)**                   | 201 is the core; **207** projects, **208** wizard and timeline, **209** verification and health views                                                                 |
| 202 Search Health                                                                                                                                          | **IMPROVE (split)**                   | 202 covers import and mapping; **210** covers cards and change history                                                                                                |
| —                                                                                                                                                          | **NEW 205**                           | A field classification registry (an **allowlist**) with a completeness test                                                                                           |
| —                                                                                                                                                          | **NEW 206**                           | Agency publishing shows protected-field changes and who made them; a "Waiting for review" list; Contributor messaging                                                 |

---

## 4. The publishing architecture: security review (before any build tasks)

| #   | Question                                                                                        | Finding                                                                                                                                                                                                                                                                         | Evidence                                                                                                                                 | Requirement this creates                                                                                                                                                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Can Contributors change protected documents or fields through the API?                          | **Yes, in drafts.** Contributors have "read and write access to draft content within all datasets" and "can write but not publish". That covers drafts of `designSettings` and of page design fields too. Their access to assets, release versions and deletes isn't documented | `[Doc: Sanity roles]`; assets, versions and deletes are `[Unknown]`                                                                      | Protection must sit at **publish time**. E1 probes the gaps with a robot that has the Contributor role                                                                                                                                                                                                                                        |
| 2   | Can a publish route reliably tell content changes from design changes?                          | **Only with deny-by-default classification.** Revision 2's `AGENCY_ONLY` list is a **denylist**: any field added later and not listed would publish                                                                                                                             | Today's marking is UI-only and denylist-based (32 `hiddenFromClients` uses, 12 design-group fields) `[Code]`                             | **205:** a `CLIENT_EDITABLE` **allowlist** per document type and section type, plus a CI test that fails whenever a field in a client-publishable type is unclassified                                                                                                                                                                        |
| 3   | Could unpublished draft changes bypass the restrictions?                                        | **Not on the public site.** It reads the published perspective; drafts appear only in secret-gated draft mode and Presentation. The risk is in **other publishing paths**                                                                                                       | `live.ts` (strict perspective), draft-mode routes `[Code]`                                                                               | See row 4                                                                                                                                                                                                                                                                                                                                     |
| 4   | Could someone change a protected field, then get it published through another permitted action? | **Yes. Revision 2 missed this.** (a) When the agency later publishes the same document, the client's hidden protected change goes live. (b) Releases and scheduled publishing by the agency do the same                                                                         | Sanity publishes the whole draft `[Doc: Actions API]`                                                                                    | **206:** before an agency publish, list the protected-field changes made since the last publish, with their authors, and require confirmation. Releases stay agency-only, with the same review. E1 checks whether Contributors can create release versions                                                                                    |
| 5   | Does the route verify identity and permissions properly?                                        | **No.** Revision 2 trusted knowledge of `draftRev`, which any project member can read, including a client suspended to Viewer                                                                                                                                                   | Revision 2 §5.5                                                                                                                          | The route derives the **authors** of every transaction since the last publish (History API), checks each author's **current** role (Access API, robot with members-read), and publishes only if all are currently Contributors, Editors or agency. Also rate-limited and audit-logged. Robot permissions are `[Unknown]`, so E1 verifies them |
| 6   | Are transactions, revisions and drafts handled safely?                                          | **Not as specified** (`createOrReplace` plus `delete` has no guards)                                                                                                                                                                                                            | The Actions API `sanity.action.document.publish` supports `ifDraftRevisionId` and `ifPublishedRevisionId` for optimistic locking `[Doc]` | Publish **exactly the validated revision** through the Actions API with both guards. A new document's protected fields must equal their initial values. Deletes and unpublishes always go to review. Server-side checks run for required fields and slug uniqueness                                                                           |
| 7   | Does it work with the real plan and roles?                                                      | Contributor is on Growth `[Doc]`, and the Actions API exists `[Doc]`. **The active client's plan is unknown**                                                                                                                                                                   | `[Unknown]`                                                                                                                              | E3 confirms paid Growth first                                                                                                                                                                                                                                                                                                                 |
| 8   | Is there a simpler secure alternative?                                                          | **Yes, available right now:** clients become **Contributors, and the agency publishes** their drafts. Sanity enforces the boundary, no code is needed, and 206 makes review practical                                                                                           | `[Doc]`, `[Code: document-access.ts]`                                                                                                    | **Interim model, now.** Build the self-service gate (190, 196, 214) only when a client actually needs to publish themselves                                                                                                                                                                                                                   |

**Verdict on publishing**

- Revision 2's gate is **not safe as specified**.
- The hardened gate is acceptable **after E1 passes**.
- Until then, use the interim model: **Contributor + agency review (205, 206)**. It is secure today and costs 3–4 sessions.

---

## 5. Decision table

| #   | Decision              | Recommendation                                                                                                                                         | Reasoning                                                            | Changes revision 2?                  | Approval                               |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| D1  | What was reviewed     | Treat the link as the unchanged canonical plan; map its open requirements                                                                              | The version and database are identical, and no other artifact exists | No                                   | Confirm, or send the intended artifact |
| D2  | Client publishing now | **Contributor + agency publishes**, with 205 and 206                                                                                                   | Enforced by Sanity, zero risk, small effort                          | **Yes** (replaces "gate in Phase 0") | **Yes**                                |
| D3  | Self-service gate     | **Hardened** (allowlist, author and role check, Actions API guards, review for new documents, deletes and releases). Built only when a client needs it | §4 rows 2–6                                                          | **Yes**                              | **Yes**                                |
| D4  | Field classification  | **Allowlist + completeness test (205)**                                                                                                                | It fails safe for fields added later                                 | **Yes** (new)                        | Yes                                    |
| D5  | Agency publish review | **206**: diff, authors, confirmation; a "Waiting for review" list                                                                                      | Closes the leak in row 4 and makes the interim workable              | **Yes** (new)                        | Yes                                    |
| D6  | E1                    | Re-scoped as security verification; Phase 2                                                                                                            | No longer blocks the real site                                       | **Yes**                              | Yes                                    |
| D7  | Task size             | Split 192, 193, 196, 199, 201 and 202 (new IDs 207–214)                                                                                                | Every task fits in 1–4 sessions                                      | **Yes**                              | Yes                                    |
| D8  | Foundation repo       | Still Phase 3, with **explicit approval when reached**                                                                                                 | Your constraint                                                      | Wording only                         | Yes, at Phase 3                        |
| D9  | Content contract v2   | 191 before the full site's content; 192 and 212 ahead of the launch if the site sells distinct services or has locations                               | Avoids migrations                                                    | No                                   | No                                     |
| D10 | Canonical plan update | New stages `f` (verified foundations) and `fx` (Foundation app). Records follow the existing schema. Prompts are written when you approve              | Schema-safe (§7)                                                     | Process                              | **Yes**                                |
| D11 | Maintenance           | Run 180 (CI speed) in the first maintenance session                                                                                                    | CI time hurts part-time work                                         | Minor                                | No                                     |
| D12 | Context hygiene       | Fix the JS-budget wording; rename the Ops context                                                                                                      | Accuracy                                                             | Minor                                | With D10                               |

---

## 6. The recommended product sequence (revision 3)

The order is unchanged from revision 2 except for publishing.

|                             Phase | What happens                                                                                                                                                                                                                       |
| --------------------------------: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0. Ready** (about 6–9 sessions) | <ul><li>Plan safety, folded into tasks 11 and 31 (E3).</li><li>Verification: 187, 188, 189.</li><li>The timed rehearsal (128 / E4).</li><li>**Contributor + review: 205, 206.**</li><li>The content contract note (191).</li></ul> |
|              **1. The real site** | <ul><li>124 → 12–14, 22 → 30 → 31 → 125 → 32, with a friction log.</li><li>The runbook (198).</li></ul>                                                                                                                            |
|        **2. Fixes from real use** | <ul><li>192, 212, 193, 213, 194, 195, 167, 168, 173.</li><li>**190 (E1), then 196 and 214, only when self-publishing is needed.**</li></ul>                                                                                        |
|    **3. Repeatable provisioning** | 199, 211, 200. **Repo approval needed**                                                                                                                                                                                            |
|  **4. Foundation app, version 0** | 201, 207, 208, 209                                                                                                                                                                                                                 |
|              **5. Search Health** | 202, 210                                                                                                                                                                                                                           |
|     **6. Design Engine at scale** | 197, remaining families, the AI design-reference experiment                                                                                                                                                                        |
|        **7. Bounded experiments** | 203 (Cloudflare), 204 (mobile), hosting, commercial signals                                                                                                                                                                        |

---

## 7. Canonical plan format: established and validated

| Element           | Format                                                                                                                                                                                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stage             | `id`, `n`, `ws`, `title`, `where`, `desc`, `milestone`                                                                                                                                                                                                                                 |
| Task              | `n`, `s`, `first`, `t`, `w` (`Template`, `Client site`, `Manual`, `Ops` or `Patterns repo`), `ctx` (`template`, `ops` or `none`), `size` (`Small`, `Medium`, `Large`, `Manual`, `Half a day`, `2 hours`, `1 hour`, `1 hour per run` or `External`), `what`, `why`, `files[]`, `deps[]` |
| Prompts           | One per task: `<script type="text/plain" id="p-NN">`                                                                                                                                                                                                                                   |
| Statuses          | `todo`, `doing`, `done`, `skip`                                                                                                                                                                                                                                                        |
| Progress database | `progress/tNN` holding `{status, notes, updatedAt}`                                                                                                                                                                                                                                    |
| IDs               | 1–186 are contiguous, and no dependency points at a missing task                                                                                                                                                                                                                       |

**The proposed records:**

- Document C, Appendix 1, holds **schema-shaped records for 187–214 and the two new stages**.
- A validation script checked uniqueness, enum values, stage references and dependency integrity. **It passed.**
- **Not done yet: prompts.** The canonical page requires one per task, so they're written when you approve.

---

## 8. Conflicts and what stays

**Conflicts:**

1. **The denylist versus fail-safe security.** Revision 2's `AGENCY_ONLY` list conflicts with the principle that permissions should fail safe. 205 resolves it.
2. **The approved direction says "Editor or Contributor".** That conflicts with Contributor as the default, and needs your approval.
3. **The approved direction's "separate Ops app" and the `currawong-ops` context** conflict with the local-first Foundation app, and need your approval.
4. **The JS budget wording** (200 KB stated, about 220 KB measured) is a hygiene fix.

**Unchanged from revision 2:**

- the verdict (BUILD, staged by real projects);
- the three-part architecture and its contracts;
- one managed, transfer-ready ownership model;
- the plan-safety rules;
- the Cloudflare findings and experiment;
- content contract v2;
- Foundation local-first, with its repo created in Phase 3;
- the value ledger;
- the readiness checks;
- the DO NOT BUILD list.

---

## 9. Keeping long-term capabilities open: the smallest decisions needed today

| Capability                                               | Smallest decision today                                                                                                      | Where              |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Hosted Foundation, agency accounts, multi-tenant SaaS    | `org_id` and `actor` on every ledger row; one credentials module; server actions only; no in-memory state                    | 201                |
| More website hosts; Cloudflare                           | Steps stay executor-agnostic. `deploy-env.ts` arrives with the Cloudflare work. Studio stays separable (task 61)             | 203                |
| React Native / Expo creation; mobile builds and releases | `blueprint.json` allows `projectTypes`. Content flows through a public, cached content API. Store accounts stay client-owned | 187, 200, 204      |
| Advanced Design Engine; AI-assisted design               | The section contract v2 grammar (looks, slots), plus the classification registry                                             | 193, 205           |
| AI-assisted content editing                              | AI only ever writes **drafts**; publishing stays behind roles and the policy. Deterministic checks never depend on AI        | 205, 206, 196      |
| Search Console intelligence; expanded structured data    | Stable `@id`s and URL-to-document path functions; content contract v2                                                        | 188, 191, 192, 212 |
| Managed client websites                                  | One managed, transfer-ready model; plan safety; `health.yml`                                                                 | 189, task 11       |
| Client-owned infrastructure and portability              | Independent repos with the template history; no runtime dependency on Foundation; a transfer runbook                         | 198, 199           |
