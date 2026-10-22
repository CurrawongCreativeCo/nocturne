import { legacyStegaEncode, vercelStegaCombine } from '@vercel/stega'
import { describe, expect, it } from 'vitest'

import { previewText } from './preview-text'

describe('previewText', () => {
  const metadata = { origin: 'sanity.io', href: '/studio/intent/edit/id=page;path=title' }

  it('leaves published text unchanged', () => {
    expect(previewText('Stay connected')).toEqual({ text: 'Stay connected', editInfo: undefined })
  })

  it.each([
    vercelStegaCombine('Stay connected', metadata, false),
    // eslint-disable-next-line @typescript-eslint/no-deprecated -- Exercise existing previews using the old encoding.
    `Stay connected${legacyStegaEncode(metadata)}`,
  ])('moves preview metadata into an edit attribute', (encoded) => {
    expect(previewText(encoded)).toEqual({
      text: 'Stay connected',
      editInfo: JSON.stringify(metadata),
    })
  })

  it('does not treat other origins as Sanity edit targets', () => {
    expect(previewText(vercelStegaCombine('Text', { origin: 'example.com' }, false))).toEqual({
      text: 'Text',
      editInfo: undefined,
    })
  })
})
