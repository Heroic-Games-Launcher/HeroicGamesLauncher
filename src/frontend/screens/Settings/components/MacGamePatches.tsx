import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const MacGamePatches = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [macGamePatches, setMacGamePatches] = useSetting('macGamePatches', true)

  if (!isMac || isMacNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="macGamePatchesToggle"
        value={macGamePatches}
        handleChange={() => setMacGamePatches(!macGamePatches)}
        title={t('setting.macGamePatches', 'Game compatibility patches')}
      />

      <InfoIcon
        text={t(
          'help.macGamePatches',
          'Patches known game executables that refuse to start on the GPU Wine reports, for example by skipping a graphics driver check. Only exact, known file versions are changed, and turning this off restores the original bytes.'
        )}
      />
    </div>
  )
}

export default MacGamePatches
