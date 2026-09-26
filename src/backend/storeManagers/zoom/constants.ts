import { join } from 'path'

import { heroicDataPath } from 'backend/constants/paths'

const zoomSupportPath = join(heroicDataPath, 'zoom_store')
export const embedUrl = 'https://www.zoom-platform.com'
export const apiUrl = 'https://www.zoom-platform.com'
export const tokenPath = join(zoomSupportPath, '.zoom.token')
