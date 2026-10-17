'use client'

import type { ComponentProps, ReactNode } from 'react'

import { EmbedFacade } from './embed-facade'
import { VideoFacade } from './video/video-facade'

interface Props {
  /** Props of the Video section's Play facade; `children` is its poster. */
  video?: Omit<ComponentProps<typeof VideoFacade>, 'children'>
  /** Props of the Embed section's card. */
  embed?: ComponentProps<typeof EmbedFacade>
  children?: ReactNode
}

/** Both click-to-load facades behind one lazy wrapper (`lazy-facade.tsx`): give it `video` or `embed`. */
export function Facade({ video, embed, children }: Props) {
  if (embed) return <EmbedFacade {...embed} />
  if (video) return <VideoFacade {...video}>{children}</VideoFacade>
  return null
}
