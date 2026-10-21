#!/usr/bin/env node
import { assessSnapshot, parseArgs } from './domain-check/checks.mjs'
import { collectSnapshot } from './domain-check/dns.mjs'

try {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(
      'Read-only DNS snapshot: npm run domain:check -- <apex-domain> [--expect-a <IPv4>] [--expect-cname <www-target>] [--json]\nUse npm run --silent domain:check -- <domain> --json > snapshot.json for a clean JSON file.\nExit codes: 0 no observed blockers (read limitations), 1 connection blocked, 2 incomplete lookup or invalid arguments.\nOptional environment: VERCEL_TOKEN + VERCEL_PROJECT_ID, VERCEL_TEAM_ID for team scope. No .env files are loaded.',
    )
  } else {
    const snapshot = await collectSnapshot(options)
    const assessment = assessSnapshot(snapshot)
    const report = {
      ...snapshot,
      ...assessment,
      limitations: [
        ...(!snapshot.expected.a.length || !snapshot.expected.cname.length
          ? [
              'Expected values missing: snapshot only for those records. Copy A and www CNAME values from the project domain cards and re-run.',
            ]
          : []),
        'DKIM selector discovery is limited to common selectors. A snapshot is not a complete zone export. Keep the registrar/DNS host export too.',
        'DNS alone cannot prove domain ownership, certificate readiness, DNSSEC chain validity or Cloudflare SSL mode. Confirm these in the dashboards and run launch:check.',
        'DS answers are parent-published delegation records observed through validating public resolvers. Never remove DS for an A/CNAME-only change.',
        'Cloudflare IP matches suggest proxying; confirm in its dashboard. Public resolver agreement samples two caches, not the whole internet.',
      ],
    }
    if (options.json) console.log(JSON.stringify(report, null, 2))
    else {
      console.log(
        `${snapshot.domain} — read-only DNS snapshot\nDNS host guess: ${snapshot.providerGuess}\nNS: ${snapshot.ns.values.join(', ') || '(unavailable)'}`,
      )
      for (const row of report.verdicts)
        console.log(
          `${row.verdict}: ${row.name} ${row.type} ${row.values.join(' | ') || '(none)'} — ${row.explanation}`,
        )
      for (const row of report.propagation)
        console.log(
          `${row.name} ${row.type}: ${row.authority} [${row.authoritative.join(', ') || '(absent)'}] / ${row.resolver} [${row.public.join(', ') || '(absent)'}] — ${row.explanation}`,
        )
      for (const config of snapshot.vercel)
        console.log(
          `Vercel ${config.name}: configuredBy=${config.configuredBy ?? 'unknown'}, misconfigured=${config.misconfigured ?? 'unknown'}`,
        )
      for (const note of [...report.errors, ...report.limitations]) console.log(`Note: ${note}`)
      console.log(
        report.blocked
          ? 'Connection blocked — review the actions above.'
          : report.errors.length
            ? 'Checks incomplete — retry before connecting.'
            : 'No observed blockers; confirm the dashboard and certificate checks in the runbook.',
      )
    }
    process.exitCode = report.blocked ? 1 : report.errors.length ? 2 : 0
  }
} catch {
  console.error(
    'Domain check could not run. Use --help and supply a bare apex domain and valid expected values. No DNS changes were made.',
  )
  process.exitCode = 2
}
