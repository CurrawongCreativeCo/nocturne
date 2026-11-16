#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * Whether a lake capture's diagnostics saw what the lake served (task 151 CI investigation, tests/e2e/diagnostics).
 *
 * A capture is only useful if both halves record: the lake logs every request it receives, and the site's processes log the
 * requests they make to it. A first capture saw 2,142 requests at the lake and not one at the client, because the client
 * logger watched `node:http` while the site uses undici's `fetch`; it passed, and told nothing. For the output of one
 * project this asks, in order:
 *
 * 1. **Coverage.** The lake's `/data/` requests (fixture-control traffic, `/__fixture/…`, left out) against the client's
 *    request records for `/data/` paths (undici `fetch-request` and node:http `request-created`). The client must have
 *    recorded AT LEAST AS MANY as the lake served: none at all is `no-client-requests`, any fewer is `partial-coverage`.
 *    There is no adjustable threshold. These are COVERAGE CHECKS on aggregate counts: they catch a client half that saw
 *    nothing or less than the lake did, and they do not prove that every request was observed (equal counts can hide a
 *    missed request and an extra one). A client count above the lake's is not an error (a request can fail before the lake
 *    logs it, or be retried).
 * 2. **Production-build processes.** At least one `fetch-request` from a process in Next's `phase-production-build` (the
 *    phase is on the record, or on the process's `preload` line): the failing requests are made while the site is built,
 *    so a capture with no fetch from the build has not watched them (`no-production-build-fetch`).
 * 3. **Matched records.** Every `fetch-headers` record has the `fetch-request` and `fetch-socket` records of the same
 *    request (process, thread and sequence): a response with no request or no socket recorded means the records are not a
 *    whole picture (`unmatched-response-headers`).
 * 4. **Truncation.** Any process that exhausted its logging budget (`limit-reached`) means the evidence is cut short
 *    (`truncated`).
 *
 * Statuses: `valid`, `no-lake-traffic` (nothing to see, not a failure of the diagnostics), `truncated` (only the budget was
 * exhausted; exit 71) and `incomplete` (any other reason, with or without truncation; exit 70).
 *
 * This is a statement about the diagnostics, not about the tests: it never looks at a test's result, and the workflow
 * keeps the two apart (exit-status.txt for tests, diagnostics-validity.txt for this).
 *
 * `node scripts/e2e-capture-validity.mjs <log> [--project <name>]` prints one line and exits 0, 70 or 71 (2 for bad usage,
 * including any other option).
 */

const PREFIX = '[e2e-diag] '
export const INCOMPLETE_EXIT = 70
export const TRUNCATED_EXIT = 71
const BUILD_PHASE = 'phase-production-build'

const isData = (path) => String(path ?? '').includes('/data/')
const isFixture = (path) => String(path ?? '').startsWith('/__fixture')
const key = (r) => `${r.pid}:${r.thread ?? ''}:${r.reqSeq}`

export function assessCapture(text) {
  const counts = {
    lakeDataRequests: 0,
    lakeFixtureRequests: 0,
    clientFetchRequests: 0,
    clientDataRequests: 0,
    productionBuildFetchRequests: 0,
    headersWithoutRequest: 0,
    headersWithoutSocket: 0,
    budgetExhausted: [],
  }
  const preloadPhase = new Map()
  const fetchRequests = []
  const requestKeys = new Set()
  const socketKeys = new Set()
  const headers = []

  for (const line of String(text).split('\n')) {
    const at = line.indexOf(PREFIX)
    if (at < 0) continue
    let record
    try {
      record = JSON.parse(line.slice(at + PREFIX.length))
    } catch {
      continue
    }
    if (record.source === 'lake' && record.event === 'request') {
      if (isFixture(record.path)) counts.lakeFixtureRequests += 1
      else if (isData(record.path)) counts.lakeDataRequests += 1
    } else if (record.source === 'client') {
      if (record.event === 'preload')
        preloadPhase.set(`${record.pid}:${record.thread ?? ''}`, record.phase ?? null)
      else if (record.event === 'fetch-request') {
        counts.clientFetchRequests += 1
        if (isData(record.path)) counts.clientDataRequests += 1
        fetchRequests.push(record)
        requestKeys.add(key(record))
      } else if (record.event === 'request-created') {
        if (isData(record.path)) counts.clientDataRequests += 1
      } else if (record.event === 'fetch-socket') socketKeys.add(key(record))
      else if (record.event === 'fetch-headers') headers.push(record)
    }
    if (record.event === 'limit-reached')
      counts.budgetExhausted.push({ source: record.source, pid: record.pid })
  }

  for (const record of fetchRequests) {
    const phase = record.phase ?? preloadPhase.get(`${record.pid}:${record.thread ?? ''}`) ?? null
    if (phase === BUILD_PHASE) counts.productionBuildFetchRequests += 1
  }
  for (const record of headers) {
    if (!requestKeys.has(key(record))) counts.headersWithoutRequest += 1
    else if (!socketKeys.has(key(record))) counts.headersWithoutSocket += 1
  }

  const reasons = []
  const coverage =
    counts.lakeDataRequests === 0 ? null : counts.clientDataRequests / counts.lakeDataRequests
  if (counts.lakeDataRequests > 0) {
    if (counts.clientDataRequests === 0) reasons.push('no-client-requests')
    else if (counts.clientDataRequests < counts.lakeDataRequests) reasons.push('partial-coverage')
    if (counts.productionBuildFetchRequests === 0) reasons.push('no-production-build-fetch')
  }
  if (counts.headersWithoutRequest > 0 || counts.headersWithoutSocket > 0)
    reasons.push('unmatched-response-headers')
  if (counts.budgetExhausted.length > 0) reasons.push('truncated')

  const problems = reasons.filter((reason) => reason !== 'truncated')
  const status =
    problems.length > 0
      ? 'incomplete'
      : reasons.includes('truncated')
        ? 'truncated'
        : counts.lakeDataRequests === 0
          ? 'no-lake-traffic'
          : 'valid'
  return { status, reasons, counts, coverage }
}

export const exitCodeOf = ({ status }) =>
  status === 'incomplete' ? INCOMPLETE_EXIT : status === 'truncated' ? TRUNCATED_EXIT : 0

export function describe({ status, reasons, counts, coverage }, project) {
  const label = project ? `project=${project} ` : ''
  const ratio = coverage === null ? 'n/a' : coverage.toFixed(3)
  const base =
    `${label}status=${status} reasons=${reasons.length ? reasons.join(',') : 'none'} ` +
    `lake_data_requests=${counts.lakeDataRequests} lake_fixture_requests=${counts.lakeFixtureRequests} ` +
    `client_data_requests=${counts.clientDataRequests} client_fetch_requests=${counts.clientFetchRequests} ` +
    `production_build_fetch_requests=${counts.productionBuildFetchRequests} ` +
    `headers_without_request=${counts.headersWithoutRequest} headers_without_socket=${counts.headersWithoutSocket} ` +
    `budget_exhausted=${counts.budgetExhausted.length} coverage=${ratio} ` +
    '(a coverage check on aggregate counts, not proof that every request was observed)'
  if (status === 'incomplete')
    return `${base} INCOMPLETE INSTRUMENTATION: ${reasons.filter((r) => r !== 'truncated').join(', ')}`
  if (status === 'truncated')
    return `${base} TRUNCATED EVIDENCE: a process exhausted its logging budget`
  return base
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2)
  const projectAt = args.indexOf('--project')
  const project = projectAt >= 0 ? args[projectAt + 1] : undefined
  const rest = args.filter((_, i) => projectAt < 0 || (i !== projectAt && i !== projectAt + 1))
  // One log, and `--project` only: an unknown option (such as the removed `--min-coverage`) is a usage error.
  if (rest.length !== 1 || rest[0].startsWith('--') || (projectAt >= 0 && !project)) {
    console.error('usage: e2e-capture-validity.mjs <log> [--project <name>]')
    process.exit(2)
  }
  const result = assessCapture(readFileSync(rest[0], 'utf8'))
  console.log(describe(result, project))
  process.exit(exitCodeOf(result))
}
