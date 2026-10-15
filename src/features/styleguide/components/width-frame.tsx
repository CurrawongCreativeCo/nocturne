import type { CSSProperties, ReactNode } from 'react'

import type { PreviewWidth } from '../utils/styleguide-state'

/**
 * Shows its children at a phone, tablet or laptop width inside the page, with no iframe: a box of
 * that width that is a size container named `styleguide`. The responsive rules of the stylesheet
 * answer to this box instead of the window (scripts/postcss-container-frames.mjs); `--sg-frame`
 * switches the window's own width queries off inside it. With no width chosen nothing is added, so
 * the sections render exactly as on the site.
 *
 * Lengths in viewport units (`vh`, `vw`) still follow the window. A frame wider than the window
 * shrinks to fit it.
 */
export function WidthFrame({
  width,
  children,
}: {
  width: PreviewWidth | null
  children: ReactNode
}) {
  if (!width) return children
  const frame: CSSProperties & Record<'--sg-frame', string> = {
    width,
    containerType: 'inline-size',
    containerName: 'styleguide',
    '--sg-frame': '1',
  }
  return (
    <div data-styleguide-stage="" className="overflow-x-clip bg-surface-alt py-6">
      <p className="mb-3 text-center text-small text-ink-muted">Previewing at {width} px wide</p>
      <div
        data-styleguide-frame={width}
        style={frame}
        className="mx-auto max-w-full border-x border-dashed border-line-strong bg-surface shadow-raised"
      >
        {children}
      </div>
    </div>
  )
}
