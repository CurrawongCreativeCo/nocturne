import { describe, expect, it } from 'vitest'

import type { LaunchData } from './launch-checklist'
import { buildLaunchView } from './launch-view'

const data: LaunchData = {
  pages: [
    { _id: 'home-id', title: 'Home', slug: 'home' },
    {
      _id: 'links-id',
      title: 'Links',
      slug: 'links',
      description: 'd',
      ogImage: 'i',
      pageBuilder: [{ _type: 'linkList' }],
    },
  ],
  navigation: [],
  identity: [],
  business: [],
}
interface State {
  status: 'prelaunch' | 'live'
  homepage: string
  visibleSlugs: string[]
}
const pre: State = { status: 'prelaunch', homepage: 'links', visibleSlugs: ['links', 'privacy'] }
const view = (audience: 'agency' | 'editor', state: State = pre) =>
  buildLaunchView({ state, audience, data, siteUrl: 'https://example.com.au' })

describe('buildLaunchView', () => {
  it('gives agency staff the status line, public pages and checklist before launch', () => {
    const model = view('agency')
    expect(model.headline).toBe('Pre-launch: visitors see Links at /')
    expect(model.tone).toBe('caution')
    expect(model.publicPages.map(({ slug }) => slug)).toEqual(['links', 'privacy'])
    expect(model.checklist.length).toBeGreaterThan(0)
    expect(model.progress.total).toBeGreaterThan(0)
    expect(model.temporaryUrl).toBe('https://example.com.au/')
    expect(model.domain).toBe('example.com.au')
  })

  it('gives a client one sentence and their links, with no checklist or page list', () => {
    const model = view('editor')
    expect(model.headline).toBe(
      'Your website is in pre-launch. Visitors see your Link page at example.com.au. Currawong will launch the full site.',
    )
    expect(model.checklist).toEqual([])
    expect(model.publicPages).toEqual([])
    expect(model.linkPage).toEqual({ id: 'links-id', title: 'Links' })
  })

  it('calls the temporary page what it is when it has no Link list', () => {
    const comingSoon: State = { ...pre, homepage: 'coming-soon', visibleSlugs: ['coming-soon'] }
    expect(view('editor', comingSoon).headline).toContain('Visitors see a temporary page at')
  })

  it('says Live, with nothing to do, once the site is live', () => {
    const live: State = { ...pre, status: 'live' }
    const agency = view('agency', live)
    expect(agency.headline).toBe('Live')
    expect(agency.tone).toBe('positive')
    expect(agency.checklist).toEqual([])
    expect(agency.publicPages).toEqual([])
    expect(view('editor', live).headline).toBe('Your website is live.')
  })

  it('has no link page when none uses a Link list', () => {
    const none = buildLaunchView({
      state: pre,
      audience: 'editor',
      data: { ...data, pages: [{ _id: 'home-id', title: 'Home', slug: 'home' }] },
      siteUrl: 'https://example.com.au',
    })
    expect(none.linkPage).toBeNull()
  })
})
