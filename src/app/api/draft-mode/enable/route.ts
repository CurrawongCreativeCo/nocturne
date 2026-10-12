import { defineEnableDraftMode } from 'next-sanity/draft-mode'

import { client } from '@/lib/sanity/client'
import { token } from '@/lib/sanity/token'

/**
 * Called by the Presentation tool with a signed secret; validates it against
 * the dataset, sets the draft-mode cookie, and redirects to the requested page.
 */
export const { GET } = defineEnableDraftMode({
  client: client.withConfig({ token }),
})
