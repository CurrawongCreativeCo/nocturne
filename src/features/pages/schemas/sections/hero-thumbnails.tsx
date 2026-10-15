import type { PresetThumbnailProps } from '@/lib/sanity/schema/preset-field'

/** Pictures of the hero layouts for the Layout picker. Inline SVG in `currentColor`, so both Studio schemes work. */

const frame = (selected: boolean) => (selected ? 0.9 : 0.55)

function Art({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 90" width="100%" height="100%" aria-hidden="true">
      {children}
    </svg>
  )
}

// Centred text over a picture filling the whole frame.
export const OverlayThumbnail = ({ selected }: PresetThumbnailProps) => (
  <Art>
    <rect width={120} height={90} fill="currentColor" opacity={0.18} />
    <rect
      x={30}
      y={26}
      width={60}
      height={10}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect
      x={40}
      y={44}
      width={40}
      height={6}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect
      x={46}
      y={58}
      width={28}
      height={10}
      rx={5}
      fill="currentColor"
      opacity={frame(selected)}
    />
  </Art>
)

// Text on one side, a picture on the other.
export const SplitThumbnail = ({ selected }: PresetThumbnailProps) => (
  <Art>
    <rect
      x={10}
      y={26}
      width={46}
      height={10}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect
      x={10}
      y={44}
      width={38}
      height={6}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect
      x={10}
      y={58}
      width={24}
      height={10}
      rx={5}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect x={66} y={16} width={44} height={58} rx={4} fill="currentColor" opacity={0.3} />
  </Art>
)

// Oversized heading with a small square picture beside it.
export const EditorialThumbnail = ({ selected }: PresetThumbnailProps) => (
  <Art>
    <rect
      x={10}
      y={22}
      width={68}
      height={14}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect
      x={10}
      y={42}
      width={52}
      height={14}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect
      x={10}
      y={64}
      width={34}
      height={5}
      rx={2.5}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect x={88} y={44} width={22} height={22} rx={3} fill="currentColor" opacity={0.3} />
  </Art>
)

// Picture edge to edge with the text at the bottom left.
export const FullBleedThumbnail = ({ selected }: PresetThumbnailProps) => (
  <Art>
    <rect width={120} height={90} fill="currentColor" opacity={0.3} />
    <rect
      x={10}
      y={50}
      width={56}
      height={10}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
    <rect
      x={10}
      y={66}
      width={38}
      height={6}
      rx={3}
      fill="currentColor"
      opacity={frame(selected)}
    />
  </Art>
)
