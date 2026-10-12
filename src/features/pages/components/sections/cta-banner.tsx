import { stegaClean } from 'next-sanity'

import { CtaGroup } from '@/components/ui/cta-link'

import type { SectionProps } from '../../types'

const tones = {
  brand: { section: 'bg-brand text-brand-foreground', text: 'text-brand-foreground/80', surface: 'dark' },
  dark: { section: 'bg-gray-950 text-white', text: 'text-gray-300', surface: 'dark' },
  light: { section: 'bg-gray-100 text-gray-950', text: 'text-gray-600', surface: 'light' },
} as const

export function CtaBanner({ data }: SectionProps<'ctaBanner'>) {
  const { title, text, ctas } = data
  const tone = tones[stegaClean(data.tone)]

  return (
    <section className="px-6 py-16">
      <div className={`mx-auto max-w-5xl rounded-3xl px-8 py-16 text-center sm:px-16 ${tone.section}`}>
        <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
        {text && <p className={`mx-auto mt-4 max-w-2xl text-lg text-pretty ${tone.text}`}>{text}</p>}
        <CtaGroup ctas={ctas} surface={tone.surface} className="mt-8 justify-center" />
      </div>
    </section>
  )
}
