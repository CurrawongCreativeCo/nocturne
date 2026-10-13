import { SparklesIcon } from '@sanity/icons/Sparkles'
import { definePlugin } from 'sanity'

import { AiSettingsTool } from './ai-settings-tool'

/** Studio tool for per-editor AI Assist preferences (currently: automatic alt text). */
export const aiSettings = definePlugin({
  name: 'ai-settings',
  tools: [
    { name: 'ai-settings', title: 'AI settings', icon: SparklesIcon, component: AiSettingsTool },
  ],
})
