import { describe, expect, it } from 'vitest'

import { validateSubmission } from './validate'
import type { FormFieldDefinition } from '../types'

const field = (
  name: string,
  type: FormFieldDefinition['type'],
  extra: Partial<FormFieldDefinition> = {},
): FormFieldDefinition => ({
  _key: name,
  label: name.charAt(0).toUpperCase() + name.slice(1),
  name,
  type,
  required: false,
  options: null,
  ...extra,
})

const validate = (fields: FormFieldDefinition[], input: Record<string, unknown>) =>
  validateSubmission(fields, new Map(Object.entries(input)))

describe('required fields', () => {
  it('rejects empty and whitespace-only answers, naming the field', () => {
    const fields = [
      field('name', 'text', { required: true }),
      field('bio', 'textarea', { required: true }),
    ]
    const { errors } = validate(fields, { name: '   ', bio: '' })
    expect(errors).toEqual({ name: 'Name is required.', bio: 'Bio is required.' })
  })

  it('treats a missing input like an empty one', () => {
    expect(validate([field('name', 'text', { required: true })], {}).errors).toEqual({
      name: 'Name is required.',
    })
  })

  it('lets optional fields stay empty', () => {
    const { errors, values } = validate([field('name', 'text'), field('mail', 'email')], {})
    expect(errors).toEqual({})
    expect(values).toEqual({ name: '', mail: '' })
  })
})

describe('value cleaning', () => {
  it('trims, and keeps line breaks only in long text', () => {
    const { values } = validate([field('note', 'textarea'), field('name', 'text')], {
      note: '  one\r\ntwo  ',
      name: '  Ann ',
    })
    expect(values).toEqual({ note: 'one\ntwo', name: 'Ann' })
  })

  it('only returns fields the form defines', () => {
    const { values } = validate([field('name', 'text')], { name: 'Ann', extra: 'injected' })
    expect(values).toEqual({ name: 'Ann' })
  })
})

describe('types', () => {
  it('accepts and rejects email addresses', () => {
    const fields = [field('mail', 'email')]
    expect(validate(fields, { mail: 'ann@example.com' }).errors).toEqual({})
    for (const bad of ['ann', 'ann@', 'ann@example', 'a nn@example.com', 'a@b@c.com']) {
      expect(validate(fields, { mail: bad }).errors.mail, bad).toMatch(/must be an email address/)
    }
  })

  it('accepts and rejects phone numbers', () => {
    const fields = [field('phone', 'tel')]
    for (const good of ['+61 400 000 000', '(02) 9999 0000', '0400-000-000']) {
      expect(validate(fields, { phone: good }).errors, good).toEqual({})
    }
    for (const bad of ['call me', '1234', '+1 2345 6789 0123 4567', '12;DROP']) {
      expect(validate(fields, { phone: bad }).errors.phone, bad).toMatch(/must be a phone number/)
    }
  })

  it('only accepts a select value the form offers', () => {
    const fields = [field('topic', 'select', { options: ['Sales', 'Support'], required: true })]
    expect(validate(fields, { topic: 'Sales' }).errors).toEqual({})
    expect(validate(fields, { topic: 'Hacking' }).errors.topic).toMatch(/Choose one of the options/)
    expect(validate(fields, { topic: '' }).errors.topic).toBe('Topic is required.')
  })

  it('reads a checkbox as ticked only for "on"', () => {
    const fields = [field('terms', 'checkbox', { required: true })]
    expect(validate(fields, { terms: 'on' })).toEqual({ values: { terms: 'on' }, errors: {} })
    expect(validate(fields, {}).errors.terms).toMatch(/Tick the box/)
    expect(validate(fields, { terms: 'yes' }).errors.terms).toMatch(/Tick the box/)
    expect(validate([field('news', 'checkbox')], {}).errors).toEqual({})
  })
})

describe('hostile input', () => {
  it('rejects values over the length limit', () => {
    expect(validate([field('name', 'text')], { name: 'x'.repeat(201) }).errors.name).toMatch(/200/)
    expect(validate([field('note', 'textarea')], { note: 'x'.repeat(5000) }).errors).toEqual({})
    expect(validate([field('note', 'textarea')], { note: 'x'.repeat(5001) }).errors.note).toMatch(
      /5000/,
    )
  })

  it('rejects line breaks outside long text, so nothing can inject a header or a row', () => {
    expect(validate([field('name', 'text')], { name: 'Ann\nBcc: x@y.z' }).errors.name).toMatch(
      /single line/,
    )
    expect(
      validate([field('mail', 'email')], { mail: 'a@b.co\r\nBcc: x@y.z' }).errors.mail,
    ).toBeTruthy()
  })

  it('rejects control characters', () => {
    expect(validate([field('note', 'textarea')], { note: 'a\u0000b' }).errors.note).toMatch(
      /aren’t allowed/,
    )
  })

  it('rejects files and other non-text values', () => {
    const file = new File(['x'], 'x.txt')
    expect(validate([field('name', 'text')], { name: file }).errors.name).toMatch(/must be text/)
  })
})
