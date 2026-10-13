import { connection } from 'next/server'

import { postPath, slugToPath } from '@/config/paths'
import { siteUrl } from '@/config/site-url'
import { getIndexablePosts } from '@/features/blog/api/get-posts'
import { getIndexablePages } from '@/features/pages/api/get-page'
import { getSettings } from '@/features/site/api/get-settings'
import { buildLlmsTxt } from '@/lib/llms-txt'
import { PUBLISHED } from '@/lib/sanity/live'

/**
 * /llms.txt: the site name, description and every indexable page, then every indexable post, with meta descriptions (a post falls back to its summary), for
 * AI tools. Built from the cached Site settings and page index, so it costs no extra request and
 * updates when either changes. A 404 when Site settings turn AI crawlers off (see robots.ts).
 *
 * It renders per request (`connection()`) instead of being prerendered: a prerendered handler that
 * starts answering 404 keeps serving its last 200 copy, so switching crawlers off would not stick.
 */
export async function GET() {
  await connection()
  const [settings, pages, posts] = await Promise.all([
    getSettings(PUBLISHED),
    getIndexablePages(),
    getIndexablePosts(),
  ])
  if (settings?.allowAiCrawlers === false) return new Response('Not found', { status: 404 })

  const text = buildLlmsTxt({
    title: settings?.title || 'Site',
    description: settings?.description,
    pages: pages.map(({ slug, title, description }) => ({
      title,
      description,
      url: new URL(slugToPath(slug), siteUrl).toString(),
    })),
    posts: posts.map(({ slug, title, description }) => ({
      title,
      description,
      url: new URL(postPath(slug), siteUrl).toString(),
    })),
  })
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
