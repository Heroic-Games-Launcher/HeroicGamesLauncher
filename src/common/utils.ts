import { Runner } from './types'

export const storeMap: { [key in Runner]: string | undefined } = {
  legendary: 'epic',
  gog: 'gog',
  nile: 'amazon',
  sideload: undefined,
  zoom: 'zoom',
  steam: 'steam'
}

// Sentinel `Reqs.title` values for rows that aren't a Minimum/Recommended spec
export const REQS_OTHER_TITLE = '__other__'
export const REQS_NOTES_TITLE = '__notes__'
