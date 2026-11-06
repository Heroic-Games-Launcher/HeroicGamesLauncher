import { useEffect, useState } from 'react'
import { GameInfo } from 'common/types'
import { timestampStore } from 'frontend/helpers/electronStores'
import { hasStatus } from './hasStatus'

export function hasPlaytime(gameInfo: GameInfo) {
  const { app_name: appName, runner } = gameInfo
  const [tsInfo, setTsInfo] = useState(timestampStore.get_nodefault(appName))
  const { status } = hasStatus(gameInfo)

  useEffect(() => {
    const storedInfo = timestampStore.get_nodefault(appName)
    setTsInfo(storedInfo)

    const fetchPlaytime = async () => {
      const playTime = await window.api.fetchPlaytimeFromServer(runner, appName)
      if (!playTime) {
        return
      }

      if (storedInfo?.totalPlayed) {
        if (storedInfo.totalPlayed < playTime) {
          const newInfo = { ...storedInfo, totalPlayed: playTime }
          timestampStore.set(appName, newInfo)
          setTsInfo(newInfo)
        }
        return
      }

      const newInfo = {
        firstPlayed: '',
        lastPlayed: '',
        totalPlayed: playTime
      }
      timestampStore.set(appName, newInfo)
      setTsInfo(newInfo)
    }

    fetchPlaytime()
  }, [status, appName, runner])

  return {
    totalPlayed: tsInfo?.totalPlayed,
    firstPlayed: tsInfo?.firstPlayed,
    lastPlayed: tsInfo?.lastPlayed
  }
}
