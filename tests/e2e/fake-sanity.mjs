/**
 * Minimal fake Content Lake for end-to-end tests: answers GROQ queries from the fixture
 * dataset using groq-js, Sanity's own query engine. The site under test points at it via
 * SANITY_API_HOST (see playwright.config.ts). It behaves like a private dataset: queries need a
 * Bearer token (any value).
 */
import { createServer } from 'node:http'

import { evaluate, parse } from 'groq-js'

import { handleStripe } from './fake-stripe.mjs'
import {
  aiCrawlersBlocked,
  documents,
  experimentRunning,
  releaseVersions,
  variantDocuments,
} from './fixtures/dataset.mjs'

const PORT = Number(process.env.FAKE_SANITY_PORT) || 9999

/** Named variants of the settings document the tests switch between; `null` serves the fixture as is. */
const SETTINGS_VARIANTS = { default: null, aiCrawlersBlocked }
let settingsPatch = null

/** Whether the fixture experiment is running; switched by POST /__fixture/experiment/<on|off>. */
let experimentPatch = null

/** Writes the site made (the Stripe webhook syncing prices), served back by GET /__fixture/mutations. */
const mutations = []

const BASE_ID = /^versions.[^.]+./

/**
 * Applies the request's `perspective` like the Content Lake: published content by default,
 * and for release perspectives (anything but published/drafts/raw) the matching
 * `versions.<release>.<id>` documents replace the base document with that id.
 */
function datasetFor(perspective, variant) {
  const published = documents
    .map((doc) => (settingsPatch && doc._id === 'settings' ? { ...doc, ...settingsPatch } : doc))
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
  // Test control: POST /__fixture/settings/<variant> picks which settings the lake serves.
  const variant = /^\/__fixture\/settings\/(\w+)$/.exec(url.pathname)?.[1]
  if (req.method === 'POST' && variant && variant in SETTINGS_VARIANTS) {
    settingsPatch = SETTINGS_VARIANTS[variant]
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
