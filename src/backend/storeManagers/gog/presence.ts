import { app } from 'electron'
import { logError, logInfo, LogPrefix } from 'backend/logger/logger'
import { axiosClient } from 'backend/utils'
import { GOGUser } from './user'
import { isOnline } from 'backend/online_monitor'
import { GlobalConfig } from 'backend/config'

interface PresencePayload {
  application_type: string
  force_update: boolean
  presence: 'online' | 'offline'
  version: string
  game_id?: string
}

let CURRENT_GAME = ''
let interval: NodeJS.Timeout

function setCurrentGame(game: string) {
  CURRENT_GAME = game
}

async function setPresence() {
  try {
    const { disablePlaytimeSync } = GlobalConfig.get().getSettings()
    if (disablePlaytimeSync || !GOGUser.isLoggedIn() || !isOnline()) return
    const credentials = await GOGUser.getCredentials()
    if (!credentials) return

    if (!interval) {
      interval = setInterval(setPresence, 5 * 60 * 1000)
    }

    const payload: PresencePayload = {
      application_type: 'Heroic Games Launcher',
      force_update: false,
      presence: 'online',
      version: app.getVersion(),
      game_id: undefined
    }

    if (CURRENT_GAME !== '') {
      payload.game_id = CURRENT_GAME
    }

    const response = await axiosClient.post(
      `https://presence.gog.com/users/${credentials.user_id}/status`,
      payload,
      { headers: { Authorization: `Bearer ${credentials.access_token}` } }
    )
    if (response.status === 204) {
      logInfo('GOG presence set', LogPrefix.Gog)
    }
  } catch (e) {
    logError(['Failed to set gog presence', e], LogPrefix.Gog)
  }
}

async function deletePresence() {
  try {
    if (!GOGUser.isLoggedIn() || !isOnline()) return
    const credentials = await GOGUser.getCredentials()
    if (!credentials) {
      return
    }
    clearInterval(interval)
    const response = await axiosClient.delete(
      `https://presence.gog.com/users/${credentials.user_id}/status`,
      { headers: { Authorization: `Bearer ${credentials.access_token}` } }
    )
    if (response.status === 204) {
      logInfo('GOG presence deleted', LogPrefix.Gog)
    }
  } catch (e) {
    logError(['Failed to delete gog presence', e], LogPrefix.Gog)
  }
}

export default {
  setCurrentGame,
  setPresence,
  deletePresence
}
