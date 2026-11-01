/** The audit as readable text and as `audit.json`. Pure. */

export const AUDIT_SCHEMA = 1

const SEVERITY_LABEL = {
  blocker: 'Blockers',
  error: 'Errors',
  warning: 'Warnings',
  suggestion: 'Suggestions',
}
const ORDER = ['blocker', 'error', 'warning', 'suggestion']
const COLOURS = { blocker: 31, error: 31, warning: 33, suggestion: 36 }
const MAX_OBSERVED = 400

/** One line of JSON for the evidence, cut short so a long list stays readable. */
function brief(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return text.length > MAX_OBSERVED ? `${text.slice(0, MAX_OBSERVED - 1)}…` : text
}

export const countBySeverity = (findings) =>
  Object.fromEntries(
    ORDER.map((severity) => [severity, findings.filter((f) => f.severity === severity).length]),
  )

/**
 * Text grouped by severity, each finding with what was seen, why it matters, how to fix it and how
 * to check. `rules` is the registry (src/lib/audit/finding.ts) for the titles.
 */
export function formatFindings(report, { rules, pages = [], notes = [], colour = false }) {
  const counts = countBySeverity(report.findings)
  const paint = (severity, text) => (colour ? `\u001b[${COLOURS[severity]}m${text}\u001b[0m` : text)
  const lines = [
    `Page audit for ${report.url}`,
    `${pages.length} page${pages.length === 1 ? '' : 's'} audited: ${pages.join(', ') || report.url}`,
    '',
  ]
  if (report.findings.length === 0) lines.push('No findings.', '')
  for (const severity of ORDER) {
    const group = report.findings.filter((finding) => finding.severity === severity)
    if (group.length === 0) continue
    lines.push(paint(severity, `${SEVERITY_LABEL[severity]} (${group.length})`), '')
    for (const finding of group) {
      const where = finding.scope.url ?? ''
      lines.push(
        `  ${rules[finding.ruleId]?.title ?? finding.ruleId}  [${finding.ruleId}, ${finding.basis}]`,
        ...(where ? [`    Where:  ${where}`] : []),
        `    Seen:   ${brief(finding.evidence.observed)}`,
        ...(finding.evidence.expected === undefined
          ? []
          : [`    Wanted: ${brief(finding.evidence.expected)}`]),
        `    Why:    ${finding.why}`,
        `    Fix:    ${finding.fix.summary}`,
        ...(finding.fix.studioIntent ? [`    Studio: ${finding.fix.studioIntent}`] : []),
        ...(finding.evidence.caveats ?? []).map((caveat) => `    Note:   ${caveat}`),
        `    Check:  ${finding.verify}`,
        '',
      )
    }
  }
  for (const note of notes) lines.push(note)
  if (notes.length > 0) lines.push('')
  const summary = ORDER.map(
    (severity) => `${counts[severity]} ${severity}${counts[severity] === 1 ? '' : 's'}`,
  )
  lines.push(
    `${summary.join(', ')}.`,
    report.blocked ? 'A blocker stops search engines reading this page: fix it first.' : '',
  )
  return lines.join('\n').trimEnd()
}

/** `[{ ruleId, url, confirmed }]` for each blocker in the report. */
export const listBlockers = (report, confirmed) =>
  report.findings
    .filter((finding) => finding.severity === 'blocker')
    .map((finding) => ({ ruleId: finding.ruleId, url: finding.scope.url ?? '', confirmed }))

/**
 * The `audit.json` document (schema 1). Findings carry their evidence and nothing from the
 * environment. `rules` is the registry entry (`title`, `anchor`) of each rule that reported, so a reader
 * with no access to the TypeScript can name the rule.
 */
export function auditJson(
  report,
  { pages, notes, sample, rules = {}, confirm = false, blockers, network } = {},
) {
  const used = [...new Set(report.findings.map(({ ruleId }) => ruleId))]
  return {
    schema: AUDIT_SCHEMA,
    url: report.url,
    checkedAt: report.checkedAt,
    sample,
    pages,
    summary: countBySeverity(report.findings),
    // Every blocker, with `confirmed` true or false after --confirm's second look, else null.
    // `blocked` is then whether one is confirmed (with --confirm) or whether there is one at all.
    confirm,
    blockers: blockers ?? listBlockers(report, null),
    blocked: confirm
      ? (blockers ?? []).some(({ confirmed }) => confirmed === true)
      : report.blocked,
    network: network
      ? {
          permitted: network.permitted,
          requests: network.requests,
          refused: network.refused.length,
        }
      : null,
    rules: Object.fromEntries(used.filter((id) => rules[id]).map((id) => [id, rules[id]])),
    findings: report.findings,
    notes,
  }
}
