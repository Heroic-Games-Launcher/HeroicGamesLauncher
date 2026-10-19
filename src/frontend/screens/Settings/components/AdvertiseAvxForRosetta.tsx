import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const AdvertiseAvxForRosetta = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [advertiseAvxForRosetta, setAdvertiseAvxForRosetta] = useSetting(
    'advertiseAvxForRosetta',
    false
  )

  // Rosetta translates AVX on macOS 15+ regardless of the Wine build
  if (!isMac || isMacNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="advertiseAvxForRosettaToggle"
        value={advertiseAvxForRosetta || false}
        handleChange={() => setAdvertiseAvxForRosetta(!advertiseAvxForRosetta)}
        title={t('setting.advertiseAvxForRosetta', 'Advertise AVX for Rosetta')}
      />

      <InfoIcon
        text={t(
          'help.advertiseAvxForRosetta',
          'Enables AVX instruction set support when running Windows games through Rosetta on Apple Silicon Macs. This may be required for some games like Death Stranding that need AVX support.'
        )}
      />
    </div>
  )
}

export default AdvertiseAvxForRosetta
