import type { Experiment } from '../types'

/** Public route that answers with the running experiment (see src/app/api/experiments). */
export const EXPERIMENT_API_PATH = '/api/experiments'

const DEFAULT_TTL_SECONDS = 60

interface Cached {
  experiment: Experiment | null
  expires: number
}

let cached: Cached | undefined

/** Seconds a proxy instance remembers the answer: how long a started or stopped test can take to show. */
function ttlMs(): number {
  const seconds = Number(process.env.EXPERIMENT_CACHE_SECONDS)
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : DEFAULT_TTL_SECONDS) * 1000
}

/**
 * The running experiment as the proxy sees it. The proxy runs before every page request, so it
 * can't query Sanity itself; it asks the cached /api/experiments route and remembers the answer
 * briefly. Fails open: any error means "no experiment", and is remembered for a few seconds only.
 */
export async function loadActiveExperiment(
  origin: string,
  now = Date.now(),
  fetcher: typeof fetch = fetch,
): Promise<Experiment | null> {
  if (cached && cached.expires > now) return cached.experiment
  try {
    const response = await fetcher(`${origin}${EXPERIMENT_API_PATH}`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const experiment = (await response.json()) as Experiment | null
    cached = { experiment, expires: now + ttlMs() }
    return experiment
  } catch (error) {
    console.error('Experiment lookup failed', error)
    cached = { experiment: null, expires: now + Math.min(ttlMs(), 5000) }
    return null
  }
}

/** Test helper: forgets the remembered answer. */
export function resetExperimentSource() {
  cached = undefined
}
