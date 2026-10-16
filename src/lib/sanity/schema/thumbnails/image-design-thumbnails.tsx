import type { CSSProperties, ReactNode } from 'react'

import type { PresetThumbnailProps } from '../preset-field'
import { Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'
const picturePaint: CSSProperties = {
  fill: FG,
  fillOpacity: 0.1,
  stroke: FG,
  strokeOpacity: 0.4,
  strokeWidth: 1,
}
const framePaint: CSSProperties = {
  fill: 'none',
  stroke: ACCENT,
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

/** The picture's hill and sun, inside a box. */
function Scene({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g style={{ fill: FG, fillOpacity: 0.25 }}>
      <circle cx={x + w * 0.68} cy={y + h * 0.3} r={Math.min(w, h) * 0.08} />
      <path
        d={`M${x + w * 0.1} ${y + h * 0.85} L${x + w * 0.4} ${y + h * 0.5} L${x + w * 0.58} ${y + h * 0.7} L${x + w * 0.74} ${y + h * 0.56} L${x + w * 0.9} ${y + h * 0.85} Z`}
      />
    </g>
  )
}

function Shape({ label, children }: { label: string; children: ReactNode }) {
  return <Wireframe label={label}>{children}</Wireframe>
}

export function ImageStandardThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="image-standard">
      <rect x={32} y={30} width={96} height={72} rx={4} style={picturePaint} />
      <Scene x={32} y={30} w={96} h={72} />
    </Shape>
  )
}

export function ImageRoundedThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="image-rounded">
      <rect x={32} y={30} width={96} height={72} rx={16} style={picturePaint} />
      <Scene x={32} y={30} w={96} h={72} />
    </Shape>
  )
}

export function ImageSquareThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="image-square">
      <rect x={32} y={30} width={96} height={72} style={picturePaint} />
      <Scene x={32} y={30} w={96} h={72} />
    </Shape>
  )
}

export function ImageCircleThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="image-circle">
      <circle cx={80} cy={60} r={38} style={picturePaint} />
      <Scene x={48} y={28} w={64} h={64} />
    </Shape>
  )
}

export function ImageArchThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="image-arch">
      <path d="M52 102 V58 A28 28 0 0 1 108 58 V102 Z" style={picturePaint} />
      <Scene x={52} y={44} w={56} h={58} />
    </Shape>
  )
}

export function ImageFramedThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="image-framed">
      <rect x={34} y={32} width={92} height={68} rx={4} style={picturePaint} />
      <Scene x={34} y={32} w={92} h={68} />
      <rect x={40} y={38} width={80} height={56} style={framePaint} />
    </Shape>
  )
}

// --- Frames -----------------------------------------------------------------------------------

function FramePicture() {
  return (
    <>
      <rect x={32} y={30} width={96} height={72} rx={3} style={picturePaint} />
      <Scene x={32} y={30} w={96} h={72} />
    </>
  )
}

export function FrameNoneThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="frame-none">
      <FramePicture />
    </Shape>
  )
}

export function FrameThinLineThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="frame-thin-line">
      <FramePicture />
      <rect x={38} y={36} width={84} height={60} style={framePaint} />
    </Shape>
  )
}

export function FrameDoubleLineThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="frame-double-line">
      <FramePicture />
      <rect x={37} y={35} width={86} height={62} style={framePaint} />
      <rect x={41} y={39} width={78} height={54} style={{ ...framePaint, strokeWidth: 0.8 }} />
    </Shape>
  )
}

export function FrameOffsetBorderThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="frame-offset-border">
      <FramePicture />
      <path d="M128 38 H136 V108 H40 V102" style={framePaint} />
    </Shape>
  )
}

export function FrameOrganicBrushThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="frame-organic-brush">
      <FramePicture />
      <path
        d="M37 36 C58 32 100 35 123 33 C126 52 122 80 124 96 C98 99 62 95 36 98 C38 76 34 55 37 36 C40 34 46 33 52 33"
        style={{ ...framePaint, strokeWidth: 2 }}
      />
    </Shape>
  )
}

export function FrameCornerBracketsThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="frame-corner-brackets">
      <FramePicture />
      <path
        d="M38 50 V36 H52 M108 36 H122 V50 M122 82 V96 H108 M52 96 H38 V82"
        style={{ ...framePaint, strokeWidth: 2 }}
      />
    </Shape>
  )
}

/** An approved SVG from the Frames library: a dashed outline stands for "whatever was uploaded". */
export function FrameCustomThumbnail(_props: PresetThumbnailProps) {
  return (
    <Shape label="frame-custom">
      <FramePicture />
      <rect
        x={36}
        y={34}
        width={88}
        height={64}
        rx={10}
        style={{ ...framePaint, strokeDasharray: '4 3' }}
      />
    </Shape>
  )
}
