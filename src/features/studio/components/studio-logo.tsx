import { Flex, Text } from '@sanity/ui'
import type { LogoProps } from 'sanity'

import { brandColor, brandForegroundColor } from '@/config/brand'

/** The Studio's navbar logo: the site name (the config `title`) beside a small mark in the brand color. */
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
          background: brandColor,
          color: brandForegroundColor,
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
