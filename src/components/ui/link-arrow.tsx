import type { CSSProperties } from 'react'

import { ActionIndicator } from '@/components/ui/action-indicator'
import type { LinkArrowStyle } from '@/lib/sanity/link-arrow-options'

/** The indicator with no motion of its own: `ActionIndicator`, kept for callers that move it themselves. */
export function LinkArrow({
  arrow,
  external,
  className,
  style,
}: {
  arrow: LinkArrowStyle
  external: boolean
  className?: string
  style?: CSSProperties
}) {
  return <ActionIndicator glyph={arrow} external={external} className={className} style={style} />
}
