import tokens from '@/styles/tokens.json'

import { sizeRange } from '../utils/token-contrast'

/**
 * Spacing, radii and shadows from tokens.json, each drawn at its real value. Bars are capped at the
 * width of the box they sit in, so a wide measure still fits a phone-sized frame.
 */
export function TokensLayout() {
  return (
    <section aria-labelledby="tokens-layout" className="py-section-compact">
      <h2 id="tokens-layout" className="text-h2 font-semibold text-ink">
        Spacing, radii and shadows
      </h2>

      <h3 className="mt-8 text-h4 font-semibold text-ink">Spacing</h3>
      <ul className="mt-3 space-y-3">
        {Object.entries(tokens.space).map(([name, value]) => (
          <li
            key={name}
            className="grid grid-cols-1 gap-1 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-center sm:gap-6"
          >
            <p className="text-small">
              <span className="font-medium text-ink">{name}</span>{' '}
              <span className="font-mono text-ink-muted">{sizeRange(value)}</span>
            </p>
            <div
              aria-hidden="true"
              className="h-4 max-w-full rounded-sm bg-accent"
              style={{ width: value }}
            />
          </li>
        ))}
      </ul>

      <h3 className="mt-12 text-h4 font-semibold text-ink">Radii</h3>
      <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(tokens.radius).map(([name, value]) => (
          <li key={name} className="text-small">
            <div
              aria-hidden="true"
              className="h-20 border-2 border-line-strong bg-surface-alt"
              style={{ borderRadius: value }}
            />
            <p className="mt-2 font-medium text-ink">rounded-{name}</p>
            <p className="font-mono text-ink-muted">{value === '9999px' ? 'fully round' : value}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-12 text-h4 font-semibold text-ink">Shadows</h3>
      <ul className="mt-3 grid gap-6 sm:grid-cols-2">
        {Object.entries(tokens.shadow).map(([name, value]) => (
          <li key={name} className="text-small">
            <div
              aria-hidden="true"
              className="h-24 rounded-card bg-surface"
              style={{ boxShadow: value }}
            />
            <p className="mt-3 font-medium text-ink">shadow-{name}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
