import { describe, expect, it } from 'vitest'

import { context, pageContent, snapshot } from '../page.fixtures'
import { imageAltFindings } from './images'

describe('image alt text', () => {
  it('accepts alt text, an empty alt and an image hidden from assistive technology', () => {
    expect(
      imageAltFindings(
        snapshot({
          images: [
            { src: '/a.jpg', alt: 'A bridge', decorative: false },
            { src: '/b.jpg', alt: '', decorative: false },
            { src: '/c.jpg', alt: null, decorative: true },
          ],
        }),
        context(),
      ),
    ).toEqual([])
  })

  it('reports images with no alt attribute, and where the images are entered', () => {
    const [finding] = imageAltFindings(
      snapshot({
        images: [
          { src: '/a.jpg', alt: null, decorative: false },
          { src: '/b.jpg', alt: 'B', decorative: false },
        ],
      }),
      context({ content: pageContent() }),
    )
    expect(finding).toMatchObject({
      ruleId: 'a11y.image-alt',
      severity: 'warning',
      scope: { documentId: 'page-about', path: 'pageBuilder' },
      evidence: { observed: { count: 1, images: ['/a.jpg'] } },
    })
  })

  it('shows at most five and says how many there were', () => {
    const images = Array.from({ length: 8 }, (_, i) => ({
      src: `/${i}.jpg`,
      alt: null,
      decorative: false,
    }))
    const [finding] = imageAltFindings(snapshot({ images }), context())
    expect(finding?.evidence.caveats).toEqual(['Showing 5 of 8 images.'])
  })
})
