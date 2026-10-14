import type { LogoAsset } from '@/config/studio-brand/types'

type Monogram = Extract<LogoAsset, { kind: 'monogram' }>

/** A rounded square with the name's first letter, for a client with colours but no logo. `size` is any CSS length. */
export function BrandMonogram({ monogram, size }: { monogram: Monogram; size: number | string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
        width: size,
        height: size,
        borderRadius: '25%',
        background: monogram.background,
        color: monogram.foreground,
        fontSize: typeof size === 'number' ? size * 0.58 : `calc(${size} * 0.58)`,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {monogram.text}
    </span>
  )
}
