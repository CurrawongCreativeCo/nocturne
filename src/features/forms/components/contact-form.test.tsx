import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ctaClassName } from '@/components/ui/button-style'

import { ContactForm } from './contact-form'

vi.mock('../api/submit-form', () => ({ submitForm: vi.fn() }))

const html = renderToStaticMarkup(
  <ContactForm
    formId="form-1"
    title="Contact"
    headingId="h"
    submitLabel="Send message"
    fields={[
      { key: 'a', label: 'Email', name: 'email', type: 'email', required: true, options: [] },
    ]}
    check={{ kind: 'test' }}
  />,
)
const button = /<button[^>]*>/.exec(html)?.[0] ?? ''

describe('the contact form’s submit button (task 148)', () => {
  it('takes the shared main-button style, so the site-wide Buttons choices reach it', () => {
    expect(button).toContain(`class="${ctaClassName('light')}"`)
    expect(button).toContain('cta-fill')
    expect(button).toContain('cta-primary-depth')
  })

  it('keeps its submit behaviour and accessibility: a submit button, its label, a live status', () => {
    expect(button).toContain('type="submit"')
    expect(button).toContain('aria-disabled="false"')
    expect(html).toContain('>Send message</button>')
    expect(html).toContain('role="status"')
  })

  it('keeps the form posting to its action, with the same field and check', () => {
    expect(html).toContain('name="email"')
    expect(html).toContain('name="cf-turnstile-response"')
  })
})
