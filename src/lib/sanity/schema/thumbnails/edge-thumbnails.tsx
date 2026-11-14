import { LAYERED_PRESETS } from '@/components/ui/edge-presets'
import {
  closeToBottom,
  closeToTop,
  edgeBackLine,
  edgeComposition,
  edgeFill,
  isLineShape,
  type EdgePaint,
  type EdgePart,
} from '@/components/ui/section-edges'
import { colorHex } from '@/config/tokens.generated'

import { isGeneratedEdge, type SectionEdge } from '../../section-style-options'
import type { PresetThumbnailProps } from '../preset-field'
import { HEIGHT, WIDTH } from './wireframe'

/** Where the edge band sits in the picture: the shape's 0-1 box is stretched over it. */
const BAND_TOP = 54
const BAND_HEIGHT = 44

/** A composed edge's colours, as the picture's dark section over a light one shows them. */
const PAINT_HEX: Record<EdgePaint, string> = {
  accent: colorHex.accent,
  'accent-2': colorHex.accent2,
  highlight: colorHex.highlight,
  ink: colorHex.ink,
  'ink-muted': colorHex.inkMuted,
  // Echo is the upper section's own colour.
  echo: colorHex.surfaceInverse,
}

/**
 * Two sections one above the other: a dark one on top, cut to the shape, and a light one showing
 * through the cut below. Drawn from the real paths (components/ui/section-edges.ts), so the picture
 * is the edge the site draws: a new shape from its composition, with its default settings. In the
 * site's colours, as the tone thumbnails are.
 */
function EdgeThumbnail({ edge }: { edge: SectionEdge }) {
  const band = `translate(0 ${BAND_TOP}) scale(${WIDTH} ${BAND_HEIGHT})`
  const composition =
    edge === 'none' || isLineShape(edge)
      ? undefined
      : edgeComposition({
          shape: edge,
          flip: false,
          invert: false,
          height: { kind: 'token', size: 'medium' },
          accent: 'none',
          layer: 'accent-2',
          tideLayer: 'accent',
          lineColour: 'accent',
          // A generated shape's default steps.
          ...(isGeneratedEdge(edge)
            ? {
                layered: {
                  crest: 'standard',
                  depth: 'standard',
                  strength: 'standard',
                  palette: 'tint',
                  // Reef's layer below is part of its shape.
                  below: LAYERED_PRESETS[edge].layerBelow === 'always',
                },
              }
            : {}),
        })
  // What the dark section keeps: today's shapes from their line, a new one from its composition's cut.
  const outline =
    edge === 'none'
      ? undefined
      : isLineShape(edge)
        ? edgeFill(edge)
        : composition && closeToTop(composition.cut)
  const parts = (kind: EdgePart['kind']) =>
    composition?.parts.filter((part) => part.side === 'under' && part.kind === kind) ?? []
  // A layer above the cut is drawn inside the dark section, clipped to it.
  const overFills =
    composition?.parts.filter((part) => part.side === 'over' && part.kind === 'fill') ?? []
  const clipId = `edge-thumbnail-${edge}`
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      data-wireframe={`edge-${edge}`}
      style={{ display: 'block' }}
    >
      <rect width={WIDTH} height={HEIGHT} fill={colorHex.surfaceAlt} />
      <rect
        x={44}
        y={BAND_TOP + BAND_HEIGHT + 8}
        width={72}
        height={6}
        rx={2}
        fill={colorHex.ink}
      />
      <rect
        x={32}
        y={BAND_TOP + BAND_HEIGHT + 19}
        width={96}
        height={3}
        rx={1.5}
        fill={colorHex.inkMuted}
      />
      {edge === 'layered' ? (
        <path
          d={closeToTop(edgeBackLine())}
          transform={band}
          fill={colorHex.accent2}
          fillOpacity={0.55}
        />
      ) : null}
      {parts('fill').map((part) => (
        <path
          key={part.line}
          d={closeToTop(part.line)}
          transform={band}
          fill={PAINT_HEX[part.paint]}
          fillOpacity={part.opacity}
        />
      ))}
      <rect
        width={WIDTH}
        height={BAND_TOP + (edge === 'none' ? BAND_HEIGHT / 2 : 0)}
        fill={colorHex.surfaceInverse}
      />
      {outline ? <path d={outline} transform={band} fill={colorHex.surfaceInverse} /> : null}
      {outline && overFills.length > 0 ? (
        <>
          <clipPath id={clipId}>
            <path d={outline} transform={band} />
          </clipPath>
          <g clipPath={`url(#${clipId})`}>
            {overFills.map((part) => (
              <path
                key={part.line}
                d={closeToBottom(part.line)}
                transform={band}
                fill={PAINT_HEX[part.paint]}
                fillOpacity={part.opacity}
              />
            ))}
          </g>
        </>
      ) : null}
      {parts('stroke').map((part) => (
        <path
          key={part.line}
          d={part.line}
          transform={band}
          fill="none"
          stroke={PAINT_HEX[part.paint]}
          strokeOpacity={part.opacity}
          strokeWidth={part.kind === 'stroke' ? part.widthPx : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <rect x={32} y={16} width={96} height={9} rx={2} fill={colorHex.inkInverse} />
      <rect x={44} y={31} width={72} height={3} rx={1.5} fill={colorHex.inkInverseMuted} />
    </svg>
  )
}

export const EdgeNoneThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="none" />
export const EdgeDiagonalThumbnail = (_props: PresetThumbnailProps) => (
  <EdgeThumbnail edge="diagonal" />
)
export const EdgeWaveThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="wave" />
export const EdgeCurveThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="curve" />
export const EdgeArchThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="arch" />
export const EdgeLayeredThumbnail = (_props: PresetThumbnailProps) => (
  <EdgeThumbnail edge="layered" />
)
export const EdgeTideThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="tide" />
export const EdgeContourThumbnail = (_props: PresetThumbnailProps) => (
  <EdgeThumbnail edge="contour" />
)
export const EdgeStillWaterThumbnail = (_props: PresetThumbnailProps) => (
  <EdgeThumbnail edge="still-water" />
)
export const EdgeLagoonThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="lagoon" />
export const EdgeReefThumbnail = (_props: PresetThumbnailProps) => <EdgeThumbnail edge="reef" />
