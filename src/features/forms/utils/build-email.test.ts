import { describe, expect, it } from 'vitest'

import { buildEmail, escapeHtml } from './build-email'
import type { FormFieldDefinition } from '../types'

const field = (name: string, type: FormFieldDefinition['type']): FormFieldDefinition => ({
  _key: name,
  label: `Your ${name}`,
  name,
  type,
  required: false,
  options: null,
})

const fields = [
  field('name', 'text'),
  field('mail', 'email'),
  field('note', 'textarea'),
  field('news', 'checkbox'),
]

describe('buildEmail', () => {
  const email = buildEmail({
    formTitle: 'Contact us',
    fields,
    values: { name: 'Ann', mail: 'ann@example.com', note: 'Line one\nLine two', news: 'on' },
  })

  it('lists every field by label in the text body', () => {
    expect(email.text).toBe(
      'Your name:\nAnn\n\nYour mail:\nann@example.com\n\nYour note:\nLine one\nLine two\n\nYour news:\nYes',
    )
    expect(email.subject).toBe('New submission: Contact us')
  })

  it('replies to the visitor’s email address', () => {
    expect(email.replyTo).toBe('ann@example.com')
    expect(buildEmail({ formTitle: 'x', fields, values: { mail: '' } }).replyTo).toBeUndefined()
  })

  it('marks empty answers and unticked boxes', () => {
    const empty = buildEmail({
      formTitle: 'x',
      fields,
      values: { name: '', mail: '', note: '', news: '' },
    })
    expect(empty.text).toContain('Your name:\n(not provided)')
    expect(empty.text).toContain('Your news:\nNo')
    expect(empty.html).toContain('<em>not provided</em>')
  })

  it('escapes everything a visitor typed in the HTML body, and keeps long text breaks', () => {
    const hostile = buildEmail({
      formTitle: 'x',
      fields,
      values: { name: '<img src=x onerror=alert(1)>', mail: '', note: 'a & b\n"c"', news: '' },
    })
    expect(hostile.html).not.toContain('<img')
    expect(hostile.html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(hostile.html).toContain('a &amp; b<br>&quot;c&quot;')
  })

  it('keeps a form title with line breaks on one subject line', () => {
    const { subject } = buildEmail({ formTitle: 'Hi\r\nBcc: x@y.z', fields: [], values: {} })
    expect(subject).toBe('New submission: Hi Bcc: x@y.z')
  })
})

describe('escapeHtml', () => {
  it('escapes the five special characters', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;',
    )
  })
})
