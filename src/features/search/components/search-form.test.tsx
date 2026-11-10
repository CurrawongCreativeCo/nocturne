import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { ctaClassName } from '@/components/ui/button-style'

import { SearchForm } from './search-form'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))

describe('the search form’s button (task 148)', () => {
  const html = renderToStaticMarkup(<SearchForm />)

  it('takes the shared main-button style, so the site-wide Buttons choices reach it', () => {
    const button = /<button[^>]*>/.exec(html)?.[0] ?? ''
    expect(button).toContain(`class="${ctaClassName('light')}"`)
    expect(button).toContain('cta-fill')
    expect(button).toContain('cta-primary-depth')
  })

  it('is still a plain GET form with a submit button and the same label', () => {
    expect(html).toContain('type="submit"')
    expect(html).toContain('>Search</button>')
    expect(html).toContain('name="q"')
    expect(html).toMatch(/<form[^>]*method="get"/i)
  })
})
