import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import SettingsContext from '../SettingsContext'
import type { PositiveInteger } from 'backend/schemas'

const MaxRecentGames = () => {
  const { t } = useTranslation()
  const { isDefault } = useContext(SettingsContext)

  const [
    maxRecentGames,
    setMaxRecentGames,
    maxRecentGamesFetched,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useGlobalConfig('maxRecentGames')

  if (!isDefault || !maxRecentGamesFetched) {
    return <></>
  }

  return (
    <SelectField
      label={t('setting.maxRecentGames', 'Recent Games to Show')}
      htmlId="setMaxRecentGames"
      extraClass="smaller"
      onChange={async (event) =>
        setMaxRecentGames(Number(event.target.value) as PositiveInteger)
      }
      value={maxRecentGames.toString()}
      isSetToDefaultValue={isSetToDefaultValue}
      resetToDefaultValue={resetToDefaultValue}
    >
      {Array.from(Array(10).keys()).map((n) => (
        <option key={n + 1}>{n + 1}</option>
      ))}
    </SelectField>
  )
}

export default MaxRecentGames
