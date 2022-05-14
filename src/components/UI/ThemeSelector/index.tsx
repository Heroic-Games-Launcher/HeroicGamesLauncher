import classNames from 'classnames'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'src/state/ContextProvider'

export const ThemeSelector = () => {
  const { isRTL, theme, setTheme } = useContext(ContextProvider)
  const { t } = useTranslation()

  return (
    <span className="setting">
      <label
        className={classNames('settingText', { isRTL: isRTL })}
        htmlFor="theme_selector"
      >
        {t('setting.select_theme', 'Select Theme')}
      </label>
      <select
        id="theme_selector"
        onChange={(event) => setTheme(event.target.value)}
        value={theme}
        className="settingSelect is-drop-down"
      >
        <option value="">Default</option>
        <option value="classic">Classic</option>
        <option value="old-school">Old School Heroic</option>
        <option value="dracula">Dracula</option>
        <option value="marine">Marine</option>
        <option value="marine-classic">Marine Classic</option>
        <option value="zombie">Zombie</option>
        <option value="zombie-classic">Zombie Classic</option>
      </select>
    </span>
  )
}
