import 'server-only'

import { defineQuery } from 'next-sanity'

import { brandGradients, type BrandGradient } from '@/lib/color/gradients'
import type { ColourSet } from '@/lib/color/heading-contrast'
import { resolveDesignTokens } from '@/lib/color/resolve-design-tokens'

import { PUBLISHED, TAGS, cachedSanityFetch } from './live'

/**
 * The colours and gradients the page really draws (Brand colours in Design settings, resolved the way
 * SiteShell resolves them), for render-time decisions that need hex values rather than CSS variables:
 * a section panel's contrast. Published, because that is what visitors see, and what the Studio measures.
 *
 * It is one small cached query, made only while rendering a section that has a panel, so a site with
 * no panels never makes it, and a visitor never causes it (README, "Request budget"). Sharing the
 * settings entry would mean importing the site feature from shared code.
 */
export const DESIGN_COLOURS_QUERY = defineQuery(/* groq */ `
  *[_id == "designSettings"][0] {
    appearance,
    primary,
    secondary,
    highlight,
    surface,
    surfaceAlt,
    surfaceInverse,
    ink,
    inkMuted,
    line,
    gradients[] { name, angle, stops }
  }
`)

export interface SiteDesign {
  colours: ColourSet
  gradients: readonly BrandGradient[]
}

/** The site's colours and gradients, or undefined when they couldn't be read (the caller stays conservative). */
export async function getSiteDesign(): Promise<SiteDesign | undefined> {
  try {
    const { data } = await cachedSanityFetch({
      query: DESIGN_COLOURS_QUERY,
      ...PUBLISHED,
      tags: [TAGS.designSettings],
    })
    return {
      colours: resolveDesignTokens(data).colours,
      gradients: brandGradients(data?.gradients),
    }
  } catch {
    return undefined
  }
}
