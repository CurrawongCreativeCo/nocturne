import { DesktopIcon } from '@sanity/icons/Desktop'
import type { DefaultDocumentNodeResolver } from 'sanity/structure'

import { isPreviewType } from './preview-url'
import { PreviewView } from '../components/preview-view'

/**
 * Pages and posts get an Editor and a Preview tab; the form is the one that opens. Editors can
 * split the pane to see both at once (Sanity's "Split pane right"). Every other type keeps the
 * form alone.
 *
 * Not `defaultPanes(['editor', 'preview'])`: Sanity gives the LAST pane priority when the window
 * is too narrow (a document pane needs 600px, and the Content and Pages lists take room too), so
 * at 1280px the form collapsed behind Preview. Listing Preview first would keep the form open
 * but put Preview on the left.
 */
export const defaultDocumentNode: DefaultDocumentNodeResolver = (S, { schemaType }) => {
  if (!isPreviewType(schemaType)) return S.document().views([S.view.form()])
  return S.document().views([
    S.view.form().id('editor'),
    S.view.component(PreviewView).id('preview').title('Preview').icon(DesktopIcon),
  ])
}
