/** Optional PageSpeed Insights scores (PSI_API_KEY). Thresholds match lighthouserc.json. */
import { fail, pass, warn } from './result.mjs'

const area = 'Speed'

export const PSI_MINIMUM = { performance: 0.9, accessibility: 0.9, seo: 0.9 }

export function psiEndpoint(url, strategy, key) {
  const params = new URLSearchParams({ url, strategy, key })
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    params.append('category', category)
  }
  return `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`
}

/** `body` is the parsed PSI response; `status` its HTTP status. */
export function evaluatePsi({ strategy, status, body }) {
  const id = `speed-psi-${strategy}`
  const title = `PageSpeed Insights (${strategy})`
  const categories = body?.lighthouseResult?.categories
  if (status !== 200 || !categories) {
    return [
      warn(
        area,
        id,
        title,
        `PSI didn't return scores (HTTP ${status}${body?.error?.message ? `: ${body.error.message}` : ''}).`,
        'Check PSI_API_KEY, or run the page at pagespeed.web.dev.',
      ),
    ]
  }
  const score = (name) => categories[name]?.score
  const percent = (value) => (typeof value === 'number' ? Math.round(value * 100) : 'n/a')
  const detail = `Performance ${percent(score('performance'))}, accessibility ${percent(score('accessibility'))}, best practices ${percent(score('best-practices'))}, SEO ${percent(score('seo'))}.`
  const low = Object.entries(PSI_MINIMUM).filter(([name, minimum]) => {
    const value = score(name)
    return typeof value === 'number' && value < minimum
  })
  if (low.length > 0) {
    return [
      fail(
        area,
        id,
        title,
        `${detail} Below ${Math.round(PSI_MINIMUM.performance * 100)}: ${low.map(([name]) => name).join(', ')}.`,
        'Open the report at pagespeed.web.dev for the cause; large images and third-party scripts are the usual ones. See README, "Performance budgets".',
      ),
    ]
  }
  return [pass(area, id, title, detail)]
}
