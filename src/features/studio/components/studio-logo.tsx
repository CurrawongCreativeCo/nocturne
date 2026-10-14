import { Flex, Text } from '@sanity/ui'
import type { LogoProps } from 'sanity'

import { studioBrand } from '@/config/studio-brand/client'

/** The Studio's navbar logo: the site name (the config `title`) beside a small mark in the CMS brand's accent (studio-brand.json, else Currawong's; not the public design tokens). */
export function StudioLogo({ title }: LogoProps) {
  return (
    <Flex align="center" gap={2}>
      <span
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 24,
          height: 24,
          borderRadius: 6,
          background: studioBrand.light.accentFill,
          color: studioBrand.light.onAccent,
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {title.trim().charAt(0).toUpperCase()}
      </span>
      <Text weight="semibold">{title}</Text>
    </Flex>
  )
}
