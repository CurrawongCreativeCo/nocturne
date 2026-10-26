/**
 * Minimal fake Content Lake for end-to-end tests: answers GROQ queries from the fixture
 * dataset using groq-js, Sanity's own query engine. The site under test points at it via
 * SANITY_API_HOST (see playwright.config.ts). It behaves like a private dataset: queries need a
 * Bearer token (any value).
 */
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'

import { evaluate, parse } from 'groq-js'

import { handleStripe } from './fake-stripe.mjs'
import {
  aiCrawlersBlocked,
  customBrowserIcon,
  designSettingsVariants,
  documents,
  experimentRunning,
  footerSocialOn,
  markerUnset,
  releaseVersions,
  variantDocuments,
} from './fixtures/dataset.mjs'

const PICTURE = readFileSync(new URL('./fixtures/picture.png', import.meta.url))

const PORT = Number(process.env.FAKE_SANITY_PORT) || 9999

/** Studio tokens /users/me knows, and the project roles each holds (the same tokens as constants.ts). */
const STUDIO_USERS = {
  'e2e-studio-administrator': ['administrator'],
  'e2e-studio-developer': ['developer'],
  'e2e-studio-editor': ['editor'],
  'e2e-studio-contributor': ['contributor'],
  'e2e-studio-viewer': ['viewer'],
  // Only the revocation test uses this one (POST /__fixture/studio-token/<token>/<revoke|restore>).
  'e2e-studio-revocable': ['administrator'],
}
const revokedTokens = new Set()
let usersMeCalls = 0

/** Named variants of the siteIdentity document the tests switch between; `null` serves the fixture as is. */
const SETTINGS_VARIANTS = { default: null, aiCrawlersBlocked, customBrowserIcon, markerUnset }
let settingsPatch = null

/** The designSettings variant being served (`light` or `dark`), or null for none; POST /__fixture/design/<off|light|dark>. */
let designPatch = null

/** Whether the fixture experiment is running; switched by POST /__fixture/experiment/<on|off>. */
let experimentPatch = null

/** Whether the footer's social icons are on; switched by POST /__fixture/footer-social/<on|off>. */
let footerSocialPatch = null

/** Writes the site made (the Stripe webhook syncing prices), served back by GET /__fixture/mutations. */
const mutations = []

const BASE_ID = /^versions.[^.]+./

/**
 * Applies the request's `perspective` like the Content Lake: published content by default,
 * and for release perspectives (anything but published/drafts/raw) the matching
 * `versions.<release>.<id>` documents replace the base document with that id.
 */
function datasetFor(perspective, variant) {
  // A served palette replaces the fixture's own designSettings (gradients only), like a real edit.
  const published = [
    ...(designPatch ? documents.filter((doc) => doc._id !== designPatch._id) : documents),
    ...(designPatch ? [designPatch] : []),
  ]
    .map((doc) =>
      settingsPatch && doc._id === 'siteIdentity' ? { ...doc, ...settingsPatch } : doc,
    )
    .map((doc) =>
      footerSocialPatch && doc._id === 'siteNavigation' ? { ...doc, ...footerSocialPatch } : doc,
    )
    .map((doc) =>
      experimentPatch && doc._type === 'experiment' ? { ...doc, ...experimentPatch } : doc,
    )
  // Content variants replace the base documents with the same id, like the real Content Lake.
  const variantDocs = variant ? (variantDocuments[variant] ?? []) : []
  const swapped = new Set(variantDocs.map((doc) => doc._id))
  const withVariant = [...published.filter((doc) => !swapped.has(doc._id)), ...variantDocs]
  const releases = perspective
    .split(',')
    .filter((name) => name && !['published', 'drafts', 'raw'].includes(name))
  if (releases.length === 0) return withVariant

  const versions = releaseVersions
    .filter((doc) => releases.some((release) => doc._id.startsWith(`versions.${release}.`)))
    .map((doc) => ({ ...doc, _id: doc._id.replace(BASE_ID, '') }))
  const overridden = new Set(versions.map((doc) => doc._id))
  return [...withVariant.filter((doc) => !overridden.has(doc._id)), ...versions]
}

async function readBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (req.method === 'GET' && url.pathname === '/__fixture/picture.png') {
    res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'public, max-age=3600' })
    res.end(PICTURE)
    return
  }
  // Test control: POST /__fixture/settings/<variant> picks which settings the lake serves.
  const variant = /^\/__fixture\/settings\/(\w+)$/.exec(url.pathname)?.[1]
  if (req.method === 'POST' && variant && variant in SETTINGS_VARIANTS) {
    settingsPatch = SETTINGS_VARIANTS[variant]
    res.writeHead(204).end()
    return
  }
  const design = /^\/__fixture\/design\/(off|light|dark)$/.exec(url.pathname)?.[1]
  if (req.method === 'POST' && design) {
    designPatch = design === 'off' ? null : designSettingsVariants[design]
    res.writeHead(204).end()
    return
  }
  const footerSocial = /^\/__fixture\/footer-social\/(on|off)$/.exec(url.pathname)?.[1]
  if (req.method === 'POST' && footerSocial) {
    footerSocialPatch = footerSocial === 'on' ? footerSocialOn : null
    res.writeHead(204).end()
    return
  }
  const experiment = /^\/__fixture\/experiment\/(on|off)$/.exec(url.pathname)?.[1]
  if (req.method === 'POST' && experiment) {
    experimentPatch = experiment === 'on' ? experimentRunning : null
    res.writeHead(204).end()
    return
  }
  if (await handleStripe(req, res, url, readBody, `http://localhost:${PORT}`)) return
  // Who a Studio token belongs to, like Sanity's /users/me: the id and project roles, or 401 for any
  // other token (setup-status.spec.ts). Studio itself can't sign in here; only the site's route asks.
  if (req.method === 'GET' && /^\/v[\w-]+\/users\/me$/.test(url.pathname)) {
    usersMeCalls += 1
    const token = /^Bearer (\S+)$/.exec(req.headers.authorization ?? '')?.[1]
    const roles = token && !revokedTokens.has(token) ? STUDIO_USERS[token] : undefined
    res.writeHead(roles ? 200 : 401, { 'content-type': 'application/json' })
    res.end(
      JSON.stringify(
        roles ? { id: `user-${roles[0]}`, roles: roles.map((name) => ({ name })) } : {},
      ),
    )
    return
  }
  const revocation = /^\/__fixture\/studio-token\/([\w-]+)\/(revoke|restore)$/.exec(url.pathname)
  if (req.method === 'POST' && revocation) {
    if (revocation[2] === 'revoke') revokedTokens.add(revocation[1])
    else revokedTokens.delete(revocation[1])
    res.writeHead(204).end()
    return
  }
  if (req.method === 'GET' && url.pathname === '/__fixture/users-me-calls') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(usersMeCalls))
    return
  }
  if (req.method === 'GET' && url.pathname === '/__fixture/mutations') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(mutations))
    return
  }
  if (req.method === 'POST' && url.pathname.includes('/data/mutate/')) {
    const { mutations: sent } = JSON.parse(await readBody(req))
    mutations.push({ authorization: req.headers.authorization, mutations: sent })
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ transactionId: 'fixture', results: [] }))
    return
  }
  if (!url.pathname.includes('/data/query/')) {
    res.writeHead(404).end()
    return
  }

  // Like a private dataset: reads without a token are refused, so a missed path fails the tests.
  if (!/^Bearer \S+$/.test(req.headers.authorization ?? '')) {
    res.writeHead(401, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: { description: 'Session not found', type: 'corsOrigin' } }))
    return
  }

  let query = url.searchParams.get('query') ?? ''
  let params = {}
  let perspective = url.searchParams.get('perspective') ?? 'published'
  const contentVariant = url.searchParams.get('variant')
  for (const [name, value] of url.searchParams) {
    if (name.startsWith('$')) params[name.slice(1)] = JSON.parse(value)
  }
  if (req.method === 'POST') {
    const body = JSON.parse(await readBody(req))
    query = body.query
    params = body.params ?? {}
    perspective = body.perspective ?? perspective
  }

  try {
    const result = await (
      await evaluate(parse(query, { params }), {
        dataset: datasetFor(perspective, contentVariant),
        params,
      })
    ).get()
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ result, ms: 1, query, syncTags: ['s1:fixture'] }))
  } catch (error) {
    console.error('fake-sanity query error:', error instanceof Error ? error.message : error)
    res.writeHead(400, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid query' }))
  }
}).listen(PORT, () => {
  console.log(`fake Content Lake on http://localhost:${PORT}`)
})
