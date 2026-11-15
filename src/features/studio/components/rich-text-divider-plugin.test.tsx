// @vitest-environment jsdom
import { defineSchema, EditorProvider, useEditor, type Editor } from '@portabletext/editor'
import { EventListenerPlugin } from '@portabletext/editor/plugins'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { writeClientViewPreview } from '@/lib/sanity/roles'

import { RichTextDividerPlugins } from './rich-text-divider-plugin'
import { DIVIDER_BLOCKED_TITLE } from '../utils/rich-text-divider'

const state = vi.hoisted(() => ({
  user: { roles: [{ name: 'administrator' }] },
  push: vi.fn(),
}))
vi.mock('sanity', () => ({ useCurrentUser: () => state.user }))
vi.mock('@sanity/ui/toast', () => ({ useToast: () => ({ push: state.push }) }))

/**
 * The plugin the Rich text body mounts through Sanity's per-field Portable Text hook: who gets the guard.
 * Agency staff get none; everyone else does, including agency staff who switch on the client-view preview.
 * The Studio's switch reloads the page, so each audience here is a fresh mount, as in the Studio.
 */

const rule = { _type: 'decorativeDivider', _key: 'd1', style: 'line' }
const para = {
  _type: 'block',
  _key: 'a',
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: 'as', text: 'One', marks: [] }],
}
let root: Root | undefined
beforeEach(() => {
  state.push.mockClear()
  writeClientViewPreview(false)
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  writeClientViewPreview(false)
})

async function mount() {
  const held: { editor?: Editor; ready: boolean; defaults: number } = { ready: false, defaults: 0 }
  const Grab = () => {
    const found = useEditor()
    useEffect(() => {
      held.editor = found
    }, [found])
    return null
  }
  const element = document.createElement('div')
  document.body.appendChild(element)
  root = createRoot(element)
  await act(async () => {
    root?.render(
      createElement(
        EditorProvider,
        {
          initialConfig: {
            schemaDefinition: defineSchema({
              styles: [{ name: 'normal' }],
              blockObjects: [{ name: 'decorativeDivider' }],
            }),
            initialValue: [para] as never,
          },
        },
        createElement(Grab),
        createElement(EventListenerPlugin, {
          on: (event: { type: string }) => {
            if (event.type === 'ready') held.ready = true
          },
        }),
        createElement(RichTextDividerPlugins, {
          renderDefault: () => {
            held.defaults += 1
            return null
          },
          plugins: {},
        } as never),
      ),
    )
    await Promise.resolve()
  })
  for (let tries = 0; tries < 50 && !held.ready; tries += 1) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })
  }
  const live = held.editor
  if (!live || !held.ready) throw new Error('The editor did not become ready.')
  return {
    dividers: () =>
      live.getSnapshot().context.value.filter((block) => block._type !== 'block').length,
    insert: async () => {
      await act(async () => {
        live.send({
          type: 'insert.block',
          block: { ...rule, _key: 'n1' },
          placement: 'after',
          select: 'end',
        } as never)
        await new Promise((resolve) => setTimeout(resolve, 20))
      })
    },
    defaultPlugins: () => held.defaults,
  }
}

describe('the Rich text body’s divider plugin', () => {
  it('lets agency staff insert a divider, with no message', async () => {
    const editor = await mount()
    await editor.insert()
    expect(editor.dividers()).toBe(1)
    expect(state.push).not.toHaveBeenCalled()
  })

  it('still renders Sanity’s own plugins for everyone', async () => {
    expect((await mount()).defaultPlugins()).toBe(1)
    act(() => root?.unmount())
    state.user = { roles: [{ name: 'editor' }] }
    expect((await mount()).defaultPlugins()).toBe(1)
    state.user = { roles: [{ name: 'administrator' }] }
  })

  it('stops a client inserting one, and says why', async () => {
    state.user = { roles: [{ name: 'editor' }] }
    const editor = await mount()
    await editor.insert()
    expect(editor.dividers()).toBe(0)
    expect(state.push).toHaveBeenCalledTimes(1)
    expect(state.push.mock.calls[0]?.[0]).toMatchObject({
      status: 'info',
      title: DIVIDER_BLOCKED_TITLE,
    })
    state.user = { roles: [{ name: 'administrator' }] }
  })

  it('treats a contributor the same', async () => {
    state.user = { roles: [{ name: 'contributor' }] }
    const editor = await mount()
    await editor.insert()
    expect(editor.dividers()).toBe(0)
    state.user = { roles: [{ name: 'administrator' }] }
  })

  it('gives agency staff the client’s guard while they preview the client view, and back again', async () => {
    writeClientViewPreview(true)
    const previewing = await mount()
    await previewing.insert()
    expect(previewing.dividers()).toBe(0)
    expect(state.push).toHaveBeenCalledTimes(1)

    act(() => root?.unmount())
    writeClientViewPreview(false)
    const back = await mount()
    await back.insert()
    expect(back.dividers()).toBe(1)
  })
})
