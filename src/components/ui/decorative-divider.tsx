import type { DividerStyle, DividerWidth } from '@/lib/sanity/divider-options'

// Full class names, so Tailwind's scanner sees them.
const WIDTH: Record<DividerWidth, string> = { short: 'w-16', medium: 'w-40', full: 'w-full' }
// Forced-colours mode drops backgrounds, so the shapes fall back to the system text colour.
const FILL = 'bg-current forced-colors:bg-[CanvasText]'
const RULE = `block h-px ${FILL}`

/**
 * A small decorative rule inside a section (lib/sanity/divider-options.ts): Line, Fading line, Three
 * dots or Line with a diamond, drawn in CSS in `currentColor`. Purely decoration, so it is hidden
 * from assistive technology rather than announced as a separator: the parts on either side already
 * have their own headings and lists. `block` centres it in a centred section; the space around it
 * collapses with its neighbours' margins.
 */
export function DecorativeDivider({
  style,
  width = 'medium',
  colour,
  block = '',
  className = '',
}: {
  style: Exclude<DividerStyle, 'none'>
  width?: DividerWidth
  /** A CSS colour (lib/sanity/theme-colour.ts); undefined is the line colour. */
  colour?: string
  /** From `sectionTraits`: `mx-auto` in a centred section. */
  block?: string
  className?: string
}) {
  const classes = [
    'my-6 flex max-w-full items-center',
    colour ? '' : 'text-line-strong',
    style === 'dots' ? 'w-fit gap-2' : WIDTH[width],
    style === 'diamond' ? 'gap-2' : '',
    block,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <div
      aria-hidden="true"
      data-decorative-divider={style}
      className={classes}
      style={colour ? { color: colour } : undefined}
    >
      {style === 'line' && <span className={`${RULE} w-full`} />}
      {style === 'fade' && (
        <span className="block h-px w-full bg-linear-to-r from-transparent via-current to-transparent forced-colors:bg-[CanvasText]" />
      )}
      {style === 'dots' &&
        [0, 1, 2].map((dot) => <span key={dot} className={`block size-1 rounded-full ${FILL}`} />)}
      {style === 'diamond' && (
        <>
          <span className={`${RULE} flex-1`} />
          <span className={`block size-1.5 shrink-0 rotate-45 ${FILL}`} />
          <span className={`${RULE} flex-1`} />
        </>
      )}
    </div>
  )
}
