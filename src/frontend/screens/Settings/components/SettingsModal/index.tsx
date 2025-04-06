import React, { useMemo } from 'react'
import { GameInfo } from 'common/types'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import { GamesSettings } from '../../sections'
import SettingsContext from '../../SettingsContext'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import LogSettings from '../../sections/LogSettings'
import './index.scss'
import { useTranslation } from 'react-i18next'
import { SettingsContextType } from 'frontend/types'
import CategorySettings from '../../sections/CategorySettings'
import { useShallowGlobalState } from 'frontend/state/GlobalStateV2'

export type GameSettingsModalType = 'settings' | 'log' | 'category'

type Props = {
  gameInfo: GameInfo
  type: GameSettingsModalType
}

function SettingsModal({ gameInfo, type }: Props) {
  const { t } = useTranslation()
  const { closeSettingsModal } = useShallowGlobalState('closeSettingsModal')

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
      onClose={() => closeSettingsModal()}
      showCloseButton
      className={'InstallModal__dialog'}
    >
      <DialogHeader onClose={() => closeSettingsModal()}>
        {`${title} (${titleType})`}
      </DialogHeader>
      <DialogContent className="settingsDialogContent">
        <SettingsContext.Provider value={contextValues}>
          {type === 'settings' && <GamesSettings />}
          {type === 'log' && <LogSettings />}
          {type === 'category' && <CategorySettings />}
        </SettingsContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsModalWrapper() {
  const { settingsModalProps } = useShallowGlobalState('settingsModalProps')

  if (!settingsModalProps.isOpen) {
    return <></>
  }

  return <SettingsModal {...settingsModalProps} />
}
