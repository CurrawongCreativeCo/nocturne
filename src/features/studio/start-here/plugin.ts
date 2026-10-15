import { HomeIcon } from '@sanity/icons/Home'
import { definePlugin } from 'sanity'

import { StartHereTool } from './components/start-here-tool'

/** Studio tool that opens first for clients: quick actions, recent changes and things to check. */
export const startHere = definePlugin({
  name: 'start-here',
  tools: [
    {
      name: 'start-here',
      title: 'Start here',
      icon: HomeIcon,
      component: StartHereTool,
    },
  ],
})
