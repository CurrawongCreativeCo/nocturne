import { featuresGrid } from './features-grid'
import { hero } from './hero'

/**
 * Section registry — the ONLY list to touch when adding a page-builder block.
 *
 * Adding a section:
 *   1. Create `schemas/sections/<name>.ts` and add it here (Studio + page builder pick it up).
 *   2. Add a GROQ fragment in `api/sections.ts` and include it in `pageBuilderFragment`.
 *   3. `npm run typegen`.
 *   4. Create `components/sections/<name>.tsx` and register it in `components/section-renderer.tsx`.
 *      TypeScript errors until you do — the registry type is exhaustive.
 */
export const sectionTypes = [hero, featuresGrid]
