'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { Overlay } from '@/components/ui/overlay/overlay'
import { OVERLAY_TRIGGER_SELECTOR } from '@/config/link-actions'

import { useIsPhone } from './use-is-phone'
import { addressWithoutPanel, addressWithPanel, slugFromHash } from '../utils/panel-hash'
import {
  resolvePresentation,
  type PanelContentKind,
  type PanelPresentation,
} from '../utils/presentation'

/** A panel ready to show: everything the browser needs, with its content already built on the server. */
export interface PanelItem {
  /** The panel document's id: what a button's `data-overlay-id` names. */
  id: string
  /** The name in its `#panel-<slug>` deep link. */
  slug: string
  title: string
  presentation: PanelPresentation
  width: 'narrow' | 'medium' | 'wide'
  swipe: boolean
  kinds: PanelContentKind[]
  /** The content, in order, built on the server. `deferred` blocks mount when the panel is first opened. */
  blocks: { key: string; node: ReactNode; deferred: boolean }[]
}

/**
 * Opens the page's panels. One delegated click listener finds `[data-overlay-kind="panel"]` buttons
 * (config/link-actions.ts), cancels the click (so a button's fallback link isn't followed) and opens
 * the panel it names. `#panel-<slug>` in the address opens a panel on load, and while one is open
 * the address shows it; closing restores the address from before. Each panel is a closed <dialog>
 * in the page from the start; what is heavy inside it (a form) mounts on the first open.
 * This component and the overlay are only on pages that have a panel.
 */
export default function PanelController({ panels }: { panels: PanelItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [everOpened, setEverOpened] = useState<ReadonlySet<string>>(new Set())
  const phone = useIsPhone()

  // What the listeners (set up once) read, and the address to put back when the open panel closes.
  const panelsRef = useRef(panels)
  const openIdRef = useRef<string | null>(null)
  const restoreRef = useRef<string | null>(null)
  useEffect(() => {
    panelsRef.current = panels
  })

  const open = useCallback((id: string) => {
    const panel = panelsRef.current.find((candidate) => candidate.id === id)
    if (!panel || openIdRef.current === id) return
    // Opening one panel from another's page address (a hash change) keeps the first's saved address.
    restoreRef.current ??= addressWithoutPanel(window.location)
    window.history.replaceState(
      window.history.state,
      '',
      addressWithPanel(window.location, panel.slug),
    )
    openIdRef.current = id
    setOpenId(id)
    setEverOpened((previous) => (previous.has(id) ? previous : new Set(previous).add(id)))
  }, [])

  const close = useCallback((id: string) => {
    // A panel replaced by another reports its close late; only the open one restores the address.
    if (openIdRef.current !== id) return
    openIdRef.current = null
    setOpenId(null)
    if (restoreRef.current !== null) {
      window.history.replaceState(window.history.state, '', restoreRef.current)
      restoreRef.current = null
    }
  }, [])

  useEffect(() => {
    const openFromHash = () => {
      const slug = slugFromHash(
        window.location.hash,
        panelsRef.current.map((panel) => panel.slug),
      )
      const panel = panelsRef.current.find((candidate) => candidate.slug === slug)
      if (panel) open(panel.id)
    }

    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return
      const trigger = event.target.closest<HTMLButtonElement>(OVERLAY_TRIGGER_SELECTOR)
      if (trigger?.dataset.overlayKind !== 'panel') return
      const id = trigger.dataset.overlayId ?? ''
      if (!panelsRef.current.some((panel) => panel.id === id)) return
      // A modified click on a button with a fallback link means "in a new tab": leave it be.
      const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      if (event.button !== 0 || (modified && trigger.form)) return
      event.preventDefault()
      // Safari doesn't focus a button on click; say so, so focus has somewhere to come back to.
      trigger.focus()
      open(id)
    }

    openFromHash()
    document.addEventListener('click', onClick)
    window.addEventListener('hashchange', openFromHash)
    return () => {
      document.removeEventListener('click', onClick)
      window.removeEventListener('hashchange', openFromHash)
    }
  }, [open])

  return (
    <>
      {panels.map((panel) => (
        <Overlay
          key={panel.id}
          open={openId === panel.id}
          onClose={() => {
            close(panel.id)
          }}
          presentation={resolvePresentation({
            presentation: panel.presentation,
            phone,
            kinds: panel.kinds,
          })}
          title={panel.title}
          width={panel.width}
          swipe={panel.swipe}
        >
          <div className="space-y-6">
            {panel.blocks.map(
              (block) =>
                (!block.deferred || everOpened.has(panel.id)) && (
                  <div key={block.key}>{block.node}</div>
                ),
            )}
          </div>
        </Overlay>
      ))}
    </>
  )
}
