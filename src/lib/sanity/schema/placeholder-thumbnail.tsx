/**
 * A stand-in picture for a layout that has not been drawn yet: a heading, three lines of text and a
 * picture, in the Card colours Sanity UI sets from the Studio theme. `npm run new:section` gives each
 * new variant this, so the Layout picker never shows a blank card; replace it with a drawing of the
 * layout (see the README's "Thumbnails").
 */
export function PlaceholderThumbnail() {
  const fg = 'var(--card-fg-color)'
  return (
    <svg viewBox="0 0 160 120" width="100%" height="100%" aria-hidden="true" focusable="false">
      <rect width={160} height={120} style={{ fill: 'var(--card-bg-color)' }} />
      <rect x={14} y={30} width={62} height={7} rx={2} style={{ fill: fg, opacity: 0.85 }} />
      {[46, 52, 58].map((y, row) => (
        <rect
          key={y}
          x={14}
          y={y}
          width={row === 2 ? 40 : 56}
          height={3}
          rx={1.5}
          style={{ fill: fg, opacity: 0.35 }}
        />
      ))}
      <rect
        x={88}
        y={22}
        width={58}
        height={76}
        rx={3}
        style={{ fill: fg, fillOpacity: 0.1, stroke: fg, strokeOpacity: 0.4 }}
      />
    </svg>
  )
}
