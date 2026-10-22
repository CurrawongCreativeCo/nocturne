import { defineQuery } from 'next-sanity'

/** Studio upload validation only; public frame URLs stay in the existing page queries. */
export const FRAME_PICTURE_ASSET_QUERY = defineQuery(/* groq */ `
  *[_type == "sanity.imageAsset" && _id == $id][0]{
    mimeType,
    size,
    "hasAlpha": metadata.hasAlpha,
    "width": metadata.dimensions.width,
    "height": metadata.dimensions.height
  }
`)
