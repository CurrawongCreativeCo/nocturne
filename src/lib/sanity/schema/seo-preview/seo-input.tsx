import { Box, Card, Flex, Stack, Text } from '@sanity/ui'
import { useEffect, useState } from 'react'
import { useClient, useFormValue, type ObjectInputProps } from 'sanity'

import { apiVersion } from '@/config/env'
import { slugToPath } from '@/config/paths'
import { urlFor } from '@/lib/sanity/image'
import type { SEO_PREVIEW_SETTINGS_QUERY_RESULT } from '@/types/sanity.types'

import { SEO_PREVIEW_SETTINGS_QUERY } from './query'
import { DESCRIPTION_LIMIT, TITLE_LIMIT, truncate } from './truncate'

type Settings = SEO_PREVIEW_SETTINGS_QUERY_RESULT
type Image = NonNullable<Settings>['ogImage']

const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const

/** Truncated text shows its ellipsis, a visible "Cut off" note, and the same note for screen readers. */
function Clipped({ value, max, label }: { value: string; max: number; label: string }) {
  const { text, truncated } = truncate(value, max)
  return (
    <>
      {text}
      {truncated && (
        <>
          <span style={visuallyHidden}>
            {` (${label} truncated: ${String(value.trim().length)} characters, limit ${String(max)})`}
          </span>
          <span
            aria-hidden="true"
            style={{ marginLeft: 6, color: 'var(--card-badge-caution-fg-color)' }}
          >
            Cut off ({value.trim().length}/{max})
          </span>
        </>
      )}
    </>
  )
}

/** Fetched once per Studio session of the field; the site name and defaults rarely change. */
function useSettings() {
  const client = useClient({ apiVersion })
  const [settings, setSettings] = useState<Settings>(null)
  useEffect(() => {
    const controller = new AbortController()
    client
      .fetch(SEO_PREVIEW_SETTINGS_QUERY, {}, { signal: controller.signal })
      .then(setSettings)
      .catch(() => {
        // The preview still works without the site name; it just can't add the suffix.
      })
    return () => {
      controller.abort()
    }
  }, [client])
  return settings
}

function ogImageUrl(image: Image | undefined) {
  if (!image?.asset) return undefined
  return urlFor(image).width(1200).height(630).fit('crop').url()
}

/** Mirrors `getPageMetadata`: metaTitle falls back to the page title, then "%s | <site name>". */
export function SeoInput(props: ObjectInputProps) {
  const settings = useSettings()
  const pageTitle = useFormValue(['title']) as string | undefined
  const slug = useFormValue(['slug', 'current']) as string | undefined
  const metaTitle = useFormValue(['seo', 'metaTitle']) as string | undefined
  const metaDescription = useFormValue(['seo', 'metaDescription']) as string | undefined
  const ogImage = useFormValue(['seo', 'ogImage']) as Image | undefined

  const siteName = settings?.title || 'Site'
  const baseTitle = metaTitle || pageTitle || 'Untitled'
  const title = `${baseTitle} | ${siteName}`
  const description = metaDescription ?? settings?.description ?? ''
  const image = ogImageUrl(ogImage) ?? ogImageUrl(settings?.ogImage)

  const path = slugToPath(slug)
  const host = typeof window === 'undefined' ? '' : window.location.host
  const crumbs = [host, ...path.split('/').filter(Boolean)].filter(Boolean).join(' › ')

  return (
    <Stack gap={4}>
      {props.renderDefault(props)}

      <Card border padding={3} radius={2}>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Search result preview
          </Text>
          <Stack gap={2}>
            <Text size={1} muted style={{ overflowWrap: 'anywhere' }}>
              {crumbs}
            </Text>
            <Text size={3} weight="medium" style={{ overflowWrap: 'anywhere' }}>
              <Clipped value={title} max={TITLE_LIMIT} label="Title" />
            </Text>
            {description && (
              <Text size={1} muted style={{ overflowWrap: 'anywhere' }}>
                <Clipped value={description} max={DESCRIPTION_LIMIT} label="Description" />
              </Text>
            )}
          </Stack>
        </Stack>
      </Card>

      <Card border padding={3} radius={2}>
        <Stack gap={3}>
          <Text size={1} weight="semibold">
            Social card preview
          </Text>
          <Card border overflow="hidden" radius={2} tone="transparent">
            {image ? (
              // Decorative: the card's title and description carry the meaning.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt=""
                width={1200}
                height={630}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  aspectRatio: '1200 / 630',
                }}
              />
            ) : (
              <Flex align="center" justify="center" style={{ aspectRatio: '1200 / 630' }}>
                <Text size={1} muted>
                  No social share image
                </Text>
              </Flex>
            )}
            <Box padding={3}>
              <Stack gap={2}>
                <Text size={1} muted>
                  {host}
                </Text>
                <Text size={2} weight="semibold" style={{ overflowWrap: 'anywhere' }}>
                  {title}
                </Text>
                {description && (
                  <Text size={1} muted style={{ overflowWrap: 'anywhere' }}>
                    {description}
                  </Text>
                )}
              </Stack>
            </Box>
          </Card>
        </Stack>
      </Card>
    </Stack>
  )
}
