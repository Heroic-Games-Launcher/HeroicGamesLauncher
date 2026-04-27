import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

const ConsoleModeSounds = () => {
  const { t } = useTranslation()
  const { consoleModeSounds, setConsoleModeSounds } =
    useContext(ContextProvider)

  return (
    <ToggleSwitch
      htmlId="consoleModeSounds"
      value={consoleModeSounds}
      handleChange={() => setConsoleModeSounds(!consoleModeSounds)}
      title={t('setting.console-mode-sounds', 'Console Mode sounds')}
    />
  )
}

export default ConsoleModeSounds
