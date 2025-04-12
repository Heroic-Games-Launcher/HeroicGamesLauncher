import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { Dialog } from 'frontend/components/UI/Dialog'
import { hasProgress } from 'frontend/hooks/hasProgress'
import { faSteam, faWindows } from '@fortawesome/free-brands-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import WineSelector from '../InstallModal/WineSelector'
import { WineInstallation } from 'common/types'
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
  const { t } = useTranslation()
  const [progress] = hasProgress('steam')

  const [winePrefix, setWinePrefix] = useState('...')
  const [wineVersion, setWineVersion] = useState<WineInstallation>()
  const [wineVersionList, setWineVersionList] = useState<WineInstallation[]>([])
  const [crossoverBottle, setCrossoverBottle] = useState('')

  // Fetch wine versions when component mounts
  useEffect(() => {
    const getWine = async () => {
      const newWineList: WineInstallation[] =
        await window.api.getAlternativeWine()
      setWineVersionList(newWineList)
    }
    getWine()
  }, [])

  const percent = progress.percent ?? 0
  const downloadMessage = getProgressMessage(percent, t)

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
          </li>
        </ul>
      </div>
      {/* Wine Selector */}
      <div style={{ marginBottom: 'var(--space-md)' }}>
        <WineSelector
          appName="steam"
          winePrefix={winePrefix}
          wineVersion={wineVersion}
          wineVersionList={wineVersionList}
          title="Steam"
          setWinePrefix={setWinePrefix}
          setWineVersion={setWineVersion}
          crossoverBottle={crossoverBottle}
          setCrossoverBottle={setCrossoverBottle}
        />
      </div>

      <div
        className="Dialog__footer"
        style={{ marginTop: 'var(--space-md)', padding: 0 }}
      >
        <button
          onClick={onInstall}
          disabled={isInstalling}
          className="button is-secondary"
          style={
            isInstalling
              ? {
                  position: 'relative',
                  overflow: 'hidden'
                }
              : {}
          }
        >
          {isInstalling && (
            <div className="progress-bar" style={{ width: `${percent}%` }} />
          )}
          <span className="button-text">
            {isInstalling
              ? downloadMessage
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
