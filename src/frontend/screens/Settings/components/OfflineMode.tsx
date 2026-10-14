import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { getGameInfo } from 'frontend/helpers'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

const OfflineMode = () => {
  const { t } = useTranslation()
  const { isDefault, game } = useContext(SettingsContext)
  const [canRunOffline, setCanRunOffline] = useState(true)

  useEffect(() => {
    const getInfo = async () => {
      if (isDefault) return

      const info = await getGameInfo(game)
      if (info) setCanRunOffline(info.canRunOffline)
    }

    void getInfo()
  }, [isDefault, game])

  const [offlineMode, setOfflineMode] = useSetting('offlineMode', false)

  if (isDefault || game.runner !== 'legendary') {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        htmlId="offlinemode"
        value={offlineMode}
        handleChange={() => setOfflineMode(!offlineMode)}
        title={t('setting.offlinemode')}
      />
      {!canRunOffline && offlineMode && (
        <div className="infoBox saves-warning">
          <FontAwesomeIcon icon={faExclamationTriangle} color={'yellow'} />
          {t(
            'settings.offline.warning',
            'This game does not explicitly allow offline mode, turn this on at your own risk. The game may not work.'
          )}
        </div>
      )}
    </>
  )
}

export default OfflineMode
