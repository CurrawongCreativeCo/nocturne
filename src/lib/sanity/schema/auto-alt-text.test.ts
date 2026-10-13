import { Schema } from '@sanity/schema'
import { describe, expect, it } from 'vitest'

import { getAutoAltText, setAutoAltText } from './auto-alt-text'
import { imageField } from './image-field'

interface ImageType {
  options: { aiAssist: { imageDescriptionField: { updateOnImageChange: boolean } } }
}

describe('automatic alt text', () => {
  it('is off until an editor turns it on', () => {
    expect(getAutoAltText()).toBe(false)
  })

  it('reaches the compiled schema live, without rebuilding it', () => {
    const schema = Schema.compile({
      types: [{ name: 'doc', type: 'document', fields: [imageField({ name: 'photo' })] }],
    }) as unknown as { get: (name: string) => { fields: { name: string; type: ImageType }[] } }
    const photo = schema.get('doc').fields.find((f) => f.name === 'photo')?.type
    if (!photo) throw new Error('photo field missing')
    const option = () => photo.options.aiAssist.imageDescriptionField.updateOnImageChange

    setAutoAltText(false)
    expect(option()).toBe(false)
    setAutoAltText(true)
    expect(option()).toBe(true)
    setAutoAltText(false)
  })
})
