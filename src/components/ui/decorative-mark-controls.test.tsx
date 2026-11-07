import { describe, expect, it, vi } from 'vitest'

import { renderToHtml } from '@/lib/design/capability-harness'
import { decorativeMark } from '@/lib/sanity/schema/decorative-mark'

import { SectionFrame } from './section-frame'

vi.mock('next-sanity/image', () => ({ Image: () => null }))
vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))
vi.mock('server-only', () => ({}))
vi.mock('@/lib/sanity/site-design', () => ({
  getSiteDesign: () => Promise.resolve({ colours: undefined, gradients: [] }),
}))

/**
 * No control without an effect (task 156): every field the Studio offers on a decorative mark must change
 * what the site draws. Each case sets one control from a base to another value on a section with a panel
 * (so Layer has something to move), and the test fails if the markup is the same, or if the schema gains a
 * control no case covers.
 */

const URL_A =
  'https://cdn.sanity.io/images/p/d/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-100x100.png'
const URL_B =
  'https://cdn.sanity.io/images/p/d/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-100x100.png'
const TEXT = { kind: 'text', text: 'Thanks' }
const ICON = { kind: 'icon', icon: 'heart' }
const PICTURE = { kind: 'picture', pictureUrl: URL_A }

type Mark = Record<string, unknown>
/** What a control is drawn from, and what it is changed to (the schema field's name is the key). */
const CONTROLS: Record<string, { base: Mark; change: Mark }> = {
  kind: { base: TEXT, change: { kind: 'icon', icon: 'heart' } },
  text: { base: TEXT, change: { text: 'Welcome' } },
  font: { base: TEXT, change: { font: 'body' } },
  align: { base: TEXT, change: { align: 'right' } },
  picture: { base: PICTURE, change: { pictureUrl: URL_B } },
  keepColours: { base: PICTURE, change: { keepColours: true } },
  icon: { base: ICON, change: { icon: 'star' } },
  size: { base: TEXT, change: { size: 'large' } },
  phoneScale: { base: ICON, change: { phoneScale: 'hidden' } },
  colour: { base: ICON, change: { colour: { colour: 'accent' } } },
  opacity: { base: ICON, change: { opacity: 6 } },
  anchor: { base: ICON, change: { anchor: 'bottom-right' } },
  offsetX: { base: ICON, change: { offsetX: 10 } },
  offsetY: { base: ICON, change: { offsetY: 10 } },
  rotation: { base: ICON, change: { rotation: 15 } },
  layer: { base: TEXT, change: { layer: 'panel' } },
}

const drawn = (mark: Mark) =>
  renderToHtml(
    <SectionFrame style={{ panel: 'solid', mark }}>
      <p>Content</p>
    </SectionFrame>,
  )

describe('every decorative mark control has an effect', () => {
  it('covers every field the schema offers', () => {
    const offered = (decorativeMark.fields as unknown as { name: string }[]).map(({ name }) => name)
    expect(Object.keys(CONTROLS).sort()).toEqual([...offered].sort())
  })

  it.each(Object.entries(CONTROLS))('%s changes what is drawn', async (_name, { base, change }) => {
    const before = await drawn(base)
    const after = await drawn({ ...base, ...change })
    expect(before).toContain('data-decorative-mark')
    expect(after).not.toBe(before)
  })
})
