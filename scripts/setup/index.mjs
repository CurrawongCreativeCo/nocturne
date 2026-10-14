/**
 * One-time setup wizard. `npm run dev` runs this first (as `predev`).
 *
 * Serves a form on localhost, verifies the Sanity credentials against the Content
 * Lake and writes .env.local. With the user's Sanity CLI login it can also create
 * the project, a Viewer token and CORS origins, and import starter content.
 * Then it deletes itself: this folder, the `predev` and `setup` scripts in
 * package.json, and the README block marked `setup-wizard`.
 *
 * If .env.local already connects successfully, it skips the form and removes itself.
 * Dependency-free on purpose: it must run before anything else is configured.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { hostname, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { seedDocuments } from './seed.mjs'
import { DEFAULTS, DEV_PORT, ENV_KEYS, mergeEnv, normalize, parseEnv } from './validate.mjs'

const wizardDir = dirname(fileURLToPath(import.meta.url))
const root = join(wizardDir, '..', '..')
const envPath = join(root, '.env.local')

/**
 * The template repo's own checkout keeps the wizard: an untracked `.template-dev` file marks it.
 * Fresh clones never have the file, so for them the wizard removes itself as usual.
 */
const isTemplateCheckout = existsSync(join(root, '.template-dev'))

// Must match HOME_SLUG in src/config/paths.ts.
const HOME_SLUG = 'home'

if (process.env.CI) {
  console.log('setup: CI detected, skipping the setup wizard.')
  process.exit(0)
}

// ---------------------------------------------------------------------------
// Startup: reuse an existing .env.local if it already works.

const existing = readEnvFile()
const prefill = { ...DEFAULTS }
for (const [field, key] of Object.entries(ENV_KEYS)) {
  if (existing[key]) prefill[field] = existing[key]
}

let initialError = null
if (prefill.projectId && prefill.token) {
  const { values, errors } = normalize(prefill, { tokenMode: 'paste', projectMode: 'existing' })
  if (Object.keys(errors).length === 0) {
    const result = await checkConnection(values)
    if (result.ok) {
      console.log('✓ .env.local already connects to Sanity.')
      reportRemoval(removeWizard())
      process.exit(0)
    }
    initialError = result
  }
}

startServer()

// ---------------------------------------------------------------------------
// Validation

// ---------------------------------------------------------------------------
// Sanity checks and CLI actions

async function checkConnection({ projectId, dataset, apiVersion, token }) {
  const query = `{"pages": count(*[_type == "page"]), "home": defined(*[_type == "page" && slug.current == "${HOME_SLUG}"][0]._id)}`
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`

  let res
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return fail(null, "Couldn't reach Sanity. Check your internet connection and try again.")
  }
  const body = await res.json().catch(() => ({}))
  if (res.ok)
    return { ok: true, pageCount: body.result?.pages ?? 0, hasHome: Boolean(body.result?.home) }

  const detail = body.message || body.error || `HTTP ${res.status}`
  switch (res.status) {
    case 401:
      return fail(
        'token',
        `Sanity rejected this token (${detail}). Check you copied all of it and that it belongs to this project.`,
      )
    case 403:
      return fail(
        'token',
        `This token can't read the "${dataset}" dataset. Create one with the Viewer role.`,
      )
    case 404: {
      const datasets = await listDatasets(projectId, token)
      if (!datasets)
        return fail(
          'projectId',
          `No project "${projectId}" was found, or this token doesn't belong to it.`,
        )
      return fail(
        'dataset',
        datasets.length
          ? `This project has no "${dataset}" dataset. Available: ${datasets.join(', ')}.`
          : 'This project has no datasets yet. Create one at sanity.io/manage, then try again.',
      )
    }
    default:
      if (/version/i.test(detail)) return fail('apiVersion', detail)
      return fail(null, `Sanity returned an error: ${detail}`)
  }
}

async function listDatasets(projectId, token) {
  try {
    const res = await fetch(`https://${projectId}.api.sanity.io/v2021-06-07/datasets`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const list = await res.json()
    return Array.isArray(list) ? list.map((d) => d.name) : null
  } catch {
    return null
  }
}

function fail(field, message) {
  return { ok: false, field, message }
}

/** Reused across retries so a failed later step doesn't create a second project. */
let createdProjectId = null

async function createProject({ projectName, dataset }) {
  if (createdProjectId) return { ok: true, projectId: createdProjectId }

  const result = await sanityCli(
    [
      'projects',
      'create',
      projectName,
      '--dataset',
      dataset,
      '--dataset-visibility',
      'private',
      '--json',
      '--yes',
    ],
    // sanity.cli.ts needs some project ID to load; the new project doesn't exist yet.
    { projectId: 'placeholder', dataset },
  )
  if (result.ok) {
    try {
      const projectId = JSON.parse(result.out.slice(result.out.indexOf('{'))).projectId
      if (projectId) {
        createdProjectId = projectId
        return { ok: true, projectId }
      }
    } catch {
      // Fall through to the error below.
    }
  }
  return fail('projectName', cliErrorMessage(result, "Couldn't create the project"))
}

async function importStarterContent({ projectId, dataset, projectName }) {
  const dir = mkdtempSync(join(tmpdir(), 'sanity-seed-'))
  const file = join(dir, 'starter.ndjson')
  try {
    const docs = seedDocuments(projectName || 'My Site')
    writeFileSync(file, docs.map((doc) => JSON.stringify(doc)).join('\n'))
    // --missing: never overwrite documents that already exist.
    const result = await sanityCli(
      ['datasets', 'import', file, '--dataset', dataset, '--project-id', projectId, '--missing'],
      {
        projectId,
        dataset,
      },
    )
    return result.ok
      ? { ok: true }
      : { ok: false, message: cliErrorMessage(result, "Couldn't import starter content") }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** Reused across retries so a typo in the dataset doesn't mint a second token. */
const createdTokens = new Map()

async function createViewerToken({ projectId, dataset }) {
  if (createdTokens.has(projectId)) return { ok: true, token: createdTokens.get(projectId) }

  const label = `nextjs-${
    hostname()
      .replace(/[^a-zA-Z0-9-]/g, '')
      .slice(0, 40) || 'site'
  }`
  const result = await sanityCli(
    ['tokens', 'add', label, '--role', 'viewer', '--json', '--yes', '--project-id', projectId],
    {
      projectId,
      dataset,
    },
  )
  if (result.ok) {
    try {
      const token = JSON.parse(result.out.slice(result.out.indexOf('{'))).token
      if (token) {
        createdTokens.set(projectId, token)
        return { ok: true, token }
      }
    } catch {
      // Fall through to the error below.
    }
  }
  return fail('token', cliErrorMessage(result, "Couldn't create a token"))
}

async function configureCors({ projectId, dataset, siteUrl }) {
  const origins = [...new Set([`http://localhost:${DEV_PORT}`, siteUrl])]
  const listed = await sanityCli(['cors', 'list', '--project-id', projectId], {
    projectId,
    dataset,
  })
  const results = []

  for (const origin of origins) {
    if (listed.ok && listed.out.split(/\s+/).includes(origin)) {
      results.push({ origin, status: 'exists' })
      continue
    }
    const added = await sanityCli(
      ['cors', 'add', origin, '--credentials', '--project-id', projectId],
      {
        projectId,
        dataset,
      },
    )
    results.push(
      added.ok
        ? { origin, status: 'added' }
        : { origin, status: 'failed', message: cliErrorMessage(added, "Couldn't add this origin") },
    )
  }
  return results
}

/** Runs the project's own Sanity CLI non-interactively (stdin closed, so it never prompts). */
function sanityCli(args, { projectId, dataset }) {
  const isWindows = process.platform === 'win32'
  const bin = join(root, 'node_modules', '.bin', isWindows ? 'sanity.cmd' : 'sanity')
  return new Promise((resolve) => {
    // With `shell: true` (Windows), arguments containing spaces must be quoted.
    const argv = isWindows
      ? args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
      : args
    const child = spawn(bin, argv, {
      cwd: root,
      shell: isWindows,
      stdio: ['ignore', 'pipe', 'pipe'],
      // sanity.cli.ts reads these through src/config/env.ts.
      env: { ...process.env, [ENV_KEYS.projectId]: projectId, [ENV_KEYS.dataset]: dataset },
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => (out += d))
    child.stderr.on('data', (d) => (err += d))
    const timer = setTimeout(() => child.kill(), 60_000)
    child.on('error', (e) => resolve({ ok: false, out, err: e.message }))
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ ok: code === 0, out, err })
    })
  })
}

function cliErrorMessage({ out, err }, prefix) {
  const text = `${err}\n${out}`
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/^\s*›\s*/gm, '')
    .trim()
  if (/log ?in|not authenticated|unauthori[sz]ed|session not found/i.test(text)) {
    return `${prefix}: you're not logged in to the Sanity CLI. Run "npx sanity login" in a terminal, then try again.`
  }
  const firstLines = text.split('\n').filter(Boolean).slice(0, 3).join(' ')
  return `${prefix}: ${firstLines || 'the Sanity CLI exited with an error.'}`
}

// ---------------------------------------------------------------------------
// Files

function readEnvFile() {
  return existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {}
}

function writeEnvFile(values) {
  writeFileSync(envPath, mergeEnv(existsSync(envPath) ? readFileSync(envPath, 'utf8') : '', values))
}

function removeWizard() {
  if (isTemplateCheckout) return []
  const removed = []
  const pkgPath = join(root, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const scripts = Object.entries(pkg.scripts ?? {})
  pkg.scripts = Object.fromEntries(
    scripts.filter(([, command]) => !command.includes('scripts/setup')),
  )
  for (const [name, command] of scripts) {
    if (command.includes('scripts/setup')) removed.push(`package.json "${name}" script`)
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

  const readmePath = join(root, 'README.md')
  if (existsSync(readmePath)) {
    const readme = readFileSync(readmePath, 'utf8')
    const stripped = readme.replace(
      /<!-- setup-wizard:start -->[\s\S]*?<!-- setup-wizard:end -->\n*/,
      '',
    )
    if (stripped !== readme) {
      writeFileSync(readmePath, stripped)
      removed.push('README setup section')
    }
  }

  rmSync(wizardDir, { recursive: true, force: true })
  removed.push('scripts/setup/')
  const scriptsDir = dirname(wizardDir)
  if (existsSync(scriptsDir) && readdirSync(scriptsDir).length === 0)
    rmSync(scriptsDir, { recursive: true })

  return removed
}

function reportRemoval(removed) {
  if (removed.length === 0) {
    console.log('✓ Template checkout (.template-dev found): the setup wizard was kept.\n')
    return
  }
  console.log(`✓ Setup wizard removed (${removed.join(', ')}).`)
  console.log('  Commit these deletions so the wizard is gone from the repo.\n')
}

// ---------------------------------------------------------------------------
// HTTP server (localhost only)

function startServer(port = 3333, attemptsLeft = 10) {
  const allowedHosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`])

  const server = createServer(async (req, res) => {
    // Reject requests made through other hostnames (DNS rebinding) or from other sites.
    if (!allowedHosts.has(req.headers.host ?? '')) return send(res, 403, 'Forbidden')

    if (req.method === 'GET' && req.url === '/') {
      return send(res, 200, readFileSync(join(wizardDir, 'form.html')), 'text/html; charset=utf-8')
    }

    if (req.method === 'GET' && req.url === '/api/state') {
      return sendJson(res, 200, { values: prefill, initialError, devPort: DEV_PORT })
    }

    if (req.method === 'POST' && req.url === '/api/setup') {
      const origin = req.headers.origin ?? ''
      if (
        !allowedHosts.has(origin.replace(/^https?:\/\//, '')) ||
        !req.headers['content-type']?.includes('application/json')
      ) {
        return send(res, 403, 'Forbidden')
      }
      let body
      try {
        body = JSON.parse(await readBody(req))
      } catch {
        return sendJson(res, 400, { ok: false, message: 'Invalid request.' })
      }

      let outcome
      try {
        outcome = await runSetup(body)
      } catch (error) {
        outcome = { ok: false, message: `Unexpected error: ${error.message}` }
      }
      sendJson(res, outcome.ok ? 200 : 422, outcome)

      if (outcome.ok) {
        res.on('finish', () => {
          console.log('✓ Connected to Sanity and wrote .env.local.')
          reportRemoval(outcome.removed)
          server.close()
          process.exit(0)
        })
      }
      return
    }

    send(res, 404, 'Not found')
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0)
      return startServer(port + 1, attemptsLeft - 1)
    throw error
  })

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`
    console.log(`\n  First-time setup: open ${url} to connect this project to Sanity.`)
    console.log('  The site starts automatically once setup succeeds. Ctrl+C to cancel.\n')
    openBrowser(url)
  })
}

async function runSetup(body) {
  const projectMode = body.projectMode === 'create' ? 'create' : 'existing'
  // A brand-new project has no tokens yet, so the wizard must create one.
  const tokenMode = projectMode === 'create' || body.tokenMode === 'create' ? 'create' : 'paste'
  const { values, errors } = normalize(body, { tokenMode, projectMode })
  if (Object.keys(errors).length) return { ok: false, errors }

  if (projectMode === 'create') {
    const project = await createProject(values)
    if (!project.ok) return { ok: false, errors: { projectName: project.message } }
    values.projectId = project.projectId
  }

  if (tokenMode === 'create') {
    const created = await createViewerToken(values)
    if (!created.ok) return { ok: false, errors: { token: created.message } }
    values.token = created.token
  }

  const connection = await checkConnection(values)
  if (!connection.ok) {
    return connection.field
      ? { ok: false, errors: { [connection.field]: connection.message } }
      : { ok: false, message: connection.message }
  }

  writeEnvFile(values)
  // The steps below are not blocking: the site works without them, and failures are reported.
  const cors = body.addCors ? await configureCors(values) : []
  const seed = body.seed ? await importStarterContent(values) : null
  const removed = removeWizard()

  return {
    ok: true,
    projectId: values.projectId,
    dataset: values.dataset,
    projectCreated: projectMode === 'create',
    tokenCreated: tokenMode === 'create',
    pageCount: connection.pageCount,
    hasHome: connection.hasHome || Boolean(seed?.ok),
    cors,
    seed,
    removed,
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 100_000) reject(new Error('Body too large'))
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' })
  res.end(body)
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), 'application/json')
}

function openBrowser(url) {
  const [cmd, args] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', '', url]]
        : ['xdg-open', [url]]
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true })
      .on('error', () => {
        // Ignored: the URL is printed, so the user can open it themselves.
      })
      .unref()
  } catch {
    // The URL is printed above; opening the browser is a convenience.
  }
}
