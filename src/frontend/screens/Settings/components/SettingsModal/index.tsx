import { useMemo } from 'react'
import { GameInfo } from 'common/types'
import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
import { GamesSettings } from '../../sections'
import SettingsContext from '../../SettingsContext'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import LogSettings from '../../sections/LogSettings'
import './index.scss'
import { useTranslation } from 'react-i18next'
import { SettingsContextType } from 'frontend/types'
import CategorySettings from '../../sections/CategorySettings'
import useGlobalState from 'frontend/state/GlobalStateV2'

export type GameSettingsModalType = 'settings' | 'log' | 'category'

type Props = {
  gameInfo: GameInfo
  type: GameSettingsModalType
  tab?: string
}

function SettingsModal({ gameInfo, type, tab }: Props) {
  const { t } = useTranslation()
  const { closeSettingsModal } = useGlobalState.keys('closeSettingsModal')

  const { app_name: appName, runner, title } = gameInfo

  // create setting context functions
  const contextValues: SettingsContextType | null = useSettingsContext({
    appName,
    gameInfo,
    runner
  })

  const titleType = useMemo(() => {
    const titleTypeLiterals = {
      settings: t('game.settings', 'Game settings'),
      log: t('settings.navbar.log', 'Log'),
      category: t('settings.navbar.categories', 'Categories')
    }

    return titleTypeLiterals[type]
  }, [type])

  if (!contextValues) {
    return null
  }

  return (
    <Modal
      onClose={() => closeSettingsModal()}
      showCloseButton
      size="lg"
      fullHeight={type === 'settings'}
    >
      <ModalHeader>
        <span className="settingsModal__title">{titleType}</span>
        <span className="settingsModal__subtitle">{title}</span>
      </ModalHeader>
      <ModalContent className="settingsDialogContent">
        <SettingsContext.Provider value={contextValues}>
          {type === 'settings' && <GamesSettings initialTab={tab} />}
          {type === 'log' && <LogSettings />}
          {type === 'category' && <CategorySettings />}
        </SettingsContext.Provider>
      </ModalContent>
    </Modal>
  )
}

export function SettingsModalWrapper() {
  const { settingsModalProps } = useGlobalState.keys('settingsModalProps')

  if (!settingsModalProps.isOpen) {
    return <></>
  }

  return <SettingsModal {...settingsModalProps} />
}
