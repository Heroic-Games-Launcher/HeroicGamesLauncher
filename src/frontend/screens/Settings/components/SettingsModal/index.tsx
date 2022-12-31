import React, { useContext } from 'react'
import { GameInfo } from 'common/types'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import ContextProvider from 'frontend/state/ContextProvider'
import { GamesSettings } from '../../sections'
import SettingsContext from '../../SettingsContext'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import LogSettings from '../../sections/LogSettings'
import './index.scss'
import { useTranslation } from 'react-i18next'
import { SettingsContextType } from 'frontend/types'

type Props = {
  gameInfo: GameInfo
  type: 'settings' | 'log'
}

function SettingsModal({ gameInfo, type }: Props) {
  const { setIsSettingsModalOpen } = useContext(ContextProvider)
  const { t } = useTranslation()

  const { app_name: appName, runner, title } = gameInfo

  // create setting context functions
  const contextValues: SettingsContextType | null = useSettingsContext({
    appName,
    gameInfo,
    runner
  })

  if (!contextValues) {
    return null
  }

  return (
    <Dialog
      onClose={() => setIsSettingsModalOpen(false)}
      showCloseButton
      className={'InstallModal__dialog'}
    >
      <DialogHeader onClose={() => setIsSettingsModalOpen(false)}>
        {`${title} (${
          type === 'settings'
            ? t('Settings', 'Settings')
            : t('settings.navbar.log', 'Log')
        })`}
      </DialogHeader>
      <DialogContent className="settingsDialogContent">
        <SettingsContext.Provider value={contextValues}>
          {type === 'settings' ? <GamesSettings useDetails /> : <LogSettings />}
        </SettingsContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
