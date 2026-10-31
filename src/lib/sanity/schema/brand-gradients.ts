import { backgroundContrastProblem } from '@/lib/color/background-contrast'
import { brandGradients, type BrandGradient, type GradientInput } from '@/lib/color/gradients'

/** The slice of a Studio client this needs, so the Studio and the validation can both pass theirs. */
interface GradientClient {
  fetch: <T>(query: string) => Promise<T>
}

// Published only: the page draws what is published, so that is what a section can pick.
const QUERY = '*[_id == "designSettings"][0].gradients[]{ name, angle, stops }'

/** What a request for the brand gradients found: the list, or that it could not be read. */
export interface BrandGradientState {
  /** False when the request failed: the list is then empty because it is unknown, not because there are none. */
  known: boolean
  gradients: BrandGradient[]
}

// A form asks several times as it renders; share the answer for a moment, but never for long, so a
// gradient just published in Design settings turns up on the next look. A failed request is not
// shared at all: the next look asks again, so a check that could not run runs once Studio can reach
// the project.
const SHARE_MS = 3000
let shared: { at: number; pending: Promise<BrandGradientState> } | undefined

/**
 * The brand gradients an editor can put behind a section, and whether they could be read. Use this
 * where "no gradients" and "could not tell" must be told apart (a section's own check), so a failed
 * request is never reported as a removed gradient.
 */
export function fetchBrandGradientState(client: GradientClient): Promise<BrandGradientState> {
  if (shared && Date.now() - shared.at < SHARE_MS) return shared.pending
  const entry = {
    at: Date.now(),
    pending: client
      .fetch<(GradientInput | null)[] | null>(QUERY)
      .then((gradients): BrandGradientState => ({
        known: true,
        gradients: brandGradients(gradients),
      }))
      .catch((): BrandGradientState => ({ known: false, gradients: [] })),
  }
  shared = entry
  void entry.pending.then((state) => {
    if (!state.known && shared === entry) shared = undefined
  })
  return entry.pending
}

/**
 * The brand gradients an editor can put behind a section: those in Design settings, with the slugs
 * the page defines as `--gradient-<slug>`. A failed request counts as none, so a flaky connection
 * hides the picker rather than breaking the form.
 */
export async function fetchBrandGradients(client: GradientClient): Promise<BrandGradient[]> {
  return (await fetchBrandGradientState(client)).gradients
}

/**
 * The warning on a section's Gradient field, or true when there is nothing to say. A gradient that is
 * not in the list is only called removed when the list was read: when it could not be, the choice is
 * kept and the editor is told the check did not run.
 */
export function gradientFieldWarning({
  slug,
  tone,
  state,
}: {
  slug: string
  tone: string | null | undefined
  state: BrandGradientState
}): string | true {
  if (!state.known) {
    return 'Studio couldn’t load the brand gradients just now, so this gradient wasn’t checked. Your choice is kept; it is checked again the next time this form is looked at.'
  }
  const chosen = state.gradients.find((gradient) => gradient.slug === slug)
  if (!chosen) {
    return 'This gradient is no longer in Brand colours, so the section shows no gradient. Choose another, or clear it.'
  }
  return (
    backgroundContrastProblem({ tone, hasImage: false, gradientStops: chosen.stops })?.message ??
    true
  )
}
