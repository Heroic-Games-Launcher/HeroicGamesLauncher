import { useTranslation } from 'react-i18next'
import { Modal, ModalContent, ModalHeader } from 'frontend/components/UI/Modal'
import {
  CustomWineProton,
  DownloadProtonToSteam
} from 'frontend/screens/Settings/components'
import SettingsContext from 'frontend/screens/Settings/SettingsContext'
import useSettingsContext from 'frontend/hooks/useSettingsContext'
import { UpdateComponent } from 'frontend/components/UI'

interface Props {
  onClose: () => void
}

export default function WineManagerSettingsModal({ onClose }: Props) {
  const { t } = useTranslation()
  const contextValues = useSettingsContext({ appName: 'default' })

  if (!contextValues) {
    return <UpdateComponent />
  }

  return (
    <SettingsContext.Provider value={contextValues}>
      <Modal onClose={onClose} showCloseButton={true}>
        <ModalHeader>
          {t('wine.manager.settings', 'Wine Manager Settings')}
        </ModalHeader>
        <ModalContent className="wineManagerSettingsContent">
          <div className="wineSettingsModalWrapper">
            <CustomWineProton />
            <DownloadProtonToSteam />
          </div>
        </ModalContent>
      </Modal>
    </SettingsContext.Provider>
  )
}
