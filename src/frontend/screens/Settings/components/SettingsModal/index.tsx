import React, { useContext, useEffect, useState } from 'react'
import { AppSettings, GameInfo } from 'common/types'
import { UpdateComponent } from 'frontend/components/UI'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import ContextProvider from 'frontend/state/ContextProvider'
import { GamesSettings } from '../../sections'
import { writeConfig } from 'frontend/helpers'
import SettingsContext from '../../SettingsContext'
import { SettingsContextType } from 'frontend/types'

type Props = {
  gameInfo: GameInfo
}

function SettingsModal({ gameInfo }: Props) {
  const { setIsSettingsModalOpen, platform } = useContext(ContextProvider)

  const [title, setTitle] = useState('')

  const [currentConfig, setCurrentConfig] = useState<Partial<AppSettings>>({})

  const { app_name: appName, runner } = gameInfo
  const isLinux = platform === 'linux'
  const isMac = platform === 'darwin'
  const isMacNative = isMac && (gameInfo?.is_mac_native || false)
  const isLinuxNative = isLinux && (gameInfo?.is_linux_native || false)

  // Load Heroic's or game's config, only if not loaded already
  useEffect(() => {
    const getSettings = async () => {
      const config = await window.api.requestGameSettings(appName)
      setCurrentConfig(config)

      setTitle(gameInfo?.title ?? appName)
    }
    getSettings()
  }, [appName])

  if (!title) {
    return <UpdateComponent />
  }

  // create setting context functions
  const contextValues: SettingsContextType = {
    getSetting: (key, fallback) => currentConfig[key] ?? fallback,
    setSetting: (key, value) => {
      const currentValue = currentConfig[key]
      if (currentValue !== undefined || currentValue !== null) {
        const noChange = JSON.stringify(value) === JSON.stringify(currentValue)
        if (noChange) return
      }
      setCurrentConfig({ ...currentConfig, [key]: value })
      writeConfig({ appName, config: { ...currentConfig, [key]: value } })
    },
    config: currentConfig,
    isDefault: false,
    appName,
    runner,
    gameInfo,
    isLinuxNative,
    isMacNative
  }

  return (
    <Dialog
      onClose={() => setIsSettingsModalOpen(false)}
      showCloseButton
      className={'InstallModal__dialog'}
    >
      <DialogHeader onClose={() => setIsSettingsModalOpen(false)}>
        {title}
      </DialogHeader>
      <DialogContent>
        <SettingsContext.Provider value={contextValues}>
          <GamesSettings />
        </SettingsContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
