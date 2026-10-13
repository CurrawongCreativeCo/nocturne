import { deserialize, flag, generatePermutations, serialize } from 'flags/next'

import { CONTROL, experimentOptions } from './assign'
import type { Experiment } from '../types'

/**
 * The one flag of the running experiment: its value is the option a visitor is in. The flag is
 * built from the experiment document, so its declared options (control and each variant id) always
 * match what editors configured. proxy.ts encodes the visitor's option into a signed code with
 * `serialize`; the /ab/<code> route decodes it. Needs FLAGS_SECRET.
 */
function experimentFlag(experiment: Experiment) {
  return flag<string>({
    key: 'experiment',
    description: experiment.name,
    options: experimentOptions(experiment).map(({ id }) => id),
    decide: () => CONTROL,
  })
}

export function encodeOption(experiment: Experiment, option: string): Promise<string> {
  return serialize([experimentFlag(experiment)], [option])
}

/** The option a code holds, or null for a code that is forged, malformed or from another experiment. */
export async function decodeOption(experiment: Experiment, code: string): Promise<string | null> {
  try {
    const { experiment: option } = await deserialize([experimentFlag(experiment)], code)
    return typeof option === 'string' &&
      experimentOptions(experiment).some(({ id }) => id === option)
      ? option
      : null
  } catch {
    return null
  }
}

/** One code per option: every variant the site can render, for prerendering. */
export function allCodes(experiment: Experiment): Promise<string[]> {
  return generatePermutations([experimentFlag(experiment)])
}
