import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { SectionFrame } from '@/components/ui/section-frame'
import type { StatItemData } from '@/components/ui/stat-figure'
import { StatsBar } from '@/components/ui/stats-bar'

export const metadata: Metadata = {
  title: 'Statistics bar gallery',
  robots: { index: false, follow: false },
}

const items = (count: number): StatItemData[] =>
  [
    { _key: 'projects', value: 12500, suffix: '+', label: 'Projects delivered' },
    { _key: 'rating', value: 4.9, decimals: 1, suffix: '/5', label: 'Average rating' },
    {
      _key: 'raised',
      value: 1.2,
      decimals: 1,
      prefix: '$',
      suffix: 'm',
      label: 'Raised for clients',
    },
    { _key: 'years', value: 12, label: 'Years in business' },
  ].slice(0, count)

/** The tones a hero can have, each with a bar of a different length. */
const TONES = [
  { tone: 'surface', count: 4, caption: 'As of June 2026' },
  { tone: 'alt', count: 3, caption: undefined },
  { tone: 'inverse', count: 4, caption: undefined },
  { tone: 'accent', count: 2, caption: undefined },
] as const

/**
 * The statistics bar (src/components/ui/stats-bar.tsx) on each tone, for tests/e2e/stats.spec.ts.
 * The bar is made for the hero's statistics slot, which is not built yet, so this is where it is seen.
 * Like the section gallery it answers 404 unless NODE_ENV is development or E2E_GALLERY=1, and its
 * `section-gallery` prefix is reserved, so no CMS page can use it.
 */
export default function StatsBarGalleryPage() {
  if (process.env.NODE_ENV !== 'development' && process.env.E2E_GALLERY !== '1') notFound()

  return (
    <main>
      <h1 className="sr-only">Statistics bar gallery</h1>
      {TONES.map(({ tone, count, caption }) => (
        <div key={tone} data-stats-bar-example={tone}>
          <SectionFrame style={{ tone }}>
            <StatsBar items={items(count)} caption={caption} />
          </SectionFrame>
        </div>
      ))}
    </main>
  )
}
