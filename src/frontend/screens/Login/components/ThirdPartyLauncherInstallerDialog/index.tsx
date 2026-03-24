import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ThirdPartyLaunchers, WineInstallation } from 'common/types'
import { DialogContent, DialogFooter } from 'frontend/components/UI/Dialog'
import WineSelector from '../../../Library/components/InstallModal/WineSelector'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'

interface Props {
  launcherId: ThirdPartyLaunchers
  launcherName: string
  onClose: () => void
  onInstall: (options: {
    winePrefix: string
    wineVersion: WineInstallation
    crossoverBottle?: string
  }) => Promise<void>
}

export default function ThirdPartyLauncherInstallerDialog({
  launcherId,
  launcherName,
  onClose,
  onInstall
}: Props) {
  const { t } = useTranslation('gamepage')
  const [winePrefix, setWinePrefix] = useState('')
  const [wineVersion, setWineVersion] = useState<WineInstallation>()
  const [wineVersionList, setWineVersionList] = useState<WineInstallation[]>([])
  const [crossoverBottle, setCrossoverBottle] = useState('')
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    void window.api.requestAppSettings().then(({ defaultWinePrefix }) => {
      setWinePrefix(`${defaultWinePrefix}/${launcherName}`)
    })

    void window.api.getAlternativeWine().then((list) => {
      setWineVersionList(list)
      if (list.length > 0) {
        setWineVersion(list[0])
      }
    })
  }, [launcherName])

  const handleInstall = async () => {
    if (!wineVersion) return
    setInstalling(true)
    await onInstall({
      winePrefix,
      wineVersion,
      crossoverBottle: crossoverBottle || undefined
    })
    setInstalling(false)
    onClose()
  }

  return (
    <>
      <DialogContent>
        <div style={{ padding: '20px' }}>
          <h2>
            {t('install.third-party-launcher', 'Install {{launcher}}', {
              launcher: launcherName
            })}
          </h2>
          <WineSelector
            appName={launcherId}
            winePrefix={winePrefix}
            wineVersion={wineVersion}
            wineVersionList={wineVersionList}
            title={launcherName}
            setWinePrefix={setWinePrefix}
            setWineVersion={setWineVersion}
            crossoverBottle={crossoverBottle}
            setCrossoverBottle={setCrossoverBottle}
            initiallyOpen
          />
        </div>
      </DialogContent>
      <DialogFooter>
        <button className="button" onClick={onClose} disabled={installing}>
          {t('button.cancel', 'Cancel')}
        </button>
        <button
          className="button is-success"
          onClick={handleInstall}
          disabled={installing || !wineVersion || !winePrefix}
        >
          {installing ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            t('button.install', 'Install')
          )}
        </button>
      </DialogFooter>
    </>
  )
}
