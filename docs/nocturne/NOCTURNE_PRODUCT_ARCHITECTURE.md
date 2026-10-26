# Nocturne Integrated Product Architecture (Document E3)

**Status:** the direction was approved by the owner on 26 October 2026. This is **revision r2**, the same day, adding the Settings and Configuration Manager (§9) and its feature configuration registry.

**Companion documents:**

- [E1, Design Engine](./NOCTURNE_DESIGN_ENGINE_ARCHITECTURE.md);
- [E2, Content Intelligence](./NOCTURNE_CONTENT_INTELLIGENCE_ARCHITECTURE.md);
- [E4, roadmap integration](./NOCTURNE_DE_CI_ROADMAP_INTEGRATION.md).

It **confirms** revision 3's integration model (document B §5.2): contracts in the template, one editor per kind of thing, and sites that never depend on Foundation. It adds the contracts that the Design Engine and Content Intelligence need.

---

## 1. The strongest integration model

> **The template defines the contracts and every capability a site needs to run, check and improve itself. Studio is the only place content and design change. Foundation creates, observes, aggregates and links, and adds the evidence only a fleet view can give (Search Console). It never edits.**

```
                   TEMPLATE REPO — contracts + runtime, versioned with each release
  ┌──────────────────────────────────────────────────────────────────────────────────────────┐
  │ Schemas · tokens.json · design-manifest.generated.json · slot registry · CLIENT_EDITABLE │
  │ structured-data graph + @id scheme · Finding contract + rule library · verification spec │
  └──────────────────────────────────────────────────────────────────────────────────────────┘
        │ merged by tag (task 30, later 53)                       │ read-only outputs
        ▼                                                         ▼
  CLIENT SITE (independent: own repo, Vercel, Sanity)       FOUNDATION (one Next.js app)
  • public site: renderer, tokens, JSON-LD, metadata         • creates sites from blueprints
  • Studio: all content + design edits, drafts, review,      • reads /api/site-info, the marker,
    content health, improvement records, proposals applied     the health and audit JSON, improvements
  • CI: check, e2e, launch:check, audit, health (daily)       • Search Console import, opportunity cards
                                                              • "Open in Studio" links; never writes
```

---

## 2. Responsibilities

| Pillar                   | Owns                                                                                                                                                                                                                                                                                       | Doesn't own                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| **Foundation**           | <ul><li>Blueprints, provisioning and the resource ledger.</li><li>Verification runs and fleet health.</li><li>Template versions per site, and update pull requests.</li><li>Search Console import and opportunity cards.</li><li>Later, proposal generation (AI) for the agency.</li></ul> | <ul><li>Content, design values, the schemas.</li><li>Publishing.</li><li>Anything a site needs at runtime.</li></ul> |
| **Design Engine**        | <ul><li>Tokens and site design decisions.</li><li>Families, presets and slots.</li><li>Section style, motion and glass.</li><li>The resolvers (contrast and inheritance).</li><li>The design manifest and the proposal validator.</li></ul>                                                | <ul><li>Content facts.</li><li>SEO output.</li><li>Fleet state.</li></ul>                                            |
| **Content Intelligence** | <ul><li>The entity model and fact ownership.</li><li>The structured-data graph.</li><li>Metadata, sitemap, robots and `llms.txt` generation.</li><li>The finding contract and rule library.</li><li>Improvement records.</li></ul>                                                         | <ul><li>Visual presentation.</li><li>Search data storage beyond the spike (Foundation stores it).</li></ul>          |

**Shared, owned by nobody alone:**

- the Studio publish policy (`CLIENT_EDITABLE`, task 205);
- the release process (task 29);
- the CI quality bar.

---

## 3. Shared contracts

| Contract                                     | File or module                                                              | Consumed by                                                                                            | Changes by                                                                             |
| -------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Content schemas                              | `src/features/*/schemas`, `schema.json`                                     | Site, Studio, typegen, manifest, audit                                                                 | A template release, with migrations in `migrations/`                                   |
| Design tokens                                | `src/styles/tokens.json` (site-owned values), generated files               | Site, Studio previews, OG image                                                                        | A per-site commit (values) or a template release (token names)                         |
| Site design decisions                        | `designSettings` document                                                   | Site (`:root` variables), Studio checks                                                                | Studio (agency)                                                                        |
| **Design manifest (new)**                    | `design-manifest.generated.json`                                            | The proposal validator, future AI, Foundation (version display)                                        | Generated by `npm run typegen`; CI checks it's current                                 |
| **Slot registry (new, generalised)**         | `src/features/pages/slots/`                                                 | Families, manifest, `CLIENT_EDITABLE`                                                                  | A template release                                                                     |
| Field classification                         | `CLIENT_EDITABLE` (task 205)                                                | Studio hiding, agency review, any future gate, manifest, proposals                                     | A template release, with a completeness test                                           |
| **Structured-data graph (new module)**       | `src/lib/structured-data/` (ids, nodes, graph)                              | Site emitters, 188 tests, audit rules                                                                  | A template release                                                                     |
| **Finding contract and rule library (new)**  | `src/lib/audit/` (pure) and `scripts/audit-page.mjs`                        | Studio content health, `launch:check`, health, Foundation                                              | A template release. `ruleId`s are stable; a retired rule keeps its ID                  |
| Verification marker                          | `siteIdentity.verificationMarker` (187)                                     | Foundation, `launch:check`                                                                             | Exists                                                                                 |
| **Feature configuration registry (new, r2)** | Each feature's `config.registry.ts`, composed in `src/app` and scripts (§9) | `npm run config:check`, `/api/site-info`, health, Studio status (later), Foundation's Settings Manager | A template release. **Separate from the design manifest**                              |
| Site description                             | `/api/site-info`                                                            | Foundation                                                                                             | **Adds** `manifestVersion`, `auditRulesVersion` and per-feature readiness with reasons |

Each new contract carries a version string, equal to the template version that last changed it. Foundation uses it to tell which capabilities a site has.

---

## 4. Data ownership

| Data                                      | Source of truth                                                      | Copies                                                       |
| ----------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------ |
| Content, business facts, design decisions | The site's Sanity dataset (private)                                  | None. Foundation reads metadata only                         |
| Code, tokens and fonts                    | The client repo                                                      | Template history                                             |
| Improvement records                       | The site's dataset (agency-only type)                                | Foundation imports them for the fleet view                   |
| Audit and health results                  | Regenerated on each run; the daily issue is the human record         | Foundation keeps a history                                   |
| Search Console data                       | Google. Foundation keeps imported windows, with the client's consent | The spike keeps a local, git-ignored copy, deleted after use |
| Proposals                                 | The draft or release they were applied to                            | None                                                         |

---

## 5. Where each capability runs

| Capability                                           | Site runtime    | Studio            | Template packages and scripts  | Site CI (GitHub Actions)  | Foundation        | Background jobs                 |
| ---------------------------------------------------- | --------------- | ----------------- | ------------------------------ | ------------------------- | ----------------- | ------------------------------- |
| Rendering, tokens, design resolution                 | ✔ (server only) | Previews          | —                              | —                         | —                 | —                               |
| Design authoring, presets, overrides, contrast hints | —               | ✔                 | —                              | —                         | —                 | —                               |
| Manifest generation                                  | —               | —                 | ✔                              | Staleness check           | Reads version     | —                               |
| Proposal validation and apply                        | —               | ✔ (agency, later) | ✔ (script for the experiment)  | —                         | Generates (later) | —                               |
| JSON-LD, metadata, sitemap, `llms.txt`               | ✔               | SEO preview       | —                              | Tests                     | —                 | —                               |
| Content rules (drafts)                               | —               | ✔ Content health  | ✔ rule library                 | —                         | —                 | —                               |
| Projection rules (rendered)                          | —               | —                 | ✔ `launch:check`, `audit:page` | ✔ health, daily           | Reads results     | —                               |
| Improvement records                                  | —               | ✔                 | —                              | Health lists the due ones | Imports           | —                               |
| Search Console                                       | —               | —                 | Spike only                     | —                         | ✔                 | ✔ Foundation's scheduled import |
| AI proposals                                         | —               | Applied here      | —                              | —                         | ✔ (later)         | —                               |

**The site keeps working if Foundation is unavailable.** Every check runs from the site's own repository and CI, and nothing on a public page calls Foundation.

---

## 6. Client permissions

| Action                                                            | Client (Contributor, now)                           | Agency                          |
| ----------------------------------------------------------------- | --------------------------------------------------- | ------------------------------- |
| Edit content fields classified as client-editable                 | Draft, reviewed by Currawong (206)                  | Publish                         |
| Fill slots (add a button, swap a picture, add a supporting video) | Draft, where the slot is classified client-editable | Publish                         |
| Change presets, style, panels, motion, site design decisions      | No (agency-only, enforced by review)                | ✔                               |
| `seo.title` and `seo.description`                                 | Draft, reviewed                                     | ✔                               |
| Apply a proposal                                                  | No                                                  | ✔                               |
| Record an improvement                                             | No                                                  | ✔                               |
| See findings                                                      | Content health in Studio (read-only)                | ✔ plus the audit and Foundation |

Enforcement comes from the Contributor role plus agency review now, and the hardened gate later (190, 196, 214). Hidden UI is only a convenience.

---

## 7. Versioning, migrations and updates to existing sites

**How Design Engine and Content Intelligence changes reach a site:**

1. A template release includes the code, schema changes, a migration (dry-run first) and its CHANGELOG steps.
2. The site merges the tag (task 30, later as automated update pull requests, task 53). CI runs check, e2e and the manifest staleness test.
3. The migration runs against the site's dataset, after a backup (`backup.yml`). Every migration is idempotent, and safe to run before and after deployment.
4. **Backward compatibility rules:**
   - **Renderers ignore unknown values.** For example, a preset or panel value from a newer release falls back to the default.
   - **Schemas only add fields** within a minor release.
   - **Renames and removals happen only in a major release,** with a migration.
   - **`ruleId`s and `@id` patterns never change meaning.**
5. **New capabilities are off until used.** An empty `designSettings` field renders as `tokens.json`, and an empty panel is no panel. Existing sites therefore look identical after an update, so visual baselines catch accidental changes.

---

## 8. Security, privacy, costs and portability

- **Security:**
  - No new public endpoints.
  - The audit and the Search Console spike are read-only, and their tests assert it.
  - The proposal applier writes drafts only, with `ifRevisionID`.
  - API keys for AI live in Foundation or a developer's environment, never in a client site or a `NEXT_PUBLIC_` variable.
- **Privacy:**
  - Search Console access needs the client's consent.
  - Improvement records contain only published values.
  - Audit output includes no enquiry or member data: the audit reads only public pages and published content.
- **Costs:**
  - Nothing new is always on.
  - The audit runs inside the existing daily health workflow, using GitHub Actions minutes.
  - Search Console's API is free within its quotas.
  - AI costs only arise in the experiment (221) and later on demand.
- **Portability:**
  - Every contract is plain files in the site's repo and data in its own dataset. A transferred site keeps everything (the transfer-ready model).
  - Foundation adds convenience only.

---

## 9. Settings and Configuration Manager (new in r2; a future milestone, not built in this change)

**What it will provide:**

- guided feature setup;
- the connection status of integrations;
- plain-English explanations;
- missing-configuration detection;
- secure configuration management;
- deployment-aware updates;
- setup and diagnostics for the daily health monitoring.

### 9.1 What exists today

- **Readiness logic, spread across features:** each feature already decides whether it's configured, with a reason when it isn't. Examples: `getFormsConfig`, `getNewsletterConfig`, `getEnquiryConfig` (with `missing`), `getCheckoutConfig` and `getWebhookConfig`.
- **Other places configuration lives today:**
  - `/api/site-info` reports booleans only, never values;
  - `site.profile.ts` switches features on;
  - `src/config/env.ts`;
  - the setup wizard (`scripts/setup/`);
  - `npm run check:dataset` and `launch:check`;
  - the health workflow, which needs `PRODUCTION_URL`, Sanity variables and a `SANITY_AUTH_TOKEN` secret;
  - the README's environment tables.
- **The gap:** nothing lists every feature's requirements in one place. Missing configuration is found feature by feature, often only when a visitor submits a form.

### 9.2 Architecture

| Layer                               | Where                                                                                                                                                                    | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature configuration registry**  | Template. Declarative entries next to each feature (`src/features/<f>/config.registry.ts`), composed in `src/app` and scripts, because shared code can't import features | <ul><li>Per feature: its purpose in plain English, the profile flag, and each setting's name.</li><li>For each setting: its **kind** (public variable, server variable, secret, Sanity setting, GitHub variable or secret); **where it's set** (Vercel, Sanity, GitHub, `site.profile.ts`); whether it's required or optional; and its docs anchor.</li><li>The existing `get*Config()` function decides readiness and gives the reason.</li><li>**Never values.**</li></ul> |
| **Diagnostics**                     | Template                                                                                                                                                                 | <ul><li>`npm run config:check`, run locally and in CI with a placeholder environment.</li><li>`/api/site-info`, readiness only.</li><li>The health workflow checks its own setup ("PRODUCTION_URL isn't set as a repository variable").</li><li>The README's environment table is generated from the registry, which removes today's duplication.</li></ul>                                                                                                                  |
| **Studio status** (later)           | Template                                                                                                                                                                 | A read-only "Integrations" card in Start here: plain-English readiness from `/api/site-info`. No secrets, and nothing editable                                                                                                                                                                                                                                                                                                                                               |
| **Guided setup and secure changes** | Foundation                                                                                                                                                               | <ul><li>Walk through each feature.</li><li>Write values **directly to the provider** (the Vercel environment API; GitHub Actions variables and secrets) with least-scope tokens.</li><li>Secrets are write-only: never read back or shown.</li><li>Every change records an `audit_event`.</li><li>Foundation stores no client secrets, except as the FX context allows (encrypted, when it must).</li></ul>                                                                  |
| **Deployment-aware updates**        | Foundation                                                                                                                                                               | <ul><li>Environment changes only apply after a redeploy (the `/api/site-info` comment already says so).</li><li>Foundation shows "saved, not yet live", offers a redeploy, then confirms through `/api/site-info`'s commit, `BUILT_AT` and readiness.</li></ul>                                                                                                                                                                                                              |

**Why separate from the design manifest?**

- **Different audiences:** operators versus designers and AI.
- **Different sources:** environment and providers versus schemas.
- **Different sensitivity:** secret names and readiness versus public schema.

The only link between them is a feature flag. For example, a form section requires the `forms` feature, and the manifest can say so by name.

### 9.3 Dependencies and milestone

- **Template, first:** task 227, the registry and diagnostics. It's useful before Foundation exists, as a pre-launch check for real sites (31, 125).
- **Foundation:** core (201), the new-site wizard (208), the verification and health views (209), provisioning credentials (199, 211), and the Vercel token scope spike (129).
- **Milestone:** **MS, Settings and Configuration Manager,** inside stage FX rather than a new stage, because its interface and secure writes are Foundation's. Its Foundation tasks are specified when 201 exists, not now, so no speculative tasks are created. Tasks 208 and 209 gain a dependency on 227.

## 10. The three user experiences

In each journey:

- **Auto** happens without anyone acting;
- **UI** needs a visual interface;
- **Judgement** needs a person;
- **Reuse** is what already exists;
- **Build** is what has to be developed.

### 10.1 Agency designer: from project creation to launch

| Step                             | Auto                                | UI                                | Judgement                         | Reuse                                    | Build           |
| -------------------------------- | ----------------------------------- | --------------------------------- | --------------------------------- | ---------------------------------------- | --------------- |
| 1. Create the project            | Provisioning steps and verification | Foundation wizard                 | The plan and the client's tier    | Setup wizard (10), scripted launch (199) | Foundation (FX) |
| 2. Start the design              | Recipe or template seeding          | Studio                            | Choosing the recipe               | Page templates (120)                     | Recipes (197)   |
| 3. Import a reference (optional) | A proposal with a gap list          | Proposal review                   | **What to keep, change or build** | —                                        | 215, 220, 221   |
| 4. Compose pages                 | Hidden invalid options              | Studio, Presentation              | Layout rhythm                     | Families, presets, slots (193, 213)      | Slot registry   |
| 5. Site-wide refinement          | Derived colours, contrast checks    | Brand colours and Design settings | **Taste**                         | Brand colours (78)                       | 216–218         |
| 6. Bespoke elements              | —                                   | Code editor                       | **Design**                        | `new:section`, `SectionFrame`            | Per site (14)   |
| 7. Client review                 | —                                   | Protected preview, Presentation   | Client feedback                   | Preview pass (118)                       | —               |
| 8. Launch                        | `launch:check`, the marker, health  | Launch screen                     | Go or no-go                       | 121–125, 187, 189                        | —               |

### 10.2 Client editor: from opening the site to publication

| Step                                                           | Auto                                       | UI                           | Judgement            | Reuse              | Build                       |
| -------------------------------------------------------------- | ------------------------------------------ | ---------------------------- | -------------------- | ------------------ | --------------------------- |
| 1. Open Studio                                                 | Role-aware structure                       | Start here                   | —                    | 26, 27             | —                           |
| 2. Find the page                                               | —                                          | Presentation (click to edit) | —                    | 163, 183           | —                           |
| 3. Make a content change (text, picture, button, slot content) | Length and image guidance, validation      | Form beside Preview          | Wording              | 23, 161, 162, 175  | Client-editable slots (193) |
| 4. Preview                                                     | —                                          | Desktop and mobile           | —                    | Presentation       | —                           |
| 5. Request publication                                         | Saved as a draft; added to the review list | "Sent to Currawong" message  | —                    | —                  | 205, 206                    |
| 6. Agency publishes                                            | Protected-field diff                       | Review dialog                | **Accept or adjust** | Publish validation | 206                         |

**Clients never see design controls, proposals or the audit.** They see Content health's plain items, which are read-only.

### 10.3 Website optimisation: from a problem to a measured result

| Step                      | Auto                                                    | UI                                                 | Judgement                                 | Reuse                   | Build    |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------- | ----------------------- | -------- |
| 1. Detect                 | Daily health, page audit, content health                | The health issue, the audit output, Content health | —                                         | 28, 189, content health | 223, 225 |
| 2. Review the evidence    | —                                                       | The finding, with evidence and caveats             | **Is it real? Does it matter?**           | —                       | 223      |
| 3. Propose an improvement | A suggested value (deterministic or AI Assist)          | Studio draft                                       | **Wording and intent**                    | AI Assist presets (35)  | —        |
| 4. Approve and publish    | —                                                       | Publish dialog                                     | ✔                                         | 24, 206                 | —        |
| 5. Record                 | Captures before, after and revision                     | "Record improvement"                               | Expected signal                           | —                       | 224      |
| 6. Measure                | A re-check now; Search Console comparison after 28 days | The improvement record; Foundation later           | **Interpreting it, with the confounders** | —                       | 226, 210 |

## 11. Future extensibility, and what's deliberately not built

- **When a second consumer appears,** the rule library and structured-data module can move into a package (`@currawong/sanity-next-core`, task 58). Until then they stay copy-in source, as `docs/template-packaging.md` says.
- **New entity types** (products, courses) are added as typed documents with a graph node builder, following §3 of E2.
- **Not built:**
  - a second CMS in Foundation;
  - a microservice for audits or AI;
  - a separate design database;
  - a client-facing analytics dashboard before the evidence model is proven.
