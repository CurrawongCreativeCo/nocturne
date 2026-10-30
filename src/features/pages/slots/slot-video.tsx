import { stegaClean } from 'next-sanity'

import { VideoFrame } from '../components/sections/video/video-frame'
import type { SectionProps } from '../types'

type HeroSlotItem = NonNullable<SectionProps<'hero'>['data']['supporting']>[number]

interface Props {
  item: Extract<HeroSlotItem, { _type: 'slotVideo' }>
  /** The host's text is centred, so the video centres in its room too. */
  centred?: boolean
}

/**
 * The `slotVideo` block: the Video section's click-to-load player (`VideoFrame`) without the section
 * around it, so a hero or a split can hold a film. It takes the room it is given up to a comfortable
 * width, and a poster is never the page's preloaded picture (the host's own picture is). Consent is as
 * in the section: YouTube and Vimeo are not contacted until the visitor presses Play, so nothing here
 * needs the cookie banner.
 */
export function SlotVideo({ item, centred = false }: Props) {
  return (
    <div className={`w-full max-w-xl text-left ${centred ? 'mx-auto' : ''}`} data-slot-video="">
      <VideoFrame
        source={item.source}
        url={item.url}
        fileUrl={item.fileUrl}
        captionsUrl={item.captionsUrl}
        poster={item.poster}
        title={stegaClean(item.title)}
        aspectRatio={item.aspectRatio}
        sizes="(min-width: 1024px) 576px, 100vw"
      />
    </div>
  )
}
