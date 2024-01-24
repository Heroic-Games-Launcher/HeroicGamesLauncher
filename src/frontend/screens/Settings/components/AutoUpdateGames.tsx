import React from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import { useTranslation } from 'react-i18next'

const AutoUpdateGames = () => {
  const { t } = useTranslation()
  const [autoUpdateGames, setAutoUpdateGames] =
    useGlobalConfig('autoUpdateGames')

  return (
    <ToggleSwitch
      htmlId="autoUpdateGames"
      value={autoUpdateGames}
      handleChange={async () => setAutoUpdateGames(!autoUpdateGames)}
      title={t('setting.autoUpdateGames', 'Automatically update games')}
    />
  )
}

export default AutoUpdateGames
