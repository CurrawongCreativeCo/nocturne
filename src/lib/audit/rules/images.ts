import { fieldScope, imageFieldTarget } from '../content'
import { makeFinding, type Finding } from '../finding'
import type { AuditContext, PageSnapshot } from '../types'

const SHOWN = 5

/**
 * Images with no alt attribute at all. An empty `alt=""` is a deliberate "decorative" and passes,
 * and so does an image hidden from assistive technology. Whether alt text is *good* is a judgement
 * the rule never makes (E2 §4). The Studio side of the same check is Content health's "Images without
 * alt text", which finds an image in the content that has no alt text entered.
 */
export function imageAltFindings(page: PageSnapshot, context: AuditContext): Finding[] {
  if (page.error || page.status !== 200) return []
  const missing = page.images.filter(({ alt, decorative }) => alt === null && !decorative)
  if (missing.length === 0) return []
  const field = imageFieldTarget(context.content)
  return [
    makeFinding({
      ruleId: 'a11y.image-alt',
      severity: 'warning',
      scope: fieldScope(page.url, field),
      observed: {
        count: missing.length,
        images: missing.slice(0, SHOWN).map(({ src }) => src),
      },
      expected: 'an alt attribute on every image (empty for a decorative one)',
      source: 'html',
      at: context.now,
      caveats:
        missing.length > SHOWN ? [`Showing ${SHOWN} of ${missing.length} images.`] : undefined,
      why: 'Screen reader users get no description of these images, and search engines learn nothing from them.',
      fix: {
        summary: 'Write alt text for each image in Studio.',
        ...(field && { studioIntent: field.studioIntent }),
      },
    }),
  ]
}
