import { getSettings } from '@/features/site/api/get-settings'
import { PUBLISHED } from '@/lib/sanity/live'
import { businessSchemaType } from '@/lib/structured-data/nodes/organization'

/**
 * The schema.org type of the site's business, from Business info (the cached settings the footer
 * already read, so no request). Location pages are typed with it, and so are the short location
 * nodes a service page carries: a feature can't read Business info, so the route passes it down.
 */
export async function getBusinessType(): Promise<string> {
  const settings = await getSettings(PUBLISHED)
  return settings?.business ? businessSchemaType(settings.business) : 'LocalBusiness'
}
