import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { getGameInfo } from 'frontend/helpers'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

const OfflineMode = () => {
  const { t } = useTranslation()
  const { isDefault, appName, runner } = useContext(SettingsContext)
  const [canRunOffline, setCanRunOffline] = useState(true)

  useEffect(() => {
    const getInfo = async () => {
      if (!runner) {
        return
      }
      const info = await getGameInfo(appName, runner)
      if (info) {
        const { canRunOffline: can_run_offline } = info
        setCanRunOffline(can_run_offline)
      }
    }

    getInfo()
  }, [])

  const [offlineMode, setOfflineMode] = useSetting('offlineMode', false)

  if (isDefault || runner !== 'legendary') {
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
