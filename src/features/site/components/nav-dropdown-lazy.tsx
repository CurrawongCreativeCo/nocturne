'use client'

import dynamic from 'next/dynamic'

/**
 * The dropdown island, downloaded only by a page whose header has a dropdown. The header is on every
 * page, so a static import puts its code in every page's scripts (the home page's JavaScript
 * budget). Still rendered on the server, so the links are in the HTML before JavaScript loads.
 */
export const NavDropdown = dynamic(() => import('./nav-dropdown').then((mod) => mod.NavDropdown))
