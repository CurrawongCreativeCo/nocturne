import { useEffect, useMemo, useState } from 'react'
import { useClient, useFormValue } from 'sanity'

import { brandGradients, type BrandGradient, type GradientInput } from '@/lib/color/gradients'
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

/**
 * The valid gradients of the document being edited (Brand colours), as the resolver reads them, so a
 * gradient just added is offered before it is published. No request: it is the form's own value.
 */
export function useDocumentGradients(): BrandGradient[] {
  const stored = useFormValue(['gradients']) as readonly (GradientInput | null)[] | undefined
  return useMemo(() => brandGradients(stored), [stored])
}
