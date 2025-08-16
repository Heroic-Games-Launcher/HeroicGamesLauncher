import { addHandler, addListener } from 'backend/ipc'
import { ZoomUser } from './user'
import { LogPrefix, logError } from 'backend/logger'

import { openAuthWindow } from 'backend/utils'
import { loginSuccessUrl } from './constants'

addHandler('authZoom', () => {
  return new Promise<{ status: 'done' | 'error' }>((resolve) => {
    openAuthWindow(ZoomUser.getLoginUrl(), loginSuccessUrl, async (url: string) => {
      try {
        const result = await ZoomUser.login(url)
        resolve(result)
        return result
      } catch (error) {
        logError(['Error during Zoom authentication:', error], LogPrefix.Zoom)
        const result = { status: 'error' as const }
        resolve(result)
        return result
      }
    })
  })
})

addHandler('getZoomUserInfo', async () => {
  try {
    const userInfo = await ZoomUser.getUserDetails()
    return userInfo
  } catch (error) {
    logError(['Error getting Zoom user info:', error], LogPrefix.Zoom)
    return undefined
  }
})

addListener('logoutZoom', () => {
  ZoomUser.logout()
})
