# Spike: Vercel project-scoped tokens (task 235)

Status: **documentation findings recorded; live measurements pending.** Plan: `docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md` §R.4. Script: `scripts/spikes/vercel-tokens.mjs`.

The live columns below are empty on purpose. The spike needs a scratch Vercel project, a scratch Edge Config store and two tokens, which the owner creates; none existed when this was written, so no request has been sent. Fill the "Measured" column from `--out` files (see _Running it_) and change the status line above. Nothing in "Decisions" should be treated as final until the cells marked ⏳ are filled.

## What Vercel's current docs say

Read on 27 October 2026.

- **Token scopes** ([Access tokens](https://vercel.com/docs/accounts/access-tokens), updated 8 September 2026): Full Account, Team (all projects) and Project. "A project-scoped token denies any request to another project, to a user-level resource, or to a team-level resource." Project-scoped tokens arrived on 30 July 2026 ([changelog](https://vercel.com/changelog/project-scoped-tokens)).
- **`teamId`**: "Team- and project-scoped tokens do not require the `teamId` query parameter or the team `slug`… Vercel infers the team and project from the token's scope." Full-account tokens still need `?teamId=`. A community answer suggests that sending `teamId` with a project-scoped token may itself cause a refusal; the spike tests both.
- **Minting**: creating tokens needs a full-account token. "A project-scoped token cannot mint new tokens."
- **Edge Config is now called Global Config** in the docs. The write call is `PATCH /v1/global-config/{id}/items?teamId=…` in the docs; our code sends `PATCH /v1/edge-config/{id}/items`. Whether the old path stays is not stated, so the spike calls both. Error shape in the docs: `{ "error": { "code", "message", … } }`.
- **No narrower credential exists in the docs.** A Global Config has _read access tokens_ (for `global-config.vercel.com`, created by `POST /v1/global-config/{id}/token`), but writes always need a Vercel access token ("writing requires Vercel Access Tokens to authenticate with the Vercel REST API"). The SDK page says the same. There is no write-only or store-scoped write token.
- **The connection string carries the store id.** Format: `https://global-config.vercel.com/<id>?token=<read token>` (the older form is `edge-config.vercel.com/ecfg_…`). So `EDGE_CONFIG_ID` can be derived from `EDGE_CONFIG`, as task 233 proposes, by taking the first path segment. The spike script and a unit test should confirm the exact legacy format from a real `EDGE_CONFIG` value (⏳, owner copies the host and path only, never the token).

## Matrix

"Documented" is the expectation from the docs above. "Measured" is for the spike run: HTTP status and error `code`, with tokens and values redacted. ⏳ = not yet run.

| #   | Operation                                                   | Request                                                        | Project token: documented                        | Project: measured | Team token: documented           | Team: measured |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------ | ----------------- | -------------------------------- | -------------- |
| a   | Edge Config item upsert (what `edge-config-sync.ts` sends)  | `PATCH /v1/edge-config/{id}/items`, with/without teamId        | **Refused** (team-level resource), expect 403    | ⏳                | Allowed                          | ⏳             |
| a2  | Same on the docs' `/v1/global-config/{id}/items` path       | `PATCH /v1/global-config/{id}/items`                           | Refused                                          | ⏳                | Allowed                          | ⏳             |
| a3  | Edge Config metadata, list stores, list read tokens         | `GET /v1/edge-config…`                                         | Refused                                          | ⏳                | Allowed                          | ⏳             |
| b1  | List environment variables (key, type, target, `updatedAt`) | `GET /v10/projects/{id}/env`                                   | Allowed                                          | ⏳                | Allowed                          | ⏳             |
| b2  | Create `plain`, `encrypted`, `sensitive` per target         | `POST /v10/projects/{id}/env`                                  | Allowed. `sensitive` cannot target `development` | ⏳                | Allowed                          | ⏳             |
| b3  | Upsert the same                                             | `POST …/env?upsert=true`                                       | Allowed                                          | ⏳                | Allowed                          | ⏳             |
| b4  | Legacy `secret` type                                        | `POST …/env` with `type: "secret"`                             | Likely rejected (deprecated); record the message | ⏳                | Same                             | ⏳             |
| c1  | List deployments with commit and ready state                | `GET /v6/deployments?projectId=`                               | Allowed                                          | ⏳                | Allowed                          | ⏳             |
| c2  | Redeploy                                                    | `POST /v13/deployments?forceNew=1` with `deploymentId`         | Allowed                                          | ⏳                | Allowed                          | ⏳             |
| d1  | List, add, inspect, verify and remove a project domain      | `/v9`, `/v10` `/projects/{id}/domains…`                        | Allowed                                          | ⏳                | Allowed                          | ⏳             |
| d2  | DNS configuration for a domain                              | `GET /v6/domains/{d}/config`                                   | Unknown (domain-level)                           | ⏳                | Allowed                          | ⏳             |
| d3  | Team-level domains and DNS records                          | `GET /v5/domains`, `/v4/domains/{d}/records`                   | **Refused** (team-level)                         | ⏳                | Allowed                          | ⏳             |
| d4  | Is `VERCEL_TEAM_ID` needed?                                 | Same reads with and without `teamId`                           | **No**; sending it may be refused                | ⏳                | **No** for a team token          | ⏳             |
| e1  | Identity: `GET /v2/user`, `/v2/teams`                       | user-level                                                     | Refused                                          | ⏳                | Team-limited                     | ⏳             |
| e2  | Other projects                                              | `GET /v9/projects`, a second scratch project                   | Refused for other projects                       | ⏳                | Allowed                          | ⏳             |
| e3  | Project settings and protection                             | `PATCH /v9/projects/{id}` (same value written back)            | **Allowed**                                      | ⏳                | Allowed                          | ⏳             |
| e4  | Firewall / bypass rules                                     | `GET /v1/security/firewall/config/active`                      | Probably allowed                                 | ⏳                | Allowed                          | ⏳             |
| e5  | Team members, account tokens, minting tokens                | `/v3/teams/{id}/members`, `/v6/user/tokens`, `/v3/user/tokens` | Refused                                          | ⏳                | Members visible; minting refused | ⏳             |
| e6  | Delete the project                                          | `DELETE /v9/projects/{id}` (cleanup only)                      | Probably **allowed**                             | ⏳                | Allowed                          | ⏳             |

### Blast radius, as far as the docs go

A project-scoped token "can read and write resources belonging to that one project". That is the whole project: environment variables (including replacing `SANITY_API_READ_TOKEN`, `PREVIEW_SECRET`, webhook secrets), deployments (a redeploy builds whatever is on the branch; env changes take effect on the next build), domains, protection settings, and probably deletion. It cannot see other projects, the team, or the account, and it cannot mint further tokens. It is **not read-only and not harmless**. What it adds to a runtime compromise is the ability to persist (change env, then redeploy), read other secrets back, which is likely for `plain` and `encrypted` variables and unlikely for `sensitive` ones (row b1 records whether values come back), and take the site offline.

## Security implications of each runtime option

| Option                                                                 | What a compromised runtime can do                                                                                                                               | Needs                                                |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **1. Page-route redirects (default)**                                  | Nothing extra. No token, no Vercel API access.                                                                                                                  | A redeploy to change redirects                       |
| **2. Project-scoped token in the runtime**                             | One project's env, deployments, domains and protection, per the matrix. **Cannot** write the Edge Config if (a) is refused, so this option may not work at all. | A token that can do (a), which is not project-scoped |
| **2b. Team token in the runtime** (what works today if (a) is refused) | Every project in the team, plus team-level resources. Not acceptable for a public runtime.                                                                      | Nothing new, but the worst case                      |
| **3. Move the redirect sync out of the runtime**                       | Nothing in the runtime. The sync runs where the token lives: a GitHub Actions workflow triggered by a Sanity webhook, or the local Foundation interface.        | A trigger and a place to hold the token              |

## Decisions this unblocks (provisional until ⏳ cells are filled)

1. **Keep page-route redirects as the default**, regardless of the measurements. This is already §R.4's first mitigation.
2. **If (a) is refused for a project-scoped token** (the documented expectation): the runtime cannot use a project-scoped token for Edge Config at all, and a team token in a public runtime is too broad. Then Edge Config redirect sync must **move out of the runtime** (option 3) or be dropped for sites that don't need it. The README must not tell anyone to put a `VERCEL_API_TOKEN` in a public site.
3. **If (a) is allowed**, a project-scoped token becomes a workable runtime option, with the blast radius above documented next to it, and only on sites whose traffic needs it.

**Task 233 (cleanups).** `EDGE_CONFIG_ID` derived from `EDGE_CONFIG`: the connection string carries the id, so this is safe to do (confirm against the real format first). `VERCEL_TEAM_ID` documented as unnecessary with a project- or team-scoped token: the docs support it; the spike confirms or contradicts it (row d4). Do not mark `VERCEL_TEAM_ID` deprecated for a full-account token, which still needs it. The Vercel token guidance in the README waits for rows a and e.

**Task 129 (domains).** Per-project domain calls (row d1) are expected to work with a project-scoped token and no `VERCEL_TEAM_ID`. Anything team-level (row d3: registered domains, DNS records for a Vercel-managed zone) is expected to be refused, so DNS stays manual, as the launch design already assumes, unless row d3 measures otherwise.

**Milestone MS (Foundation).** Foundation runs on the owner's machine, so it can hold a stronger credential than a public runtime. Saving settings to Vercel (rows b, c) works with a project-scoped token; the Edge Config store is the exception. MS must not assume one token covers env, redeploy and Edge Config.

## Running it

Create, by hand, in the Vercel dashboard: a scratch project (deployed once, so there is a deployment to redeploy), a scratch Edge Config store linked to it, a **project-scoped** token and a **team** token for the scratch team (short expiry). Then:

```sh
export VERCEL_SPIKE_PROJECT_ID=prj_… VERCEL_SPIKE_EDGE_CONFIG_ID=ecfg_… VERCEL_SPIKE_TEAM_ID=team_…
export VERCEL_SPIKE_PROJECT_TOKEN=… VERCEL_SPIKE_TEAM_TOKEN=…   # read from the environment, never printed
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as project --step all --dry-run
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as project --step all --yes --out project.json
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as team --step all --yes --out team.json
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as team --step cleanup --yes
```

`--as project --step cleanup` shows what the project token can remove. Cleanup lists everything it removed; add `--include-project-delete` last to delete the scratch project, which also measures row e6.

## Cleanup record

Nothing has been created, so nothing has been removed. Fill in from the cleanup output after the run.
