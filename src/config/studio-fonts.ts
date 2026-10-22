import { Inter, Newsreader } from 'next/font/google'

// Imported only by Studio and its preview. Apply families through the UI 4 theme, never classes.
// CSS loads these when used; preloading here leaks the CMS heading font into public route hints.
const inter = Inter({ subsets: ['latin'], display: 'swap', preload: false })
const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  style: 'normal',
  preload: false,
})

export const studioFontFamilies = {
  interface: inter.style.fontFamily,
  heading: newsreader.style.fontFamily,
}
