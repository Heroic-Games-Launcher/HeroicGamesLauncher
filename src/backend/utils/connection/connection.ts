import * as axios from 'axios'
import { Notification, shell } from 'electron'
import { logError, logInfo, LogPrefix } from '../../logger/logger'
import { t } from 'i18next'
import { RpcClient } from 'common/types'
import makeClient from 'discord-rich-presence-typescript'
import { getFormattedOsName } from '..'

async function isEpicServiceOffline(
  type: 'Epic Games Store' | 'Fortnite' | 'Rocket League' = 'Epic Games Store'
) {
  const epicStatusApi = 'https://status.epicgames.com/api/v2/components.json'
  const notification = new Notification({
    title: `${type} ${t('epic.offline-notification-title', 'offline')}`,
    body: t(
      'epic.offline-notification-body',
      'Heroic will maybe not work probably!'
    ),
    urgency: 'normal',
    timeoutType: 'default',
    silent: false
  })

  try {
    const { data } = await axios.default.get(epicStatusApi)

    for (const component of data.components) {
      const { name: name, status: indicator } = component

      // found component and checking status
      if (name === type) {
        const isOffline = indicator === 'major'
        if (isOffline) {
          notification.show()
        }
        return isOffline
      }
    }

    notification.show()
    return false
  } catch (error) {
    logError(
      ['Failed to get epic service status with', error],
      LogPrefix.Backend
    )
    return false
  }
}

function constructAndUpdateRPC(gameName: string): RpcClient {
  const client = makeClient('852942976564723722')
  client.updatePresence({
    details: gameName,
    instance: true,
    largeImageKey: 'icon_new',
    large_text: gameName,
    startTimestamp: Date.now(),
    state: 'via Heroic on ' + getFormattedOsName()
  })
  logInfo('Started Discord Rich Presence', LogPrefix.Backend)
  return client
}

async function openUrlOrFile(url: string): Promise<string | void> {
  if (url.startsWith('http')) {
    return shell.openExternal(url)
  }
  return shell.openPath(url)
}

export { isEpicServiceOffline, constructAndUpdateRPC, openUrlOrFile }
