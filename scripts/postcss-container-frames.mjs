/**
 * PostCSS plugin for the style guide's width frames (README, "Style guide"). Tailwind's `sm:`, `md:`
 * and `lg:` variants are viewport media queries, so a 375 px box on a wide screen would still lay
 * its content out for desktop. For every width media query this plugin:
 *
 *  1. adds the same rules as a query on the `styleguide` container, which only matches inside a
 *     frame (`container: styleguide / inline-size`), and
 *  2. wraps the original rules in `@container not style(--sg-frame: 1)`, so inside a frame the
 *     viewport no longer decides the layout. The frame sets `--sg-frame: 1`; it inherits to
 *     everything in it, and nothing outside a frame has it, so the rest of the site is unchanged.
 *
 * It runs only where the style guide can be opened (development, preview and E2E_GALLERY builds).
 * Live production builds, including self-hosted ones, leave out these extra rules.
 */

/** `(width >= 48rem)`, `(min-width: 48rem)`, `(width < 40rem)`: a single width condition, nothing else. */
const WIDTH_CONDITION =
  /^\(\s*(?:(?:min-|max-)?width\s*(?::|>=|<=|<|>)\s*[\d.]+(?:rem|em|px))\s*\)$/

export const FRAME_CONTAINER = 'styleguide'
export const FRAME_PROPERTY = '--sg-frame'

/** Match the environments where the style guide can be available (src/lib/styleguide-access.ts). */
export const includeContainerFrames = (env) =>
  env.NODE_ENV === 'development' || env.E2E_GALLERY === '1' || env.VERCEL_ENV === 'preview'

/**
 * `include` limits the plugin to stylesheets whose path matches it (the site's own, not Studio's
 * bundled CSS); without it every stylesheet is rewritten.
 *
 * @type {import('postcss').PluginCreator<{ include?: RegExp }>}
 */
const containerFrames = ({ include } = {}) => ({
  postcssPlugin: 'postcss-container-frames',
  Once(root, { AtRule }) {
    if (include && !include.test(root.source?.input.file ?? '')) return
    const queries = []
    root.walkAtRules('media', (atRule) => {
      if (WIDTH_CONDITION.test(atRule.params.trim())) queries.push(atRule)
    })

    for (const media of queries) {
      const condition = media.params.trim()

      const inFrame = new AtRule({ name: 'container', params: `${FRAME_CONTAINER} ${condition}` })
      const outsideFrame = new AtRule({
        name: 'container',
        params: `not style(${FRAME_PROPERTY}: 1)`,
      })
      for (const node of [...(media.nodes ?? [])]) {
        inFrame.append(node.clone())
        outsideFrame.append(node)
      }
      media.append(outsideFrame)
      media.after(inFrame)
      // A media query nested in a rule (Tailwind's output) keeps its place: the copy is a sibling.
    }
  },
})
containerFrames.postcss = true

export default containerFrames
