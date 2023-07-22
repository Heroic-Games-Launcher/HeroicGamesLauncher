import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch, TextInputField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import SettingsContext from '../SettingsContext'
import { defaultWineVersion } from '..'

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
          title={t('setting.dxvkfpslimit', 'Limit FPS (DX9, 10 and 11)')}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t('help.dxvkfpslimit', 'Sets a frame rate cap for DXVK games')}
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
          onChange={(event) => setDXVKFpsCap(event.target.value)}
        />
      )}
    </>
  )
}

export default EnableDXVKFpsLimit
