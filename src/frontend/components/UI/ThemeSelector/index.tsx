import React, {
  ChangeEvent,
  FocusEvent,
  useContext,
  useEffect,
  useState
} from 'react'
import { useTranslation } from 'react-i18next'
import ContextProvider from 'frontend/state/ContextProvider'
import { SelectField, TextInputWithIconField, InfoBox } from '..'
import { AppSettings } from 'common/types'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolderOpen } from '@fortawesome/free-solid-svg-icons'
import { Backspace } from '@mui/icons-material'
import { writeConfig } from 'frontend/helpers'

export const defaultThemes = {
  midnightMirage: 'Midnight Mirage',
  cyberSpaceOasis: 'Cyberspace Oasis',
  cyberSpaceOasisAlt: 'Cyberspace Oasis Classic',
  'old-school': 'Old School Heroic',
  dracula: 'Dracula',
  marine: 'Marine',
  'marine-classic': 'Marine Classic',
  zombie: 'Zombie',
  'zombie-classic': 'Zombie Classic',
  'nord-light': 'Nord Light',
  'nord-dark': 'Nord Dark'
}

export const ThemeSelector = () => {
  const { theme, setTheme } = useContext(ContextProvider)
  const { t } = useTranslation()
  const [appConfig, setAppConfig] = useState<AppSettings | null>(null)
  const [themesPath, setThemesPath] = useState('')
  const [themes, setThemes] = useState<string[]>(Object.keys(defaultThemes))

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

  // on input change only update the state
  const onThemesPathChanged = (e: ChangeEvent<HTMLInputElement>) => {
    if (themesPath !== e.target.value) {
      setThemesPath(e.target.value)
    }
  }

  // only save config on input blur when editing manually
  const onThemesPathBlured = (e: FocusEvent<HTMLInputElement>) => {
    if (appConfig?.customThemesPath !== e.target.value) {
      updatePath(e.target.value)
    }
  }

  // show folder selector
  const selectThemesPath = () => {
    window.api
      .openDialog({
        buttonLabel: t('box.choose'),
        properties: ['openDirectory'],
        title: t('box.default-install-path')
      })
      .then((path) => {
        updatePath(path || '')
      })
  }

  const resetThemesPath = () => {
    updatePath('')
  }

  return (
    <>
      <SelectField
        htmlId="theme_selector"
        label={t('setting.select_theme', 'Select Theme')}
        onChange={(event) => setTheme(event.target.value)}
        value={theme}
      >
        {themes.map((key) => (
          <option key={key} value={key}>
            {defaultThemes[key] || key}
          </option>
        ))}
      </SelectField>

      <TextInputWithIconField
        label={t('setting.custom_themes_path', 'Custom Themes Path')}
        htmlId="custom_themes_path"
        placeholder={t(
          'placeholder.custom_themes_path',
          'Select the path to look for custom CSS files'
        )}
        value={themesPath}
        onChange={onThemesPathChanged}
        icon={
          !themesPath ? (
            <FontAwesomeIcon icon={faFolderOpen} />
          ) : (
            <Backspace
              data-testid="setGogdlBinaryBackspace"
              style={{ color: '#currentColor' }}
            />
          )
        }
        onIconClick={
          !themesPath ? async () => selectThemesPath() : () => resetThemesPath()
        }
        onBlur={onThemesPathBlured}
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
