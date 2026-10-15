import { brandGradients, type BrandGradient, type GradientInput } from '@/lib/color/gradients'

/** The slice of a Studio client this needs, so the Studio and the validation can both pass theirs. */
interface GradientClient {
  fetch: <T>(query: string) => Promise<T>
}

// Published only: the page draws what is published, so that is what a section can pick.
const QUERY = '*[_id == "designSettings"][0].gradients[]{ name, angle, stops }'

// A form asks several times as it renders; share the answer for a moment, but never for long, so a
// gradient just published in Design settings turns up on the next look.
const SHARE_MS = 3000
let shared: { at: number; pending: Promise<BrandGradient[]> } | undefined

/**
 * The brand gradients an editor can put behind a section: those in Design settings, with the slugs
 * the page defines as `--gradient-<slug>`. A failed request counts as none, so a flaky connection
 * hides the picker rather than breaking the form.
 */
export function fetchBrandGradients(client: GradientClient): Promise<BrandGradient[]> {
  if (shared && Date.now() - shared.at < SHARE_MS) return shared.pending
  const pending = client
    .fetch<(GradientInput | null)[] | null>(QUERY)
    .then((gradients) => brandGradients(gradients))
    .catch(() => [])
  shared = { at: Date.now(), pending }
  return pending
}
