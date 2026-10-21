# Connect a client domain to Vercel

Use this checklist on the call with the client. The operator changes records manually in the DNS host's
dashboard. `domain:check` only reads DNS and, optionally, Vercel configuration; it cannot save a change.
Replace `example.com.au` and the example targets below with the client's domain and **their project's
Domains card values**. Keep the old website available until the connection and rollback window close.

## Before the call

- [ ] Agree on the launch time, primary address (apex or `www`), operator, client contact and rollback trigger.
      Record the registrar, DNS host and email provider separately. Have the client sign in with MFA;
      do not ask them to send passwords or tokens through chat.
- [ ] Confirm the DNS host from the authoritative NS answers, then check its dashboard. A provider guess
      is a clue: a registrar can sell the domain while Cloudflare or another company hosts its DNS.
- [ ] Confirm email ownership with the client: Microsoft 365, Google Workspace, registrar mail or another
      service. Record who can investigate email problems and send/receive a test message before launch.
- [ ] A day ahead, lower the existing apex and `www` web-record TTLs to 300 seconds if the host permits.
      Wait out the **previous** TTL before launch. Lowering a TTL on the call cannot clear cached answers.
- [ ] Export the **whole zone** from the DNS host (the registrar if it hosts DNS). If it offers no export,
      copy every record and take screenshots, including hostnames, values, priorities, TTLs and proxy status.
      Save these in the client's private launch folder. DNS discovery cannot enumerate a complete zone.
- [ ] Save a timestamped before snapshot. `--silent` suppresses npm's banner so the redirected file is valid JSON:

  ```bash
  npm run --silent domain:check -- example.com.au --json > domain-before.json
  ```

- [ ] Read the snapshot and record the existing apex A/AAAA/CNAME and `www` A/AAAA/CNAME values in the launch notes.
      Compare with the dashboard, including any flattened ALIAS/ANAME or proxied records: DNS answers can
      hide their configured targets. Save the old targets and proxy settings separately for rollback.
- [ ] Confirm MX, SPF TXT, `_dmarc` and DKIM with the email owner. The checker probes `google`, `selector1`,
      `selector2`, `k1`, `default`, `s1` and `s2` as both TXT and CNAME at `<selector>._domainkey`.
      Other selectors and records may exist. Keep **all** email and unrelated verification records.

## In Vercel

- [ ] Open the correct team → project → Settings → Domains. Add **both** `example.com.au` and
      `www.example.com.au`. Confirm the production deployment works at its Vercel address first.
- [ ] Choose the primary address with the client; configure the other domain to redirect to it.
      `www` is Vercel's recommended primary. Avoid redirecting each address to the other.
- [ ] Copy the apex **A** and `www` **CNAME** values from their respective domain cards into the launch notes.
      Do not reuse another client's targets or assume the apex address is always the same.
- [ ] If Vercel requests ownership verification, add exactly its TXT name/value at the DNS host (normally
      `_vercel` at the apex). Preserve existing TXT values. Verify in Vercel; do not invent a challenge
      value or assume an old `_vercel` record proves ownership of this project.

These steps follow [Vercel's domain connection guide](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

## At the DNS host

- [ ] Run a comparison using the card values. The following targets are examples only:

  ```bash
  npm run domain:check -- example.com.au \
    --expect-a 216.198.79.1 \
    --expect-cname d1d4fc829fe7bc7c.vercel-dns-017.com
  ```

- [ ] Change only the website records below, plus a verification TXT or CAA permission when explicitly required.
      Take a screenshot before saving and another afterwards. If the host offers a “connect website” wizard
      that replaces the zone or moves nameservers, use its manual record editor instead.

  | Type  | Name                                 | Action                                                                                                    |
  | ----- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
  | A     | `@` (or blank, as the host requires) | Replace old apex A values with the exact domain-card value.                                               |
  | CNAME | `www`                                | Set the project's target hostname, with no `https://` or path. Replace conflicting `www` A/CNAME records. |
  | AAAA  | `@` and `www`                        | Remove stale web IPv6 records for the external-DNS connection. Leave unrelated names alone.               |

- [ ] If an apex CNAME, ALIAS/ANAME or forwarding service exists, record its original settings and replace
      that web mapping with the intended A record. Do not remove any unrelated hostnames.
- [ ] If Cloudflare hosts DNS, use **DNS only** for the two web names while verifying. Orange-cloud proxy
      addresses can hide the expected records. Flexible SSL can cause redirect loops; use Full (strict)
      once the origin certificate is valid. Any later decision to proxy needs its own HTTPS/redirect test.
- [ ] Review CAA for both addresses, including inherited policies. If it restricts issuance, the DNS owner
      must permit `0 issue "letsencrypt.org"` while retaining other required issuers. Parameters such as
      account restrictions, unknown critical tags or an incomplete lookup require manual review. Do not
      delete the whole CAA policy. No CAA policy normally means issuance is unrestricted.

The project card takes precedence over example addresses. External-DNS IPv6, CAA and proxy caveats are
covered in [Vercel's A-record and certificate guide](https://vercel.com/kb/guide/a-record-and-caa-with-vercel).

## After saving

- [ ] Run the same comparison again and save the after snapshot with the same expectations:

  ```bash
  npm run --silent domain:check -- example.com.au \
    --expect-a 216.198.79.1 \
    --expect-cname d1d4fc829fe7bc7c.vercel-dns-017.com \
    --json > domain-after.json
  ```

- [ ] Review every authoritative answer. If public answers differ, the result says **not yet everywhere**:
      wait for the old TTL and re-run. Do not keep editing correct records to chase cached answers.
      If authoritative servers disagree or a lookup is incomplete, investigate with the DNS host.
- [ ] Wait for **Valid Configuration** on both Vercel domain cards and a valid certificate. Open both
      HTTPS addresses, confirm the expected redirect and primary address, and check the certificate covers
      them. The checker cannot prove TLS readiness or ownership from DNS alone.
- [ ] Set `NEXT_PUBLIC_SITE_URL` to the primary HTTPS origin in Vercel's relevant environments and redeploy.
      This is a build-time setting; changing it without redeploying leaves old canonical addresses in place.
- [ ] In Sanity Manage → project → API → CORS, manually add the final site/Studio origin with credentials
      allowed. Keep required preview and local origins; follow the [deployment checklist](../../README.md#deploying-vercel).
- [ ] Run `npm run launch:check -- https://example.com.au` using the chosen primary address.
      For a temporary launch page, use `--prelaunch` instead. Resolve its failures before sign-off.
- [ ] Compare email records with the before export/snapshot; have the client send and receive a message again.
      Save the snapshots, zone export, screenshots, final domain-card status and sign-off together. Restore
      the agreed normal web TTL after the observation window.

## Rollback

- [ ] Agree with the client to roll back if the new site or certificate cannot be made ready in the launch window.
- [ ] In the same DNS host, restore the old apex and `www` A/CNAME values from `domain-before.json` and
      the zone export. Remove newly added conflicting web records. Restore any original web AAAA,
      ALIAS/ANAME, forwarding and proxy settings from the export/screenshots if they were changed.
- [ ] Re-run the checker **without the new Vercel expectations** to capture the restored answers; it may
      still flag old-host IPv6 or non-Vercel mappings. Compare with the before snapshot, not its Vercel verdict.
      Wait out cached answers and check the old website and email. DNS rollback is not instantaneous.
- [ ] If the application origin changed, restore `NEXT_PUBLIC_SITE_URL`, redeploy the intended old application
      when applicable, and review redirects with the owner. Keep the Vercel deployment available for cached traffic.

## Never do on launch day

- [ ] Never alter or delete **MX, SPF, DKIM or DMARC** to connect a website. Never replace all TXT records.
- [ ] Never move nameservers or transfer the registration during this process. If NS already belong to Vercel,
      edit records there; do not move them again.
- [ ] Never remove DS just to change A/CNAME records. For a separately planned nameserver move, first export
      and copy **every** record to the new host, remove the old DNSSEC DS through the registrar, and wait for its
      TTL to expire before changing NS. Re-enable DNSSEC with the new host's keys afterwards. A stale DS can
      break the entire domain, including email, for validating resolvers.

See [Cloudflare's DNSSEC migration guidance](https://developers.cloudflare.com/dns/dnssec/) for the DS sequence.

## .com.au and other .au domains

- [ ] Confirm the registrar of record and the client's access before booking the call. auDA accredits .au
      registrars; the client may buy through a reseller. Use the [auDA registrar list](https://www.auda.org.au/registrar-resources/list-of-au-accredited-registrars/)
      and [auDA WHOIS](https://whois.auda.org.au/) to identify the responsible provider if needed.
- [ ] Keep the licence holder, registration and renewal arrangements unchanged. Connecting web DNS does not
      require a registrar transfer. `example.com.au` is the apex here; use the whole name in the command,
      not `com.au`, a URL or `www.example.com.au`.

## Command behaviour and reuse

`npm run domain:check -- <apex-domain>` takes a read-only snapshot. It uses `node:dns/promises` against
all discovered authoritative NS and DNS-over-HTTPS against Cloudflare and Google. DS is the parent-published
DNSSEC delegation observed through those public resolvers; the tool does not validate the complete chain.
The normal output labels records **OK**, **Add**, **Change**, **Remove** or **Don't touch**, with values and explanations.
Missing email selectors are not instructions to add them. Public resolver comparison samples two caches, not all visitors.

Use `--expect-a` and `--expect-cname` from the domain cards. Alternatively, export `VERCEL_TOKEN` and
`VERCEL_PROJECT_ID` in your shell or secret manager; `VERCEL_TEAM_ID` is optional for team scope. The script
makes only `GET /v6/domains/{domain}/config?projectIdOrName=…` requests, for apex and `www`, and uses the
highest-ranked recommendations. Explicit expectations override API recommendations. It reports
`misconfigured` and `configuredBy`. See the [Vercel configuration API](https://vercel.com/docs/rest-api/domains/get-a-domain-s-configuration).
It does not load `.env` files or print tokens. Keep tokens out of command arguments and saved launch notes.

Without expectations the result is a snapshot, not proof that the project is connected. Exit **0** means
no observed blockers (read the limitations); **1** means an observed connection blocker; **2** means invalid
arguments or incomplete checks when there is no confirmed blocker. A stale public cache alone does not fail
the command. Network errors are never presented as missing records. `--help` lists the arguments.

JSON includes `schemaVersion`, UTC capture time, expected values, raw observed record values grouped by source,
public TTLs, DS, effective CAA policies, errors, limitations and verdicts. Authoritative values use Node's
record APIs; TTLs and configured proxy/flattening settings must also be kept in the zone export. Protect these
files as client operational data. For future Ops reuse, import the pure checks in `scripts/domain-check/checks.mjs`;
collection is separate in `dns.mjs`. Offline Vitest fixtures cover the supported DNS scenarios.

Sources checked **21 October 2026**. Re-check the current project cards and provider instructions at each launch.
