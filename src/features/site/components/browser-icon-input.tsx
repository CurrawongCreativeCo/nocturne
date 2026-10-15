import { Stack } from '@sanity/ui'
import { useFormValue, type ObjectInputProps } from 'sanity'

import { dataset, projectId } from '@/config/env'

import { BrowserIconPreview } from './browser-icon-preview'
import { browserIconUrl, type IconBackground, type IconPadding } from '../utils/browser-icon'

interface BrowserIconValue {
  choice?: 'default' | 'upload' | 'logo'
  image?: { asset?: { _ref?: string } }
  padding?: IconPadding
  background?: IconBackground
}

/** The default icon, served by Next.js from src/app. */
const DEFAULT_SOURCES = { size16: '/icon.png', size32: '/icon.png', size180: '/apple-icon.png' }

/** The Browser icon fields, then a preview built from the same URLs the site uses. */
export function BrowserIconInput(props: ObjectInputProps) {
  const value: BrowserIconValue = props.value ?? {}
  const siteName = (useFormValue(['title']) as string | undefined) || 'Your site'
  const image = value.image?.asset?._ref ? value.image : undefined
  const custom = value.choice !== undefined && value.choice !== 'default'

  const sources =
    custom && image
      ? Object.fromEntries(
          (['size16', 'size32', 'size180'] as const).map((key) => [
            key,
            browserIconUrl(image, Number(key.slice(4)), value, { projectId, dataset }),
          ]),
        )
      : DEFAULT_SOURCES

  return (
    <Stack gap={4}>
      {props.renderDefault(props)}
      <BrowserIconPreview
        siteName={siteName}
        sources={sources as typeof DEFAULT_SOURCES}
        note={
          custom && !image
            ? 'No picture yet, so the default icon is showing. Add one above and it will appear here.'
            : undefined
        }
      />
    </Stack>
  )
}
