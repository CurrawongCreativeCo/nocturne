import '@/styles/globals.css'

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

import { siteUrl } from '@/config/env'

/** Title, description and share image defaults come from Site settings, in (site)/layout.tsx. */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
}

/**
 * Brand font: self-hosted at build time by next/font (no request to Google from visitors),
 * with size-adjusted fallbacks so text doesn't shift when it loads. To change it, swap
 * `Inter` for any Google font (or `next/font/local`) and keep `variable: '--font-inter'`.
 */
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

/** Bare document shell shared by the site and the embedded Studio. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-dvh flex-col bg-white font-sans text-gray-950 antialiased">
        {children}
      </body>
    </html>
  )
}
