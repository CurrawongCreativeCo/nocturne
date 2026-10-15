import tokens from '@/styles/tokens.json'

import { sizeRange, TYPE_LABELS } from '../utils/token-contrast'

/** Class names are written out in full so Tailwind finds them; the order is the scale's. */
const TYPE_CLASSES: Readonly<Record<string, string>> = {
  display: 'text-display font-display font-semibold',
  h1: 'text-h1 font-display font-semibold',
  h2: 'text-h2 font-display font-semibold',
  h3: 'text-h3 font-display font-semibold',
  h4: 'text-h4 font-display font-semibold',
  lead: 'text-lead',
  body: 'text-body',
  small: 'text-small',
}

const FONT_CLASSES: Readonly<Record<string, string>> = {
  display: 'font-display',
  body: 'font-body',
  mono: 'font-mono',
}

const SAMPLE = 'Built to be found, made to be remembered'

/** The type scale from tokens.json, each step set in its own class, and the three font families. */
export function TokensType() {
  return (
    <section aria-labelledby="tokens-type" className="py-section-compact">
      <h2 id="tokens-type" className="text-h2 font-semibold text-ink">
        Type
      </h2>
      <p className="mt-3 max-w-measure-narrow text-lead text-ink-muted">
        Sizes are fluid: they grow with the window between the two values shown.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-3">
        {Object.entries(tokens.font).map(([name, stack]) => (
          <li key={name} className="rounded-card border border-line p-4">
            <p className={`text-h3 text-ink ${FONT_CLASSES[name] ?? ''}`}>Aa Bb Cc 123</p>
            <p className="mt-2 text-small font-medium text-ink">{name}</p>
            <p className="font-mono text-small break-words text-ink-muted">{stack}</p>
          </li>
        ))}
      </ul>

      <ul className="mt-8 divide-y divide-line border-y border-line">
        {Object.entries(tokens.type).map(([name, step]) => (
          <li key={name} className="grid gap-2 py-5 lg:grid-cols-[14rem_1fr] lg:gap-8">
            <div className="text-small">
              <p className="font-medium text-ink">{TYPE_LABELS[name] ?? name}</p>
              <p className="font-mono text-ink-muted">text-{name}</p>
              <p className="text-ink-muted">
                {sizeRange(step.size)} · line {step.lineHeight} · tracking {step.letterSpacing}
              </p>
            </div>
            <p className={`text-ink ${TYPE_CLASSES[name] ?? ''}`}>{SAMPLE}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
