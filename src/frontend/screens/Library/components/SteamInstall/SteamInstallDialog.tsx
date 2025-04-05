import React from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { Dialog } from 'frontend/components/UI/Dialog'
import { hasProgress } from 'frontend/hooks/hasProgress'

interface SteamInstallDialogProps {
  isInstalling: boolean
  onClose: () => void
  onInstall: () => void
}

const getProgressMessage = (percent: number, t: TFunction) => {
  if (!percent) {
    return t('Please Wait', 'Please Wait')
  }
  if (percent > 95) {
    return t('Installing', 'Installing')
  }
  return t('Downloading', 'Downloading {{percent}}%', {
    percent: percent.toFixed(0)
  })
}

const SteamInstallDialog: React.FC<SteamInstallDialogProps> = ({
  isInstalling,
  onClose,
  onInstall
}) => {
  const { t } = useTranslation()
  const [progress] = hasProgress('steam')

  const percent = progress.percent ?? 0
  const downloadMessage = getProgressMessage(percent, t)

  return (
    <Dialog showCloseButton={false} onClose={onClose}>
      <div>
        <h6>{t('Steam Installation')}</h6>
      </div>
      <div>
        <ul>
          <li>
            {t(
              'Recommended specs for a better experience',
              'Recommended specs for a better experience'
            )}
            :
          </li>
          <ul>
            <li>
              {t('Apple Silicon M1 or above', 'Apple Silicon M1 or above')}
            </li>
            <li>{t('macOS 14.0 or above', 'macOS 14.0 or above')}</li>
            <li>{t('16GB of RAM', '16GB of RAM')}</li>
          </ul>
          <li>
            {t(
              'Be aware that not all games will work, and even if they do, they may not run as expected.',
              'Be aware that not all games will work, and even if they do, they may not run as expected.'
            )}
          </li>
          <li>
            {t(
              'If you wish to continue, please be patient since it can take a few minutes to finish depending on your internet connection and system configuration.',
              'If you wish to continue, please be patient since it can take a few minutes to finish depending on your internet connection and system configuration.'
            )}
          </li>
          <li>
            {t(
              'Heroic will notify you once the installation is done;',
              'Heroic will notify you once the installation is done.'
            )}
          </li>
        </ul>
      </div>
      <div className="Dialog__footer" style={{ marginTop: 'var(--space-md)' }}>
        <button onClick={onInstall} disabled={isInstalling}>
          {isInstalling ? (
            <span>{downloadMessage}</span>
          ) : (
            t('Install Steam', 'Install Steam')
          )}
        </button>
        {isInstalling ? null : (
          <button onClick={onClose} disabled={isInstalling}>
            {t('Cancel Installation', 'Cancel Installation')}
          </button>
        )}
      </div>
    </Dialog>
  )
}

export default SteamInstallDialog
