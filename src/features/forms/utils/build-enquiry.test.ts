import { describe, expect, it } from 'vitest'

import { buildEnquiry } from './build-enquiry'
import type { FormFieldDefinition } from '../types'

const field = (
  name: string,
  type: FormFieldDefinition['type'],
  label = name,
): FormFieldDefinition => ({
  _key: `key-${name}`,
  label,
  name,
  type,
  required: false,
  options: null,
})

const fields = [
  field('name', 'text', 'Your name'),
  field('message', 'textarea', 'Message'),
  field('agree', 'checkbox', 'I agree to be contacted'),
  field('news', 'checkbox', 'Newsletter'),
]

const base = {
  id: 'abc',
  formId: 'form-1',
  formTitle: 'Contact',
  fields,
  values: { name: 'Ann', message: 'Hi\nthere', agree: 'on', news: '' },
  submission: new Map<string, unknown>(),
  now: new Date('2026-10-17T01:02:03.000Z'),
}

describe('buildEnquiry', () => {
  it('stores label and value for every field, checkboxes as Yes or No', () => {
    expect(buildEnquiry({ ...base, pagePath: '/contact' })).toEqual({
      _id: 'enquiry-abc',
      _type: 'enquiry',
      form: { _type: 'reference', _ref: 'form-1', _weak: true },
      formTitle: 'Contact',
      fields: [
        { _key: 'key-name', label: 'Your name', value: 'Ann' },
        { _key: 'key-message', label: 'Message', value: 'Hi\nthere' },
        { _key: 'key-agree', label: 'I agree to be contacted', value: 'Yes' },
        { _key: 'key-news', label: 'Newsletter', value: 'No' },
      ],
      pagePath: '/contact',
      createdAt: '2026-10-17T01:02:03.000Z',
      status: 'new',
    })
  })

  it('leaves out the page path and attribution when there are none', () => {
    const doc = buildEnquiry(base)
    expect(doc).not.toHaveProperty('pagePath')
    expect(doc).not.toHaveProperty('attribution')
  })

  it('stores the cleaned attribution, only what is present', () => {
    const submission = new Map<string, unknown>([
      ['_referrer', 'https://www.google.com/search'],
      ['_utm_source', 'news'],
      ['_utm_campaign', ''],
    ])
    expect(buildEnquiry({ ...base, submission }).attribution).toEqual({
      referrer: 'https://www.google.com/search',
      utmSource: 'news',
    })
  })
})
