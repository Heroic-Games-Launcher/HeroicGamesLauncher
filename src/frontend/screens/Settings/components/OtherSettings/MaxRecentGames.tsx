import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import SettingsContext from '../../SettingsContext'

const MaxRecentGames = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)

  const [maxRecentGames, setMaxRecentGames] = useSetting('maxRecentGames', 5)

  if (!isDefault) {
    return <></>
  }

  return (
    <SelectField
      label={t('setting.maxRecentGames', 'Recent Games to Show')}
      htmlId="setMaxRecentGames"
      extraClass="smaller"
      onChange={(event) => setMaxRecentGames(Number(event.target.value))}
      value={maxRecentGames.toString()}
    >
      {Array.from(Array(10).keys()).map((n) => (
        <option key={n + 1}>{n + 1}</option>
      ))}
    </SelectField>
  )
}

export default MaxRecentGames
