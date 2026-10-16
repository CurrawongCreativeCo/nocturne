import { CUSTOM_FRAME_MAX_BYTES } from '@/lib/sanity/image-design-options'

/**
 * Checks an uploaded frame before it can be published. The site never inlines it (it is a CSS mask
 * loaded as an image, which cannot run a script), so these checks keep the library tidy and the file
 * safe to open on its own as well: an SVG with a viewBox, small, with nothing active in it.
 * Returns the problem in plain words, or true.
 */
export function checkFrameSvg(source: string, bytes: number): string | true {
  if (bytes > CUSTOM_FRAME_MAX_BYTES) {
    return `This file is ${Math.ceil(bytes / 1024)} KB. Frames must be under ${CUSTOM_FRAME_MAX_BYTES / 1024} KB: simplify the paths and export again.`
  }
  // Ignore the XML declaration, doctype and comments in front of the root element.
  const root = /<svg\b[^>]*>/i.exec(source.replace(/<!--[\s\S]*?-->/g, ''))
  if (!root) return 'This is not an SVG file. Upload an .svg exported from your design tool.'
  if (!/\sviewBox\s*=\s*["'][^"']+["']/i.test(root[0])) {
    return 'This SVG has no viewBox, so it cannot scale with the picture. Export it again with the viewBox kept (in Illustrator: "Responsive"; in Figma: leave width and height unchecked).'
  }
  if (/<script\b|<foreignObject\b|\son[a-z]+\s*=|javascript:/i.test(source)) {
    return 'This SVG contains scripts or embedded content. Export a plain vector shape instead.'
  }
  return true
}
