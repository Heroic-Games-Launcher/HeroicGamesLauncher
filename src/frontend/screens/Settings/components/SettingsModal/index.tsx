import React, { useContext } from 'react'
import { GameInfo } from 'common/types'
import { UpdateComponent } from 'frontend/components/UI'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
import ContextProvider from 'frontend/state/ContextProvider'
import { GamesSettings } from '../../sections'
import SettingsContext from '../../SettingsContext'
import { SettingsContextType } from 'frontend/types'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import LogSettings from '../../sections/LogSettings'
import './index.scss'

type Props = {
  gameInfo: GameInfo
  type: 'settings' | 'log'
}

function SettingsModal({ gameInfo, type }: Props) {
  const { setIsSettingsModalOpen } = useContext(ContextProvider)

  const { app_name: appName, runner, title } = gameInfo

  if (!title) {
    return <UpdateComponent />
  }

  // create setting context functions
  const contextValues: SettingsContextType = useSettingsContext({
    appName,
    gameInfo,
    runner
  })

  return (
    <Dialog
      onClose={() => setIsSettingsModalOpen(false)}
      showCloseButton
      className={'InstallModal__dialog'}
    >
      <DialogHeader onClose={() => setIsSettingsModalOpen(false)}>
        {title}
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
