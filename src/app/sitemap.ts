import { getSitemap, getSitemapCount } from '@/features/pages/api/get-page'

/** One file per 45,000 pages. `/sitemap.xml` is rewritten to the first file (see next.config.ts). */
export async function generateSitemaps() {
  return Array.from({ length: await getSitemapCount() }, (_, id) => ({ id }))
}

export default async function sitemap(props: { id: Promise<string> }) {
  return getSitemap(Number(await props.id))
}
