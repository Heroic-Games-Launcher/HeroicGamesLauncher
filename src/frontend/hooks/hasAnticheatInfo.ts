import { useEffect, useState } from 'react'
import { AntiCheatInfo, GameInfo } from 'common/types'

export const hasAnticheatInfo = (gameInfo: GameInfo) => {
  const [anticheatInfo, setAnticheatInfo] = useState<AntiCheatInfo | null>(null)

  useEffect(() => {
    if (
      gameInfo.runner !== 'sideload' &&
      gameInfo.title &&
      gameInfo.namespace !== undefined
    ) {
      window.api
        .getAnticheatInfo(gameInfo.namespace)
        .then((anticheatInfo: AntiCheatInfo | null) => {
          setAnticheatInfo(anticheatInfo)
        })
    }
  }, [gameInfo])

  return anticheatInfo
}
