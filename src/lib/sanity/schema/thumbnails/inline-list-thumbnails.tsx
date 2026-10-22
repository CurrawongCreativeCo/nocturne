import type { InlineSeparator } from '../../inline-list-options'
import type { PresetThumbnailProps } from '../preset-field'
import { Heading, Line, Wireframe } from './wireframe'

/** Short labels above a heading, with the separator drawn in the gap. */
function InlineThumbnail({ separator }: { separator: InlineSeparator }) {
  return (
    <Wireframe label={`inline-list-${separator}`}>
      {[24, 66, 108].map((x) => (
        <Line key={x} x={x} y={40} w={28} />
      ))}
      {[59, 101].map((cx) => (
        <g key={cx} style={{ fill: 'var(--card-link-color)' }}>
          {separator === 'bullet' && <circle cx={cx} cy={41.5} r={2.5} />}
          {separator === 'dot' && <circle cx={cx} cy={41.5} r={1.5} />}
          {separator === 'line' && <rect x={cx} y={37} width={1} height={9} />}
          {separator === 'diamond' && <path d={`M${cx} 38 l3.5 3.5 -3.5 3.5 -3.5 -3.5 Z`} />}
        </g>
      ))}
      <Heading x={24} y={60} w={112} />
    </Wireframe>
  )
}

export const inlineListThumbnails: Record<
  InlineSeparator,
  (props: PresetThumbnailProps) => React.JSX.Element
> = {
  bullet: () => <InlineThumbnail separator="bullet" />,
  dot: () => <InlineThumbnail separator="dot" />,
  line: () => <InlineThumbnail separator="line" />,
  diamond: () => <InlineThumbnail separator="diamond" />,
  none: () => <InlineThumbnail separator="none" />,
}
