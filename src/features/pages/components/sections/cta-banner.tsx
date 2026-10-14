import { stegaClean } from 'next-sanity'

import { CtaGroup } from '@/components/ui/cta-link'

import type { SectionProps } from '../../types'

const tones = {
  brand: {
    section: 'bg-accent text-accent-ink',
    // Full strength: 80% opacity measured 3.84:1 on the brand color, below WCAG AA (4.5:1).
    text: 'text-accent-ink',
    surface: 'dark',
  },
  dark: {
    section: 'bg-surface-inverse text-ink-inverse',
    text: 'text-ink-inverse-muted',
    surface: 'dark',
  },
  light: { section: 'bg-surface-alt text-ink', text: 'text-ink-muted', surface: 'light' },
} as const

export function CtaBanner({ data }: SectionProps<'ctaBanner'>) {
  const { title, text, ctas } = data
  const tone = tones[stegaClean(data.tone)]

  return (
    <section className="px-gutter py-section-compact">
      <div
        className={`mx-auto max-w-5xl rounded-panel px-8 py-section-compact text-center sm:px-16 ${tone.section}`}
      >
        <h2 className="text-h2 font-semibold text-balance">{title}</h2>
        {text && (
          <p className={`mx-auto mt-4 max-w-measure-narrow text-lead text-pretty ${tone.text}`}>
            {text}
          </p>
        )}
        <CtaGroup ctas={ctas} surface={tone.surface} className="mt-8 justify-center" />
      </div>
    </section>
  )
}
