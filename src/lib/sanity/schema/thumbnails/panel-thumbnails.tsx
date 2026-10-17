import type { CSSProperties } from 'react'

import type { PresetThumbnailProps } from '../preset-field'
import { Button, Heading, Lines, Picture, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'
const BG = 'var(--card-bg-color)'

const line = (opacity: number): CSSProperties => ({
  fill: BG,
  stroke: FG,
  strokeOpacity: opacity,
  strokeWidth: 1,
})

/** The page seen through the dimmed backdrop. */
function PageBehind({ x = 0, w = 160 }: { x?: number; w?: number }) {
  return (
    <>
      <Heading x={x + 12} y={12} w={w * 0.36} />
      <Lines x={x + 12} y={26} w={w - 24} count={3} />
      <Picture x={x + 12} y={52} w={w - 24} h={52} />
    </>
  )
}

function Dim({ x = 0, w = 160, h = 120 }: { x?: number; w?: number; h?: number }) {
  return <rect x={x} y={0} width={w} height={h} style={{ fill: FG, opacity: 0.32 }} />
}

/** What every panel holds: a heading, some lines and a button. */
function Content({ x, y, w, rows = 3 }: { x: number; y: number; w: number; rows?: number }) {
  return (
    <>
      <Heading x={x} y={y} w={w * 0.5} />
      <Lines x={x} y={y + 14} w={w} count={rows} />
      <Button x={x} y={y + 16 + rows * 6 + 4} w={26} />
    </>
  )
}

/** A centred window over the dimmed page. */
function Window({
  x,
  y,
  w,
  h,
  rows,
}: {
  x: number
  y: number
  w: number
  h: number
  rows?: number
}) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={4} style={line(0.5)} />
      <Content x={x + 8} y={y + 9} w={w - 16} rows={rows} />
    </>
  )
}

/** Auto: a window on a desktop, a sheet on a phone. */
export function PanelAutoThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="panel-auto">
      <PageBehind w={104} />
      <Dim w={104} />
      <Window x={14} y={30} w={76} h={58} rows={2} />
      {/* The phone */}
      <rect x={112} y={16} width={38} height={88} rx={6} style={line(0.55)} />
      <rect x={113} y={17} width={36} height={86} rx={5} style={{ fill: FG, opacity: 0.32 }} />
      <rect x={113.5} y={58} width={35} height={45} rx={4} style={line(0.5)} />
      <rect x={125} y={61} width={12} height={2.5} rx={1.25} style={{ fill: FG, opacity: 0.4 }} />
      <Heading x={118} y={68} w={14} h={4} />
      <Lines x={118} y={77} w={26} count={2} />
    </Wireframe>
  )
}

/** Centred window: a window over the page, on every screen. */
export function PanelCentredThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="panel-centred">
      <PageBehind />
      <Dim />
      <Window x={34} y={24} w={92} h={72} />
    </Wireframe>
  )
}

/** Side panel: a panel along the right edge. */
export function PanelSideThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="panel-side">
      <PageBehind />
      <Dim />
      <rect x={88} y={0} width={72} height={120} style={line(0.5)} />
      <Content x={96} y={12} w={56} rows={4} />
    </Wireframe>
  )
}

/** Full screen: the panel is the whole screen, with a Close at the top. */
export function PanelFullscreenThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="panel-fullscreen">
      <Picture x={14} y={34} w={132} h={34} />
      <Heading x={14} y={12} w={48} />
      <rect x={126} y={11} width={20} height={9} rx={4.5} style={line(0.5)} />
      <Lines x={14} y={76} w={132} count={3} />
      <Button x={14} y={98} w={26} />
    </Wireframe>
  )
}
