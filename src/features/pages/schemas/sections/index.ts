import { ctaBanner } from './cta-banner'
import { faq } from './faq'
import { featuresGrid } from './features-grid'
import { formSection } from './form-section'
import { hero } from './hero'
import { logoCloud } from './logo-cloud'
import { mediaText } from './media-text'
import { newsletterSignup } from './newsletter-signup'
import { pricingTable } from './pricing-table'
import { richText } from './rich-text'
import { stats } from './stats'
import { testimonials } from './testimonials'
// new-section:import

/**
 * Section registry — the ONLY list to touch when adding a page-builder block.
 * Order here is the order in Studio's "Add item" menu.
 *
 * Quickest way to add one: `npm run new:section <name>` does all of the steps below.
 *
 * By hand:
 *   1. Create `schemas/sections/<name>.ts` and add it here (Studio + page builder pick it up).
 *   2. Add a GROQ fragment in `api/sections.ts` and include it in `pageBuilderFragment`.
 *   3. `npm run typegen`.
 *   4. Create `components/sections/<name>.tsx` and register it in `components/section-renderer.tsx`.
 *   5. Optional: add `public/section-previews/<typeName>.svg` for the insert menu thumbnail.
 */
export const sectionTypes = [
  hero,
  richText,
  mediaText,
  featuresGrid,
  logoCloud,
  testimonials,
  faq,
  ctaBanner,
  formSection,
  pricingTable,
  newsletterSignup,
  stats,
  // new-section:register
]
