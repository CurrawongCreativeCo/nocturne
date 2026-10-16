import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Wireframe } from './wireframe'

const FG = 'var(--card-fg-color)'

/** A logo: a soft rounded block. */
function Logo({ x, y, w = 24 }: { x: number; y: number; w?: number }) {
  return <rect x={x} y={y} width={w} height={12} rx={3} style={{ fill: FG, fillOpacity: 0.3 }} />
}

/** Grid: a small title over two rows of logos that wrap. */
export function LogoCloudGridThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="logo-cloud-grid">
      <Heading x={50} y={30} w={60} h={5} />
      {[22, 56, 90, 124].map((x) => (
        <Logo key={`a${x}`} x={x - 8} y={52} />
      ))}
      {[38, 72, 106].map((x) => (
        <Logo key={`b${x}`} x={x - 8} y={72} />
      ))}
    </Wireframe>
  )
}

/** Marquee: one row that runs off both edges, faded, with a small Pause button under it. */
export function LogoCloudMarqueeThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="logo-cloud-marquee">
      <Heading x={50} y={34} w={60} h={5} />
      <defs>
        <linearGradient id="logo-cloud-fade">
          <stop offset="0" stopColor="white" stopOpacity={0} />
          <stop offset="0.15" stopColor="white" stopOpacity={1} />
          <stop offset="0.85" stopColor="white" stopOpacity={1} />
          <stop offset="1" stopColor="white" stopOpacity={0} />
        </linearGradient>
        <mask id="logo-cloud-mask">
          <rect x={0} y={52} width={160} height={16} fill="url(#logo-cloud-fade)" />
        </mask>
      </defs>
      <g mask="url(#logo-cloud-mask)">
        {[-4, 28, 60, 92, 124].map((x) => (
          <Logo key={x} x={x} y={54} />
        ))}
      </g>
      <rect x={68} y={84} width={24} height={10} rx={5} style={{ fill: FG, fillOpacity: 0.7 }} />
    </Wireframe>
  )
}
