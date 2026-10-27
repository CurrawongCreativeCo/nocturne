import {
  hasProfileImageChoice,
  type ProfileImageDesignInput,
} from '@/lib/sanity/profile-image-options'

/** The parts of a Team section that decide how a list portrait is drawn. */
export interface PortraitDesigns {
  imageDesign?: object | null
  portraitDesign?: ProfileImageDesignInput | null
}

/** Whether the section's Image design names anything (`_type`, `_key` and the nulls a query returns for unset fields are not choices). */
export const hasImageDesign = (section: PortraitDesigns | null | undefined): boolean =>
  Object.entries(section?.imageDesign ?? {}).some(
    ([key, value]) => key !== '_type' && key !== '_key' && value != null && value !== '',
  )

/**
 * One picture, one design (README, "Image design"). The list's small portraits use the profile
 * picture design once it names something, unless the section already has an Image design from
 * before: that list keeps it, and the Studio shows only it, until it is cleared. Nothing set is the
 * list's original portrait. The grid and slider always use Image design.
 */
export const listUsesProfilePortrait = (section: PortraitDesigns | null | undefined): boolean =>
  !hasImageDesign(section) && hasProfileImageChoice(section?.portraitDesign)
