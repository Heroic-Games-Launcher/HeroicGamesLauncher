import React, { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { SelectField, InfoBox, PathSelectionBox } from '..'
import { hasHelp } from 'frontend/hooks/hasHelp'
import { useGlobalConfig } from 'frontend/hooks/config'
import { IconButton } from '@mui/material'
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore'

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
  const [themesPath, setThemesPath, , themesPathIsDefault, resetThemesPath] =
    useGlobalConfig('customThemesPath')
  const [themes, setThemes] = useState<string[]>(Object.keys(defaultThemes))

  hasHelp(
    'customThemesPath',
    t('setting.custom_themes_path', 'Custom Themes Path'),
    <p>{t('help.content.customThemesPath', 'Check our wiki.')}</p>
  )

  // load themes from the custom themes path
  useEffect(() => {
    window.api.getCustomThemes().then((themes) => {
      setThemes([...Object.keys(defaultThemes), ...themes])
    })
  }, [themesPath])

  let resetButton = <></>
  if (!themesPathIsDefault) {
    resetButton = (
      <IconButton
        color={'primary'}
        onClick={resetThemesPath}
        title={t('button.reset-to-default', 'Reset to default')}
      >
        <SettingsBackupRestoreIcon />
      </IconButton>
    )
  }

  return (
    <>
      <SelectField
        htmlId="theme_selector"
        label={t('setting.select_theme', 'Select Theme')}
        onChange={(event) => setTheme(event.target.value)}
        value={theme}
        isSetToDefaultValue={theme === 'midnightMirage'}
        resetToDefaultValue={() => setTheme('midnightMirage')}
      >
        {themes.map((key) => (
          <option key={key} value={key}>
            {defaultThemes[key] || key}
          </option>
        ))}
      </SelectField>

      <PathSelectionBox
        label={t('setting.custom_themes_path', 'Custom Themes Path')}
        htmlId="custom_themes_path"
        placeholder={t(
          'placeholder.custom_themes_path',
          'Select the path to look for custom CSS files'
        )}
        path={themesPath ?? ''}
        onPathChange={async (path) => setThemesPath(path)}
        pathDialogTitle={t('box.default-install-path')}
        type="directory"
        inlineElement={resetButton}
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
