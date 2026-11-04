import { Runner } from './types'

export const storeMap = {
  legendary: 'epic',
  gog: 'gog',
  nile: 'amazon',
  sideload: undefined,
  zoom: 'zoom',
  steam: 'steam'
} as const satisfies Record<Runner, string | undefined>

// Sentinel `Reqs.title` values for rows that aren't a Minimum/Recommended spec
export const REQS_OTHER_TITLE = '__other__'
export const REQS_NOTES_TITLE = '__notes__'
