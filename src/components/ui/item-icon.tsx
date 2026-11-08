import { stegaClean } from 'next-sanity'

import { BadgeIcon } from '@/components/ui/badge-icon'
import { IconContainer } from '@/components/ui/icon-container'
import { SanityImage } from '@/components/ui/sanity-image'
import type { IconDesign, OwnIcon } from '@/lib/sanity/surface-options'

/** A set icon with nothing chosen: the glyph on its own, in the accent, in the picture's box. */
const SET_ICON_OWN: OwnIcon = {
  shape: 'plain',
  background: 'bg-surface-alt',
  border: 'ring-1 ring-inset ring-line',
  colour: 'text-accent-text',
}

type Picture = Parameters<typeof SanityImage>[0]['image']

/**
 * A card's or step's icon (task 158): the set icon if one is chosen, in the shared container, else
 * the uploaded icon or image, drawn whole as it always was. So the set icon wins when both are
 * stored, and content that never chose one renders exactly as before.
 */
export function ItemIcon({
  name,
  image,
  design,
}: {
  name?: string | null
  image?: Picture
  design: IconDesign
}) {
  const setIcon = stegaClean(name)
  if (setIcon) {
    return (
      <IconContainer design={design} own={SET_ICON_OWN} size="mb-4 size-12" keepBox>
        <BadgeIcon name={setIcon} className="size-6" />
      </IconContainer>
    )
  }
  return (
    <SanityImage
      image={image}
      alt=""
      width={48}
      height={48}
      className="mb-4 size-12 object-contain"
    />
  )
}
