import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogContent,
  DialogHeader
} from 'frontend/components/UI/Dialog'
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
      <Dialog onClose={onClose} showCloseButton={true}>
        <DialogHeader>
          <h3>{t('wine.manager.settings', 'Wine Manager Settings')}</h3>
        </DialogHeader>
        <DialogContent className="wineManagerSettingsContent">
          <div className="wineSettingsModalWrapper">
            <CustomWineProton />
            <DownloadProtonToSteam />
          </div>
        </DialogContent>
      </Dialog>
    </SettingsContext.Provider>
  )
}
