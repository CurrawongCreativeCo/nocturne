'use client'

import { Card, Stack, Text } from '@sanity/ui'

import {
  animationThumbnails,
  sectionVariantThumbnails,
  toneThumbnails,
  type Thumbnail,
} from '@/lib/sanity/schema/thumbnails/registry'

import { OptionThumbnail } from '../components/preset-picker/option-grid'

export interface SectionPreview {
  /** The section's type name: its insert-menu picture is /section-previews/<name>.svg. */
  name: string
  title: string
}

interface Group {
  id: string
  title: string
  note?: string
  items: { key: string; title: string; thumbnail: Thumbnail | string }[]
}

function groups(sections: readonly SectionPreview[]): Group[] {
  return [
    {
      id: 'layouts',
      title: 'Section layouts',
      items: Object.entries(sectionVariantThumbnails).flatMap(([type, variants]) =>
        Object.entries(variants).map(([value, thumbnail]) => ({
          key: `${type}.${value}`,
          title: `${type} · ${value}`,
          thumbnail,
        })),
      ),
    },
    {
      id: 'animations',
      title: 'Animations',
      note: 'They loop gently, and are still for visitors who ask for less motion.',
      items: Object.entries(animationThumbnails).map(([value, thumbnail]) => ({
        key: `motion.${value}`,
        title: value,
        thumbnail,
      })),
    },
    {
      id: 'tones',
      title: 'Tones',
      note: 'Live swatches from the site’s design tokens, so they do not change with the Studio scheme.',
      items: Object.entries(toneThumbnails).map(([value, thumbnail]) => ({
        key: `tone.${value}`,
        title: value,
        thumbnail,
      })),
    },
    {
      id: 'insert-menu',
      title: 'Insert menu',
      note: 'Static files, which follow the system light or dark setting rather than the Studio’s.',
      items: sections.map(({ name, title }) => ({
        key: `section.${name}`,
        title,
        thumbnail: `/section-previews/${name}.svg`,
      })),
    },
  ]
}

/**
 * Every thumbnail the preset picker can show, at the 160 px a card gives them, for review in light
 * and dark. Rendered once per scheme by the page, under that scheme's Studio theme.
 */
export function ThumbnailGallery({ sections }: { sections: readonly SectionPreview[] }) {
  return (
    <Stack gap={5} data-thumbnail-gallery="">
      {groups(sections).map((group) => (
        <Stack key={group.id} gap={3} data-thumbnail-group={group.id}>
          <Text as="h4" size={1} weight="semibold">
            {group.title}
          </Text>
          {group.note ? (
            <Text size={0} muted>
              {group.note}
            </Text>
          ) : null}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 12,
            }}
          >
            {group.items.map((item) => (
              <Card
                key={item.key}
                as="figure"
                padding={2}
                radius={3}
                border
                data-thumbnail-key={item.key}
                style={{ margin: 0 }}
              >
                <Stack gap={2}>
                  <OptionThumbnail
                    option={{ value: item.key, title: item.title, thumbnail: item.thumbnail }}
                  />
                  <Text as="figcaption" size={0}>
                    {item.title}
                  </Text>
                </Stack>
              </Card>
            ))}
          </div>
        </Stack>
      ))}
    </Stack>
  )
}
