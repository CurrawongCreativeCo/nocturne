import { stegaClean } from 'next-sanity'
import type { ReactNode } from 'react'

import { RichText } from '@/components/ui/rich-text'
import { SanityImage } from '@/components/ui/sanity-image'

import { PanelController } from './lazy-panel-controller'
import type { PanelItem } from './panel-controller'
import type { PanelBlock, PanelData, PanelFormData } from '../types'
import { assignPanelSlugs } from '../utils/panel-slug'
import { parsePresentation, parseWidth, type PanelContentKind } from '../utils/presentation'

/** Draws a form. Forms are another feature, so the route supplies it (see `renderPanels` there). */
export type RenderPanelForm = (form: PanelFormData) => ReactNode

interface Props {
  panels: PanelData[]
  renderForm?: RenderPanelForm
}

/** The kinds of content a panel holds, which its Auto presentation depends on. */
const KIND_OF: Record<PanelBlock['_type'], PanelContentKind> = {
  panelText: 'text',
  panelForm: 'form',
}

/**
 * Whether a block has something to show: a form block needs a form that still exists and a route
 * that can draw it. (Typegen can't know a reference dangles, so it types `form` as always present.)
 */
const isShowable = (renderForm?: RenderPanelForm) => (block: PanelBlock) =>
  block._type !== 'panelForm' || (Boolean(block.form) && renderForm !== undefined)

function PanelBlockView({
  block,
  renderForm,
}: {
  block: PanelBlock
  renderForm?: RenderPanelForm
}) {
  switch (block._type) {
    case 'panelText':
      return (
        <div>
          {block.image?.asset && (
            <SanityImage
              image={block.image}
              width={800}
              sizes="(min-width: 640px) 36rem, 100vw"
              loading="lazy"
              className="mb-4 h-auto w-full rounded-control"
            />
          )}
          <RichText value={block.body} className="[&>*:first-child]:mt-0" />
        </div>
      )
    case 'panelForm':
      return renderForm ? renderForm(block.form) : null
  }
}

/**
 * Renders the panels a page's buttons open, once each, as closed <dialog>s (README, "Panels"). The
 * content is built here on the server, so the HTML is complete before any JavaScript runs; the
 * controller and the overlay are the only client code, and they exist only on pages that have a
 * panel. A panel with no title or nothing to show is left out rather than opening empty.
 */
export function PanelHost({ panels, renderForm }: Props) {
  const slugs = assignPanelSlugs(
    panels.map((panel) => ({
      id: stegaClean(panel._id),
      slug: panel.slug ? stegaClean(panel.slug) : null,
      title: stegaClean(panel.title),
    })),
  )

  const items = panels.flatMap((panel): PanelItem[] => {
    const id = stegaClean(panel._id)
    const blocks = panel.content.filter(isShowable(renderForm))
    if (stegaClean(panel.title) === '' || blocks.length === 0) return []
    return [
      {
        id,
        slug: slugs.get(id) ?? 'panel',
        title: panel.title,
        presentation: parsePresentation(stegaClean(panel.presentation)),
        width: parseWidth(stegaClean(panel.width)),
        swipe: panel.swipeToClose !== false,
        kinds: [...new Set(blocks.map((block) => KIND_OF[block._type]))],
        // A form mounts when the panel first opens, not with the page.
        blocks: blocks.map((block) => ({
          key: block._key,
          deferred: block._type === 'panelForm',
          node: <PanelBlockView block={block} renderForm={renderForm} />,
        })),
      },
    ]
  })

  return items.length > 0 ? <PanelController panels={items} /> : null
}
