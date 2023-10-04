import React, { useContext, useMemo } from 'react'
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
import CategorySettings from '../../sections/CategorySettings'

type Props = {
  gameInfo: GameInfo
  type: 'settings' | 'log' | 'category'
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

  const titleType = useMemo(() => {
    const titleTypeLiterals = {
      settings: t('Settings', 'Settings'),
      log: t('settings.navbar.log', 'Log'),
      category: 'Categories'
    }

    return titleTypeLiterals[type]
  }, [type])

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
        {`${title} (${titleType})`}
      </DialogHeader>
      <DialogContent className="settingsDialogContent">
        <SettingsContext.Provider value={contextValues}>
          {type === 'settings' && <GamesSettings useDetails />}
          {type === 'log' && <LogSettings />}
          {type === 'category' && <CategorySettings />}
        </SettingsContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
