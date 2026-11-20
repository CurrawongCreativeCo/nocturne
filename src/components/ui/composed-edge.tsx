import { useId, type CSSProperties, type ReactNode } from 'react'

import type { ResolvedComposedEdge } from '@/lib/sanity/composed-edge'

import { BadgeIcon } from './badge-icon'
import { SanityImage } from './sanity-image'
import { closeToBottom, closeToTop, cutMaskImage, edgeHeightStyle } from './section-edges'

const svgBand = {
  'aria-hidden': true,
  focusable: 'false',
  viewBox: '0 0 1 1',
  preserveAspectRatio: 'none',
  className: 'pointer-events-none absolute inset-x-0 bottom-0 w-full',
  style: { height: 'var(--edge-h)' },
} as const

const colourOf = (role: string) => `var(--color-${role})`

export function ComposedEdgeArtwork({
  edge,
  plane,
}: {
  edge: ResolvedComposedEdge
  plane: 'above' | 'below' | 'stroke' | 'all'
}) {
  const id = useId()
  const layers = edge.layers.filter(({ placement }) => plane === 'all' || placement === plane)
  if (!layers.length) return null
  const { start, end } = edge.span
  const mid = edge.centre?.x
  const gap = edge.centre ? edge.centre.gap / 2 : 0
  return (
    <svg
      {...svgBand}
      // The tint sits at -z-10 inside the section, as a saved shape's over parts do: above its background,
      // below its Decorative mark and content. Keep the space outside the condition (Prettier trims it).
      className={`${svgBand.className} overflow-hidden ${plane === 'above' ? '-z-10' : ''}`.trim()}
      data-composed-edge-artwork={plane}
      data-edge-part={plane === 'all' ? undefined : `composed-${plane}`}
    >
      <defs>
        <clipPath id={`${id}-span`} clipPathUnits="userSpaceOnUse">
          {mid === undefined ? (
            <rect x={start} y="0" width={end - start} height="1" />
          ) : (
            <>
              <rect x={start} y="0" width={mid - gap - start} height="1" />
              <rect x={mid + gap} y="0" width={end - mid - gap} height="1" />
            </>
          )}
        </clipPath>
        {layers.map(({ key, paint }, index) =>
          paint.kind === 'gradient' ? (
            <linearGradient
              key={key}
              id={`${id}-gradient-${index}`}
              gradientUnits="userSpaceOnUse"
              x1={start}
              x2={end}
              y1="0"
              y2="0"
            >
              {paint.fadeEnds && (
                <stop offset="0" stopColor={colourOf(paint.from)} stopOpacity="0" />
              )}
              <stop offset={paint.fadeEnds ? '15%' : '0'} stopColor={colourOf(paint.from)} />
              <stop offset={paint.fadeEnds ? '85%' : '100%'} stopColor={colourOf(paint.to)} />
              {paint.fadeEnds && (
                <stop offset="100%" stopColor={colourOf(paint.to)} stopOpacity="0" />
              )}
            </linearGradient>
          ) : null,
        )}
      </defs>
      <g clipPath={`url(#${id}-span)`}>
        {layers.map(({ key, path, paint, opacity, placement, strokeWidth }, index) => {
          const colour =
            paint.kind === 'gradient' ? `url(#${id}-gradient-${index})` : colourOf(paint.colour)
          return placement === 'stroke' ? (
            <path
              key={key}
              d={path}
              fill="none"
              stroke={colour}
              strokeOpacity={opacity}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ) : (
            <path
              key={key}
              d={placement === 'above' ? closeToBottom(path) : closeToTop(path)}
              fill={colour}
              fillOpacity={opacity}
            />
          )
        })}
      </g>
    </svg>
  )
}

function ComposedEdgeShadow({
  cut,
  shadow,
}: {
  cut: string
  shadow: NonNullable<ResolvedComposedEdge['shadow']>
}) {
  const id = useId()
  return (
    <svg
      {...svgBand}
      className={`${svgBand.className} overflow-visible`}
      data-composed-edge-shadow=""
    >
      <defs>
        <filter
          id={id}
          filterUnits="userSpaceOnUse"
          x="0"
          y="-1"
          width="1"
          height="3"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation={`0 ${shadow.blur}`} result="softened" />
          <feOffset in="softened" dy={shadow.distance} result="displaced" />
          <feFlood floodColor="var(--color-ink)" floodOpacity={shadow.opacity} result="shade" />
          <feComposite in="shade" in2="displaced" operator="in" />
          {/* Cast only below the edge. Even a transparent upper section keeps the shadow off its content. */}
          <feComposite in2="SourceAlpha" operator="out" />
        </filter>
      </defs>
      <path d={closeToTop(cut)} filter={`url(#${id})`} />
    </svg>
  )
}

function ComposedEdgeCentre({ centre }: { centre: NonNullable<ResolvedComposedEdge['centre']> }) {
  return (
    <span
      aria-hidden="true"
      data-composed-edge-centre=""
      style={
        {
          left: `${centre.x * 100}%`,
          '--edge-centre-bottom': `calc(var(--edge-h) * ${1 - centre.y})`,
          width: `${centre.gap * 100}%`,
        } as CSSProperties
      }
    >
      {centre.kind === 'icon' ? (
        <BadgeIcon name={centre.icon} className="aspect-square h-auto w-full" />
      ) : (
        <SanityImage
          image={centre.image}
          alt=""
          width={64}
          height={64}
          whole
          className="h-auto w-full"
        />
      )}
    </span>
  )
}

export function ComposedEdgeRule({ edge }: { edge: ResolvedComposedEdge }) {
  return (
    <>
      <ComposedEdgeArtwork edge={edge} plane="all" />
      {edge.centre && <ComposedEdgeCentre centre={edge.centre} />}
    </>
  )
}

export function ComposedEdgeFrame({
  edge,
  children,
}: {
  edge: ResolvedComposedEdge
  children: ReactNode
}) {
  return (
    <div
      data-section-edge-frame="composed"
      className="relative"
      style={
        {
          ...edgeHeightStyle(edge.height, '--edge-h'),
          '--edge-mask': cutMaskImage(edge.cut),
        } as CSSProperties
      }
    >
      <ComposedEdgeArtwork edge={edge} plane="below" />
      {edge.shadow && <ComposedEdgeShadow cut={edge.cut} shadow={edge.shadow} />}
      {children}
      <ComposedEdgeArtwork edge={edge} plane="stroke" />
      {edge.centre && <ComposedEdgeCentre centre={edge.centre} />}
    </div>
  )
}
