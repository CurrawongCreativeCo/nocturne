import type { Metadata } from 'next'
import { Suspense } from 'react'

import { getSettings } from '@/features/site/api/get-settings'
import { DesignStyle } from '@/features/site/components/design-style'
import { resolveDesignTokens } from '@/features/site/utils/resolve-design-tokens'
import { StyleguideNav } from '@/features/styleguide/components/styleguide-nav'
import { TokensColours } from '@/features/styleguide/components/tokens-colours'
import { TokensLayout } from '@/features/styleguide/components/tokens-layout'
import { TokensMotion } from '@/features/styleguide/components/tokens-motion'
import { TokensType } from '@/features/styleguide/components/tokens-type'
import { PUBLISHED } from '@/lib/sanity/live'

import { requireStyleguide, requireStyleguideToken } from '../guard'

export const metadata: Metadata = {
  title: 'Style guide: design tokens',
  robots: { index: false, follow: false },
}

type Props = PageProps<'/section-gallery/tokens'>

/**
 * The style guide's tokens view: colour with contrast ratios, the type scale, spacing, radii,
 * shadows and motion. The values come from src/styles/tokens.json, and the colours are the ones in
 * use, with the Studio's Design settings applied. Same access rules as the sections view.
 */
export default function TokensPage({ searchParams }: Props) {
  const access = requireStyleguide()
  return (
    <Suspense fallback={null}>
      <Tokens access={access} searchParams={searchParams} />
    </Suspense>
  )
}

async function Tokens({
  access,
  searchParams,
}: {
  access: Parameters<typeof requireStyleguideToken>[0]
  searchParams: Props['searchParams']
}) {
  await requireStyleguideToken(access, searchParams)
  const { colours } = resolveDesignTokens((await getSettings(PUBLISHED))?.design)

  return (
    <main>
      <DesignStyle {...PUBLISHED} />
      <StyleguideNav view="tokens" />
      <div className="mx-auto max-w-content px-gutter pb-section">
        <header className="py-section-compact">
          <h1 className="text-h1 font-semibold text-ink">Design tokens</h1>
          <p className="mt-3 max-w-measure-narrow text-lead text-ink-muted">
            The colour, type, spacing, shape and motion every section is built from. Edit them in{' '}
            <code className="font-mono">src/styles/tokens.json</code> and the Studio’s Brand
            colours.
          </p>
        </header>
        <TokensColours colours={colours} />
        <TokensType />
        <TokensLayout />
        <TokensMotion />
      </div>
    </main>
  )
}
