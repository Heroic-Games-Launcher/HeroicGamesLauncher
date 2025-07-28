import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch, TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import { defaultWineVersion } from '..'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const EnableDXVKFpsLimit = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative, isMacNative } = useContext(SettingsContext)
  const isWin = platform === 'win32'
  const [enableDXVKFpsLimit, setDXVKFpsLimit] = useSetting(
    'enableDXVKFpsLimit',
    false
  )
  const [DXVKFpsCap, setDXVKFpsCap] = useSetting('DXVKFpsCap', '')
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  if (
    isWin ||
    isLinuxNative ||
    isMacNative ||
    wineVersion.bin.includes('toolkit')
  ) {
    return <></>
  }

  return (
    <>
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="enableDXVKFpsLimit"
          value={enableDXVKFpsLimit || false}
          handleChange={() => setDXVKFpsLimit(!enableDXVKFpsLimit)}
          title={t('setting.dxfpslimit', 'Limit DirectX Games FPS')}
        />

        <InfoIcon
          text={t(
            'help.dxfpslimit',
            'Sets a frame rate cap for DirectX Games (9-12)'
          )}
        />
      </div>

      {enableDXVKFpsLimit && (
        <TextInputField
          htmlId="DXVKFpsLimitValue"
          placeholder={t(
            'placeholder.dxvkfpsvalue',
            'Positive integer value (e.g. 30, 60, ...)'
          )}
          value={DXVKFpsCap}
          onChange={(newValue) => setDXVKFpsCap(newValue)}
        />
      )}
    </>
  )
}

export default EnableDXVKFpsLimit
