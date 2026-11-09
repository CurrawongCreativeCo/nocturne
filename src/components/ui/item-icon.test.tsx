import { vercelStegaCombine } from '@vercel/stega'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ItemIcon } from './item-icon'

vi.mock('@/components/ui/sanity-image', () => ({
  SanityImage: () => <span data-upload />,
}))

const upload = { asset: { _ref: 'image-abc-48x48-svg' } } as never

describe('ItemIcon', () => {
  it('draws the set icon, in a container only when one is chosen', () => {
    const plain = renderToStaticMarkup(<ItemIcon name="star" design={{}} />)
    expect(plain).toContain('<svg')
    expect(plain).toContain('data-icon-shape="plain"')
    const circle = renderToStaticMarkup(<ItemIcon name="star" design={{ shape: 'circle' }} />)
    expect(circle).toContain('rounded-full')
  })

  it('lets the set icon win over an uploaded one', () => {
    const html = renderToStaticMarkup(<ItemIcon name="star" image={upload} design={{}} />)
    expect(html).not.toContain('data-upload')
    expect(html).toContain('<svg')
  })

  it('draws the upload whole when there is no set icon', () => {
    const html = renderToStaticMarkup(<ItemIcon image={upload} design={{ shape: 'circle' }} />)
    expect(html).toContain('data-upload')
    expect(html).not.toContain('data-icon-shape')
  })

  it('draws nothing of its own without a set icon, so the upload renders whole as before', () => {
    const html = renderToStaticMarkup(<ItemIcon name={null} design={{ shape: 'circle' }} />)
    expect(html).not.toContain('data-icon-shape')
  })

  it('falls back to the upload for a name the set doesn’t have', () => {
    const html = renderToStaticMarkup(
      <ItemIcon name="removed-icon" image={upload} design={{ shape: 'circle' }} />,
    )
    expect(html).toContain('data-upload')
    expect(html).not.toContain('data-icon-shape')
    expect(html).not.toContain('<svg')
  })

  it('draws nothing of its own for an unknown name with no upload', () => {
    const html = renderToStaticMarkup(<ItemIcon name="removed-icon" design={{ shape: 'circle' }} />)
    expect(html).not.toContain('data-icon-shape')
  })

  it('still reads a set icon name carrying stega encoding', () => {
    const html = renderToStaticMarkup(
      <ItemIcon
        name={vercelStegaCombine('star', { origin: 'sanity.io', href: '/x' })}
        image={upload}
        design={{}}
      />,
    )
    expect(html).toContain('<svg')
    expect(html).not.toContain('data-upload')
  })
})
