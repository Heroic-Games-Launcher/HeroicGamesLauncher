import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'

const StartInConsoleMode = () => {
  const { t } = useTranslation()
  const [startInConsoleMode, setStartInConsoleMode] = useSetting(
    'startInConsoleMode',
    false
  )

  return (
    <ToggleSwitch
      description={t(
        'setting.start-in-console-mode.description',
        'Open Heroic in the big-picture interface built for controllers'
      )}
      htmlId="startInConsoleMode"
      value={startInConsoleMode}
      handleChange={() => setStartInConsoleMode(!startInConsoleMode)}
      title={t('setting.start-in-console-mode', 'Start in Console Mode')}
    />
  )
}

export default StartInConsoleMode
