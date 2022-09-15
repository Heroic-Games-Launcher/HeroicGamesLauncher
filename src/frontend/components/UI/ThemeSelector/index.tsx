import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { SelectField } from '..'

export const ThemeSelector = () => {
  const { theme, setTheme } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <SelectField
      htmlId="theme_selector"
      label={t('setting.select_theme', 'Select Theme')}
      onChange={(event) => setTheme(event.target.value)}
      value={theme}
    >
      <option value="default">Default</option>
      <option value="classic">Classic</option>
      <option value="old-school">Old School Heroic</option>
      <option value="dracula">Dracula</option>
      <option value="marine">Marine</option>
      <option value="marine-classic">Marine Classic</option>
      <option value="zombie">Zombie</option>
      <option value="zombie-classic">Zombie Classic</option>
    </SelectField>
  )
}
