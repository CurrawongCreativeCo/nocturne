'use client'

import { NextStudio, type NextStudioProps } from 'next-sanity/studio'
import { useMemo } from 'react'

import { studioBrand } from '@/config/studio-brand/client'
import { studioFontFamilies } from '@/config/studio-fonts'

import { buildStudioTheme } from '../theme'

/** Keep the Next font loader outside sanity.config.ts, which the schema CLI also imports. */
export function BrandedStudio({ config }: Pick<NextStudioProps, 'config'>) {
  const branded = useMemo(() => {
    const theme = buildStudioTheme(studioBrand, studioFontFamilies)
    return Array.isArray(config)
      ? config.map((workspace) => ({ ...workspace, theme }))
      : { ...config, theme }
  }, [config])
  return <NextStudio config={branded} />
}
