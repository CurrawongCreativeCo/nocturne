import { getDraftFetchMode, type FetchMode } from '@/lib/sanity/live'

import { getSettings } from '../api/get-settings'
import { resolveDesignTokens } from '../utils/resolve-design-tokens'

/**
 * The Studio's brand colours as `:root` CSS variable overrides, rendered on the server so the first
 * paint is already in the right colours and no JavaScript is involved. Renders nothing when no colour
 * is set. React hoists the tag into <head>; being unlayered it beats the Tailwind theme variables
 * whatever the stylesheet order. The values are validated hex colours, so the CSS is safe inline.
 */
export async function DesignStyle(mode: FetchMode) {
  const { css } = resolveDesignTokens((await getSettings(mode))?.design)
  if (!css) return null
  return (
    <style href="design-settings" precedence="high">
      {css}
    </style>
  )
}

export async function DraftDesignStyle() {
  return <DesignStyle {...await getDraftFetchMode()} />
}
