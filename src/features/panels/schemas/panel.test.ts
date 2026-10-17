import { describe, expect, it } from 'vitest'

import { panel } from './panel'
import { PANEL_PRESENTATIONS, type PanelPresentation } from '../utils/presentation'

const agency = { roles: [{ name: 'administrator' }] }
const client = { roles: [{ name: 'editor' }] }

type Hidden = (context: { currentUser: unknown; document: unknown }) => boolean
interface FieldShape {
  name: string
  hidden?: unknown
  options?: unknown
  initialValue?: unknown
  fieldset?: string
}
const field = (name: string) =>
  (panel.fields as FieldShape[]).find((candidate) => candidate.name === name)
const hiddenOf = (name: string) => field(name)?.hidden as Hidden
const doc = (presentation?: PanelPresentation) => ({ presentation })

describe('panel schema', () => {
  it('offers the four presentations, each with a picture, Auto first', () => {
    const list = (
      field('presentation')?.options as { list: { value: string; thumbnail: unknown }[] }
    ).list
    expect(list.map((option) => option.value)).toEqual([...PANEL_PRESENTATIONS])
    for (const option of list) expect(option.thumbnail, option.value).toBeTruthy()
    expect(field('presentation')?.initialValue).toBe('auto')
  })

  it('keeps design controls agency-only', () => {
    for (const name of ['presentation', 'slug']) {
      expect(hiddenOf(name)({ currentUser: client, document: doc() }), name).toBe(true)
      expect(hiddenOf(name)({ currentUser: agency, document: doc() }), name).toBe(false)
    }
    for (const name of ['width', 'swipeToClose']) {
      expect(hiddenOf(name)({ currentUser: client, document: doc('auto') }), name).toBe(true)
    }
  })

  it('shows Width for everything but full screen, and swipe only where there is something to swipe', () => {
    const shows = (name: string, presentation?: PanelPresentation) =>
      !hiddenOf(name)({ currentUser: agency, document: doc(presentation) })
    expect(PANEL_PRESENTATIONS.map((p) => shows('width', p))).toEqual([true, true, true, false])
    expect(PANEL_PRESENTATIONS.map((p) => shows('swipeToClose', p))).toEqual([
      true,
      false,
      true,
      false,
    ])
    // Nothing chosen yet means Auto.
    expect(shows('width')).toBe(true)
  })

  it('lists its advanced controls in one collapsed Advanced area', () => {
    for (const name of ['width', 'swipeToClose', 'slug']) {
      expect(field(name)?.fieldset, name).toBe('advanced')
    }
    const advanced = panel.fieldsets.find((fieldset) => fieldset.name === 'advanced')
    expect(advanced?.options).toMatchObject({ collapsible: true, collapsed: true })
  })

  it('asks the Studio to show which buttons open it', () => {
    expect(panel.options).toMatchObject({ usedByButtons: true })
  })
})
