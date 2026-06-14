import { useMemo } from 'react'
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
import CategorySettings from '../../sections/CategorySettings'
import useGlobalState from 'frontend/state/GlobalStateV2'
import type { GameHandle } from 'frontend/helpers/ipc'

export type GameSettingsModalType = 'settings' | 'log' | 'category'

type Props = {
  game: GameHandle
  type: GameSettingsModalType
}

function SettingsModal({ game, type }: Props) {
  const { t } = useTranslation()
  const { closeSettingsModal } = useGlobalState.keys('closeSettingsModal')

  // create setting context functions
  const contextValues = useSettingsContext(game)

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
        {`${contextValues.gameInfo?.title} (${titleType})`}
      </DialogHeader>
      <DialogContent className="settingsDialogContent">
        <SettingsContext.Provider value={contextValues}>
          {type === 'settings' && <GamesSettings />}
          {type === 'log' && <LogSettings />}
          {type === 'category' && <CategorySettings game={game} />}
        </SettingsContext.Provider>
      </DialogContent>
    </Dialog>
  )
}

export function SettingsModalWrapper() {
  const { settingsModalProps } = useGlobalState.keys('settingsModalProps')

  if (!settingsModalProps.isOpen) {
    return <></>
  }

  return <SettingsModal {...settingsModalProps} />
}
