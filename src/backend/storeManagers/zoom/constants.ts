import { join } from 'path'
import { app } from 'electron'

const zoomStorePath = join(app.getPath('userData'), 'zoom_store')
export const zoomConfigPath = join(zoomStorePath, 'config.json')
export const embedUrl = 'https://www.zoom-platform.com'
export const apiUrl = 'https://www.zoom-platform.com'
export const tokenPath = join(zoomStorePath, '.zoom.token')
