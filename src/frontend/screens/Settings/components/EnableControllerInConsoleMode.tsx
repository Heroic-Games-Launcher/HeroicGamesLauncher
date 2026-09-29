import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { setControllerEnabledInConsole } from 'frontend/helpers/gamepad'

const EnableControllerInConsoleMode = () => {
  const { t } = useTranslation()
  const [enableControllerInConsoleMode, setEnableControllerInConsoleMode] =
    useSetting('enableControllerInConsoleMode', true)

  useEffect(() => {
    setControllerEnabledInConsole(enableControllerInConsoleMode)
  }, [enableControllerInConsoleMode])

  return (
    <ToggleSwitch
      htmlId="enableControllerInConsoleMode"
      value={enableControllerInConsoleMode}
      handleChange={() =>
        setEnableControllerInConsoleMode(!enableControllerInConsoleMode)
      }
      title={t(
        'setting.enable-controller-in-console-mode',
        'Always enable controller in Console Mode'
      )}
    />
  )
}

export default EnableControllerInConsoleMode
