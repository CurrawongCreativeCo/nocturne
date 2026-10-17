'use client'

import dynamic from 'next/dynamic'

// The controller and the overlay are downloaded only when a page renders this. The route that
// draws panels is shared by every page, and a static import of the controller there lands its code
// in every page's scripts (the home page's JavaScript budget), so this thin wrapper is all that is.
export const PanelController = dynamic(() => import('./panel-controller'))
