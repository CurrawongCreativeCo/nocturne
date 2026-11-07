import type { CSSProperties } from 'react'

import { BADGE_ICON_PATHS } from '@/components/ui/badge-icon'
import type { StoredCardLevel } from '@/lib/color/card-contrast'
import type { GlassStrength } from '@/lib/color/glass-contrast'
import { markOpacityAt } from '@/lib/color/mark-contrast'
import type { BadgeIconName } from '@/lib/sanity/badge-icons'
import {
  MARK_SIZE_CQI,
  resolveDecorativeMark,
  type MarkInput,
  type ResolvedMark,
} from '@/lib/sanity/decorative-mark-options'

export type MarkScope = 'section' | 'card' | 'item'

export interface DecorativeMarkProps {
  input: MarkInput | null | undefined
  scope: MarkScope
  tone: string | null | undefined
  /** A card's or item's stored levels, least specific first. Unset is the section itself. */
  levels?: readonly (StoredCardLevel | null | undefined)[]
  /** A picture, gradient or panel sits behind the text. */
  backdrop?: boolean
  glass?: GlassStrength | null
  /**
   * Drawn inside the element whose background it sits on (a card, a panel), which must be `relative
   * isolate`: below that element's content and above its own background. Otherwise a direct child of the
   * section, drawn before a content container that is `relative`.
   */
  nested?: boolean
}

const ALIGN_CLASS = { left: 'text-left', centre: 'text-center', right: 'text-right' } as const
const FONT_CLASS = { display: 'font-display', body: 'font-body' } as const

/** Where the mark sits, in the container's own measure, so it never takes part in layout. */
function placement(mark: ResolvedMark, opacity: number): CSSProperties {
  return {
    left: `calc(${String(mark.x)}% + ${String(mark.offsetX)}%)`,
    top: `calc(${String(mark.y)}% + ${String(mark.offsetY)}%)`,
    transform: `translate(${String(-mark.x)}%, ${String(-mark.y)}%) rotate(${String(mark.rotation)}deg) scale(var(--mark-scale, 1))`,
    opacity,
    ...(mark.colour ? { color: mark.colour } : {}),
  }
}

function MarkContent({ mark, opacity }: { mark: ResolvedMark; opacity: number }) {
  const position = placement(mark, opacity)
  const sizes = MARK_SIZE_CQI[mark.size]
  const box = { ...position, width: `${String(sizes.box)}cqi` }
  switch (mark.kind) {
    case 'text':
      return (
        // Drawn from an attribute, so the words are never read, selected, copied or indexed as content.
        <span
          data-mark-text={mark.text}
          className={`absolute w-max max-w-[100cqi] leading-none font-semibold before:content-[attr(data-mark-text)] ${FONT_CLASS[mark.font]} ${ALIGN_CLASS[mark.align]}`}
          style={{ ...position, fontSize: `${String(sizes.text)}cqi` }}
        />
      )
    case 'icon':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
          className="absolute"
          style={box}
        >
          {BADGE_ICON_PATHS[mark.icon as BadgeIconName]}
        </svg>
      )
    case 'picture':
      return (
        <span
          className="absolute aspect-square bg-center bg-no-repeat"
          style={
            mark.keepColours
              ? { ...box, backgroundImage: `url(${mark.url})`, backgroundSize: 'contain' }
              : {
                  ...box,
                  backgroundColor: 'currentColor',
                  maskImage: `url(${mark.url})`,
                  WebkitMaskImage: `url(${mark.url})`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                }
          }
        />
      )
  }
}

/**
 * The one decorative mark, at every scope (task 156; README, "Decorative marks"): a server component with
 * no JavaScript. Decorative only (hidden from assistive technology, never hit by the pointer, never
 * focusable) and clipped to its own box, so it can't cause a horizontal scroll or reach a neighbour. It is
 * absolutely placed in a box the size of its container, so it can't shift layout. Only a page with a mark
 * waits for the site's colours, which the contrast check needs.
 */
export function DecorativeMark(props: DecorativeMarkProps) {
  const mark = resolveDecorativeMark(props.input)
  return mark ? <LoadedMark {...props} mark={mark} /> : null
}

async function LoadedMark({
  mark,
  scope,
  tone,
  levels,
  backdrop,
  glass,
  nested = false,
}: DecorativeMarkProps & { mark: ResolvedMark }) {
  const { getSiteDesign } = await import('@/lib/sanity/site-design')
  const design = await getSiteDesign()
  const opacity = markOpacityAt({
    opacity: mark.opacity,
    colour: mark.storedColour,
    ownColours: mark.kind === 'picture' && mark.keepColours,
    tone,
    levels,
    backdrop,
    glass,
    site: design?.colours,
  })
  if (opacity === 0) return null
  const phone =
    mark.phoneScale === 'hidden'
      ? 'max-md:hidden'
      : mark.phoneScale === 'smaller'
        ? 'max-md:[--mark-scale:0.6]'
        : ''
  return (
    <div
      aria-hidden="true"
      data-decorative-mark={scope}
      data-mark-kind={mark.kind}
      className={`[container-type:size] pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] select-none ${nested ? '-z-10' : ''} ${phone}`.trim()}
    >
      <MarkContent mark={mark} opacity={opacity} />
    </div>
  )
}
