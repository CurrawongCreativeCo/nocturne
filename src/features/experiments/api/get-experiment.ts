import { cachedSanityFetch, PUBLISHED, TAGS } from '@/lib/sanity/live'

import { ACTIVE_EXPERIMENT_QUERY } from './queries'
import { optionToVariant } from '../utils/assign'
import { allCodes, decodeOption } from '../utils/experiment-flag'

/** The running experiment, from one cached entry shared by the proxy lookup and the variant routes. */
export async function getActiveExperiment() {
  const { data } = await cachedSanityFetch({
    query: ACTIVE_EXPERIMENT_QUERY,
    ...PUBLISHED,
    tags: [TAGS.experiment],
  })
  return data
}

/**
 * What a variant route's code stands for: the experiment, the option and the Sanity variant to
 * fetch. Null when no experiment runs or the code isn't valid for it (a stale or forged URL);
 * callers then render the published content.
 */
export async function resolveExperimentCode(code: string) {
  const experiment = await getActiveExperiment()
  if (!experiment) return null
  const option = await decodeOption(experiment, code)
  return option === null
    ? null
    : { experiment: experiment.name, option, variant: optionToVariant(option) }
}

/** Codes to prerender: one per option of the running experiment, none without one. */
export async function getExperimentCodes(): Promise<string[]> {
  const experiment = await getActiveExperiment()
  if (!experiment) return []
  try {
    return await allCodes(experiment)
  } catch (error) {
    // No FLAGS_SECRET: the proxy can't assign visitors either, so nothing needs prerendering.
    console.error('Experiment codes unavailable', error)
    return []
  }
}
