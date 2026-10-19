import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const MacRunWithRosetta = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [runWithRosetta, setRunWithRosetta] = useSetting(
    'runWithRosetta',
    false
  )

  if (!isMac || !isMacNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="runWithRosettaToggle"
        value={runWithRosetta}
        handleChange={() => setRunWithRosetta(!runWithRosetta)}
        title={t('setting.runWithRosetta', 'Run with Rosetta')}
      />

      <InfoIcon
        text={t(
          'help.runWithRosetta',
          'Starts this Mac game as an Intel app. Intel-only games already do this. Turn it on for a universal game that misbehaves on Apple Silicon.'
        )}
      />
    </div>
  )
}

export default MacRunWithRosetta
