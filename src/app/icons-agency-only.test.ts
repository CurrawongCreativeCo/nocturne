import { describe, expect, it, vi } from 'vitest'

import { COMPONENT_SCHEMAS, lookupType } from './design-components'

vi.mock('@/config/env', () => ({
  projectId: 'e2etest1',
  dataset: 'production',
  apiVersion: '2026-10-01',
  siteLanguage: 'en',
  studioUrl: '/studio',
}))

/** Task 158: the footer's and the Team page's Icons boxes are the agency's, whatever the shared helper does. */
const user = (name: string) => ({ roles: [{ name }] })
type Hidden = (context: unknown) => boolean

describe.each([
  ['siteFooter', 'navigation', 'footerIconDesign'],
  ['teamMemberPage', 'settings', 'iconDesign'],
] as const)('the %s Icons box (%s.%s)', (id, root, key) => {
  const wrapper = COMPONENT_SCHEMAS.get(id)?.fields?.find(({ name }) => name === root)
  const field = lookupType(wrapper?.type ?? '')?.fields?.find(({ name }) => name === key)
  // The footer's own rule also asks for social icons, so the state is the one where they are on.
  const hiddenFor = (role: string) =>
    (field?.hidden as Hidden)({ currentUser: user(role), parent: { footerShowSocial: true } })

  it('exists, with a hidden rule', () => {
    expect(typeof field?.hidden).toBe('function')
  })

  it('is hidden from an Editor', () => {
    expect(hiddenFor('editor')).toBe(true)
  })

  it('is shown to an Administrator', () => {
    expect(hiddenFor('administrator')).toBe(false)
  })
})
