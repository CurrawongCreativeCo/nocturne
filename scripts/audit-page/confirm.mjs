/**
 * Confirming blockers (`--confirm`, used by the daily health run). A blocker opens an incident, so one
 * bad response must not: each page with a blocker is audited a second time after a short pause, and a
 * blocker counts as **confirmed** only if the same rule reports it again on that page. A blocker on a
 * page that cannot be re-checked (over the cap, or the second audit failed to run) is not confirmed.
 * Warnings and errors are never re-checked. Bounded: at most `max` pages, one extra audit each.
 */

export const MAX_CONFIRMED_PAGES = 5
export const CONFIRM_DELAY_MS = 2000

const key = (ruleId, url) => `${ruleId}\n${url}`

/**
 * `rerun(url)` audits one page again and returns its report (or throws). Returns
 * `[{ ruleId, url, confirmed }]` for every blocker in `report`, in report order.
 */
export async function confirmBlockers({
  report,
  rerun,
  max = MAX_CONFIRMED_PAGES,
  delayMs = CONFIRM_DELAY_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const blockers = report.findings
    .filter((finding) => finding.severity === 'blocker')
    .map((finding) => ({ ruleId: finding.ruleId, url: finding.scope.url ?? '' }))
  const pages = [...new Set(blockers.map(({ url }) => url).filter(Boolean))].slice(0, max)
  const seenAgain = new Set()
  if (pages.length > 0 && delayMs > 0) await sleep(delayMs)
  for (const url of pages) {
    try {
      const again = await rerun(url)
      for (const finding of again.findings) {
        if (finding.severity === 'blocker')
          seenAgain.add(key(finding.ruleId, finding.scope.url ?? ''))
      }
    } catch {
      // A page that cannot be audited a second time is not confirmed.
    }
  }
  return blockers.map(({ ruleId, url }) => ({
    ruleId,
    url,
    confirmed: seenAgain.has(key(ruleId, url)),
  }))
}
