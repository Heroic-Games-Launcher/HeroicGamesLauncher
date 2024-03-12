import { GameInfo, Runner } from 'common/types'
import { SettingsContextType } from 'frontend/types'
import { useContext } from 'react'
import ContextProvider from 'frontend/state/ContextProvider'

type Props = {
  appName: string
  gameInfo: GameInfo
  runner: Runner
}

function useSettingsContext({ appName, gameInfo, runner }: Props) {
  const { platform } = useContext(ContextProvider)

  const isDefault = appName === 'default'
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isMacNative =
    isMac &&
    (['Mac', 'osx'].includes(gameInfo?.install.platform ?? '') || false)
  const isLinuxNative =
    isLinux && (gameInfo?.install.platform === 'linux' || false)

  const contextValues: SettingsContextType = {
    isDefault,
    appName,
    runner,
    gameInfo,
    isLinuxNative,
    isMacNative
  }

  return contextValues
}

export default useSettingsContext
