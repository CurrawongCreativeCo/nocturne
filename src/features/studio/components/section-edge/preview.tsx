import { useId } from 'react'

import { closeToBottom, closeToTop } from '@/components/ui/section-edges'
import { colorHex } from '@/config/tokens.generated'
import { resolveComposedEdge, type ResolvedComposedEdge } from '@/lib/sanity/composed-edge'
import { asProjected } from '@/lib/sanity/composed-edge-editor'

const HEIGHT = { small: 90, medium: 130, large: 170 } as const
/** Room above the band for the upper section's colour. */
const ABOVE = 0.55

const ROLE_HEX: Record<string, string> = {
  accent: colorHex.accent,
  'accent-2': colorHex.accent2,
  highlight: colorHex.highlight,
  ink: colorHex.ink,
  'ink-muted': colorHex.inkMuted,
}
const hex = (role: string) => ROLE_HEX[role] ?? colorHex.accent

/**
 * The edge as the page draws it: the same `resolveComposedEdge` result (cut, layer paths, paint, span, centre
 * and shadow), laid out in the page's own order (the lower section, paint below the cut, the shadow, the upper
 * section with its tints, then lines and the centre). Colours are the template's defaults; the page uses the
 * site's. Decorative: the controls beside it say the same things in words.
 */
export function EdgePreview({ value }: { value: unknown }) {
  const edge = resolveComposedEdge(asProjected(value))
  if (!edge) {
    return (
      <div
        role="img"
        aria-label="No preview: this edge cannot be drawn yet."
        style={{ height: 80, border: '1px dashed currentColor', opacity: 0.6, padding: 12 }}
      >
        Nothing to preview until the problems below are fixed.
      </div>
    )
  }
  const height = HEIGHT[edge.height.size]
  return (
    <div
      data-edge-preview=""
      role="img"
      aria-label={`Preview of the edge: ${edge.mode === 'rule' ? 'a rule' : 'a transition'} with ${String(edge.layers.length)} paint layers${edge.centre ? ' and a centre' : ''}${edge.shadow ? ' and a shadow' : ''}.`}
    >
      <div style={{ position: 'relative' }}>
        <PreviewSvg edge={edge} height={height} />
        {edge.centre && (
          <span
            data-edge-preview-centre=""
            style={{
              position: 'absolute',
              left: `${String(edge.centre.x * 100)}%`,
              top: `${String(((edge.mode === 'rule' ? 0.5 : edge.centre.y) + ABOVE) * (100 / (1 + ABOVE)))}%`,
              width: `${String(edge.centre.gap * 100)}%`,
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              border: '1.5px dashed currentColor',
              borderRadius: '50%',
              opacity: 0.7,
            }}
          />
        )}
      </div>
    </div>
  )
}

function PreviewSvg({ edge, height }: { edge: ResolvedComposedEdge; height: number }) {
  // Every definition id carries this instance's id, so two previews on one page never share or shadow one.
  const uid = useId()
  const ref = (name: string) => `${uid}-${name}`
  const url = (name: string) => `url(#${ref(name)})`
  const { start, end } = edge.span
  const mid = edge.centre?.x
  const gap = edge.centre ? edge.centre.gap / 2 : 0
  const rule = edge.mode === 'rule'
  const top = -ABOVE
  const total = 1 + ABOVE
  const planes = (placement: string) => edge.layers.filter((layer) => layer.placement === placement)
  const paintOf = (layer: ResolvedComposedEdge['layers'][number], index: number) =>
    layer.paint.kind === 'gradient' ? url(`g${String(index)}`) : hex(layer.paint.colour)
  const layerPath = (layer: ResolvedComposedEdge['layers'][number], index: number) =>
    layer.placement === 'stroke' ? (
      <path
        key={layer.key}
        d={layer.path}
        fill="none"
        stroke={paintOf(layer, index)}
        strokeOpacity={layer.opacity}
        strokeWidth={layer.strokeWidth}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    ) : (
      <path
        key={layer.key}
        d={layer.placement === 'above' ? closeToBottom(layer.path) : closeToTop(layer.path)}
        fill={paintOf(layer, index)}
        fillOpacity={layer.opacity}
      />
    )
  const index = (layer: ResolvedComposedEdge['layers'][number]) => edge.layers.indexOf(layer)
  return (
    <svg
      viewBox={`0 ${String(top)} 1 ${String(total)}`}
      preserveAspectRatio="none"
      width="100%"
      height={height * total}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', borderRadius: 4, overflow: 'hidden' }}
    >
      <defs>
        <clipPath id={ref('span')} clipPathUnits="userSpaceOnUse">
          {mid === undefined ? (
            <rect x={start} y={top} width={end - start} height={total} />
          ) : (
            <>
              <rect x={start} y={top} width={mid - gap - start} height={total} />
              <rect x={mid + gap} y={top} width={end - mid - gap} height={total} />
            </>
          )}
        </clipPath>
        <clipPath id={ref('upper')} clipPathUnits="userSpaceOnUse">
          <path d={closeToTop(edge.cut)} />
          <rect x="0" y={top} width="1" height={ABOVE} />
        </clipPath>
        <filter
          id={ref('shade')}
          filterUnits="userSpaceOnUse"
          x="0"
          y="-1"
          width="1"
          height="3"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceAlpha"
            stdDeviation={`0 ${String(edge.shadow?.blur ?? 0)}`}
            result="soft"
          />
          <feOffset in="soft" dy={edge.shadow?.distance ?? 0} result="moved" />
          <feFlood
            floodColor={colorHex.ink}
            floodOpacity={edge.shadow?.opacity ?? 0}
            result="tone"
          />
          <feComposite in="tone" in2="moved" operator="in" />
          <feComposite in2="SourceAlpha" operator="out" />
        </filter>
        {edge.layers.map((layer, i) =>
          layer.paint.kind === 'gradient' ? (
            <linearGradient
              key={layer.key}
              id={ref(`g${String(i)}`)}
              gradientUnits="userSpaceOnUse"
              x1={start}
              x2={end}
              y1="0"
              y2="0"
            >
              {layer.paint.fadeEnds && (
                <stop offset="0" stopColor={hex(layer.paint.from)} stopOpacity="0" />
              )}
              <stop offset={layer.paint.fadeEnds ? '15%' : '0'} stopColor={hex(layer.paint.from)} />
              <stop
                offset={layer.paint.fadeEnds ? '85%' : '100%'}
                stopColor={hex(layer.paint.to)}
              />
              {layer.paint.fadeEnds && (
                <stop offset="100%" stopColor={hex(layer.paint.to)} stopOpacity="0" />
              )}
            </linearGradient>
          ) : null,
        )}
      </defs>
      {/* The section below, and what paints under the cut. */}
      <rect x="0" y={top} width="1" height={total} fill={colorHex.surfaceAlt} />
      {!rule && (
        <g clipPath={url('span')}>
          {planes('below').map((layer) => layerPath(layer, index(layer)))}
        </g>
      )}
      {!rule && edge.shadow && <path d={closeToTop(edge.cut)} filter={url('shade')} />}
      {/* The upper section, cut along the contour, with its tints inside it. */}
      {!rule ? (
        <>
          <path d={closeToTop(edge.cut)} fill={colorHex.surface} />
          <rect x="0" y={top} width="1" height={ABOVE} fill={colorHex.surface} />
          <g clipPath={url('upper')}>
            <g clipPath={url('span')}>
              {planes('above').map((layer) => layerPath(layer, index(layer)))}
            </g>
          </g>
        </>
      ) : (
        <>
          <rect x="0" y={top} width="1" height={ABOVE + 1} fill={colorHex.surface} />
          <g clipPath={url('span')}>{edge.layers.map((layer) => layerPath(layer, index(layer)))}</g>
        </>
      )}
      {!rule && (
        <g clipPath={url('span')}>
          {planes('stroke').map((layer) => layerPath(layer, index(layer)))}
        </g>
      )}
    </svg>
  )
}
