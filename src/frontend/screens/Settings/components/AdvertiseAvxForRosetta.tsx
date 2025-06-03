import ContextProvider from 'frontend/state/ContextProvider'
import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '..'

const AdvertiseAvxForRosetta = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)
  const [advertiseAvxForRosetta, setAdvertiseAvxForRosetta] = useSetting(
    'advertiseAvxForRosetta',
    false
  )

  // Only show on macOS when using toolkit wine and not native games
  if (!isMac || isMacNative || wineVersion.type !== 'toolkit') {
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

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.advertiseAvxForRosetta',
          'Enables AVX instruction set support when running Windows games through Rosetta on Apple Silicon Macs. This may be required for some games like Death Stranding that need AVX support.'
        )}
      />
    </div>
  )
}

export default AdvertiseAvxForRosetta
