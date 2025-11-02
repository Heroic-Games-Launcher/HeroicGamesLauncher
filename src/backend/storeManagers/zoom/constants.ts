import { join } from 'path'
import { app } from 'electron'

const zoomSupportPath = join(app.getPath('userData'), 'zoom_store')
export const embedUrl = 'https://www.zoom-platform.com'
export const apiUrl = 'https://www.zoom-platform.com'
export const tokenPath = join(zoomSupportPath, '.zoom.token')
