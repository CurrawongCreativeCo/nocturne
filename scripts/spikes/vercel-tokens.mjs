/**
 * Task 235 spike: what can a Vercel project-scoped token do, against a team token?
 * Decision record: docs/spikes/vercel-tokens.md. Plan: docs/nocturne/NOCTURNE_SETTINGS_CONFIGURATION.md §R.4.
 *
 * SCRATCH PROJECT ONLY. Refuses to run unless VERCEL_SPIKE_PROJECT_ID is set and equals `--project`,
 * so it cannot be pointed at a client's project by accident. Every request that is not a GET needs
 * `--yes`; `--dry-run` prints each request (tokens redacted) and sends nothing. Dependency-free.
 *
 *   VERCEL_SPIKE_PROJECT_ID=prj_x VERCEL_SPIKE_EDGE_CONFIG_ID=ecfg_x VERCEL_SPIKE_PROJECT_TOKEN=... \
 *     node scripts/spikes/vercel-tokens.mjs --project prj_x --as project --step all --dry-run
 *
 * Options
 *   --project <id>      the scratch project (must match VERCEL_SPIKE_PROJECT_ID)
 *   --as project|team   which token to use: VERCEL_SPIKE_PROJECT_TOKEN or VERCEL_SPIKE_TEAM_TOKEN
 *   --step <name>       edge-config | env | deploy | domains | blast | cleanup | all (not cleanup)
 *   --yes               allow writes   --dry-run  print, send nothing   --out <file>  save the matrix as JSON
 *   --include-project-delete   with `--step cleanup`, also DELETE the scratch project (last, irreversible)
 *
 * Environment (names only; values are read here and never printed)
 *   VERCEL_SPIKE_PROJECT_ID, VERCEL_SPIKE_EDGE_CONFIG_ID, VERCEL_SPIKE_TEAM_ID (the scratch team),
 *   VERCEL_SPIKE_PROJECT_TOKEN, VERCEL_SPIKE_TEAM_TOKEN, VERCEL_SPIKE_DOMAIN (optional),
 *   VERCEL_SPIKE_OTHER_PROJECT_ID (optional: a second scratch project, to prove isolation).
 *
 * Everything this script creates is named with SPIKE_PREFIX, and `--step cleanup` removes it and
 * lists what it removed. Only the names, targets, types and dates of environment variables are
 * recorded; response bodies are reduced to their shape.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const API = 'https://api.vercel.com'
export const SPIKE_PREFIX = 'NOCT_SPIKE_'
export const SPIKE_EDGE_KEY = 'redirects'
const STEPS = ['edge-config', 'env', 'deploy', 'domains', 'blast']
const TARGETS = ['production', 'preview', 'development']

/* ---------------------------------------------------------------- pure helpers (unit tested) */

/** Replaces every secret value and anything that looks like a Vercel token. */
export function redact(text, secrets = []) {
  let out = String(text ?? '')
  for (const secret of secrets) {
    if (secret && secret.length >= 8) out = out.split(secret).join('[redacted]')
  }
  return out
    .replace(/\bvc[a-z]_[A-Za-z0-9]{8,}/g, '[redacted]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
}

export function parseArgs(argv) {
  const args = { flags: new Set(), values: {} }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const name = arg.slice(2)
    if (['yes', 'dry-run', 'include-project-delete'].includes(name)) args.flags.add(name)
    else args.values[name] = argv[++i]
  }
  return args
}

/** The safety gate: a scratch project must be named in the environment and match `--project`. */
export function checkGuard(args, env) {
  const scratch = env.VERCEL_SPIKE_PROJECT_ID
  if (!scratch)
    return {
      ok: false,
      message:
        'VERCEL_SPIKE_PROJECT_ID is not set. This spike only runs against a scratch project.',
    }
  if (args.values.project !== scratch)
    return { ok: false, message: '--project must equal VERCEL_SPIKE_PROJECT_ID. Refusing to run.' }
  const as = args.values.as
  if (as !== 'project' && as !== 'team')
    return { ok: false, message: '--as must be "project" or "team".' }
  const tokenName = as === 'project' ? 'VERCEL_SPIKE_PROJECT_TOKEN' : 'VERCEL_SPIKE_TEAM_TOKEN'
  if (!env[tokenName]) return { ok: false, message: `${tokenName} is not set.` }
  const step = args.values.step ?? 'all'
  if (step !== 'all' && step !== 'cleanup' && !STEPS.includes(step))
    return {
      ok: false,
      message: `--step must be one of ${[...STEPS, 'cleanup', 'all'].join(', ')}.`,
    }
  if ((step === 'all' || step === 'edge-config') && !env.VERCEL_SPIKE_EDGE_CONFIG_ID)
    return {
      ok: false,
      message: 'VERCEL_SPIKE_EDGE_CONFIG_ID is not set (the scratch Edge Config store).',
    }
  return { ok: true, tokenName, step }
}

/** Whether a request may be sent: reads always, anything else only with --yes or in a dry run. */
export function isAllowed(method, flags) {
  return method === 'GET' || flags.has('yes') || flags.has('dry-run')
}

export function buildUrl(path, { teamId, query = {} } = {}) {
  const url = new URL(path, API)
  for (const [key, value] of Object.entries(query))
    if (value !== undefined) url.searchParams.set(key, value)
  if (teamId) url.searchParams.set('teamId', teamId)
  return url
}

/** The error shape of a response: HTTP status, Vercel's code and message, and the keys it carries. */
export function describeResponse(status, text) {
  let body
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    return { status, ok: status < 400, error: { code: 'non-json', message: text.slice(0, 120) } }
  }
  if (status < 400) return { status, ok: true, shape: shapeOf(body) }
  const error = body?.error ?? {}
  return {
    status,
    ok: false,
    error: {
      code: error.code ?? null,
      message: typeof error.message === 'string' ? error.message.slice(0, 200) : null,
      keys: Object.keys(error).sort(),
    },
  }
}

function shapeOf(body) {
  if (Array.isArray(body)) return `array(${body.length})`
  if (body && typeof body === 'object') return `{${Object.keys(body).sort().join(',')}}`
  return typeof body
}

/** Names, targets, types and dates only. A value, even an encrypted one, is never kept. */
export function summariseEnv(body) {
  return (body?.envs ?? []).map((e) => ({
    key: e.key,
    type: e.type,
    target: [].concat(e.target ?? []).sort(),
    updatedAt: e.updatedAt ?? null,
  }))
}

/** Commit and ready state of each deployment. */
export function summariseDeployments(body) {
  return (body?.deployments ?? []).map((d) => ({
    uid: d.uid,
    state: d.readyState ?? d.state ?? null,
    target: d.target ?? null,
    commit: d.meta?.githubCommitSha ?? null,
    createdAt: d.created ?? d.createdAt ?? null,
  }))
}

/* ---------------------------------------------------------------- the runner */

export function createRunner({ token, teamId, flags, fetchImpl = fetch, log = console.log }) {
  const results = []
  const secrets = [token]
  async function call(
    step,
    label,
    { method = 'GET', path, query, body, withTeam = false, summarise, note },
  ) {
    const url = buildUrl(path, { teamId: withTeam ? teamId : undefined, query })
    const display = redact(url.pathname + url.search, secrets)
    const entry = { step, label, method, path: display, teamIdSent: Boolean(withTeam && teamId) }
    if (note) entry.note = note
    if (!isAllowed(method, flags)) {
      entry.skipped = 'needs --yes'
    } else if (flags.has('dry-run')) {
      entry.dryRun = true
      entry.body = body === undefined ? undefined : redactBody(body)
    } else {
      const response = await fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
      const text = await response.text()
      Object.assign(entry, describeResponse(response.status, text))
      if (entry.ok && summarise) {
        try {
          entry.data = summarise(text ? JSON.parse(text) : undefined)
        } catch {
          /* shape only */
        }
      }
      entry.raw = response.ok && text ? safeJson(text) : undefined
    }
    log(formatLine(entry))
    results.push(entry)
    return entry
  }
  return { call, results }
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Dry-run bodies never show values for environment variables. */
function redactBody(body) {
  return JSON.parse(
    JSON.stringify(body, (key, value) =>
      key === 'value' && typeof value === 'string' ? '[value]' : value,
    ),
  )
}

function formatLine(e) {
  if (e.dryRun && e.body !== undefined)
    return `${formatOutcome(e)}\n             body ${JSON.stringify(e.body)}`
  return formatOutcome(e)
}

function formatOutcome(e) {
  const outcome = e.skipped
    ? `skipped (${e.skipped})`
    : e.dryRun
      ? 'dry run'
      : `${e.status} ${e.ok ? 'ok' : (e.error?.code ?? 'error')}`
  return `${e.step.padEnd(11)} ${e.method.padEnd(6)} ${e.path}  ->  ${outcome}  [${e.label}]`
}

/** Strips `raw` (kept in memory for chaining only) before the matrix is saved. */
function publicEntries(results) {
  return results.map(({ raw: _raw, ...rest }) => rest)
}

/* ---------------------------------------------------------------- steps */

export async function runSteps(run, ctx) {
  const { project, edgeConfigId } = ctx
  const p = (path) => `/v9/projects/${project}${path}`

  async function edgeConfig() {
    const map = { '/spike-from-nocturne': { destination: '/', permanent: false } }
    const items = { items: [{ operation: 'upsert', key: SPIKE_EDGE_KEY, value: map }] }
    // Exactly what src/lib/edge-config-sync.ts sends, with and without teamId.
    for (const withTeam of [true, false]) {
      await run.call('edge-config', `sync PATCH (teamId ${withTeam ? 'sent' : 'omitted'})`, {
        method: 'PATCH',
        path: `/v1/edge-config/${edgeConfigId}/items`,
        body: items,
        withTeam,
      })
    }
    // Vercel's docs now name the product "Global Config"; check the new path answers the same way.
    await run.call('edge-config', 'sync PATCH on /v1/global-config (docs wording)', {
      method: 'PATCH',
      path: `/v1/global-config/${edgeConfigId}/items`,
      body: items,
      withTeam: true,
    })
    await run.call('edge-config', 'read metadata (id, slug, ownerId)', {
      path: `/v1/edge-config/${edgeConfigId}`,
      withTeam: true,
    })
    await run.call('edge-config', 'list stores', { path: '/v1/edge-config', withTeam: true })
    await run.call('edge-config', 'list read tokens', {
      path: `/v1/edge-config/${edgeConfigId}/tokens`,
      withTeam: true,
    })
  }

  async function env() {
    await run.call('env', 'list (names, targets, updatedAt)', {
      path: `/v10/projects/${project}/env`,
      summarise: summariseEnv,
    })
    for (const [type, targets] of [
      ['plain', TARGETS],
      ['encrypted', TARGETS],
      ['sensitive', ['production', 'preview']],
      ['secret', ['production']], // legacy type: record the refusal
    ]) {
      for (const target of targets) {
        const key = `${SPIKE_PREFIX}${type.toUpperCase()}_${target.toUpperCase()}`
        await run.call('env', `create ${type} / ${target}`, {
          method: 'POST',
          path: `/v10/projects/${project}/env`,
          body: { key, value: 'spike-value', type, target: [target] },
        })
        await run.call('env', `upsert ${type} / ${target}`, {
          method: 'POST',
          path: `/v10/projects/${project}/env`,
          query: { upsert: 'true' },
          body: { key, value: 'spike-value-2', type, target: [target] },
        })
      }
    }
    await run.call('env', 'list again, after writes', {
      path: `/v10/projects/${project}/env`,
      summarise: summariseEnv,
    })
  }

  async function deploy() {
    const info = await run.call('deploy', 'project (name, link, latest deployments)', {
      path: p(''),
    })
    await run.call('deploy', 'list deployments (commit, ready state)', {
      path: '/v6/deployments',
      query: { projectId: project, limit: '5' },
      summarise: summariseDeployments,
    })
    const list = await run.call('deploy', 'list deployments (v6) re-read for redeploy source', {
      path: '/v6/deployments',
      query: { projectId: project, limit: '1' },
    })
    const source = list.raw?.deployments?.[0]?.uid
    if (!source) {
      list.note =
        'No deployment to redeploy: deploy the scratch project once, then re-run this step.'
      return
    }
    await run.call('deploy', 'redeploy (create from an existing deployment)', {
      method: 'POST',
      path: '/v13/deployments',
      query: { forceNew: '1' },
      body: { name: info.raw?.name ?? 'nocturne-spike', deploymentId: source, target: 'preview' },
    })
  }

  async function domains() {
    const domain = ctx.domain
    await run.call('domains', 'list project domains', { path: p('/domains') })
    await run.call('domains', 'add domain to project', {
      method: 'POST',
      path: `/v10/projects/${project}/domains`,
      body: { name: domain },
    })
    await run.call('domains', 'get project domain', { path: p(`/domains/${domain}`) })
    await run.call('domains', 'verify project domain', {
      method: 'POST',
      path: p(`/domains/${domain}/verify`),
    })
    await run.call('domains', 'DNS configuration for domain', {
      path: `/v6/domains/${domain}/config`,
    })
    await run.call('domains', 'team-level: list registered domains', {
      path: '/v5/domains',
      withTeam: true,
    })
    await run.call('domains', 'team-level: domain record lookup', {
      path: `/v5/domains/${domain}`,
      withTeam: true,
    })
    await run.call('domains', 'team-level: list DNS records', {
      path: `/v4/domains/${domain}/records`,
      withTeam: true,
    })
    await run.call('domains', 'remove domain from project', {
      method: 'DELETE',
      path: p(`/domains/${domain}`),
    })
    // Can VERCEL_TEAM_ID be dropped? Repeat the reads without and with the team id.
    for (const withTeam of [false, true]) {
      await run.call('domains', `list project domains (teamId ${withTeam ? 'sent' : 'omitted'})`, {
        path: p('/domains'),
        withTeam,
      })
      await run.call('domains', `list env (teamId ${withTeam ? 'sent' : 'omitted'})`, {
        path: `/v10/projects/${project}/env`,
        withTeam,
      })
    }
  }

  async function blast() {
    // Writes below set a field to the value it already has, so the scratch project is unchanged.
    const info = await run.call('blast', 'read project settings', { path: p('') })
    const current = info.raw ?? {}
    await run.call('blast', 'who am I (user-level)', { path: '/v2/user' })
    await run.call('blast', 'list teams (user-level)', { path: '/v2/teams' })
    await run.call('blast', 'list projects (team-level)', {
      path: '/v9/projects',
      query: { limit: '5' },
      summarise: (b) => (b?.projects ?? []).length,
    })
    if (ctx.otherProject)
      await run.call('blast', 'read a different scratch project', {
        path: `/v9/projects/${ctx.otherProject}`,
      })
    // Only written back when the project returned a value, so nothing is ever set from a default.
    for (const field of ['autoExposeSystemEnvs', 'ssoProtection']) {
      if (info.dryRun || current[field] !== undefined) {
        await run.call('blast', `write ${field} (same value)`, {
          method: 'PATCH',
          path: p(''),
          body: { [field]: current[field] ?? '[current value]' },
        })
      } else {
        run.results.push({
          step: 'blast',
          label: `write ${field} (same value)`,
          method: 'PATCH',
          path: p(''),
          skipped: 'project did not return the field',
        })
      }
    }
    await run.call('blast', 'read protection bypass / firewall config', {
      path: '/v1/security/firewall/config/active',
      query: { projectId: project },
    })
    await run.call('blast', 'list team members (team-level)', {
      path: ctx.teamId ? `/v3/teams/${ctx.teamId}/members` : '/v3/teams/unknown/members',
    })
    await run.call('blast', 'list account tokens (user-level)', { path: '/v6/user/tokens' })
    const mint = await run.call('blast', 'mint a token (should need a full-account token)', {
      method: 'POST',
      path: '/v3/user/tokens',
      body: { name: `${SPIKE_PREFIX}mint-test` },
    })
    // If minting worked, revoke the stray token at once.
    const minted = mint.raw?.token?.id ?? mint.raw?.tokenId
    if (mint.ok && minted)
      await run.call('blast', 'revoke the token that was just minted', {
        method: 'DELETE',
        path: `/v3/user/tokens/${minted}`,
      })
    await run.call('blast', 'read deployment logs/events', {
      path: '/v6/deployments',
      query: { projectId: project, limit: '1' },
    })
  }

  async function cleanup() {
    const removed = []
    const gone = (what) => removed.push(what)
    const env = await run.call('cleanup', 'list env', { path: `/v10/projects/${project}/env` })
    for (const e of (env.raw?.envs ?? []).filter((x) => x.key.startsWith(SPIKE_PREFIX))) {
      const r = await run.call(
        'cleanup',
        `delete env ${e.key} (${[].concat(e.target).join(',')})`,
        { method: 'DELETE', path: p(`/env/${e.id}`) },
      )
      if (r.ok) gone(`env ${e.key} [${[].concat(e.target).join(',')}]`)
    }
    const r = await run.call('cleanup', 'remove spike domain', {
      method: 'DELETE',
      path: p(`/domains/${ctx.domain}`),
    })
    if (r.ok) gone(`domain ${ctx.domain}`)
    if (edgeConfigId) {
      const e = await run.call('cleanup', 'delete Edge Config item', {
        method: 'PATCH',
        path: `/v1/edge-config/${edgeConfigId}/items`,
        withTeam: true,
        body: { items: [{ operation: 'delete', key: SPIKE_EDGE_KEY }] },
      })
      if (e.ok) gone(`edge config item "${SPIKE_EDGE_KEY}"`)
    }
    if (ctx.deleteProject) {
      const d = await run.call('cleanup', 'DELETE the scratch project', {
        method: 'DELETE',
        path: p(''),
      })
      if (d.ok) gone(`project ${project}`)
    }
    return removed
  }

  const table = { 'edge-config': edgeConfig, env, deploy, domains, blast }
  if (ctx.step === 'cleanup') return { removed: await cleanup() }
  for (const name of ctx.step === 'all' ? STEPS : [ctx.step]) await table[name]()
  return {}
}

/* ---------------------------------------------------------------- entry point */

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const guard = checkGuard(args, process.env)
  if (!guard.ok) {
    console.error(`✗ ${guard.message}`)
    process.exit(1)
  }
  const { env } = process
  const run = createRunner({
    token: env[guard.tokenName],
    teamId: env.VERCEL_SPIKE_TEAM_ID,
    flags: args.flags,
  })
  const domain =
    env.VERCEL_SPIKE_DOMAIN ||
    `nocturne-spike-${Math.random().toString(36).slice(2, 8)}.example.com`
  console.log(
    `Token: ${args.values.as} (from ${guard.tokenName}, never printed). Project ${args.values.project}.`,
  )
  const { removed } = await runSteps(run, {
    step: guard.step,
    project: args.values.project,
    edgeConfigId: env.VERCEL_SPIKE_EDGE_CONFIG_ID,
    teamId: env.VERCEL_SPIKE_TEAM_ID,
    domain,
    otherProject: env.VERCEL_SPIKE_OTHER_PROJECT_ID,
    deleteProject: args.flags.has('include-project-delete'),
  })
  if (removed)
    console.log(`\nRemoved:\n${removed.map((r) => `  - ${r}`).join('\n') || '  (nothing)'}`)
  if (args.values.out) {
    writeFileSync(
      args.values.out,
      JSON.stringify(
        { as: args.values.as, at: new Date().toISOString(), results: publicEntries(run.results) },
        null,
        2,
      ),
    )
    console.log(`\nMatrix written to ${args.values.out}`)
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`✗ ${redact(error.message)}`)
    process.exit(1)
  })
}
