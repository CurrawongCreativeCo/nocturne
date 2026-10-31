import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import {
  PanelGlassThumbnail,
  PanelNoneThumbnail,
  PanelSolidThumbnail,
} from './section-panel-thumbnails'

const props = { scheme: 'light', selected: false } as const

describe('section panel thumbnails', () => {
  it('draw no panel for None, a see-through one for Glass and an opaque one for Solid card', () => {
    const none = renderToStaticMarkup(<PanelNoneThumbnail {...props} />)
    const glass = renderToStaticMarkup(<PanelGlassThumbnail {...props} />)
    const solid = renderToStaticMarkup(<PanelSolidThumbnail {...props} />)
    expect(none).toContain('data-wireframe="section-panel-none"')
    expect(glass).toContain('data-wireframe="section-panel-glass"')
    expect(solid).toContain('data-wireframe="section-panel-solid"')
    // None has no panel rectangle; Glass draws it translucent; Solid card draws it opaque.
    expect(none).not.toContain('rx="8"')
    expect(glass).toMatch(/rx="8"[^>]*opacity="0\.7"/)
    expect(solid).toMatch(/rx="8"[^>]*opacity="1"/)
  })
})
