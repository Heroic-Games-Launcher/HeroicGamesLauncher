import { Runner } from './types'

export const storeMap: { [key in Runner]: string | undefined } = {
  legendary: 'epic',
  gog: 'gog',
  nile: 'amazon',
  'humble-bundle': 'humble-bundle',
  sideload: undefined
}
