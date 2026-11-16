/**
 * A bounded diagnostic log shared by the lake and the client preload (task 151 CI investigation).
 *
 * Every line is one JSON object after the prefix `[e2e-diag]`, written to stderr (never stdout, which the lake's
 * readiness check reads). The log is bounded twice: a line budget per process (E2E_DIAGNOSTICS_MAX_LINES, default
 * 4000), after which one notice is written and everything else is only counted, and a cap on any string it keeps.
 * It never throws: a diagnostic that fails is dropped, because a diagnostic must not change what the process does.
 */

import { createHash } from 'node:crypto'

const PREFIX = '[e2e-diag]'
const MAX_LINES = Math.max(1, Number(process.env.E2E_DIAGNOSTICS_MAX_LINES) || 4000)

let written = 0
let dropped = 0
let announced = false

/** A string held to a length, so a long URL or message cannot fill the log. */
const clip = (value, length = 160) => {
  const text = String(value ?? '')
  return text.length > length ? `${text.slice(0, length)}…` : text
}

function emit(source, event, fields = {}) {
  try {
    if (written >= MAX_LINES) {
      dropped += 1
      if (!announced) {
        announced = true
        process.stderr.write(
          `${PREFIX} ${JSON.stringify({ source, pid: process.pid, event: 'limit-reached', maxLines: MAX_LINES, at: new Date().toISOString() })}\n`,
        )
      }
      return
    }
    written += 1
    process.stderr.write(
      `${PREFIX} ${JSON.stringify({ at: new Date().toISOString(), mono: Math.round(performance.now()), source, pid: process.pid, event, ...fields })}\n`,
    )
  } catch {
    // Dropped on purpose.
  }
}

/**
 * A short hash of a request's method and whole path (query string included), computed BEFORE any clipping, written by the
 * lake and by both client loggers as `urlKey`. Two records with the same key are a lead that they describe the same
 * request: it is 32 bits of a hash, so a collision is possible and equality is a correlation key, not proof.
 */
const requestKey = (method, path) =>
  createHash('sha1').update(`${method} ${path}`).digest('hex').slice(0, 8)

const stats = () => ({ written, dropped })

export { PREFIX, clip, emit, requestKey, stats }
