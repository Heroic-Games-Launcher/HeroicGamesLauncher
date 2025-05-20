import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { Dialog } from 'frontend/components/UI/Dialog'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { faSteam, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { PathSelectionBox } from 'frontend/components/UI'
import './index.scss'

interface SteamInstallDialogProps {
  isInstalling: boolean
  onClose: () => void
  onInstall: (installPath: string) => void
}

const getProgressMessage = (percent: number, t: TFunction) => {
  if (!percent) {
    return t('label.steam.pleaseWait', 'Please Wait')
  }
  if (percent > 99) {
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
  const { t } = useTranslation('gamepage')
  const [progress] = hasProgress('steam')
  const [isHovering, setIsHovering] = useState(false)
  const [installPath, setInstallPath] = useState('')

  useEffect(() => {
    const getDefaultWinePrefix = async () => {
      const { defaultWinePrefix } = await window.api.requestAppSettings()
      if (defaultWinePrefix) {
        setInstallPath(`${defaultWinePrefix}/SteamHeroic`)
      }
    }
    void getDefaultWinePrefix()
  }, [])

  const percent = progress.percent ?? 0
  const downloadMessage = getProgressMessage(percent, t)

  const handleButtonClick = () => {
    if (isInstalling && percent < 95 && isHovering) {
      window.api.abort('steam-download')
    } else {
      onInstall(installPath)
    }
  }

  return (
    <Dialog
      showCloseButton={false}
      onClose={onClose}
      className="InstallModal__dialog steamModal "
    >
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
                'label.steam.hardware',
                'Apple Silicon M1+ (for Intel Macs Steam will work with Crossover)'
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
          <li>
            {t(
              'label.steam.specificVersion-pt1',
              'This will download a specific version of Steam from'
            )}{' '}
            <a
              href="https://archive.org/details/SteamHeroic"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              {t('label.steam.specificVersion-pt2', 'archive.org')}
            </a>{' '}
            {t(
              'label.steam.specificVersion-pt3',
              "made to work through Heroic since new versions of Steam won't work on macOS."
            )}
            <li>
              {t(
                'label.steam.crossover',
                "If you have Crossover installed, you won't need this since it can run the normal Steam just fine."
              )}
            </li>
          </li>
        </ul>
      </div>
      {/* Installation Path Selector */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <PathSelectionBox
          htmlId="steam-install-path"
          type="directory"
          onPathChange={setInstallPath}
          path={installPath}
          pathDialogTitle={t(
            'box.select-install-path',
            'Select Steam Installation Path'
          )}
          label={t('label.steam.install-path', 'Steam Installation Path')}
          placeholder={t(
            'label.steam.select-path',
            'Select installation folder for Steam'
          )}
          noDeleteButton
        />
      </div>

      <div
        className="Dialog__footer"
        style={{ marginTop: 'var(--space-md)', padding: 0 }}
      >
        <button
          onClick={handleButtonClick}
          disabled={
            (isInstalling && percent >= 95) || (!isInstalling && !installPath)
          }
          className="button is-secondary"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={
            isInstalling
              ? {
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundColor:
                    percent < 95 && isHovering ? 'var(--danger)' : undefined,
                  transition: 'background-color 0.2s ease-in-out'
                }
              : {}
          }
        >
          {isInstalling && (
            <div className="progress-bar" style={{ width: `${percent}%` }} />
          )}
          <span className="button-text">
            {isInstalling
              ? percent < 95 && isHovering
                ? t('label.steam.abort', 'Abort Installation')
                : downloadMessage
              : t('label.steam.install', 'Install Steam')}
          </span>
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
