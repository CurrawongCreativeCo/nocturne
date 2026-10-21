import { currawongBrand } from './currawong.ts'
import { resolveStudioBrand } from './resolve.ts'
import { validateStudioBrand } from './validate.ts'
import clientFile from '../../../studio-brand.json'

const validation = validateStudioBrand(clientFile)
if (!validation.ok) {
  throw new Error(`studio-brand.json is invalid:\n- ${validation.errors.join('\n- ')}`)
}

/**
 * This site's resolved CMS brand: studio-brand.json (the client's) over Currawong's defaults.
 * The Studio logo and workspace theme read it; client colours replace defaults as a whole set.
 * Run `npm run check:studio-brand` to see the result and any contrast warnings.
 */
export const studioBrand = resolveStudioBrand(validation.brand, currawongBrand, {
  studioTitle: process.env.NEXT_PUBLIC_STUDIO_TITLE,
})
