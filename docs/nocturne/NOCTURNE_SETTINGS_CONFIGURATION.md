# Nocturne Settings, Configuration and Feature Setup (Document S1)

**Status:** **approved by the owner on 26 October 2026** (S-D1 to S-D8), with six refinements. This is **revision r2**. The refinements are in [§R](#r-revision-r2-the-approved-refinements), and they take precedence over anything earlier in the document that they contradict. The tasks are published as **build plan v21**. Nothing is implemented yet.

**Builds on:**

- [E3 §9, Settings and Configuration Manager](./NOCTURNE_PRODUCT_ARCHITECTURE.md), approved on 26 October;
- task 227, in [E4](./NOCTURNE_DE_CI_ROADMAP_INTEGRATION.md) §4 and plan v20.

This document doesn't replace E3 §9. It audits the real repository against it, corrects it where the code disagrees, and turns it into a staged plan.

**Audited:** `origin/main` at `1ebb16b` (PR #103, the health workflow). Your local `main` is one merge behind, so `health.yml` isn't in your working tree yet. Run `git pull` before starting any task below.

---

## Contents

- [Summary: what the audit changed](#summary-what-the-audit-changed)
- [R. Revision r2: the approved refinements](#r-revision-r2-the-approved-refinements)
- [A. Configuration architecture audit](#a-configuration-architecture-audit)
- [B. Recommended architecture](#b-recommended-architecture)
- [C. Settings UX specification](#c-settings-ux-specification)
- [D. Development plan](#d-development-plan)
- [E. Implementation approval brief](#e-implementation-approval-brief)

---

## Summary: what the audit changed

The approved direction in E3 §9 holds up. The registry belongs in the template, and Foundation writes to providers. Studio never edits configuration. But eight findings from the code change the details or the order of the work.

1. **Foundation doesn't exist yet.** Task 199 still needs the repository approval, and the Foundation core (201) is in Phase 4. So any Settings screen that can _write_ configuration is many sessions away. The first useful slice must be **read-only and guided, inside the template**.
2. **On Vercel, every environment variable change needs a new deployment.** That's true whether the code reads the value at build time or at request time, because Vercel applies changes only to new deployments ([Vercel docs](https://vercel.com/docs/environment-variables/managing-environment-variables)). Only Sanity documents and Edge Config change a running site. Every screen must say this honestly.
3. **`/api/site-info` is prerendered.** It reports the environment the _build_ saw, not what's in Vercel now. That's useful: it means "what's live". But it can't tell you that a value was saved and not yet deployed. Only a provider API can.
4. **A green Health run can be a skip.** When setup is missing, `health.yml` skips with a notice and _succeeds_. Backup, retention and the Sanity workflows follow the same pattern. A misconfigured monitor therefore looks exactly like a healthy one. This is the most important thing for the first slice to fix.
5. **The environment is documented in three hand-kept places, and they've drifted.** `.env.example` has 55 names. The README's Vercel checklist, which calls itself "the single source of truth", lists 35. Twenty are missing from it, including every members/auth variable, `ENQUIRIES_STORE` and the Loops and Mailchimp keys. This drift is direct evidence that the registry should generate the docs.
6. **No server route authenticates a Studio user,** and none should. `/api/site-info` and `/api/ops-notices` are public by design. A Studio "edit settings" screen would need a new privileged write path on every public website. **I recommend never building one.**
7. **Several values are set twice in different providers, and can drift apart:**
   - the Sanity project ID and dataset, in Vercel, in GitHub variables and in `.env.local`;
   - the site URL, as `NEXT_PUBLIC_SITE_URL` in Vercel and `PRODUCTION_URL` in GitHub;
   - `ENQUIRIES_STORE`, in Vercel and in GitHub;
   - the revalidate secret, in Vercel and in the Sanity webhook.
8. **`VERCEL_API_TOKEN` sits in the website's runtime environment,** for Edge Config redirects. Vercel now offers **project-scoped tokens** ([changelog](https://vercel.com/changelog/project-scoped-tokens), [docs](https://vercel.com/docs/accounts/access-tokens)). The README should require one. Then `VERCEL_TEAM_ID` becomes unnecessary, because a scoped token implies its team.

**Corrections to the approved task 227:**

- **(a) Diagnostics don't go in an issue.** Requirement 5 says the health workflow reports missing setup "in the issue". That would open an issue every day on every repo where monitoring is deliberately off, including the template itself. Setup gaps belong in a structured result and the job summary. The issue stays for real failures.
- **(b) Split it.** It's two sessions in E4, and it covers about 12 features plus the README generation. Split it into 227, the contract with the first three features, and a new task, 233, for the rest.

---

## R. Revision r2: the approved refinements

The owner approved S-D1 to S-D8 on 26 October 2026, with the six refinements below. **Where this section disagrees with a later one, this section wins.** The later sections and prompts have been edited to match.

### R.1 `/api/site-info` is minimal; detailed diagnostics need authentication

**The problem.** Today's public `/api/site-info` already says more than its consumers need. And r1 would have added reason codes like `missing:TURNSTILE_SECRET_KEY`, which tell anyone on the internet which security credential is absent.

**The audit.** The only consumer of `/api/site-info` in the repository is `launch:check`. It reads `launch.status` and `launch.homepage`. No Ops dashboard exists.

| Field today                          | Who needs it                                                             | Disclosure                                               | Decision             |
| ------------------------------------ | ------------------------------------------------------------------------ | -------------------------------------------------------- | -------------------- |
| `launch.status`, `launch.homepage`   | `launch:check`, the health workflow                                      | Already observable: the temporary page is what `/` shows | **Stays public**     |
| `templateVersion`                    | Foundation, which can read it from GitHub at the deployed commit instead | Fingerprints the release, and so its known bugs          | Moves to diagnostics |
| `tier`                               | Nobody outside the agency                                                | Commercial information                                   | Moves to diagnostics |
| `enabled` (the profile switches)     | Nobody outside the agency                                                | Feature inventory                                        | Moves to diagnostics |
| `features` (configured booleans)     | Nobody outside the agency                                                | **Shows which integrations are broken or missing**       | Moves to diagnostics |
| `commit`, `builtAt`                  | Foundation, which gets them from the Vercel API                          | Deployment metadata                                      | Moves to diagnostics |
| r1's proposed `readiness` with codes | The agency                                                               | **Names missing credentials**                            | **Never public**     |

**The result:**

- **Public `/api/site-info` becomes `{ schema: 2, launch: { status, homepage } }`.** It stays prerendered. That's a breaking change to the response shape, so it gets a CHANGELOG note. The only consumer, `launch:check`, is unaffected.
- **Agency diagnostics** come from three authenticated contexts only:
  1. **Local tooling.** `config:check` reads the local environment. `config:check --github` uses a read-only GitHub token (task 231).
  2. **Foundation.** It computes readiness from provider APIs: Vercel's variable names, targets and `updatedAt`, and GitHub. It needs no endpoint on the site.
  3. **Studio, through a protected route:** `GET /api/setup-status` (task 232). The server verifies the caller's Sanity identity **and** agency role with Sanity, on every request, before answering. Responses are `private, no-store`, and the token is never logged.
- **Verify first, and fail closed.** Nothing in the code verifies a Studio user on the server today, and the publish-gate spike (190) lists the same question as unknown. So task 232 starts by proving the mechanism: the user's Sanity token reaches the route, and Sanity's user endpoint returns that user's roles. **If it can't be proven,** the route isn't built, and the pane shows only the static explanations from the registry, plus "check with `config:check` or Foundation". It never shows readiness taken from a public source.
- **A hidden pane is not the boundary.** The authorisation boundary is the server-side identity check. Hiding the pane from clients is only for relevance.

### R.2 Monitoring states

**For each run,** `health-result.json` (schema 1) records the run's `outcome`. Readers then add **Stale** and **Unknown**. That gives exactly the eight states you asked for:

| State                         | How it's decided                                                                                                                                                                                                    | Shown as                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Intentionally disabled**    | The repository variable `HEALTH_CHECKS` is `off`, optionally with `HEALTH_CHECKS_REASON`. Outcome `disabled`. Use it on the template repo, scratch repos and forks                                                  | Neutral, with the reason   |
| **Expected but unconfigured** | Not disabled, and required setup is missing. Outcome `unconfigured`, with `setup.missing`. **The default for a repo that hasn't been set up,** so turning monitoring off is always an explicit choice               | **A problem**              |
| **Configured but skipped**    | Setup is present, but no checks ran: the run was cancelled, timed out before the checks, or was superseded. Outcome `skipped`, with `skipReason`. Readers also count a cancelled or skipped run with no result file | **A problem**              |
| **Healthy**                   | Checks ran, with no failures and no warnings. Outcome `healthy`, with `mode: 'live'` or `'prelaunch'`                                                                                                               | Good                       |
| **Warning**                   | Checks ran, with warnings only                                                                                                                                                                                      | Attention                  |
| **Failed**                    | Any failure, including a check that broke before it finished (today's "launch:check printed no results" line)                                                                                                       | **A problem**              |
| **Stale**                     | The newest real result is older than 36 hours, or GitHub has paused or disabled the workflow when `HEALTH_CHECKS` isn't `off`                                                                                       | **A problem**              |
| **Unknown**                   | The reader can't see GitHub (Studio, or no token), or no run has happened yet                                                                                                                                       | Neutral, with how to check |

**Rules:**

- **A green run is never shown as health.** Only `healthy` and `warning` results from **non-synthetic** runs count. Runs stay green for `disabled`, `unconfigured` and `skipped`, so the template and forks don't go red. But the job summary and a `::warning::` annotation say plainly that nothing was checked, and every reader uses the result file, not the run's colour.
- **Pre-launch sites get real checks.** When `/api/site-info` says `prelaunch`, the workflow runs `launch:check --prelaunch`, which proves the site is private, instead of the live checks. Its result has `mode: 'prelaunch'`.
- **Synthetic failure tests never create real incidents:**
  - A `workflow_dispatch` input, `synthetic: true`, runs the checks, writes a result with `synthetic: true`, and puts the issue it _would_ have written into the job summary. It never opens, edits or closes an issue. Readers ignore synthetic results.
  - Every state is unit-tested with fixtures, with no network.
  - Any test that needs a real issue runs on a **scratch repository**, never on a client's repo.
  - The README's "Trying it" advice, which today opens the real issue, is replaced.

### R.3 The core build gate: safeguards

**Principle:** the gate adds **no new way for a working site to become undeployable**. The only thing it changes on day one is the error message.

| Environment                                      | How it's detected                                                                           | What the gate enforces                                                                                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local `next dev`                                 | Not a build                                                                                 | Nothing. The setup wizard and `env.ts` handle it, as today                                                                                                                                                   |
| Local `npm run build`                            | No `VERCEL_ENV`, no `CI`                                                                    | The **enforced core set** only                                                                                                                                                                               |
| CI and fake-data builds (`ci.yml`, e2e, typegen) | `CI`, `SANITY_API_HOST`, or a placeholder project ID such as `ci-placeholder` or `e2etest1` | The enforced core set only. Placeholders are accepted. **A real-service setting is never required**                                                                                                          |
| Vercel Preview                                   | `VERCEL_ENV=preview`                                                                        | The enforced core set. Production-only settings are **warnings**                                                                                                                                             |
| Vercel Production                                | `VERCEL_ENV=production`                                                                     | The enforced core set. Settings marked `requiredIn: ['production']` (for example `SANITY_API_READ_TOKEN`) are **warnings in the release that introduces them**, and enforced only from a later minor version |

**The safeguards:**

1. **The first enforced core set is exactly what fails today:** `NEXT_PUBLIC_SANITY_PROJECT_ID` and `NEXT_PUBLIC_SANITY_DATASET`, which `env.ts` already throws on. So the gate creates zero new failure modes. It only replaces a stack trace with plain English.
2. **Promotion is deliberate.** A setting joins the enforced set only with `tier: 'core'` and `enforceFrom: '<version>'`, after at least one minor release in which it's a warning, and with a release note. Task 234's release rule refuses anything else.
3. **Optional features never gate a build, in any environment.**
4. **Readiness compatibility test.** Environment fixtures that were _ready_ under the previous release's registry must still be ready under the new one, unless a deprecation window is declared. This stops an update from quietly switching off a working form because the feature gained a requirement.
5. **Emergency override.** `NOCTURNE_CONFIG_GATE=warn` turns the gate's failures into loud warnings, so an urgent fix can still ship. It can't bypass `env.ts`, because a build truly can't work without those two values.
6. **On Vercel,** a failed build never replaces the live deployment, so a gate failure leaves production as it was. The message says so, names each setting, and says where to set it. It never prints a value.

### R.4 Vercel project-scoped tokens: test before changing anything

The new task **235** is a spike on a scratch Vercel project and scratch Edge Config store. It doesn't touch production credentials. It tests every operation Nocturne needs with a **project-scoped** token, against a team token:

1. The Edge Config item `PATCH` that `src/lib/edge-config-sync.ts` sends. Edge Config stores are **team-level** resources, and Vercel says project-scoped tokens deny team-level requests, **so this may fail.**
2. Listing environment variables, and creating and upserting them, including the Secret type.
3. Creating a deployment or redeploying, and listing deployments with their commit.
4. The domain operations task 129 needs.
5. What else the token _can_ do. This measures the blast radius.

**Until 235 reports:**

- `VERCEL_TEAM_ID` stays;
- the README makes no new token requirement;
- task 233's Vercel cleanups wait.

**Security implications that hold whatever 235 finds**, now recorded in §B.6:

- A write-capable Vercel token in a public website's runtime is a standing risk. If the runtime is compromised (a server-side request forgery bug, a vulnerable dependency, a leaked log), the token can change that project's environment, deployments and possibly domains.
- **Project-scoped narrows the blast radius to one project. It doesn't make the token read-only or harmless.**
- The mitigations, in order:
  1. **Page-route redirects stay the default.** They need no token.
  2. Edge Config redirects only on sites whose traffic needs them.
  3. The narrowest token 235 proves works, rotated on staff change and at least yearly.
  4. If 235 finds no narrow enough option, move the sync out of the runtime: a publish webhook triggers a GitHub workflow or Foundation, which holds the token instead.

### R.5 The editing experience stays the goal: Foundation acceptance criterion

The read-only first slice doesn't change the product requirement:

> **I want to add, update and verify supported configuration through the Nocturne UI without manually editing environment files.**

**Milestone MS isn't done until this passes:**

> From Foundation's local browser interface, configure **one real integration**:
>
> 1. securely save its settings to the right provider;
> 2. verify the provider accepted them;
> 3. show whether the configuration is live;
> 4. provide the required deployment action.
>
> All of it without manually editing an environment file.

**The first integration is Daily Health Monitoring.**

- **Settings:** two GitHub variables and one sealed secret. The Viewer token is minted with the Sanity session, or pasted in and tested.
- **"Accepted"** is proven by GitHub's `updated_at`.
- **The deployment action** is **Run now**. "Live" is proven by a non-synthetic `health-result.json` showing anything other than `unconfigured`.

The next integration, contact forms in Vercel, adds a redeploy and confirmation of what's live (MS-c).

**Narrow and secure:**

- no generic secrets editor;
- no stored client secrets;
- local only, with Host, Origin and CSRF checks;
- every write audited, without its value.

### R.6 The roadmap update (v21)

Applied as approved, with these refinements folded in:

- **Six new tasks, 230–235.** 235 is the token spike from R.4. 230–234 now carry R.1–R.3.
- **227** revised.
- Changes to tasks **30, 31, 129, 200 and 209**.
- **Milestones:** MS0 in stage `f`, and MS in stage `fx` with the R.5 criterion.

See §D and the patch in `docs/nocturne/s1-canonical-patch/`.

---

## A. Configuration architecture audit

### A.1 Where configuration lives today

| Store                                         | What's in it                                                                                                                                                                                                                      | Who changes it          | Takes effect             |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ------------------------ |
| **Vercel environment variables**              | Every app variable in §A.2. Targets: Production, Preview, Development                                                                                                                                                             | Agency, in Vercel       | **Next deployment only** |
| **`.env.local`**                              | Local copies. The setup wizard (`scripts/setup/`) writes the six Sanity-core values, then deletes itself                                                                                                                          | Developer               | Next `npm run dev`       |
| **GitHub repository variables and secrets**   | What the scheduled and CI workflows use (§A.3)                                                                                                                                                                                    | Agency, in GitHub       | Next workflow run        |
| **`site.profile.ts`** (code)                  | Feature switches, the launch state, the client name and slug, tier, `clientSections`, help links                                                                                                                                  | Reviewed commit         | Next deployment          |
| **`studio-brand.json`, `tokens.json`** (code) | CMS brand; the public design tokens                                                                                                                                                                                               | Reviewed commit         | Next deployment          |
| **Sanity singletons** (content)               | `siteIdentity` (SEO defaults, with the agency-only launch verification marker under _Advanced_), `businessInfo`, `siteNavigation`, `announcement`, `cookieBanner`, `designSettings`. Plus `redirect`, `experiment`, `stripePrice` | Editors, by role        | **Live, on publish**     |
| **Vercel Edge Config**                        | The redirect map, synced on publish (`src/lib/edge-config-sync.ts`)                                                                                                                                                               | The site, automatically | Live                     |
| **Vercel system variables**                   | `VERCEL_ENV`, `VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_GIT_COMMIT_SHA`                                                                                                                                                            | Vercel                  | Per deployment           |

**Existing settings UI:**

- Studio's **Website settings** group, which holds the singletons, plus a read-only **Launch & visibility** pane (`src/features/studio/launch/`). That pane has no document behind it. It's the right precedent for a read-only "Features & setup" pane.
- **Start here**, which shows Ops notices.
- **AI settings**, per-editor Assist preferences, agency-only.
- **Content health**, agency-only.
- The local **setup wizard**. It's a browser form on 127.0.0.1 with Host and Origin checks, and it's the precedent for a safe local setup tool.

**Existing readiness logic** (task 227 reuses it):

- `getFormsConfig` and `getCheckoutConfig` return `missing[]`;
- `getWebhookConfig` returns `missing[]`;
- `getEnquiryConfig` returns `missing`;
- `getNewsletterConfig`;
- `enabledProviders`;
- `canSyncRedirects`;
- `hasConsentProviders`;
- `sentryDsn`.

All of them are pure functions over `env`. Most have no imports, so a script can load them with `jiti`, which is already a devDependency. The exception is `src/lib/preview-pass.ts`, which imports `server-only` and can't be loaded from a script. Its readiness check has to move into a small pure module.

### A.2 Application variables (Vercel and `.env.local`)

**Key:**

- **Kind:** `pub` = `NEXT_PUBLIC_`, inlined into browser bundles; `srv` = server-only, not secret; `sec` = secret.
- **When:** `B` = read at build time (inlined); `R` = read at request time. On Vercel, both need a redeploy (finding 2).
- **UI path** is the recommended way to manage the value without editing files:
  - `F-write` = Foundation writes it to the provider;
  - `F-gen` = Foundation generates it, so nobody types it;
  - `code` = it belongs in a committed file;
  - `remove` = it can be eliminated.

| Variable                                                                                                                                                                                                         | Feature                   | Kind            | When        | Req.                                       | Default                                       | Notes                                                                                  | UI path                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | --------------- | ----------- | ------------------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`                                                                                                                                                                                  | Sanity core               | pub             | B           | **Yes** (build throws)                     | —                                             | Set in **three** places (Vercel, GitHub variable, `.env.local`)                        | F-write at provisioning                           |
| `NEXT_PUBLIC_SANITY_DATASET`                                                                                                                                                                                     | Sanity core               | pub             | B           | **Yes** (build throws)                     | none in the app; `production` in workflows    | Inconsistent default                                                                   | F-write                                           |
| `NEXT_PUBLIC_SANITY_API_VERSION`                                                                                                                                                                                 | Sanity core               | pub             | B           | No                                         | `2026-10-01`                                  | A code constant that's "bumped deliberately". It shouldn't be an environment variable  | **remove** → code                                 |
| `SANITY_API_READ_TOKEN`                                                                                                                                                                                          | Sanity core               | sec             | R           | **Yes in practice** (datasets are private) | —                                             | Viewer role. Reaches the browser only in draft mode                                    | F-write (Sanity CLI mints it, as the wizard does) |
| `NEXT_PUBLIC_SITE_URL`                                                                                                                                                                                           | Site                      | pub             | B           | Production                                 | Vercel production URL, then localhost         | Duplicated by GitHub's `PRODUCTION_URL`                                                | F-write                                           |
| `NEXT_PUBLIC_SITE_LANGUAGE`                                                                                                                                                                                      | Site                      | pub             | B           | No                                         | `en`                                          | A per-site constant                                                                    | code (`site.profile.ts`), decision S-D7           |
| `NEXT_PUBLIC_STUDIO_TITLE`                                                                                                                                                                                       | Studio brand              | pub             | B           | No                                         | Nocturne                                      | **Duplicates** the name in `studio-brand.json`, which wins over it                     | **remove** → `studio-brand.json`                  |
| `SITE_LAUNCH_OVERRIDE`                                                                                                                                                                                           | Launch                    | srv             | R           | No                                         | —                                             | Emergency "hide now". Can only hide. In the README, not `.env.example`                 | Keep as an environment variable, documented       |
| `SANITY_REVALIDATE_SECRET`                                                                                                                                                                                       | Webhook mode              | sec             | R           | No                                         | live mode                                     | Must equal the Sanity webhook's secret: **two places**                                 | **F-gen** for both                                |
| `INDEXNOW_KEY`                                                                                                                                                                                                   | IndexNow                  | pub by protocol | R           | No                                         | —                                             | Served at `/api/indexnow/<key>`. Needs webhook mode                                    | F-gen                                             |
| `EDGE_CONFIG`                                                                                                                                                                                                    | Redirects                 | sec             | R           | No                                         | page-route redirects                          | Vercel adds it when you connect a store. It contains a read token                      | Vercel-managed                                    |
| `EDGE_CONFIG_ID`                                                                                                                                                                                                 | Redirects                 | srv             | R           | With `VERCEL_API_TOKEN`                    | —                                             | Probably derivable from `EDGE_CONFIG`, which embeds the `ecfg_` id **[verify]**        | remove if derivable                               |
| `VERCEL_API_TOKEN`                                                                                                                                                                                               | Redirects                 | sec             | R           | No                                         | —                                             | **A broad token in a public site's runtime.** Require a project-scoped token           | F-write, scoped                                   |
| `VERCEL_TEAM_ID`                                                                                                                                                                                                 | Redirects                 | srv             | R           | Team stores                                | —                                             | Unneeded with a project-scoped token                                                   | remove                                            |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                                                                                                                                                                                 | Forms                     | pub             | B           | For forms                                  | —                                             |                                                                                        | F-write                                           |
| `TURNSTILE_SECRET_KEY`                                                                                                                                                                                           | Forms                     | sec             | R           | For forms                                  | —                                             |                                                                                        | F-write                                           |
| `RESEND_API_KEY`                                                                                                                                                                                                 | Forms, newsletter         | sec             | R           | For forms                                  | —                                             |                                                                                        | F-write                                           |
| `FORMS_FROM_EMAIL`                                                                                                                                                                                               | Forms                     | srv             | R           | For forms                                  | —                                             | Must be a verified Resend sender                                                       | F-write                                           |
| `ENQUIRIES_STORE`                                                                                                                                                                                                | Enquiries                 | srv             | R           | No                                         | off                                           | **Also a GitHub variable**, only so the health workflow knows                          | F-write; drop the GitHub copy (task 230)          |
| `SANITY_WRITE_TOKEN`                                                                                                                                                                                             | Enquiries, Stripe webhook | sec             | R           | With either                                | —                                             | Editor role. **Also a GitHub secret** for retention                                    | F-write (both)                                    |
| `NEWSLETTER_PROVIDER`, `NEWSLETTER_RESEND_SEGMENT_ID`, `LOOPS_API_KEY`, `LOOPS_MAILING_LIST_ID`, `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`                                                                        | Newsletter                | srv/sec         | R           | One provider's set                         | —                                             | `*_API_KEY` values are secrets                                                         | F-write                                           |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`                                                                                                                                                                     | Pricing                   | sec             | R           | For pricing                                | —                                             | The webhook secret comes from Stripe's endpoint                                        | F-write                                           |
| `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`                                                                                                                                                                        | Pricing                   | srv             | R           | No                                         | `/?checkout=success`; the page they came from | Content-like                                                                           | Sanity candidate (later)                          |
| `PREVIEW_ACCESS_SECRET`, `PRELAUNCH_PREVIEW_TOKEN`                                                                                                                                                               | Pre-launch                | sec             | R           | No                                         | no passes                                     | Rotating revokes passes, by design                                                     | **F-gen**                                         |
| `STYLEGUIDE_PREVIEW_TOKEN`                                                                                                                                                                                       | Style guide               | sec             | R           | No                                         | 404                                           | **Preview target only.** The README table says "Production and Preview" for every row  | F-gen (Preview only)                              |
| `FLAGS_SECRET`                                                                                                                                                                                                   | A/B tests                 | sec             | R           | For experiments                            | no experiments                                | Read by the `flags` library and the proxy                                              | **F-gen**                                         |
| `EXPERIMENT_CACHE_SECONDS`                                                                                                                                                                                       | A/B tests                 | srv             | R           | No                                         | 60                                            | An infrastructure tuning knob                                                          | Keep as an environment variable                   |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_GA_ID`                                                                                                       | Analytics                 | pub             | B           | No                                         | none, so no banner                            | Public IDs, but whoever controls them receives visitor analytics                       | F-write; Sanity is possible later (decision S-D7) |
| `AUTH_SECRET`                                                                                                                                                                                                    | Members                   | sec             | R           | For members                                | —                                             | Read by Auth.js                                                                        | **F-gen**                                         |
| `AUTH_GITHUB_ID/SECRET`, `AUTH_GOOGLE_ID/SECRET`                                                                                                                                                                 | Members                   | srv/sec         | R           | One pair                                   | —                                             | Created in the OAuth provider's console                                                | F-write (guided)                                  |
| `AUTH_ALLOWED_EMAILS`                                                                                                                                                                                            | Members                   | srv             | R           | No                                         | anyone who can sign in                        | **An access-control list.** Keep it out of Sanity, where an editor could widen access  | F-write                                           |
| `AUTH_TRUST_HOST`                                                                                                                                                                                                | Members                   | srv             | R           | Off Vercel                                 | —                                             |                                                                                        | Keep                                              |
| `SENTRY_DSN`, `SENTRY_TRACES_SAMPLE_RATE`                                                                                                                                                                        | Error tracking            | pub (mapped)    | B           | No                                         | off; 0.1                                      | `next.config.ts` copies them into `NEXT_PUBLIC_SENTRY_*` at build                      | F-write                                           |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`                                                                                                                                                              | Error tracking            | sec/srv         | **B only**  | No                                         | no source maps                                | Build-time upload                                                                      | F-write (Vercel build env)                        |
| `OPS_NOTICES_URL`, `OPS_NOTICES_KEY`                                                                                                                                                                             | Start here                | srv/sec         | R           | No                                         | panel skipped                                 | **Dormant:** no Ops endpoint exists, and Foundation v0 is local, so it can't serve one | Keep, marked dormant                              |
| `PSI_API_KEY`, `VERCEL_AUTOMATION_BYPASS_SECRET`                                                                                                                                                                 | `launch:check`            | sec             | Local or CI | No                                         | PageSpeed skipped                             | **Not in `.env.example`**                                                              | Document it                                       |
| `FORMS_TEST_MODE`, `AUTH_TEST_MODE`, `AUTH_TEST_PASSWORD`, `SANITY_API_HOST`, `STRIPE_API_HOST`, `E2E_*`, `STUDIO_PERF_*`, `NEXT_DIST_DIR`, `FAKE_SANITY_PORT`, `PORT`, `CI`, `NODE_ENV`, `NO_COLOR`, `BUILT_AT` | Tests and tooling         | —               | —           | —                                          | —                                             | Test modes are already ignored on Vercel production, in code                           | Registry ignore list                              |

**Unused variables:** none. Every name in `.env.example` is still read somewhere.

**Values that can be eliminated:**

- `NEXT_PUBLIC_SANITY_API_VERSION`, as a code constant;
- `NEXT_PUBLIC_STUDIO_TITLE`, in favour of `studio-brand.json`;
- `VERCEL_TEAM_ID`, with a project-scoped token;
- probably `EDGE_CONFIG_ID` **[verify]**;
- the `ENQUIRIES_STORE` GitHub variable.

### A.3 GitHub Actions variables and secrets

| Name                                                     | Type     | Used by                                     | Notes                                                                        |
| -------------------------------------------------------- | -------- | ------------------------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`                          | variable | sanity, backup, retention, health           | A copy of the Vercel value                                                   |
| `NEXT_PUBLIC_SANITY_DATASET`                             | variable | the same                                    | Defaults to `production`                                                     |
| `PRODUCTION_URL`                                         | variable | health                                      | A copy of the site URL                                                       |
| `ENQUIRIES_STORE`                                        | variable | health                                      | A copy of the Vercel value; remove it (task 230)                             |
| `ENQUIRY_RETENTION_DAYS`                                 | variable | retention                                   | Default 365                                                                  |
| `BACKUP_S3_REGION`, `BACKUP_S3_PREFIX`                   | variable | backup                                      |                                                                              |
| `SANITY_AUTH_TOKEN`                                      | secret   | backup, health                              | Viewer. **One secret shared by two workflows.** Fine, because both only read |
| `SANITY_DEPLOY_TOKEN`                                    | secret   | sanity (schema deploy on push)              | Editor                                                                       |
| `SANITY_MIGRATION_READ_TOKEN`                            | secret   | sanity (migration dry run on pull requests) | Viewer                                                                       |
| `SANITY_WRITE_TOKEN`                                     | secret   | retention                                   | Editor. A copy of the Vercel value                                           |
| `BACKUP_S3_BUCKET`, `BACKUP_S3_ENDPOINT`                 | secret   | backup                                      | Not really secret. Stored as secrets, they can't be displayed or checked     |
| `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | secret   | backup                                      |                                                                              |

`ci.yml` and `visual-baselines.yml` need nothing, because they use the fake Content Lake.

**Scheduled workflows** and their schedules (UTC):

| Workflow  | Schedule     |
| --------- | ------------ |
| health    | 20:00 daily  |
| backup    | 03:00 Sunday |
| retention | 04:00 Monday |

Each one skips with a notice and _succeeds_ when its setup is missing.

### A.4 Weaknesses, ranked

| #   | Weakness                                                                                                                                                                                                                                                                            | Effect                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| W1  | **Green skips.** A scheduled workflow with missing setup succeeds                                                                                                                                                                                                                   | "Monitoring is on" can't be told apart from "monitoring is silently off"    |
| W2  | **Three hand-kept copies of the environment docs,** already 20 names out of step                                                                                                                                                                                                    | Setup follows an incomplete checklist                                       |
| W3  | **The same values in two or three providers** (project ID, dataset, site URL, `ENQUIRIES_STORE`, the write token, the revalidate secret)                                                                                                                                            | Silent drift. One copy changes and the other doesn't                        |
| W4  | **Readiness is only partly visible.** `/api/site-info` covers 6 features. Enquiries, webhook mode, redirects sync, pre-launch passes and experiments aren't reported                                                                                                                | Missing setup shows up when a visitor hits it                               |
| W5  | **A broad `VERCEL_API_TOKEN` in a public site's runtime**                                                                                                                                                                                                                           | A compromised runtime could reach other projects                            |
| W6  | **Health checks less than it could.** No PageSpeed key is passed, and no `--expect-marker`, so it doesn't prove CMS → render daily. Notifications are only GitHub's own                                                                                                             | Weaker evidence than `launch:check` can already give                        |
| W7  | **The README's 60-day claim may be wrong for client repos.** GitHub's docs say the automatic disable applies to _public_ repositories ([docs](https://docs.github.com/actions/managing-workflow-runs/disabling-and-enabling-a-workflow)), and client repos are private **[verify]** | Either a needless warning or a real risk. Read the workflow `state` to know |
| W8  | **Small inconsistencies:** dataset defaults differ between the app and the workflows; the Studio title has two sources; the API version is an environment variable; `launch:check` variables aren't in `.env.example`                                                               | Friction and confusion                                                      |
| W9  | **Dormant Ops notices variables** with no endpoint                                                                                                                                                                                                                                  | Documented setup for something that can't be used                           |

---

## B. Recommended architecture

### B.1 The approaches compared

| Approach                                                                                                                                                                                           | Strengths                                                                                                                                                                                                                                                              | Weaknesses                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Verdict                                       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **1. Registry + provider-managed values.** The template declares requirements and reports readiness, without values. Foundation writes values straight into Vercel and GitHub. Studio is read-only | <ul><li>No new secret store.</li><li>Providers keep encryption, write-only secrets and environment separation.</li><li>Sites stay independent.</li><li>It works today, read-only, and gains writes when Foundation exists.</li><li>It's what E3 §9 approved.</li></ul> | <ul><li>Changes still need a redeploy, and the UI must say so.</li><li>Two provider integrations to maintain.</li><li>A client secret can't be re-tested after saving, because nobody can read it back (§B.6).</li></ul>                                                                                                                                                                                                                                                           | **Recommended**                               |
| **2. A runtime configuration store.** Values in Sanity (non-secret) or an encrypted table. The site reads it per request, and a Studio or Settings page edits it                                   | <ul><li>Changes without a redeploy.</li><li>One editing screen.</li></ul>                                                                                                                                                                                              | <ul><li>**Sanity is not a secret store.** Every Viewer token and Studio user can read the dataset, and a plan downgrade makes datasets public.</li><li>An encrypted store means a new database, key management and a dependency every site needs at runtime. That breaks "sites never depend on Foundation".</li><li>Studio editing needs a privileged write path on every public site.</li><li>It moves build-time values nowhere: `NEXT_PUBLIC_*` still needs a build.</li></ul> | Rejected for secrets and infrastructure       |
| **3. A local configuration tool in the template.** Like the setup wizard: a browser form that writes to Vercel and GitHub from the developer's machine                                             | <ul><li>Writes are available sooner.</li></ul>                                                                                                                                                                                                                         | <ul><li>Duplicates Foundation's provider modules (199, 201) in every client repo.</li><li>Needs provider tokens on every developer machine and in every repo's tooling.</li><li>GitHub secrets need libsodium sealed boxes, a dependency the dependency-free template scripts avoid.</li></ul>                                                                                                                                                                                     | Not now. Reconsider only if Foundation stalls |

**Where approach 2 is right:** a few non-secret values that behave like content. The candidates are `STRIPE_SUCCESS_URL` and `STRIPE_CANCEL_URL`, and possibly the analytics IDs. These can move into Sanity later, case by case (decision S-D7). Nothing has to move now.

### B.2 The layers

```
TEMPLATE (every client repo, versioned with releases)
  src/features/<f>/config.registry.ts   declarations: settings, kind, where, targets, since. NEVER values
  src/features/<f>/utils/*config.ts     readiness (existing get*Config functions, unchanged)
  ├─ npm run config:check               local/CI: table, plain English; --strict; --live; --github; --since
  ├─ prebuild core gate                 enforced core set only (§R.3) → a failed build leaves the old deployment live
  ├─ /api/site-info (PUBLIC)            { schema: 2, launch: { status, homepage } } and nothing else (§R.1)
  ├─ /api/setup-status (PROTECTED)      readiness + reason codes, only for a server-verified agency Studio user
  ├─ health.yml → health-result.json    disabled | unconfigured | skipped | healthy | warning | failed (§R.2)
  ├─ generated: README "Configuration", .env.example
  └─ Studio › Website settings › Features & setup   read-only, reads /api/setup-status (static text if unverified)

FOUNDATION (local first; later hosted). Reads the same registry from the site's template version
  Project › Settings: Overview · Features · Connections · Monitoring · Advanced
  ├─ reads: GitHub (workflow state, variable values, secret names + updated_at, runs, issues),
  │          Vercel (env names/targets/updatedAt, deployments + commit), health-result.json
  └─ writes: Vercel env (upsert, Secret type), GitHub variables + sealed secrets, Sanity webhook,
             then redeploy → confirm via the Vercel deployment (commit, ready) → audit_event (never the value)
```

### B.3 The typed registry

It's a typed module per feature. It's **not a plugin system**: no loading, no hooks, no runtime registration. It extends E3 §9's shape with the fields that the UI, the docs and upgrades need.

```ts
// src/features/forms/config.registry.ts (pure data + a reference to the existing readiness function)
import { defineFeatureConfig } from '@/config/feature-config' // types + helpers only; no feature imports

export const formsConfig = defineFeatureConfig({
  id: 'forms',
  title: 'Contact forms',
  summary: 'Sends form submissions to your inbox, with a spam check.',
  why: 'Visitors can contact the business without an email address on the page.',
  withoutIt: 'Form sections show "unavailable" to visitors. Nothing else changes.',
  profileFlag: 'forms', // site.profile.ts switch; null for always-on infrastructure
  tier: 'optional', // 'core' fails the build when missing; 'optional' degrades
  since: '1.0.0', // template version that introduced it (upgrade prompts)
  docs: 'README.md#forms-setup',
  settings: [
    {
      name: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
      kind: 'public-env',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: true,
      required: true,
      source: 'Cloudflare → Turnstile → your widget → Site key',
    },
    {
      name: 'TURNSTILE_SECRET_KEY',
      kind: 'secret',
      where: 'vercel',
      targets: ['production', 'preview'],
      buildTime: false,
      required: true,
      source: 'Cloudflare → Turnstile → your widget → Secret key',
    },
    {
      name: 'FORMS_FROM_EMAIL',
      kind: 'server-env',
      where: 'vercel',
      required: true,
      format: 'email-with-name', // a named validator, never a regex string from data
      example: 'Site name <forms@example.com.au>',
    },
    // …
  ],
  readiness: 'getFormsConfig', // resolved by the composer to the existing function
  verify: ['launch-check:forms'], // checks that prove it works (§B.7); may be empty
})
```

**Setting fields:**

- `name`;
- `kind`: `public-env`, `server-env`, `secret`, `github-var`, `github-secret`, `sanity`, `profile` or `system`;
- `where`: `vercel`, `github`, `sanity`, `site.profile.ts` or `local`;
- `targets`;
- `buildTime`;
- `required`, which is `true`, `false` or `{ when: '<other setting or flag>' }`;
- `default`, a description only, never a secret;
- `format`, a named validator;
- `generate`, for example `'hex-32'` or `'base64url-32'`, used by Foundation's F-gen;
- `source`, which says where to get the value;
- `since`;
- `deprecated: { replacedBy, removeIn }`;
- `docs`.

**What the registry generates:**

| Output                                                                      | From                                                  | Task          |
| --------------------------------------------------------------------------- | ----------------------------------------------------- | ------------- |
| `config:check` table and reasons                                            | Settings, plus the readiness functions                | 227           |
| The core gate at build                                                      | `tier: 'core'` settings                               | 227           |
| `getSetupStatus()` (server), behind the protected `/api/setup-status`       | The readiness functions                               | 227, 232      |
| Studio's Features & setup pane                                              | `/api/setup-status`, plus the registry text in Studio | 232           |
| The README "Configuration" table and `.env.example`                         | Settings                                              | 233           |
| Release notes ("New configuration in 1.9.0")                                | `since` and `deprecated`                              | 234           |
| `blueprint.json` "required environment"                                     | Settings                                              | 200 (changed) |
| Foundation's forms, validation, generation, and the "saved, not live" state | Everything                                            | MS            |

**Guardrails, tested:**

- A completeness test checks that every `process.env` name read under `src/` and `scripts/`, and every `vars.*` and `secrets.*` in `.github/workflows/`, is registered or on the documented ignore list.
- A planted canary secret never appears in `site-info`, `/api/setup-status`, `config:check`, the health result or the generated files.
- The public `site-info` body is tested to contain only `schema` and `launch`.
- Registry files import only types and the helper. They never import `server-only`.

### B.4 Storage: what goes where

| Category                                  | Store                                                                                  | Why                                                                                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Public website settings**            | Sanity singletons, as today                                                            | Editors own them, and they change live. Clients already manage what's safe, gated by roles and, from task 205, `CLIENT_EDITABLE`                                                                              |
| **B. Server runtime options, non-secret** | Vercel environment variables, written by Foundation                                    | Runtime config needs no new store. On Vercel a redeploy is needed anyway. The candidates in §B.1 can move into Sanity case by case                                                                            |
| **C. Secrets**                            | **Vercel "Secret" variables** (write-only after saving) and **GitHub Actions secrets** | Encrypted at rest by the provider, never readable through the API, and separated by environment. Never in Sanity, never `NEXT_PUBLIC_`, never in a Foundation database while local (approved Stage A custody) |
| **D. Build-time values**                  | Vercel environment variables                                                           | `NEXT_PUBLIC_*` and the Sentry build values are inlined or used during `next build`, so changing one needs a rebuild. The UI marks them as build-time                                                         |
| **E. GitHub Actions configuration**       | GitHub variables and secrets                                                           | Workflows can't read Vercel. Keep the copies few and detect drift: project ID, dataset and `PRODUCTION_URL` remain; `ENQUIRIES_STORE` goes                                                                    |
| **F. Local development**                  | `.env.local` for Sanity core, written by the wizard, plus the test modes               | Vercel Secret variables can't be pulled to Development, so local work uses `FORMS_TEST_MODE`, `AUTH_TEST_MODE` and the fake lake. **Bootstrap stays:** a fresh clone needs the wizard once                    |
| **Per-site constants**                    | Code: `site.profile.ts`, `studio-brand.json`                                           | Reviewed and versioned. The candidates to move here are the site language and the Studio title                                                                                                                |

**The honest limit:** most variables don't stop being environment variables. What changes is that **nobody hand-edits them**:

- Foundation writes them, or generates them;
- the registry explains them;
- `config:check` and `site-info` verify them.

### B.5 Provider integration: what can be automated

| Capability                         | GitHub (repo)                                                                                                                                                                                                | Vercel (project)                                                                                                                                                                                      | Sanity                                                                     | Cloudflare (experiment, task 203)                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------- |
| Create and update                  | Variables: plain API. Secrets: sealed with the repo's public key (libsodium), then `PUT`                                                                                                                     | `POST /v10/projects/{id}/env?upsert=true`, with `type` set to Secret for secrets ([API](https://docs.vercel.com/docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables)) | Tokens through the CLI session or Management API; webhooks through the API | Worker secrets through the API or `wrangler secret put` |
| Read back                          | Variables: values. Secrets: **name and `updated_at` only**                                                                                                                                                   | Names, targets and `updatedAt`. Secret values: **never**                                                                                                                                              | Token names and roles, never values                                        | Names only                                              |
| Remove obsolete values             | Yes                                                                                                                                                                                                          | Yes                                                                                                                                                                                                   | Revoke tokens                                                              | Yes                                                     |
| Detect missing configuration       | Yes                                                                                                                                                                                                          | Yes, per target                                                                                                                                                                                       | Partly                                                                     | Yes                                                     |
| Trigger the action that applies it | Not needed: the next run uses it. `workflow_dispatch` tests it now                                                                                                                                           | **A redeploy is required**                                                                                                                                                                            | Not needed                                                                 | A secret change deploys a new version **[verify]**      |
| Verify it took effect              | The next run's `health-result.json`                                                                                                                                                                          | `/api/site-info`: a new `commit` or `builtAt`, and `readiness` true                                                                                                                                   | Query with the token                                                       | —                                                       |
| Least-privilege credential         | Fine-grained token (later a GitHub App) limited to client repos. **Actions** read and write (dispatch, enable), **Variables** read and write, **Secrets** read and write, **Issues** read, **Metadata** read | **Project-scoped tokens** for per-project work. A team token only for creating projects (199)                                                                                                         | The CLI session, or an organisation robot (S1 in task 211)                 | An API token per account                                |

**Never claimed:**

- Foundation doesn't claim a value is "live" until `site-info` proves the new deployment carries it.
- Studio never claims anything about GitHub or Vercel that it can't see.

### B.6 Secret handling

| Concern                   | Control                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At rest                   | Provider-managed: Vercel Secret type, and GitHub secrets. Agency provider tokens sit in Foundation's `.env.local` (Stage A), then a KMS-wrapped envelope when hosted (approved Stage B). **No new credential database for the first slice**                                                                                                                                                                                                                                                                       |
| In transit                | HTTPS to providers. The local Foundation binds to 127.0.0.1                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Ownership                 | Client service keys (Stripe, Resend, Turnstile) belong to the client's accounts and live only in the client's Vercel project. Foundation holds only agency tokens                                                                                                                                                                                                                                                                                                                                                 |
| Least privilege           | §B.5. A project-scoped Vercel token for `VERCEL_API_TOKEN`. Viewer tokens wherever a job only reads                                                                                                                                                                                                                                                                                                                                                                                                               |
| Write-only behaviour      | Secret fields are write-only. After saving, the field shows **Configured · updated 3 Oct by Ben** and offers **Replace** or **Remove**. Nothing ever displays or returns a stored value                                                                                                                                                                                                                                                                                                                           |
| Rotation and revocation   | Generated secrets: Foundation writes a new value, redeploys and confirms. The UI warns about side effects, such as `PREVIEW_ACCESS_SECRET` revoking every preview pass, by design. Provider keys: a guided flow (create the new key, save, redeploy, confirm, then revoke the old one at the provider)                                                                                                                                                                                                            |
| Audit                     | Every Foundation write records an `audit_event`: setting name, target, actor, time, provider response id and outcome. **Never the value, and never a hash** (a hash of a low-entropy secret leaks it)                                                                                                                                                                                                                                                                                                             |
| Logging                   | Foundation's redacting logger (already planned). The template's scripts print names and outcomes only, as `launch:check` already does. The canary test in §B.3                                                                                                                                                                                                                                                                                                                                                    |
| API responses             | Public `site-info` returns only the launch block (§R.1). Readiness and reason codes come only from `/api/setup-status`, to a server-verified agency user, `private, no-store`. Codes name settings, never values                                                                                                                                                                                                                                                                                                  |
| Runtime write tokens      | `VERCEL_API_TOKEN` (Edge Config redirects) is a **write-capable token in a public runtime**. Project-scoped narrows it to one project but doesn't make it harmless (§R.4). Page-route redirects stay the default; task 235 decides the narrowest workable token before any change                                                                                                                                                                                                                                 |
| Client-side JavaScript    | Only `public-env` settings may be `NEXT_PUBLIC_`. The completeness test fails if a `secret` setting's name starts with `NEXT_PUBLIC_`                                                                                                                                                                                                                                                                                                                                                                             |
| CSRF and authorisation    | **The client site gets no configuration write endpoint at all.** The only diagnostics route on the site is read-only, and the server checks the caller's Sanity identity and agency role with Sanity on every request. Hiding the pane from clients is for relevance only; it isn't the boundary. Local Foundation reuses the wizard's guards (127.0.0.1, Host and Origin allowlists) **plus** a per-session CSRF token on every mutation. Hosted Foundation adds Auth.js with the Workspace allowlist (approved) |
| Provider failures         | A write is "saved" only when the provider returns 2xx. Partial multi-target writes are shown per target, with retry. A redeploy failure leaves "saved, not live". Error text from providers is shown after redaction                                                                                                                                                                                                                                                                                              |
| Local development         | `.env.local` is git-ignored. Test modes replace real secrets. Real client secrets aren't pulled to developer machines (Vercel won't release Secret values anyway)                                                                                                                                                                                                                                                                                                                                                 |
| Environment separation    | `targets` on each setting. `STYLEGUIDE_PREVIEW_TOKEN` is Preview-only. Test modes are already refused on Vercel production, in code                                                                                                                                                                                                                                                                                                                                                                               |
| Multi-project isolation   | One Vercel project-scoped token per client project where possible. GitHub tokens limited to the client repos. Foundation rows carry `org_id` (approved)                                                                                                                                                                                                                                                                                                                                                           |
| Re-testing a saved secret | Nobody can read it back, so it's **tested at entry**: Foundation calls the provider with the value it's holding in memory, before writing. Afterwards, proof comes from real operations (a form delivered, a health run, a webhook received). I recommend **not** adding an authenticated "test my secrets" endpoint to client sites: it would be a new attack surface on every public site                                                                                                                       |

### B.7 Validation and status levels

These are different states, and the UI never merges them into one tick:

| Level | Meaning                                 | Who can know it                                               | Example                                                 |
| ----- | --------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------- |
| L0    | Declared and switched on in the profile | Registry, profile                                             | `features.forms: true`                                  |
| L1    | Value exists                            | Provider API (Foundation); `site-info` for the deployed build | `TURNSTILE_SECRET_KEY` set in Production                |
| L2    | Passes format validation                | `config:check`, Foundation at entry                           | `FORMS_FROM_EMAIL` parses as `Name <addr>`              |
| L3    | Authentication succeeds                 | Foundation at entry; `config:check --live` locally            | Resend accepts the key                                  |
| L4    | Required permissions available          | The same                                                      | The Stripe restricted key can read prices               |
| L5    | Service reachable                       | The same, and health                                          | The production URL answers                              |
| L6    | **Completed a real operation**          | Evidence: run history, logs                                   | A health run that actually ran (not skipped) and passed |
| L7    | **Latest operation healthy**            | The latest evidence, and how old it is                        | Last run at 06:00 today passed                          |

**Rules:**

- Every level shows **Not checked** when it hasn't been checked, plus `checkedAt` when it has.
- Checks at L3 and above run only on demand, or on their natural schedule, **never on page load**. Results are cached with their timestamp.
- "Healthy" requires L6 and L7. **It's never inferred from L1.**

### B.8 Deployment propagation

**On Vercel**, the flow is:

1. Foundation writes the value.
2. The setting shows **Saved, not live** while `updatedAt` is later than the current production deployment.
3. Foundation offers **Redeploy production**.
4. It polls the Vercel API until the new deployment is ready with the expected commit.
5. It compares the readiness it computes from the provider names against the registry.
6. The setting shows **Live**, or **Live, but still not ready: <reason>**.

**Without Foundation:** the Studio pane (when the identity check works) says "This deployment: `abc1234`, 26 Oct, 09:14". The guided steps end with "Redeploy in Vercel, then reopen this pane".

**Required settings never break a working site.** `config:check --build` runs before `next build`, with the per-environment rules and safeguards in §R.3. Optional features never fail a build: they degrade, as they do today.

### B.9 Versioning, new features and migrations

1. **A new feature** adds `config.registry.ts` with `since: '<next version>'`. The completeness test forces this.
2. **A release** (task 29). The release script lists **New configuration in X.Y.Z** in the CHANGELOG, from `since` and `deprecated`. `blueprint.json` (200) is generated from the registry.
3. **The client update PR** (tasks 30 and 53). Its description includes `config:check --since <old version>`. Optional features say "available, not set up". **Newly required** settings are called out, and the core gate makes the preview build fail until they're set, so the PR can't be merged into a broken production deployment.
4. **Discovery:**
   - Foundation compares the deployed template version, read from GitHub at the commit Vercel deployed, with the registry and shows **New feature available** cards.
   - Studio's pane marks features whose `since` equals the current minor version and that aren't set up.
   - **No dismissal state is stored.** It's derived from the version, so there's nothing to sync.
5. **Configuration migrations:**
   - A rename keeps the old name readable for one minor version, through the readiness function and `deprecated.replacedBy`. `config:check` warns on the old name, and Foundation offers **Move to the new name**.
   - Content migrations stay in `migrations/`.
   - The `ENQUIRIES_STORE` GitHub variable is the first real deprecation (task 230).
6. **Rollback.** Reverting the update PR, or Vercel Instant Rollback, restores the previous code. Values left in providers are harmless, because unused names are ignored. Foundation lists them as **Set but unused** for cleanup.
7. **Safe degradation is the default.** An optional feature stays inert until it's ready. That's already the pattern: forms show "unavailable", and missing providers are skipped. The registry makes it explicit.

### B.10 Ownership and propagation (§11 of the brief)

| Scope                                      | Settings                                                                              | Who changes them                                                                        | How updates propagate                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| **Global** (template)                      | The registry itself, defaults, validators, readiness rules                            | Template releases                                                                       | The update PR per client                                                                      |
| **Agency defaults** (Foundation blueprint) | For example, the Sentry organisation, the `FORMS_FROM_EMAIL` pattern, default targets | The agency, in Foundation                                                               | Applied when a site is provisioned. Later changes are offered per site, never pushed silently |
| **Per client**                             | Every value in §A.2 and §A.3                                                          | The agency (Foundation or the provider UI). Clients change only Sanity content settings | Direct to that client's providers                                                             |
| **Per environment**                        | `targets`: Production, Preview, Development                                           | The same                                                                                | Per target                                                                                    |

**What happens if Foundation is offline:** nothing breaks. Values live in the providers. Each repo's workflows keep running. Studio's pane and `config:check` keep reporting.

**Drift detection** (Foundation):

- registry requirements against the provider's names per target;
- copies against each other: project ID, dataset, site URL against `PRODUCTION_URL`;
- provider `updatedAt` against the deployed build ("saved, not live").

### B.11 Permissions

| Who                          | Studio pane (site)                                                      | Foundation Settings | Sanity Website settings                                    |
| ---------------------------- | ----------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------- |
| Currawong (operator)         | Reads it                                                                | Reads and writes    | Everything                                                 |
| Client (Contributor, Editor) | **Not shown**, and `/api/setup-status` refuses them on the server (403) | No access           | The client-safe singletons and fields (task 205 allowlist) |

**Rejected:** an environment-variable editor for clients.

---

## C. Settings UX specification

### C.1 Information architecture

I've reviewed the brief's eight sections against what already exists. Most of them already have a home, so they collapse into **five Foundation tabs** and **one Studio pane**.

| Brief's section          | Where it goes                                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Overview                 | Foundation › Project › Settings › **Overview**                                                                             |
| Integrations             | Foundation › **Connections** (GitHub repo, Vercel project, Sanity project; later Cloudflare and Search Console)            |
| Website                  | **Stays** in Studio › Website settings: the Sanity singletons that clients and the agency already use                      |
| Monitoring & Health      | Foundation › **Monitoring** (health, backup, retention)                                                                    |
| SEO & Search             | Content: Studio's `siteIdentity`. Search Console: a Foundation Connection (226, 202). Not a separate settings area         |
| Publishing & Permissions | Code: roles and `CLIENT_EDITABLE`. Shown read-only under **Advanced**. Never editable from a UI (it's a security boundary) |
| Deployment               | Part of every write ("saved, not live", Redeploy) and Connections › Vercel                                                 |
| Advanced Configuration   | Foundation › **Advanced**                                                                                                  |
| Features (new)           | Foundation › **Features**, one card per registry entry                                                                     |

**Foundation, agency level:** **Agency settings** holds the connected accounts (the agency's GitHub, Vercel and Sanity credentials, each showing scope and expiry), the blueprint defaults and the audit log.

**Studio, site level:** Website settings › **Features & setup**. It's read-only and agency-only, and sits next to Launch & visibility. In Start here (agency only), one line reads "2 features need setup →".

There's **one system with two views**: the registry is shared, and the permissions and responsibilities are separate. Studio's Website settings keep content settings. Features & setup and Foundation cover deployment configuration. Neither edits the other's data.

### C.2 Studio: Features & setup (template, the first slice)

```
Website settings › Features & setup                    This deployment: abc1234 · 26 Oct 09:14
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│ Needs attention (2)                                                                       │
│  ● Contact forms ........ Not set up: the spam check's secret key is missing.   Details › │
│  ● Daily health checks .. Can't be checked from here. See how to check.         Details › │
│ Ready (5)   Website content · Live updates · Analytics · Error tracking · Pre-launch      │
│ Off in this site's profile (3)   Pricing · Members · A/B tests                            │
│ New in 1.9.0 · Search Console insights: not set up                              Details › │
│                                                                                           │
│ Changes to these settings apply after the next deployment.                                │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

**How it behaves:**

- **Where its data comes from.** It reads `/api/setup-status` (readiness, profile switches, template version, commit, build time). The server answers only after verifying the caller is an agency user (§R.1). The registry text is bundled into Studio. No secret ever enters Studio.
- **States it can show:**
  - Ready;
  - Not set up (with the reason);
  - Off in profile;
  - **Can't be checked from here** (anything that needs GitHub or Vercel);
  - Couldn't load (when the route fails: "Try again", and the deployment isn't blamed);
  - **Explanations only.** If the identity check isn't available (the fail-closed outcome of R.1), every feature shows its explanation and setup steps, plus "Check readiness with `npm run config:check` or Foundation", and no status.
- **Each detail view has five parts:**
  1. What it does;
  2. Why you'd use it;
  3. What happens without it;
  4. What it needs: names, where to set each one, build-time or not, whether it's present in this build;
  5. How to set it up: numbered steps with the provider's page, ending "Redeploy, then reopen this pane".

  A **Technical details** disclosure holds the names, kinds and targets.

### C.3 Foundation: Overview

```
Acme Plumbing › Settings › Overview                       Template 1.9.0 · production abc1234
┌ Attention ─────────────────────────────────────────────────────────────────────────────────┐
│ ▲ Daily health checks: paused by GitHub on 2 Oct (no recent activity).   [Turn back on]    │
│ ● Contact forms: saved 10:02, not live yet.                              [Redeploy]        │
│ ● ENQUIRIES_STORE is set in GitHub but no longer used.                   [Remove]          │
├ New in this version ───────────────────────────────────────────────────────────────────────┤
│ ✦ Search Console insights: see how visitors find you through Google.     [Set up]          │
├ Configured (6) · Off in profile (3) · Recent problems (1: health failed 24 Oct, fixed) ────┤
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### C.4 Feature detail: Daily Health Monitoring (the reference example)

All of this describes **what `health.yml` actually does today** (PR #103).

```
Daily health checks                                                     [Run now] [View runs]
Setup:      ● Ready: all 3 settings present · workflow active          (checked 26 Oct 10:15)
Monitoring: ● Healthy with 2 warnings: last real run 26 Oct 06:00 AEDT                [Why?]
```

**What does it do?**

Every morning at about 6 am Sydney time (7 am in daylight saving), GitHub opens your live website the way a launch check does, and checks your Sanity dataset is still private. The launch check covers:

- the home page loads, and HTTP redirects to HTTPS;
- `www` and the bare domain point the same way;
- security headers are present;
- Studio opens;
- missing pages return a real 404;
- `robots.txt` and the sitemap are correct;
- canonical links are correct;
- page titles and descriptions are unique;
- each page has one H1;
- share images are present;
- no template leftovers (placeholder icons, template copy, `localhost` links);
- Sanity CORS allows the site;
- the revalidate webhook is set up, in webhook mode;
- the site reports itself as live.

**It does _not_ check:**

- page speed (no PageSpeed key is passed);
- that forms deliver email;
- payments;
- uptime between runs;
- that content renders from the CMS (the marker isn't passed yet; task 230 adds this as an option).

**Why is it useful?**

A broken deployment, or a lapsed or downgraded Sanity plan, which makes private datasets public, reaches you before it reaches the client or a visitor. When stored enquiries are on, a public dataset means visitors' names and email addresses are exposed. It's reported first.

**What does it need?**

| Requirement                     | Where                                           | Status example                                      |
| ------------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| The workflow file               | `.github/workflows/health.yml` (template 1.8+)  | ● Installed                                         |
| The workflow is enabled         | GitHub › Actions                                | ● Active / ▲ Paused by GitHub / ▲ Turned off        |
| `PRODUCTION_URL`                | GitHub variable                                 | ● `https://acme.com.au`, which matches the site URL |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | GitHub variable                                 | ● Matches Vercel                                    |
| `SANITY_AUTH_TOKEN`             | GitHub secret (**Viewer**; shared with backups) | ● Configured · updated 3 Oct                        |
| Issue notifications             | Your GitHub notification settings               | **Not checked:** Nocturne can't see these           |

**How do I turn it on?**

- **Foundation:** **Set up** shows the three fields. The URL is prefilled from the Vercel production domain, and the project ID from the project. **Create a Viewer token** mints one with the Sanity session, or you paste one, which is tested before saving. Saving writes the variables and sealed secret to GitHub, then offers **Run now**.
- **Without Foundation:** numbered steps, each with the GitHub settings page path and the exact name. Then run `npm run config:check -- --github` (task 231) to confirm.

**How do I check it works?**

- **Run now** (`workflow_dispatch`) runs the real checks.
- **Test a failure safely:** **Run a synthetic check** (`synthetic: true`, with a deliberately wrong address). It shows the issue it would have written, in the run summary, and **never opens a real issue** (§R.2). Tests of the issue itself belong on a scratch repository.
- Results come from `health-result.json` (task 230), not from the run's colour.

**What happens if it fails?**

- The run turns red.
- One issue labelled `health`, titled _Production health check failing_, lists each failing check and how to fix it.
- Later runs update that issue, and the next passing run closes it.
- **Notifications are GitHub's own.** You hear about it only if you watch the repo, or have issue notifications on. There's no email or Slack integration.
- Warnings never fail a run.

**How do I fix a problem?**

Each failing line in the issue already carries a `Fix:` from `launch:check`. Foundation shows the same lines with links: **Open in Studio**, **Open Vercel domains** or **Open Sanity billing**.

**Status meanings:**

| Setup status         | Means                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| **Not configured**   | No settings present                                                                                |
| **Setup incomplete** | Some settings are missing, or the workflow file isn't there                                        |
| **Ready**            | All settings are present and the workflow is active. **This says nothing about the site's health** |
| **Unknown**          | Can't see GitHub (in Studio, or with no token)                                                     |

**Monitoring status:** the eight states in §R.2. **Intentionally disabled** and **Unknown** are neutral. **Healthy** is good. **Warning** needs attention. **Expected but unconfigured**, **Configured but skipped**, **Failed** and **Stale** are problems. A run in progress shows **Running** beside the latest state, and doesn't replace it. Only non-synthetic results that actually ran checks can be **Healthy** or **Warning**.

### C.5 Integration detail: Connections › GitHub

```
GitHub · CurrawongCreativeCo/acme-site                    Connected with: agency token (expires 12 Jan)
What it's for   Runs daily health checks, weekly backups and enquiry clean-up, and deploys the schema.
Permissions     Actions R/W · Variables R/W · Secrets R/W · Issues R · Metadata R      [Why each?]
Status          ● Reachable · ● Permissions OK            (checked 10:15)              [Check again]
Workflows       health ● active · backup ● active · retention ○ skipped (needs SANITY_WRITE_TOKEN)
Settings        6 variables · 4 secrets (names only)                       [Manage in Advanced]
                                                                           [Disconnect this repo]
```

**Disconnect** removes Foundation's link to the repo. It never deletes values from GitHub, and it says so.

### C.6 Advanced

There's one table per project, with these columns:

- name;
- feature;
- kind;
- storage (Vercel Production, Preview and Development, or GitHub);
- build-time or runtime;
- present per target;
- last updated, and by whom (from the audit);
- validation result;
- `since` and deprecation.

Filters: **Missing**, **Unused**, **Drift**, **Secrets**.

Secrets show **Configured** with **Replace** and **Remove**, and never a value.

### C.7 Explanation patterns and messages

**The order of an explanation:** what it does → why → what happens without it → what you need → steps → technical details. Use plain Australian English, name the exact place to click, and never blame the user.

| Situation                        | Message                                                                                                                                                          |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing required setting         | "Contact forms can't send yet: the spam check's secret key (`TURNSTILE_SECRET_KEY`) isn't set. Get it from Cloudflare → Turnstile → your widget."                |
| Format error                     | "The sender must look like `Name <forms@example.com.au>`, using an address on a domain you've verified in Resend."                                               |
| Authentication failed (at entry) | "Resend didn't accept this key (401). Check you copied all of it. Nothing was saved."                                                                            |
| Saved, not live                  | "Saved to Vercel at 10:02. The live site still uses the previous value until it's redeployed. [Redeploy]"                                                        |
| Build-time setting               | "This value is built into the pages, so changing it rebuilds the site (about 3 minutes)."                                                                        |
| Expected but unconfigured        | "Health checks aren't running: `PRODUCTION_URL` isn't set. Until it's set, nothing is being checked. To turn them off on purpose, set `HEALTH_CHECKS` to `off`." |
| Configured but skipped           | "The 06:00 check was cancelled before it ran any checks. The last real result is from yesterday."                                                                |
| Intentionally disabled           | "Health checks are off for this repository: 'template repo, no production site'."                                                                                |
| Provider down                    | "GitHub didn't answer (timeout). Your settings are unchanged. [Try again]"                                                                                       |
| Can't see from here              | "Studio can't see GitHub. Check _Actions → Health_ in the repository, or run `npm run config:check -- --github`."                                                |

### C.8 Error recovery

- **Partial writes** (one target failed) are listed per target, with **Retry failed only**.
- **A failed redeploy** keeps "saved, not live" and links to the Vercel build log.
- **Mistaken values:**
  - non-secret values can be edited back;
  - secrets can be replaced;
  - Vercel Instant Rollback restores the previous _code_, but not the environment (the UI says so).
- **Token problems:**
  - an expired agency token shows on Agency settings and on every affected Connection;
  - nothing is retried in a loop.

---

## D. Development plan

### D.1 The minimum useful vertical slice

It's **template only**, and it **needs no Foundation, no OAuth and no new store**. It makes one real task easier: **turning on daily health monitoring, and knowing it's really working.**

1. A typed requirement definition: task 227 (registry contract, with `sanity-core`, `health-monitoring` and `forms`).
2. Detects setup: `config:check`, the core build gate and the server-side `getSetupStatus()` (227). Public `site-info` gets smaller, not bigger (§R.1).
3. Tells the eight monitoring states apart, and keeps synthetic tests away from real issues (230).
4. Verifies GitHub-side setup without opening GitHub: `config:check --github` (231).
5. Displays it: Studio's Features & setup pane, behind a verified identity check, or explanations only (232).
6. Reports the deployment action honestly: "this deployment", "redeploy to apply" (227, 232).
7. Preserves behaviour: the gate's first enforced set is what already fails today (§R.3). The one deliberate change is the public `site-info` shape, and its only consumer, `launch:check`, is unaffected.

Then task 233 covers all the features and generates the docs, and task 234 adds the release prompts. Foundation's writes come in milestone MS, after task 201.

### D.2 Tasks

**Task IDs:** 227 keeps its ID, with a narrower scope. New IDs start at **230**, the next free number. Task **235** was added in r2 for refinement R.4. No existing task, ID, status or note is changed, except where §D.3 says so.

**The prompts** are kept in one place only, [`s1-canonical-patch/prompts.txt`](./s1-canonical-patch/prompts.txt): exactly the text published in plan v21. The summaries below describe each task, and the prompts are authoritative.

---

#### 227 (revised): Feature configuration registry: contract, `config:check` and the core gate

|          |                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Product  | Template                                                                                                                  |
| Stage    | `f` · Medium · **2 sessions** · deps none                                                                                 |
| Reuses   | `get*Config` functions, `site-info`, `env.ts`, `jiti`, the `check-dataset` env reader, the editor-guide staleness pattern |
| Security | No values anywhere. The canary test. Registry files can't import `server-only`                                            |

- **Scope:**
  - The `defineFeatureConfig` types (§B.3).
  - Entries for **`sanity-core`, `health-monitoring`, `forms`** only.
  - `config:check` with `[--strict] [--build] [--live] [--json]`.
  - `--build` as a prebuild step with §R.3's safeguards: it enforces only the two values that already fail today, warns for production-only settings, and never involves optional ones.
  - A server-only `getSetupStatus()`. Public `site-info` is reduced to `{ schema: 2, launch }` (§R.1).
  - The completeness test, with an ignore list, covering `src/`, `scripts/` and `.github/workflows/`. Until task 233, unregistered names are allowed through a `pending` list, so the test passes from day one and the list shrinks to empty in 233.
  - **Removed from the original 227:** reporting setup in the issue (moved to 230 as a result file) and the README generation (moved to 233).
- **Acceptance:**
  - The canary never appears.
  - `--build` fails with a plain-English message when `NEXT_PUBLIC_SANITY_PROJECT_ID` is missing. It passes in CI with the placeholder environment. A missing `TURNSTILE_SECRET_KEY` or `SANITY_API_READ_TOKEN` never fails a build.
  - `site-info` stays prerendered, and its public body has only `schema` and `launch`.
- **Tests:** unit tests (composer, readiness mapping, canary, completeness); e2e for `site-info` shape.
- **Done when:** merged, with the CHANGELOG and README "Configuration" (hand-written for now), and `config:check` run on the client repo before task 31.

---

#### 230 (new): Health results that tell a real run from a skip

|          |                                                                                                                                                |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose  | Fix weakness W1 for the health workflow, add the optional marker check, retire the `ENQUIRIES_STORE` GitHub copy, and correct the 60-day claim |
| Product  | Template                                                                                                                                       |
| Stage    | `f` · Small · **1 session** · deps **227**                                                                                                     |
| Reuses   | `health.yml`, `health-report.mjs` (pure `buildReport`), `launch:check --json` and `--expect-marker`                                            |
| Security | The result file contains check ids, titles and fixes only. Same permissions (`contents: read`, `issues: write`); nothing new is granted        |

- **Scope (r2):**
  - the six outcomes and two modes in §R.2;
  - `HEALTH_CHECKS=off` for intentional disabling;
  - `--prelaunch` checks before launch;
  - a `synthetic` dispatch that never touches issues;
  - exposed enquiries found from the dataset itself (a count of `enquiry` documents with the Viewer token).
- **Acceptance:**
  - Fixture runs produce the right `outcome` for every state.
  - Disabled, unconfigured and synthetic runs write a result and open no issue.
  - A public dataset holding enquiries is reported as **exposed** without the GitHub variable.
  - Any end-to-end check that needs a real issue runs on a scratch repository only.
- **Tests:** unit tests for the result builder; `actionlint` if it's available.
- **Done when:** merged, the README "Health checks" section is updated, and the CHANGELOG notes the deprecation.

---

#### 231 (new): `config:check --github`: GitHub-side setup and run status, read-only

|          |                                                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose  | Verify monitoring setup and the latest _real_ result without opening GitHub. The module is written to move into Foundation's provider layer (199, 201, 209)                                                                                                                                                                    |
| Product  | Template (a script); later lifted into Foundation                                                                                                                                                                                                                                                                              |
| Stage    | `f` · Small–Medium · **1–2 sessions** · deps **227, 230**                                                                                                                                                                                                                                                                      |
| Security | A **read-only** fine-grained token (Actions read, Variables read, Secrets read for metadata, Issues read, Metadata read), passed as `GITHUB_TOKEN` for the run only. **Never written to `.env.local` by the tool.** Prints names, states and timestamps; never variable values for secrets (GitHub doesn't return them anyway) |

- **Scope:** dependency-free `fetch` against the GitHub REST API:
  - the workflow's `state`;
  - presence of variables and secrets, and whether the variables match local or `site-info` values (project ID, `PRODUCTION_URL` against the site URL);
  - the latest run and its `health-result` artifact;
  - the open `health` issue.

  Covers health, backup, retention and sanity, from their registry entries.

- **Acceptance:** fixture-driven unit tests for every status in §C.4; a manual run against the client repo matches the Actions page.
- **Done when:** merged and documented, and the output is recorded in task 30's notes.

---

#### 232 (new): Studio: Features & setup pane (read-only, agency-only)

|          |                                                                                                                                                                                                                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose  | See what this deployment has and lacks, in plain English, where the agency already works                                                                                                                                                                                                                                    |
| Product  | Template (Studio)                                                                                                                                                                                                                                                                                                           |
| Stage    | `f` · Medium · **2 sessions** · deps **227** (shows more after 233)                                                                                                                                                                                                                                                         |
| Reuses   | The Launch & visibility pane pattern (`S.component`), Start here, `filterStructureItems`, the Studio theme                                                                                                                                                                                                                  |
| Security | A new `GET /api/setup-status` answers only after the server verifies the caller's Sanity identity and agency role with Sanity (§R.1). It's built verify-first and fails closed: if verification can't be proven, the route isn't built and the pane shows explanations only. Hiding the pane is for relevance, not security |

- **Acceptance:**
  - The pane matches §C.2.
  - The route returns 200 to an agency user and 403 to a client, and 401 to an invalid, expired or missing token.
  - Its responses are `private, no-store`, and the canary never appears.
  - The pane shows explanations only when the route fails.
  - Studio's initial JavaScript stays inside the Studio budget: the pane loads lazily, like the other panes.
- **Tests:** unit tests for the view model (mapping `site-info` and the registry to rows); e2e in agency and client modes; a visual baseline.
- **Done when:** merged, and the editor guide and README updated.

---

#### 233 (new): Registry for every feature, plus generated `.env.example` and README "Configuration"

|          |                                                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose  | Remove the three hand-kept copies (W2), report readiness for every feature (W4), and the small cleanups (W5, W8, W9)                                                    |
| Product  | Template                                                                                                                                                                |
| Stage    | `f` · Medium · **2 sessions** · deps **227, 235**                                                                                                                       |
| Security | The Vercel token guidance and the `VERCEL_TEAM_ID` and `EDGE_CONFIG_ID` cleanups follow task 235's findings only. The completeness test now has an empty `pending` list |

- **Scope:**
  - Entries for: newsletter, enquiries, pricing (checkout and webhook), members, analytics and consent, Sentry, revalidation (webhook mode), IndexNow, Edge Config redirects, pre-launch passes, style guide, experiments, Ops notices (marked dormant), backup, retention, schema deploy and migrations, and `launch:check`'s local values.
  - **Generated** `.env.example` and the README "Configuration" table, with a CI staleness check. The table **replaces** the hand-written list in "Deploying (Vercel)" step 2.
  - Cleanups, each decision-gated (S-D7):
    - `NEXT_PUBLIC_SANITY_API_VERSION` becomes a code constant, with the variable still honoured for one minor version;
    - `NEXT_PUBLIC_STUDIO_TITLE` is deprecated in favour of `studio-brand.json`;
    - `EDGE_CONFIG_ID` is derived from `EDGE_CONFIG`, if the format is confirmed;
    - `VERCEL_TEAM_ID` is documented as unnecessary with a project-scoped token.
- **Acceptance:** the generated files have no diff in CI; `site-info` reports every feature; the deprecations warn in `config:check`.
- **Done when:** merged and released.

---

#### 234 (new): Release and update prompts for new configuration

|          |                                                              |
| -------- | ------------------------------------------------------------ |
| Purpose  | New features announce their setup when a site updates (§B.9) |
| Product  | Template (release tooling)                                   |
| Stage    | `f` · Small · **1 session** · deps **233**, 29               |
| Security | None new                                                     |

- **Scope:**
  - `config:check --since <version>`;
  - the release script adds **New configuration in X.Y.Z** to the CHANGELOG;
  - a snippet for the client update-PR description (tasks 30 and 53);
  - a rule: a newly _required_ setting needs a deprecation or migration note, or the release script refuses.
- **Acceptance:** unit tests with a fixture registry diff; the next release carries the section.
- **Done when:** merged, and used in one real update PR.

---

#### 235 (new in r2): Spike: Vercel project-scoped tokens

|          |                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Purpose  | Test, before anything changes, every Vercel operation Nocturne needs with a project-scoped token against a team token, and measure the token's blast radius (§R.4) |
| Product  | Template (a spike script and a decision record)                                                                                                                    |
| Stage    | `f` · Small · **1 session** · deps none                                                                                                                            |
| Security | Scratch project and scratch Edge Config store only. No production credential, configuration or `VERCEL_TEAM_ID` is changed                                         |

- **Done when:** `docs/spikes/vercel-tokens.md` is committed, and tasks 233 and 129 point to it.

---

#### Milestone MS (Foundation): outline only, no records yet

**Acceptance criterion (R.5, now in the plan's FX milestone):** MS is done only when one real integration (Daily Health Monitoring first) is configured from Foundation's local browser interface. Its settings must be saved securely to the right provider, the provider verified as having accepted them, the screen must show whether the configuration is live, and it must offer the required deployment action. All of this without editing an environment file by hand.

E3 §9.3 decided that Foundation's Settings tasks are specified **when task 201 exists**. This keeps to that, so no speculative records are created. The expected shape:

| Outline | Content                                                                                                                                                  | Sessions | After         |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------- |
| MS-a    | The Settings shell (Overview, Features, Connections, Monitoring, Advanced), reading the registry for the site's template version and 231's GitHub module | 3        | 201, 209, 233 |
| MS-b    | GitHub writes: variables, sealed secrets, enable and dispatch, audit events, CSRF token                                                                  | 2        | MS-a          |
| MS-c    | Vercel writes: Secret type, targets, "saved, not live", redeploy, confirm through the Vercel deployment; tokens as task 235 found                        | 3        | MS-a, 235     |
| MS-d    | Generated secrets (F-gen), including the Sanity webhook and revalidate secret pair; guided rotation; drift and "set but unused" cleanup                  | 2        | MS-b, MS-c    |

### D.3 Changes to existing tasks

Each change adds to the task. IDs, statuses and notes are kept.

| Task                                 | Change                                                                                                                                             |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **227**                              | Narrowed and revised as above: three features, the core gate added, issue reporting moved to 230, README generation moved to 233. Still 2 sessions |
| **31** (pre-launch QA)               | Add `npm run config:check -- --strict` and `--github` showing health as **Ready** and the latest run **Healthy** (not Skipped)                     |
| **30** (enable on the client's repo) | Record `config:check --github` output once health is turned on                                                                                     |
| **200** (`blueprint.json`)           | "Required environment" is **generated from the registry**, not written by hand. Add dependency **233**                                             |
| **209** (Foundation health views)    | Read `health-result.json` and reuse 231's module, so the results match the CLI by construction. Add dependencies **230 and 231**                   |
| **129** (Vercel token spike)         | Read task 235's record first, and cover only the domain and DNS questions it leaves open                                                           |
| **208** (Foundation new-site wizard) | Confirm a redeploy through the Vercel API, not public `site-info`; MS's acceptance criterion applies                                               |
| **39** (old Ops provider status)     | Read the template version and readiness from the repository and providers; public `site-info` carries only `launch`                                |
| **189** (done)                       | No change. Its README wording correction is done in 230                                                                                            |

### D.4 Placement and order

**Milestone MS0, "Setup is visible and honest"**, in stage `f`: tasks 227 and 230–235. **MS** stays in stage `fx`, now with its acceptance criterion.

**Order.** This follows E4 §8: in-progress work first, and one platform task at a time.

| When                                                   | Tasks            |
| ------------------------------------------------------ | ---------------- |
| Session 6 of E4's ten, as already planned              | **227**          |
| Directly after, because it's small and serves task 31  | **230**          |
| Before the real site's pre-launch QA (31), if possible | **231**          |
| Any time; before 233's Vercel cleanups                 | **235**          |
| After the ten, replacing E4's "227 part 2"             | **232**, **233** |
| With the next release that adds a feature              | **234**          |

**Total:** about **10–11 sessions** for MS0. That's 227: 2, 230: 1, 231: 1–2, 232: 2, 233: 2, 234: 1 and 235: 1. Only 227 was already counted in E4.

---

## E. Implementation approval brief

1. **The simplest viable architecture.** A typed, per-feature registry in the template that declares requirements but never values. It reports through `config:check`, a core build gate, a server-verified `/api/setup-status` and a read-only Studio pane. Public `/api/site-info` shrinks to its launch block. Values stay **provider-managed** (Vercel, GitHub). Foundation later writes them through provider APIs, then redeploys and confirms through `site-info`. No new secret store, no OAuth and no client-site write endpoint.

2. **Which variables can genuinely move into a UI.** Almost all of them can be **managed** from Foundation's UI without hand-editing. But they remain provider variables underneath, and changes need a redeploy on Vercel.
   - **Generated, so nobody types them:** `AUTH_SECRET`, `FLAGS_SECRET`, `PREVIEW_ACCESS_SECRET`, `PRELAUNCH_PREVIEW_TOKEN`, `STYLEGUIDE_PREVIEW_TOKEN`, `SANITY_REVALIDATE_SECRET` (plus the matching Sanity webhook) and `INDEXNOW_KEY`.
   - **Eliminated:** `NEXT_PUBLIC_SANITY_API_VERSION`, `NEXT_PUBLIC_STUDIO_TITLE`, `VERCEL_TEAM_ID`, the `ENQUIRIES_STORE` GitHub copy, and probably `EDGE_CONFIG_ID`.
   - **Possible later moves into live Sanity settings:** the Stripe return URLs, and maybe the analytics IDs.

3. **Which values must stay provider-managed.** Every secret:
   - the Sanity tokens;
   - Turnstile, Resend, Loops, Mailchimp and Stripe;
   - the Auth.js secrets;
   - Sentry's auth token;
   - the Vercel API token;
   - the backup storage keys.

   Also every build-time value (`NEXT_PUBLIC_*`, the Sentry build values), the GitHub Actions values, and Sanity core in `.env.local` for local bootstrap (the setup wizard stays).

4. **How secrets are protected.**
   - Providers store them encrypted and write-only.
   - Nocturne never stores, returns, logs or hashes a value.
   - Secrets are tested once at entry, then proven by real operations.
   - Least-privilege tokens: project-scoped for Vercel, fine-grained per-repo for GitHub.
   - A local Foundation with Host, Origin and CSRF checks.
   - Audit events without values.
   - A canary test and a completeness test in CI.
   - No configuration write path on any public site.

5. **How new features introduce configuration.**
   - Each feature ships a registry entry with `since`, and the completeness test forces it.
   - Releases list new configuration.
   - Update PRs show `config:check --since`.
   - Newly required core settings fail the _preview build_, never production.
   - Optional features stay inert until ready.
   - Foundation and Studio show **New feature available** from the version, with no stored state.

6. **The recommended Settings navigation.**
   - **Foundation › Project › Settings:** Overview · Features · Connections · Monitoring · Advanced.
   - **Foundation › Agency settings:** connected accounts, defaults and the audit log.
   - **Studio:** Website settings keeps the content settings and gains **Features & setup**, read-only and agency-only.

7. **The first feature to support.** **Daily Health Monitoring.** The audit confirms it's suitable:
   - it's real and merged (PR #103);
   - it's small, with three settings;
   - it shows the hardest status problem, green skips;
   - it exercises GitHub, which is the provider Foundation reads first.

8. **The first five development tasks.**
   - **227** registry contract, `config:check` and the core gate (2 sessions);
   - **230** health result and skip detection (1);
   - **231** `config:check --github` (1–2);
   - **232** Studio Features & setup pane (2);
   - **233** every feature, plus the generated `.env.example` and README (2).

9. **Decisions:** all eight were **approved on 26 October 2026**, with the refinements in §R. The table records what was approved.

| #    | Decision                                                                                                                                                                                                                                                                                    | Recommendation                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| S-D1 | Studio never edits deployment configuration, and client sites get no configuration write endpoint. Edits happen in Foundation, or in the provider's own UI                                                                                                                                  | Approve                                |
| S-D2 | No new secret store. Values are provider-managed. Foundation keeps only agency tokens (the approved custody model)                                                                                                                                                                          | Approve                                |
| S-D3 | Revise 227 (three features, the core build gate; issue reporting moved to 230; README generation moved to 233)                                                                                                                                                                              | Approve                                |
| S-D4 | New tasks 230–234 and milestone MS0 in stage `f`; MS's Foundation tasks stay unspecified until 201                                                                                                                                                                                          | Approve                                |
| S-D5 | `health-result.json` (schema 1) becomes a contract that Foundation's task 209 reads                                                                                                                                                                                                         | Approve                                |
| S-D6 | A missing **core** setting fails the build (the old deployment stays live). Optional ones never do                                                                                                                                                                                          | Approve                                |
| S-D7 | Cleanups: the API version becomes code; the Studio title is deprecated; `EDGE_CONFIG_ID` is derived (after checking); a project-scoped `VERCEL_API_TOKEN`. **Defer:** the site language into the profile, the Sanity project ID and dataset into the profile, the analytics IDs into Sanity | Approve the first four; defer the rest |
| S-D8 | The changes to existing tasks 31, 30, 200, 209 and 129 (§D.3)                                                                                                                                                                                                                               | Approve                                |

**Applied** as build plan v21 with [`s1-canonical-patch/`](./s1-canonical-patch/README.md) (records, prompts and `build.py`), after a full read of the live page.

---

**Sources** (provider facts checked on 26 October 2026):

- [Vercel: managing environment variables](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel: sensitive (Secret) variables](https://vercel.com/docs/environment-variables/sensitive-environment-variables)
- [Vercel: create environment variables API](https://docs.vercel.com/docs/rest-api/reference/endpoints/projects/create-one-or-more-environment-variables)
- [Vercel: access tokens](https://vercel.com/docs/accounts/access-tokens)
- [Vercel: project-scoped tokens](https://vercel.com/changelog/project-scoped-tokens)
- [GitHub: workflows REST API](https://docs.github.com/en/rest/actions/workflows?apiVersion=2022-11-28)
- [GitHub: disabling and enabling a workflow](https://docs.github.com/actions/managing-workflow-runs/disabling-and-enabling-a-workflow)
