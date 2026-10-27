# Spike: Vercel project-scoped tokens (task 235)

Status: **measured on 27 October 2026** against a scratch project, a scratch Edge Config store and two tokens. Plan: `docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md` §R.4. Script: `scripts/spikes/vercel-tokens.mjs`.

**Headline:** a project-scoped token cannot touch the Edge Config store at all, so it cannot run the redirect sync. A team token can. A team token in a public runtime is far too broad (it reached every project and the member list in this team), so runtime Edge Config sync should not be a supported default.

Caveats: one account, one team (the team token's project list hit its limit of 5, so it can see other projects), one run each. The project token's Edge Config refusals are 404 "not found", not 403; the team token reaching the same ID with 200 shows that the ID was right, so the 404 is how Vercel hides a store from a token that cannot see it.

## What Vercel's current docs say

Read on 27 October 2026.

- **Token scopes** ([Access tokens](https://vercel.com/docs/accounts/access-tokens), updated 8 September 2026): Full Account, Team (all projects) and Project. "A project-scoped token denies any request to another project, to a user-level resource, or to a team-level resource." Project-scoped tokens arrived on 30 July 2026 ([changelog](https://vercel.com/changelog/project-scoped-tokens)).
- **`teamId`**: "Team- and project-scoped tokens do not require the `teamId` query parameter or the team `slug`… Vercel infers the team and project from the token's scope." Full-account tokens still need `?teamId=`. A community answer suggests that sending `teamId` with a project-scoped token may itself cause a refusal; the spike tests both.
- **Minting**: creating tokens needs a full-account token. "A project-scoped token cannot mint new tokens."
- **Edge Config is now called Global Config** in the docs. The write call is `PATCH /v1/global-config/{id}/items?teamId=…` in the docs; our code sends `PATCH /v1/edge-config/{id}/items`. Whether the old path stays is not stated, so the spike calls both. Error shape in the docs: `{ "error": { "code", "message", … } }`.
- **No narrower credential exists in the docs.** A Global Config has _read access tokens_ (for `global-config.vercel.com`, created by `POST /v1/global-config/{id}/token`), but writes always need a Vercel access token ("writing requires Vercel Access Tokens to authenticate with the Vercel REST API"). The SDK page says the same. There is no write-only or store-scoped write token.
- **The connection string carries the store id.** Format: `https://global-config.vercel.com/<id>?token=<read token>` (the older form is `edge-config.vercel.com/ecfg_…`). So `EDGE_CONFIG_ID` can be derived from `EDGE_CONFIG`, as task 233 proposes, by taking the first path segment. Confirm the exact legacy format from a real `EDGE_CONFIG` value (not measured: the owner copies the host and path of one real value, never the token).

## Matrix

Measured results: HTTP status and Vercel's error `code`. Tokens and values are never recorded. "Documented" is what the docs above predicted.

| #   | Operation                                                                      | Project token (measured)                                                                                                      | Team token (measured)                                                                                                                    | Matches docs?                                    |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| a   | Edge Config item upsert, as `edge-config-sync.ts` sends it                     | **404** `not_found` "Edge Config Item not found", with and without `teamId`                                                   | **200** `{status: ok}`, both ways                                                                                                        | Refused, but as 404 not 403                      |
| a2  | Same on the docs' `/v1/global-config/{id}/items` path                          | **404** `not_found`                                                                                                           | **200**                                                                                                                                  | Both paths work for the team token               |
| a3  | Edge Config metadata, list stores, list read tokens                            | metadata **404**, list stores **403** `forbidden`, read tokens **404**                                                        | **200** each (1 store, 0 tokens)                                                                                                         | Yes                                              |
| b1  | List env vars (key, type, target, `updatedAt`)                                 | **200**                                                                                                                       | **200**                                                                                                                                  | Yes                                              |
| b2  | Create `plain`, `encrypted` (all 3 targets), `sensitive` (production, preview) | **201** each                                                                                                                  | **201** each                                                                                                                             | Yes                                              |
| b3  | Upsert the same (`?upsert=true`)                                               | **201** each                                                                                                                  | **201** each                                                                                                                             | Yes                                              |
| b4  | Legacy `secret` type                                                           | **400** `bad_request`: allowed types are `system, encrypted, plain, sensitive`                                                | **400**, same                                                                                                                            | Yes: `secret` is gone                            |
| c1  | List deployments with commit and ready state                                   | **200** (state `READY`, target, commit SHA)                                                                                   | **200**                                                                                                                                  | Yes                                              |
| c2  | Redeploy from an existing deployment                                           | **200** (after fixing the script's `target`; `preview` is not accepted, only `production`, `staging` or a custom environment) | **200**                                                                                                                                  | Yes                                              |
| d1  | List, add, get, remove a project domain                                        | **200** each                                                                                                                  | **200** each                                                                                                                             | Yes                                              |
| d1b | Verify a domain                                                                | **400** `missing_txt_record` (the normal "not verified yet" answer)                                                           | **400**, same                                                                                                                            | Yes                                              |
| d2  | DNS configuration `GET /v6/domains/{d}/config`                                 | **200**                                                                                                                       | **200**                                                                                                                                  | Yes (was unknown)                                |
| d3  | Team-level domains: list, lookup, DNS records                                  | list **403**, lookup **403**, records **403**                                                                                 | list **200**, lookup **403**, records **403** (the test domain is not registered with Vercel, so the last two prove nothing about scope) | Yes for the project token                        |
| d4  | Is `teamId` needed?                                                            | **No.** Domain and env reads give **200** with and without it                                                                 | **No.** Also **200** both ways, including the Edge Config `PATCH`                                                                        | Yes, and sending it does no harm                 |
| e1  | `GET /v2/user`, `GET /v2/teams`                                                | **404** `not_found`, **403**                                                                                                  | **200**, **200**                                                                                                                         | Yes                                              |
| e2  | `GET /v9/projects?limit=5`                                                     | **1** project (its own)                                                                                                       | **5** (the limit; other projects in the team)                                                                                            | Yes                                              |
| e3  | Write project settings and protection (same value written back)                | **200**, **200**                                                                                                              | **200**, **200**                                                                                                                         | Yes: protection can be changed                   |
| e4  | Firewall / bypass config                                                       | **404** "Config not found"                                                                                                    | **404**                                                                                                                                  | Inconclusive: the project has no firewall config |
| e5  | Team members; account tokens; mint a token                                     | members **403**; account tokens **400** (needs a personal-account token); mint **403**                                        | members **200**; tokens **400**; mint **403**                                                                                            | Yes                                              |
| e6  | Delete the project                                                             | not run                                                                                                                       | not run                                                                                                                                  | Untested                                         |

### Blast radius, measured

**Project-scoped token:** read and write on its one project: env vars of every type, including replacing `SANITY_API_READ_TOKEN`, `PREVIEW_SECRET` and webhook secrets; project settings and protection (the same-value `PATCH`es returned 200); domains (add, remove, DNS config); and new deployments, including to production. It saw one project, no user, no teams, no members, and could not mint tokens. It is **not read-only and not harmless**: an attacker with it can change a secret or add a domain and redeploy. Whether env values come back readable was not measured (the script keeps names only); assume `plain` and `encrypted` values can be read back and `sensitive` ones cannot.

**Team token:** everything above on **every project in the team** (the list returned the limit of 5 projects), the Edge Config stores, the team member list and the user record. Still no minting.

## Security implications of each runtime option

| Option                                           | What a compromised runtime can do                                                                                                                        | Works today?                      |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **1. Page-route redirects (default)**            | Nothing extra: no token, no Vercel API access                                                                                                            | Yes; a redeploy changes redirects |
| **2. Project-scoped token in the runtime**       | One project's env, settings, domains and deployments (matrix e3). **Cannot write Edge Config**, so it cannot do the sync                                 | **No** for redirect sync (row a)  |
| **2b. Team token in the runtime**                | Every project in the team and its Edge Config, plus the member list                                                                                      | Yes, and unacceptable             |
| **3. Move the redirect sync out of the runtime** | Nothing in the runtime. The sync runs where a team token lives: a GitHub Actions job triggered by a Sanity webhook, or Foundation on the owner's machine | Needs building                    |

## Decisions

1. **Page-route redirects stay the default**, as §R.4 already says.
2. **Do not offer a project-scoped token for Edge Config redirects.** It is refused. The only token that works is a team token, which does not belong in a public runtime. Mark runtime Edge Config sync (`VERCEL_API_TOKEN` + `EDGE_CONFIG_ID` on the site) as a **not recommended** option, document the reason and the blast radius next to it, and do not add any new README requirement for a token. Whether to keep it for existing sites, deprecate it, or replace it with option 3 is the owner's decision; option 3 is the only design that keeps instant redirects without a team token in the runtime.
3. **`VERCEL_TEAM_ID` is unnecessary** for project-scoped and team tokens on every call tested, and sending it is harmless. Full-account tokens still need it (docs; not tested here), so keep reading it, document it as "only for a full-account token", and keep sending it when set.
4. **`EDGE_CONFIG_ID` can be derived from `EDGE_CONFIG`** (the connection string carries the store id), if the format is confirmed against a real value first. This was not measured; the owner should check one real `EDGE_CONFIG` host and path, never the token.
5. **Env var types:** use `sensitive` for secrets Nocturne writes; `secret` is rejected. The script did not test `sensitive` on the `development` target (the docs say it is not allowed).

### What this unblocks

**Task 233 (cleanups).** Go ahead with `VERCEL_TEAM_ID` ("only needed for a full-account token") and `EDGE_CONFIG_ID` (derive it, after confirming the format). The Vercel token guidance in the README should say: project-scoped for everything except Edge Config; Edge Config sync needs a team token and is not recommended in the runtime.

**Task 129 (domains).** Project-scoped token, no `VERCEL_TEAM_ID`: list, add, get, verify, remove, and read DNS configuration all work. Registered-domain and DNS-record calls are refused, so DNS stays manual, as the launch design assumes. Adding and removing domains is part of the blast radius, so a launch-control feature that holds this token belongs in the local interface, not the public runtime.

**Milestone MS (Foundation).** Foundation can save env vars (as `sensitive`), list deployments and trigger redeploys with a **project-scoped** token. It must not assume that token also covers Edge Config; that needs a team token, which Foundation (on the owner's machine) may hold but a site runtime may not.

## Evidence check for task 233 (27 October 2026)

What the cleanups rest on, kept apart:

- **Measured against Vercel's API:** a project-scoped token is refused for the Edge Config write (404) and a team token is accepted; `teamId` is not needed by either token type and sending it does no harm; env var creation works for `plain`, `encrypted` and `sensitive` and `secret` is rejected. These are matrix rows a, a2, a3, b2, b4 and d4.
- **From Vercel's documentation, not measured:** that the `EDGE_CONFIG` connection string is `https://edge-config.vercel.com/ecfg_…?token=…` (older) or `https://global-config.vercel.com/<id>?token=…` (newer); that a full-account token still needs `teamId`; that `sensitive` env vars cannot target `development`. The spike never read a real `EDGE_CONFIG` value.
- **What the code therefore does:** `src/lib/edge-config-settings.ts` derives an id only from those two hosts over https, and only when the first path segment looks like `ecfg_…`; anything else yields no derived id, so a site with an unrecognised string keeps working as before (and sets `EDGE_CONFIG_ID`). An explicit `EDGE_CONFIG_ID` must itself be an `ecfg_` id, and if it differs from the derived one nothing is written. Messages name settings and never include the string or its token. Whether newer Global Config ids still start `ecfg_` is **unconfirmed**: check one real value (host and path only) before relying on derivation for a site.

## How it was run

```sh
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as project --step all --yes --out project.json
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as project --step cleanup --yes
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as project --step deploy --yes   # re-run after fixing the redeploy body
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as team --step all --yes --out team.json
node scripts/spikes/vercel-tokens.mjs --project $VERCEL_SPIKE_PROJECT_ID --as team --step cleanup --yes
```

Tokens come from `VERCEL_SPIKE_PROJECT_TOKEN` and `VERCEL_SPIKE_TEAM_TOKEN` and are never printed; add `--dry-run` to see every request first. Both tokens need a scratch project and a scratch Edge Config store (Vercel now calls the store a Global Config). Cleanup lists what it removed; `--include-project-delete` (not used) also deletes the scratch project.

## Cleanup record

Removed by the script: the eight `NOCT_SPIKE_*` environment variables (plain, encrypted and sensitive, per target) after the project-token pass and again after the team-token pass; the `redirects` item in the scratch Edge Config store (team token); every spike domain, removed within the run (the cleanup step's 404s for the domain are that, already gone).

**Not removed by the script, to delete by hand:** the two production redeployments it created on the scratch project (one per token); the scratch project, the scratch Edge Config store, and both tokens (revoke at the Vercel account tokens page). No production project, credential, `VERCEL_TEAM_ID` or client resource was changed. The team token can see other projects in the team, but the script only addressed the scratch project.
