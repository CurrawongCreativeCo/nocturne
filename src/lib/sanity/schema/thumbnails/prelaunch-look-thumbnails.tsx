import type { PresetThumbnailProps } from '../preset-field'
import { Button, Heading, Line, Lines, Picture, Wireframe, HEIGHT, WIDTH } from './wireframe'

const FG = 'var(--card-fg-color)'
const ACCENT = 'var(--card-link-color)'

const outline = { fill: FG, fillOpacity: 0.06, stroke: FG, strokeOpacity: 0.4, strokeWidth: 1 }

/** A stack of pill buttons, the Link page's rows. */
function Rows({ y, filled = false }: { y: number; filled?: boolean }) {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <rect x={38} y={y + index * 14} width={84} height={10} rx={5} style={outline} />
          {filled && index === 0 ? (
            <rect x={38} y={y} width={84} height={10} rx={5} style={{ fill: ACCENT }} />
          ) : null}
        </g>
      ))}
    </>
  )
}

/** Minimal and elegant: lots of quiet space, a short heading and three plain rows. */
export function PrelaunchMinimalThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="prelaunch-minimal">
      <Heading x={52} y={16} w={56} h={6} />
      <Line x={60} y={28} w={40} />
      <Rows y={50} filled />
    </Wireframe>
  )
}

/** Dark and atmospheric: a dark full-screen photo with frosted rows over it. */
export function PrelaunchDarkThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="prelaunch-dark">
      <rect width={WIDTH} height={HEIGHT} style={{ fill: FG, fillOpacity: 0.78 }} />
      <Picture x={0} y={0} w={WIDTH} h={HEIGHT} frame={false} glyph={false} />
      <rect width={WIDTH} height={HEIGHT} style={{ fill: FG, fillOpacity: 0.55 }} />
      <Heading x={52} y={16} w={56} h={6} />
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={32}
          y={48 + index * 22}
          width={96}
          height={16}
          rx={5}
          style={{ fill: 'var(--card-bg-color)', fillOpacity: 0.28 }}
        />
      ))}
    </Wireframe>
  )
}

/** Editorial: large left-aligned type over a ruled list. */
export function PrelaunchEditorialThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="prelaunch-editorial">
      <Heading x={20} y={14} w={100} h={9} />
      <Heading x={20} y={27} w={72} h={9} />
      <Lines x={20} y={42} w={80} />
      {[0, 1, 2].map((index) => (
        <g key={index}>
          <rect
            x={20}
            y={64 + index * 16}
            width={120}
            height={1}
            style={{ fill: FG, opacity: 0.4 }}
          />
          <rect
            x={20}
            y={70 + index * 16}
            width={48}
            height={4}
            rx={2}
            style={{ fill: FG, opacity: 0.7 }}
          />
          <rect x={132} y={70 + index * 16} width={8} height={4} rx={2} style={{ fill: ACCENT }} />
        </g>
      ))}
    </Wireframe>
  )
}

/** Bold and colourful: the page in the brand colour, with a button to match. */
export function PrelaunchBoldThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="prelaunch-bold">
      <rect width={WIDTH} height={HEIGHT} style={{ fill: ACCENT }} />
      <rect x={44} y={18} width={72} height={9} rx={2} style={{ fill: 'var(--card-bg-color)' }} />
      <rect
        x={56}
        y={33}
        width={48}
        height={3}
        rx={1.5}
        style={{ fill: 'var(--card-bg-color)', opacity: 0.7 }}
      />
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={38}
          y={54 + index * 16}
          width={84}
          height={11}
          rx={5.5}
          style={{ fill: 'var(--card-bg-color)', opacity: index === 0 ? 1 : 0.35 }}
        />
      ))}
    </Wireframe>
  )
}

/** Image-led: big pictures lead two cards. */
export function PrelaunchImageThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="prelaunch-image">
      <Heading x={52} y={9} w={56} h={5} />
      {[0, 1].map((col) => {
        const x = 18 + col * 66
        return (
          <g key={col}>
            <rect x={x} y={24} width={58} height={86} rx={4} style={outline} />
            <Picture x={x + 3} y={27} w={52} h={56} />
            <Heading x={x + 6} y={90} w={30} h={4} />
            <Line x={x + 6} y={99} w={42} />
          </g>
        )
      })}
    </Wireframe>
  )
}

/** Soft and refined: a tinted page, with the links in rounded cards. */
export function PrelaunchSoftThumbnail(_props: PresetThumbnailProps) {
  return (
    <Wireframe label="prelaunch-soft">
      <rect width={WIDTH} height={HEIGHT} style={{ fill: FG, fillOpacity: 0.07 }} />
      <Heading x={52} y={12} w={56} h={6} />
      <Line x={60} y={24} w={40} />
      {[0, 1].flatMap((row) =>
        [0, 1].map((col) => (
          <g key={`${row}-${col}`}>
            <rect
              x={22 + col * 60}
              y={42 + row * 34}
              width={56}
              height={28}
              rx={6}
              style={{ ...outline, fill: 'var(--card-bg-color)', fillOpacity: 1 }}
            />
            <Picture x={26 + col * 60} y={46 + row * 34} w={14} h={14} />
            <Line x={44 + col * 60} y={50 + row * 34} w={28} />
          </g>
        )),
      )}
      <Button x={69} y={110} w={22} />
    </Wireframe>
  )
}
