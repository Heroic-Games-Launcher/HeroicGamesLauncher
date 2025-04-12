import React from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { Dialog } from 'frontend/components/UI/Dialog'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { faSteam, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './index.scss'

interface SteamInstallDialogProps {
  isInstalling: boolean
  onClose: () => void
  onInstall: () => void
}

const getProgressMessage = (percent: number, t: TFunction) => {
  if (!percent) {
    return t('label.steam.pleaseWait', 'Please Wait')
  }
  if (percent > 95) {
    return t('label.steam.installing', 'Installing')
  }
  return t('label.steam.downloading', 'Downloading {{percent}}%', {
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
    <Dialog showCloseButton={false} onClose={onClose} className="steamModal">
      <div>
        <h6>
          <span className="iconsWrapper">
            <FontAwesomeIcon icon={faSteam} />
            <FontAwesomeIcon icon={faWindows} />
          </span>
          {t('label.steam.installation', 'Steam Installation')}
        </h6>
      </div>
      <div>
        <ul>
          <li>
            {t(
              'label.steam.recommended',
              'Recommended specs for a better experience'
            )}
            :
          </li>
          <ul>
            <li>
              {t(
                'label.steam.appleSilicon',
                'Apple Silicon M1+ or Intel with dedicated GPU'
              )}
            </li>
            <li>{t('label.steam.macOS', 'macOS 14.0 or above')}</li>
            <li>{t('label.steam.ram', '8GB of RAM')}</li>
          </ul>
          <li>
            {t(
              'label.steam.compatibility',
              'Be aware that not all games will work, and even if they do, they may not run as expected.'
            )}
          </li>
          <li>
            {t(
              'label.steam.patience',
              'If you wish to continue, please be patient since it can take a few minutes to finish depending on your internet connection and system configuration.'
            )}
          </li>
          <li>
            {t(
              'label.steam.notification',
              'Heroic will notify you once the installation is done.'
            )}
          </li>
        </ul>
      </div>
      <div
        className="Dialog__footer"
        style={{ marginTop: 'var(--space-md)', padding: 0 }}
      >
        <button
          onClick={onInstall}
          disabled={isInstalling}
          className="button is-secondary"
        >
          {isInstalling ? (
            <span>{downloadMessage}</span>
          ) : (
            t('label.steam.install', 'Install Steam')
          )}
        </button>
        {isInstalling ? null : (
          <button
            onClick={onClose}
            disabled={isInstalling}
            className="button is-tertiary"
          >
            {t('label.steam.cancel', 'Cancel Installation')}
          </button>
        )}
      </div>
    </Dialog>
  )
}

export default SteamInstallDialog
