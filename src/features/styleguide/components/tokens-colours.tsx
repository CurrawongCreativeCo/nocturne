import { contrastRows, formatRatio } from '../utils/token-contrast'

type Colours = Readonly<Record<string, string>>

/** The colour roles in groups, as `[token name in camelCase, class suffix]`. */
const GROUPS: readonly { title: string; tokens: readonly (readonly [string, string])[] }[] = [
  {
    title: 'Surfaces',
    tokens: [
      ['surface', 'surface'],
      ['surfaceAlt', 'surface-alt'],
      ['surfaceInverse', 'surface-inverse'],
    ],
  },
  {
    title: 'Text',
    tokens: [
      ['ink', 'ink'],
      ['inkMuted', 'ink-muted'],
      ['inkInverse', 'ink-inverse'],
      ['inkInverseMuted', 'ink-inverse-muted'],
    ],
  },
  {
    title: 'Brand',
    tokens: [
      ['accent', 'accent'],
      ['accentInk', 'accent-ink'],
      ['accentText', 'accent-text'],
      ['accent2', 'accent-2'],
      ['accent2Ink', 'accent-2-ink'],
      ['highlight', 'highlight'],
      ['highlightInk', 'highlight-ink'],
      ['cta', 'cta'],
      ['ctaInk', 'cta-ink'],
    ],
  },
  {
    title: 'Lines and focus',
    tokens: [
      ['line', 'line'],
      ['lineStrong', 'line-strong'],
      ['focus', 'focus'],
    ],
  },
  {
    title: 'Status',
    tokens: [
      ['danger', 'danger'],
      ['dangerSurface', 'danger-surface'],
      ['dangerInk', 'danger-ink'],
      ['success', 'success'],
      ['successSurface', 'success-surface'],
      ['successInk', 'success-ink'],
      ['warning', 'warning'],
      ['warningSurface', 'warning-surface'],
      ['warningInk', 'warning-ink'],
    ],
  },
]

/**
 * Every colour role as a swatch, then the contrast of the pairs sections draw. `colours` are the
 * colours in use (tokens.json with the Studio's Design settings applied), and each swatch is filled
 * from its CSS variable, so the picture and the numbers describe the same site.
 */
export function TokensColours({ colours }: { colours: Colours }) {
  const rows = contrastRows(colours)
  const failing = rows.filter((row) => !row.pass).length

  return (
    <section aria-labelledby="tokens-colour" className="py-section-compact">
      <h2 id="tokens-colour" className="text-h2 font-semibold text-ink">
        Colour
      </h2>
      <p className="mt-3 max-w-measure-narrow text-lead text-ink-muted">
        Each role by its class name (<code className="font-mono">bg-surface</code>,{' '}
        <code className="font-mono">text-ink-muted</code>). These are the colours in use, so any
        change in the Studio’s Brand colours shows here.
      </p>

      {GROUPS.map((group) => (
        <div key={group.title} className="mt-8">
          <h3 className="text-h4 font-semibold text-ink">{group.title}</h3>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {group.tokens.map(([key, name]) => (
              <li key={key} className="overflow-hidden rounded-card border border-line bg-surface">
                <div
                  aria-hidden="true"
                  className="h-16 border-b border-line"
                  style={{ backgroundColor: `var(--color-${name})` }}
                />
                <div className="p-3 text-small">
                  <p className="font-medium text-ink">{name}</p>
                  <p className="font-mono text-ink-muted">{colours[key]?.toUpperCase()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <h3 className="mt-12 text-h3 font-semibold text-ink">Contrast</h3>
      <p className="mt-3 max-w-measure-narrow text-body text-ink-muted" role="status">
        {failing === 0
          ? 'Every pair meets WCAG 2.2 AA.'
          : `${failing} ${failing === 1 ? 'pair does' : 'pairs do'} not meet WCAG 2.2 AA. Fix ${
              failing === 1 ? 'it' : 'them'
            } in the Studio’s Brand colours before launch.`}
      </p>
      {/* Scrolls sideways on a phone, so keyboard users can focus it to scroll (WCAG 2.1.1). */}
      <div
        role="region"
        aria-label="Contrast ratios table"
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be focusable
        tabIndex={0}
        className="mt-4 overflow-x-auto"
      >
        <table className="w-full min-w-xl border-collapse text-left text-small">
          <caption className="sr-only">
            Contrast ratios of the colour pairs sections use. Text needs 4.5:1 and borders and focus
            rings 3:1.
          </caption>
          <thead>
            <tr className="border-b border-line-strong text-ink">
              <th scope="col" className="py-2 pr-4 font-semibold">
                Pair
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                Sample
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                Ratio
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold">
                Needs
              </th>
              <th scope="col" className="py-2 font-semibold">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-line">
                <th scope="row" className="py-2 pr-4 font-medium text-ink">
                  {row.label}
                </th>
                <td className="py-2 pr-4">
                  <span
                    aria-hidden="true"
                    className="inline-block min-w-16 rounded-sm border border-line px-3 py-1 text-center font-semibold"
                    style={{ color: row.foregroundHex, backgroundColor: row.backgroundHex }}
                  >
                    Aa
                  </span>
                </td>
                <td className="py-2 pr-4 font-mono text-ink">{formatRatio(row.ratio)}</td>
                <td className="py-2 pr-4 text-ink-muted">
                  {row.required}:1 {row.kind === 'text' ? 'text' : 'UI'}
                </td>
                <td className={`py-2 font-semibold ${row.pass ? 'text-success' : 'text-danger'}`}>
                  {row.pass ? 'Pass' : 'Fails AA'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
