import { vercelStegaDecode, vercelStegaSplit } from '@vercel/stega'

/** Keep preview metadata out of text measurements while retaining Sanity's edit target. */
export function previewText(value: string) {
  const { cleaned, encoded } = vercelStegaSplit(value)
  let editInfo: string | undefined
  if (encoded) {
    try {
      const metadata = vercelStegaDecode<{ origin?: string; href?: string }>(encoded)
      if (metadata?.origin === 'sanity.io' && typeof metadata.href === 'string') {
        editInfo = JSON.stringify(metadata)
      }
    } catch {
      // Malformed preview metadata must not prevent the visible label from rendering.
    }
  }
  return { text: cleaned, editInfo }
}
