import { join } from 'path'
import { app } from 'electron'

export const zoomSupportPath = join(app.getPath('userData'), 'zoom_store')
export const zoomdlAuthConfig = join(zoomSupportPath, 'auth.json')

export const embedUrl = 'https://www.zoom-platform.com'
export const apiUrl = 'https://www.zoom-platform.com'
export const redirectUris = ['https://www.zoom-platform.com/account?li_token=']
export const loginSuccessUrl = 'https://www.zoom-platform.com/account?li_token='
export const tokenPath = join(zoomSupportPath, '.zoom.token')
export const cachePath = join(app.getPath('userData'), 'zoom-library.json')
