/**
 * Result lines shared by every launch check. A check is a pure function that returns an array of
 * these; nothing here touches the network. `fix` says what to do about a fail or warning.
 */

/** @typedef {'pass' | 'warn' | 'fail'} Status */
/** @typedef {{ id: string, area: string, status: Status, title: string, detail?: string, fix?: string }} CheckResult */

export const pass = (area, id, title, detail) => ({ id, area, status: 'pass', title, detail })
export const warn = (area, id, title, detail, fix) => ({
  id,
  area,
  status: 'warn',
  title,
  detail,
  fix,
})
export const fail = (area, id, title, detail, fix) => ({
  id,
  area,
  status: 'fail',
  title,
  detail,
  fix,
})

/** Counts by status; `ok` is false on any failure (warnings never fail the run). */
export function summarise(results) {
  const summary = { pass: 0, warn: 0, fail: 0 }
  for (const result of results) summary[result.status] += 1
  return { ...summary, ok: summary.fail === 0 }
}

/** The first few items of a list, with a count of the rest: "a, b, c and 4 more". */
export function listSome(items, limit = 5) {
  if (items.length <= limit) return items.join(', ')
  return `${items.slice(0, limit).join(', ')} and ${items.length - limit} more`
}

const LABELS = { pass: 'PASS', warn: 'WARN', fail: 'FAIL' }
const MARKS = { pass: '✓', warn: '!', fail: '✗' }
const COLOURS = { pass: 32, warn: 33, fail: 31 }

/**
 * Plain-text table: status, area, check, then detail and a "Fix:" line under anything that
 * isn't a pass. `colour` adds ANSI colour to the status column only.
 */
export function formatTable(results, { colour = false } = {}) {
  const areaWidth = Math.max(4, ...results.map((r) => r.area.length))
  const paint = (status, text) => (colour ? `\u001b[${COLOURS[status]}m${text}\u001b[0m` : text)
  const indent = ' '.repeat(2 + 6 + 2 + areaWidth + 2)
  const lines = [`  ${'STATUS'.padEnd(6)}  ${'AREA'.padEnd(areaWidth)}  CHECK`]
  for (const result of results) {
    const status = paint(result.status, `${MARKS[result.status]} ${LABELS[result.status]}`)
    // The mark and label are 6 visible characters; pad on the plain text so colour codes don't skew it.
    lines.push(`  ${status}  ${result.area.padEnd(areaWidth)}  ${result.title}`)
    if (result.status !== 'pass' || result.detail) {
      if (result.detail) lines.push(`${indent}${result.detail}`)
      if (result.status !== 'pass' && result.fix) lines.push(`${indent}Fix: ${result.fix}`)
    }
  }
  return lines.join('\n')
}

export function formatSummary(
  summary,
  { ready = 'Ready to go live', notReady = 'Not ready to go live' } = {},
) {
  const verdict = summary.ok ? ready : notReady
  return `${verdict}: ${summary.pass} passed, ${summary.warn} to review, ${summary.fail} failed.`
}
