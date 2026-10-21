import { Inter, Newsreader } from 'next/font/google'

// Imported only by Studio and its preview. Apply families through the UI 4 theme, never classes.
const inter = Inter({ subsets: ['latin'], display: 'swap' })
const newsreader = Newsreader({ subsets: ['latin'], display: 'swap', style: 'normal' })

export const studioFontFamilies = {
  interface: inter.style.fontFamily,
  heading: newsreader.style.fontFamily,
}
