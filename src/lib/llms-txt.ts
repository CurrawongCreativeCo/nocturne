export interface LlmsPage {
  title: string
  url: string
  description?: string | null
}

/** One line of text: line breaks collapse so a value can't start a new Markdown block. */
const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

/** Link text can't contain brackets, or the link ends early. */
const linkText = (text: string) => oneLine(text).replace(/[[\]]/g, '\\$&')

/**
 * The /llms.txt Markdown (https://llmstxt.org): an H1 with the site name, a blockquote summary
 * and a list of links. Posts follow under a "Blog" heading. An entry with no description is listed without one.
 */
export function buildLlmsTxt({
  title,
  description,
  pages,
  posts = [],
}: {
  title: string
  description?: string | null
  pages: LlmsPage[]
  posts?: LlmsPage[]
}) {
  const lines = [`# ${oneLine(title)}`]
  if (description && oneLine(description)) lines.push('', `> ${oneLine(description)}`)
  const list = (items: LlmsPage[]) =>
    items.map(({ title: name, url, description: summary }) => {
      const link = `- [${linkText(name)}](${url})`
      return summary && oneLine(summary) ? `${link}: ${oneLine(summary)}` : link
    })
  if (pages.length > 0) lines.push('', ...list(pages))
  if (posts.length > 0) lines.push('', '## Blog', '', ...list(posts))
  return `${lines.join('\n')}\n`
}
