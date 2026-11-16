#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Whether a lake capture's diagnostics saw what the lake served (task 151 CI investigation, tests/e2e/diagnostics).
 *
 * A capture is only useful if both halves record: the lake logs every request it receives, and the site's processes log
 * the requests they make to it. A first capture saw 2,142 requests at the lake and not one at the client, because the
 * client logger watched `node:http` while the site uses undici's `fetch`; it passed, and told nothing. So, for the
 * output of one project: lake requests with ZERO matching client request records is **incomplete instrumentation**.
 * No lake traffic is not a failure of the diagnostics (there was nothing to see), and is reported as such.
 *
 * This is a statement about the diagnostics, not about the tests: it never looks at a test's result, and the workflow
 * keeps the two apart (exit-status.txt for tests, diagnostics-validity.txt for this).
 *
 * `node scripts/e2e-capture-validity.mjs <log> [--project <name>]` prints one line and exits 0 (valid, or no lake
 * traffic) or 70 (incomplete instrumentation).
 */

const PREFIX = '[e2e-diag] '
/** The events a client logger writes when it sees a request: undici's, and node:http's. */
export const CLIENT_REQUEST_EVENTS = new Set(['fetch-request', 'request-created'])
export const INCOMPLETE_EXIT = 70

export function assessCapture(text) {
  let lakeRequests = 0
  let clientRequests = 0
  const budgetExhausted = []
  for (const line of String(text).split('\n')) {
    const at = line.indexOf(PREFIX)
    if (at < 0) continue
    let record
    try {
      record = JSON.parse(line.slice(at + PREFIX.length))
    } catch {
      continue
    }
    if (record.source === 'lake' && record.event === 'request') lakeRequests += 1
    else if (record.source === 'client' && CLIENT_REQUEST_EVENTS.has(record.event))
      clientRequests += 1
    else if (record.event === 'limit-reached')
      budgetExhausted.push({ source: record.source, pid: record.pid })
  }
  const status =
    lakeRequests === 0 ? 'no-lake-traffic' : clientRequests === 0 ? 'incomplete' : 'valid'
  return { status, lakeRequests, clientRequests, budgetExhausted }
}

export function describe({ status, lakeRequests, clientRequests, budgetExhausted }, project) {
  const label = project ? `project=${project} ` : ''
  const base = `${label}status=${status} lake_requests=${lakeRequests} client_request_records=${clientRequests} budget_exhausted=${budgetExhausted.length}`
  return status === 'incomplete'
    ? `${base} INCOMPLETE INSTRUMENTATION: the lake served ${lakeRequests} requests and no client request was recorded`
    : base
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [file, flag, project] = process.argv.slice(2)
  if (!file) {
    console.error('usage: e2e-capture-validity.mjs <log> [--project <name>]')
    process.exit(2)
  }
  const result = assessCapture(readFileSync(file, 'utf8'))
  console.log(describe(result, flag === '--project' ? project : undefined))
  process.exit(result.status === 'incomplete' ? INCOMPLETE_EXIT : 0)
}
