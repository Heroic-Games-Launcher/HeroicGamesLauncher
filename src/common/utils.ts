import { Runner } from './types'

export const storeMap = {
  legendary: 'epic',
  gog: 'gog',
  nile: 'amazon',
  sideload: undefined,
  zoom: 'zoom'
} as const satisfies Record<Runner, string | undefined>
