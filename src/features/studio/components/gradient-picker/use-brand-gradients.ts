import { useEffect, useState } from 'react'
import { useClient } from 'sanity'

import type { BrandGradient } from '@/lib/color/gradients'
import { fetchBrandGradients } from '@/lib/sanity/schema/brand-gradients'

/** The gradients in Design settings; `null` while they load. */
export function useBrandGradients(): BrandGradient[] | null {
  const client = useClient({ apiVersion: '2025-01-01' })
  const [gradients, setGradients] = useState<BrandGradient[] | null>(null)

  useEffect(() => {
    let current = true
    void fetchBrandGradients(client).then((found) => {
      if (current) setGradients(found)
    })
    return () => {
      current = false
    }
  }, [client])

  return gradients
}
