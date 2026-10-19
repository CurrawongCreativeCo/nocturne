import { useEffect, useState } from 'react'
import { useClient } from 'sanity'

import { DEFAULT_BRAND_COLOURS, fetchBrandColours, type BrandColours } from './brand-colours'

/**
 * The site's colours for the Studio's contrast checks and swatches, read from Design settings once
 * and shared by every colour field on the form. The defaults (tokens.json's) until they arrive, with
 * `ready` false so an input can hold back a verdict it is not sure of.
 */
export function useBrandColours(): BrandColours & { ready: boolean } {
  const client = useClient({ apiVersion: '2025-01-01' })
  const [found, setFound] = useState<BrandColours | null>(null)

  useEffect(() => {
    let current = true
    void fetchBrandColours(client).then((colours) => {
      if (current) setFound(colours)
    })
    return () => {
      current = false
    }
  }, [client])

  return { ...(found ?? DEFAULT_BRAND_COLOURS), ready: found !== null }
}
