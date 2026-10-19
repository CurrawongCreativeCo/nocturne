import { Wireframe } from './wireframe'
import type { DividerStyle } from '../../divider-options'
import type { PresetThumbnailProps } from '../preset-field'

const FG = 'var(--card-fg-color)'
const outline = { fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.4, strokeWidth: 1 }
const rule = { fill: FG, opacity: 0.55 }

/** A heading block above a link row, with the divider style between them. */
function DividerThumbnail({ style }: { style: DividerStyle }) {
  const y = 60
  return (
    <Wireframe label={`divider-${style}`}>
      <rect x={45} y={28} width={70} height={7} rx={3.5} style={{ fill: FG, opacity: 0.6 }} />
      {style === 'line' && <rect x={30} y={y} width={100} height={1.5} style={rule} />}
      {style === 'fade' && (
        <>
          <defs>
            <linearGradient id="divider-fade">
              <stop offset="0" stopColor={FG} stopOpacity={0} />
              <stop offset="0.5" stopColor={FG} stopOpacity={0.7} />
              <stop offset="1" stopColor={FG} stopOpacity={0} />
            </linearGradient>
          </defs>
          <rect x={30} y={y} width={100} height={1.5} fill="url(#divider-fade)" />
        </>
      )}
      {style === 'dots' &&
        [72, 80, 88].map((cx) => <circle key={cx} cx={cx} cy={y + 0.75} r={1.8} style={rule} />)}
      <rect x={20} y={82} width={120} height={22} rx={8} style={outline} />
    </Wireframe>
  )
}

export const dividerThumbnails: Record<
  DividerStyle,
  (props: PresetThumbnailProps) => React.JSX.Element
> = {
  none: () => <DividerThumbnail style="none" />,
  line: () => <DividerThumbnail style="line" />,
  fade: () => <DividerThumbnail style="fade" />,
  dots: () => <DividerThumbnail style="dots" />,
}
