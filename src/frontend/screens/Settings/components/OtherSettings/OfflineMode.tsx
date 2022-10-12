import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from '/src/frontend/components/UI'
import { getGameInfo } from '/src/frontend/helpers'
import useSetting from '/src/frontend/hooks/useSetting'
import SettingsContext from '../../SettingsContext'

const OfflineMode = () => {
  const { t } = useTranslation()
  const { isDefault, appName, runner } = useContext(SettingsContext)
  const [canRunOffline, setCanRunOffline] = useState(true)

  useEffect(() => {
    const getInfo = async () => {
      const info = await getGameInfo(appName, runner)
      if (info) {
        const { canRunOffline: can_run_offline } = info
        setCanRunOffline(can_run_offline)
      }
    }

    if (!isDefault) {
      getInfo()
    }
  }, [])

  const [offlineMode, setOfflineMode] = useSetting<boolean>(
    'offlineMode',
    false
  )

  if (isDefault || !canRunOffline) {
    return <></>
  }

  return (
    <ToggleSwitch
      htmlId="offlinemode"
      value={offlineMode}
      handleChange={() => setOfflineMode(!offlineMode)}
      title={t('setting.offlinemode')}
    />
  )
}

export default OfflineMode
