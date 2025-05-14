import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { SelectField, InfoBox, PathSelectionBox } from '..'
import { AppSettings } from 'common/types'
import { writeConfig } from 'frontend/helpers'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { MenuItem } from '@mui/material'

export const defaultThemes = {
  midnightMirage: 'Midnight Mirage',
  cyberSpaceOasis: 'Cyberspace Oasis',
  cyberSpaceOasisAlt: 'Cyberspace Oasis Classic',
  'high-contrast': 'High Contrast',
  'old-school': 'Old School Heroic',
  dracula: 'Dracula',
  marine: 'Marine',
  'marine-classic': 'Marine Classic',
  zombie: 'Zombie',
  'zombie-classic': 'Zombie Classic',
  'nord-light': 'Nord Light',
  'nord-dark': 'Nord Dark',
  gruvbox_dark: 'Gruvbox Dark',
  sweet: 'Sweet'
}

export const ThemeSelector = () => {
  const { theme, setTheme } = useContext(ContextProvider)
  const { t } = useTranslation()
  const [appConfig, setAppConfig] = useState<AppSettings | null>(null)
  const [themesPath, setThemesPath] = useState('')
  const [themes, setThemes] = useState<string[]>(Object.keys(defaultThemes))

  hasHelp(
    'customThemesPath',
    t('setting.custom_themes_path', 'Custom Themes Path'),
    <p>{t('help.content.customThemesPath', 'Check our wiki.')}</p>
  )

  // load themes from the custom themes path
  const loadThemes = async () => {
    const themes = await window.api.getCustomThemes()
    setThemes([...Object.keys(defaultThemes), ...themes])
  }

  // update config, update component state, reload themes
  const updatePath = async (path: string) => {
    if (!appConfig) {
      return
    }

    const newAppConfig = { ...appConfig, customThemesPath: path }
    setThemesPath(path)
    await writeConfig({ appName: 'default', config: newAppConfig })
    setAppConfig(newAppConfig)
    loadThemes()
  }

  useEffect(() => {
    const getPath = async () => {
      const config = await window.api.requestAppSettings()
      setAppConfig(config)
      setThemesPath(config.customThemesPath || '')
      loadThemes()
    }

    getPath()
  }, [])

  return (
    <>
      <SelectField
        htmlId="theme_selector"
        label={t('setting.select_theme', 'Select Theme')}
        onChange={(event) => setTheme(event.target.value)}
        value={theme}
      >
        {themes.map((key) => (
          <MenuItem key={key} value={key}>
            {defaultThemes[key] || key}
          </MenuItem>
        ))}
      </SelectField>

      <PathSelectionBox
        label={t('setting.custom_themes_path', 'Custom Themes Path')}
        htmlId="custom_themes_path"
        placeholder={t(
          'placeholder.custom_themes_path',
          'Select the path to look for custom CSS files'
        )}
        path={themesPath}
        onPathChange={updatePath}
        pathDialogTitle={t('box.default-install-path')}
        type="directory"
        afterInput={
          <>
            <InfoBox text="infobox.help">
              <a
                className="link"
                onClick={() => window.api.openCustomThemesWiki()}
              >
                {t(
                  'help.custom_themes_wiki',
                  'Check the Wiki for more details on adding custom themes. Click here.'
                )}
              </a>
            </InfoBox>
            <InfoBox text="infobox.warning">
              {t(
                'help.custom_themes_path',
                'Do not use CSS files from untrusted sources.'
              )}
            </InfoBox>
          </>
        }
      />
    </>
  )
}
