import { createClient } from '@sanity/client'
import { Schema } from '@sanity/schema'
import { validateDocument } from '@sanity/validation'
import { describe, expect, it } from 'vitest'

import { decorativeDivider } from '@/lib/sanity/schema/decorative-divider'

import { linkListDesignFields } from './link-list-design'

const schema = Schema.compile({
  types: [
    decorativeDivider,
    { name: 'frame', type: 'document', fields: [{ name: 'title', type: 'string' }] },
    {
      name: 'page',
      type: 'document',
      fields: [
        {
          name: 'sections',
          type: 'array',
          of: [
            {
              name: 'linkList',
              type: 'object',
              fields: [
                { name: 'variant', type: 'string' },
                { name: 'socialSource', type: 'string' },
                ...linkListDesignFields,
              ],
            },
          ],
        },
      ],
    },
  ],
})
const client = createClient({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2025-01-01',
  apiHost: 'http://localhost:9999',
  useCdn: false,
})
const agency = {
  id: 'agency',
  name: 'Agency',
  email: 'agency@example.com',
  roles: [{ name: 'administrator', title: 'Administrator' }],
}
const validate = (section: Record<string, unknown>) =>
  validateDocument({
    schema,
    client,
    currentUser: agency,
    document: {
      _id: 'drafts.hidden-link-design',
      _createdAt: '2026-10-21T00:00:00Z',
      _updatedAt: '2026-10-21T00:00:00Z',
      _rev: 'fixture',
      _type: 'page',
      sections: [{ _key: 'links', _type: 'linkList', ...section }],
    },
    getDocumentExists: () => Promise.resolve(false),
  })
const invalidColour = { colour: 'custom', hex: 'invalid' }

describe('hidden Link list design validation', () => {
  it('ignores a stale frame and hidden colour when a profile uses no border', async () => {
    const result = await validate({
      profileDesign: {
        border: 'none',
        frame: { _type: 'reference', _ref: 'unpublished-frame' },
        borderColour: invalidColour,
      },
    })
    expect(result.markers).toEqual([])
  })

  it('ignores nested custom colours in hidden social controls and dividers', async () => {
    const result = await validate({
      socialSource: 'none',
      socialDesign: { background: invalidColour },
      dividerDesign: {
        aboveSocial: { _type: 'decorativeDivider', style: 'line', lineColour: invalidColour },
      },
    })
    expect(result.markers).toEqual([])
  })

  it('still rejects an invalid custom colour on a visible profile border', async () => {
    const result = await validate({
      profileDesign: { border: 'line', borderColour: invalidColour },
    })
    expect(result.markers).toEqual([
      expect.objectContaining({
        level: 'error',
        path: ['sections', { _key: 'links' }, 'profileDesign', 'borderColour', 'hex'],
      }),
    ])
  })

  it('disables inline creation for the profile frame picker', () => {
    const profile = linkListDesignFields.find((field) => field.name === 'profileDesign')
    expect(
      profile && 'fields' in profile && profile.fields.find((field) => field.name === 'frame'),
    ).toMatchObject({ options: { disableNew: true } })
  })
})
