import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SocialLinks } from './social-links'

const profiles = [{ _key: 'a', platform: 'instagram', url: 'https://instagram.com/example' }]

describe('SocialLinks', () => {
  it('claims the profile with rel="me" and names the link for its network', () => {
    const html = renderToStaticMarkup(<SocialLinks profiles={profiles} />)
    expect(html).toContain('rel="me"')
    expect(html).toContain('aria-label="Instagram"')
  })

  it('takes another rel and label, for someone else’s profiles', () => {
    const html = renderToStaticMarkup(
      <SocialLinks
        profiles={profiles}
        rel="noopener"
        linkLabel={(network) => `Jo Lee on ${network}`}
      />,
    )
    expect(html).toContain('rel="noopener"')
    expect(html).not.toContain('rel="me"')
    expect(html).toContain('aria-label="Jo Lee on Instagram"')
  })
})
