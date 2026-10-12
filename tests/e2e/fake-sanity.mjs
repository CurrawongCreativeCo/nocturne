/**
 * Minimal fake Content Lake for end-to-end tests: answers GROQ queries from the fixture
 * dataset using groq-js, Sanity's own query engine. The site under test points at it via
 * SANITY_API_HOST (see playwright.config.ts).
 */
import { createServer } from 'node:http'

import { evaluate, parse } from 'groq-js'

import { documents } from './fixtures/dataset.mjs'

const PORT = Number(process.env.FAKE_SANITY_PORT) || 9999

async function readBody(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.includes('/data/query/')) {
    res.writeHead(404).end()
    return
  }

  let query = url.searchParams.get('query') ?? ''
  let params = {}
  for (const [name, value] of url.searchParams) {
    if (name.startsWith('$')) params[name.slice(1)] = JSON.parse(value)
  }
  if (req.method === 'POST') {
    const body = JSON.parse(await readBody(req))
    query = body.query
    params = body.params ?? {}
  }

  try {
    const result = await (
      await evaluate(parse(query, { params }), { dataset: documents, params })
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
