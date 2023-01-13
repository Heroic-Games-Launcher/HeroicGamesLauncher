import React from 'react'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useTranslation } from 'react-i18next'

const AutoUpdateGames = () => {
  const { t } = useTranslation()
  const [autoUpdateGames, setAutoUpdateGames] = useSetting(
    'autoUpdateGames',
    true
  )

  return (
    <ToggleSwitch
      htmlId="autoUpdateGames"
      value={autoUpdateGames}
      handleChange={() => setAutoUpdateGames(!autoUpdateGames)}
      title={t('setting.autoUpdateGames', 'Automatically update games')}
    />
  )
}

export default AutoUpdateGames
