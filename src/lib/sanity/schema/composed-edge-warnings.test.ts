import { describe, expect, it } from 'vitest'

import type { SectionStyleInput } from '@/components/ui/section-style'
import { edgeVisibility } from '@/lib/color/edge-visibility'
import { colorHex } from '@/config/tokens.generated'

import { edgeLayerColourFieldHidden, staleLayerColourFieldMessage } from './section-form'

/**
 * Studio's warnings describe the edge that draws (composable section edges, Task 2). A composition that
 * renders wins over the saved shape, so the saved shape's advisories stop; one that cannot render leaves the
 * saved shape drawing, and its advisories stay.
 */

const COMPOSITION = {
  version: 1,
  mode: 'transition',
  contour: {
    points: [
      { x: 0, y: 70 },
      { x: 100, y: 40 },
    ],
  },
  layers: [{ placement: 'above', opacity: 40 }],
}
/** The dark Large / Flip Lagoon whose second layer is faint: it warns on its own. */
const DARK_LAGOON: SectionStyleInput = {
  tone: 'inverse',
  edge: 'lagoon',
  edgePalette: 'highlight',
  edgeStrength: 'strong',
  edgeFlip: true,
  edgeHeight: 'large',
}
const BROKEN = { ...COMPOSITION, version: 2 }

describe('the visibility advisory', () => {
  it('warns about the saved shape when there is no composition', () => {
    expect(edgeVisibility({ style: DARK_LAGOON, site: colorHex }).state).toBe('faint')
  })

  it('says nothing about a saved shape while a composition draws instead', () => {
    const result = edgeVisibility({
      style: { ...DARK_LAGOON, composedEdge: COMPOSITION },
      site: colorHex,
    })
    expect(result.state).toBe('none')
    expect(result.message).toBeUndefined()
  })

  it('warns again when the composition cannot render and the saved shape draws', () => {
    const result = edgeVisibility({
      style: { ...DARK_LAGOON, composedEdge: BROKEN },
      site: colorHex,
    })
    expect(result.state).toBe('faint')
  })
})

describe('the per-layer colour warning', () => {
  const style = (composedEdge?: unknown): Record<string, unknown> => ({
    edge: 'still-water',
    ...(composedEdge ? { composedEdge } : {}),
  })
  const document = (composedEdge?: unknown) => ({
    pageBuilder: [{ _key: 's1', _type: 'section', style: style(composedEdge) }],
  })
  const path = ['pageBuilder', { _key: 's1' }, 'style', 'edgeLayerColours', 'above2']
  const message = (composedEdge?: unknown) =>
    staleLayerColourFieldMessage('above2', 'colour')('ink', {
      document: document(composedEdge),
      path,
    })

  it('names the saved shape when it draws', () => {
    expect(message()).toMatch(/one layer above/)
  })

  it('says the colours are ignored while a composition draws', () => {
    expect(message(COMPOSITION)).toMatch(/custom section edge draws/)
  })

  it('names the saved shape again when the composition cannot render', () => {
    expect(message(BROKEN)).toMatch(/one layer above/)
  })

  it('keeps a stored colour visible while a composition draws, so its warning can be read and cleared', () => {
    const hidden = edgeLayerColourFieldHidden('above2') as (context: never) => boolean
    expect(hidden({ document: document(COMPOSITION), path, value: 'ink' } as never)).toBe(false)
    expect(hidden({ document: document(COMPOSITION), path, value: undefined } as never)).toBe(true)
  })
})
