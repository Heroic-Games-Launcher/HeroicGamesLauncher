import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { getGameInfo } from 'frontend/helpers'
import { useGameConfig } from 'frontend/hooks/config'
import SettingsContext from '../SettingsContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'

const OfflineMode = () => {
  const { t } = useTranslation()
  const { appName, runner } = useContext(SettingsContext)
  const [canRunOffline, setCanRunOffline] = useState(true)

  useEffect(() => {
    const getInfo = async () => {
      const info = await getGameInfo(appName, runner)
      if (info) {
        const { canRunOffline: can_run_offline } = info
        setCanRunOffline(can_run_offline)
      }
    }

    getInfo()
  }, [])

  const [offlineMode, setOfflineMode, , isSetToDefault, resetToDefaultValue] =
    useGameConfig('runGameOffline')

  if (runner !== 'legendary') {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        htmlId="offlinemode"
        value={offlineMode}
        handleChange={async () => setOfflineMode(!offlineMode)}
        title={t('setting.offlinemode')}
        isSetToDefaultValue={isSetToDefault}
        resetToDefaultValue={resetToDefaultValue}
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
