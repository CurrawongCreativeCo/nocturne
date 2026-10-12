import '@/styles/globals.css'

import type { Metadata } from 'next'

import { siteUrl } from '@/config/env'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { template: '%s | Site', default: 'Site' },
}

/** Bare document shell shared by the site and the embedded Studio. */
export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en">
      <body className="bg-white font-sans text-gray-950 antialiased">{children}</body>
    </html>
  )
}
