import '@/styles/globals.css'

import type { Metadata } from 'next'

import { siteUrl } from '@/config/env'

/** Title, description and share image defaults come from Site settings, in (site)/layout.tsx. */
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
}

/** Bare document shell shared by the site and the embedded Studio. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col bg-white font-sans text-gray-950 antialiased">{children}</body>
    </html>
  )
}
