import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch, TextInputField } from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import SettingsContext from '../SettingsContext'

const EnableDXVKFpsLimit = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative, isMacNative } = useContext(SettingsContext)
  const isWin = platform === 'win32'
  const [
    DXVKFpsLimit,
    setDXVKFpsLimit,
    fpsLimitFetched,
    isSetToDefault,
    resetToDefaultValue
  ] = useSharedConfig('dxvkFpsLimit')
  const [wineVersion, , wineVersionFetched] = useSharedConfig('wineVersion')

  if (!fpsLimitFetched || !wineVersionFetched) return <></>

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
          value={DXVKFpsLimit.enabled}
          handleChange={async () =>
            setDXVKFpsLimit({ enabled: !DXVKFpsLimit.enabled, limit: 60 })
          }
          title={t('setting.dxvkfpslimit', 'Limit FPS (DX9, 10 and 11)')}
          isSetToDefaultValue={isSetToDefault}
          resetToDefaultValue={resetToDefaultValue}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t('help.dxvkfpslimit', 'Sets a frame rate cap for DXVK games')}
        />
      </div>

      {DXVKFpsLimit.enabled && (
        <TextInputField
          htmlId="DXVKFpsLimitValue"
          placeholder={t(
            'placeholder.dxvkfpsvalue',
            'Positive integer value (e.g. 30, 60, ...)'
          )}
          value={DXVKFpsLimit.limit.toString()}
          onChange={async (event) =>
            setDXVKFpsLimit({
              enabled: true,
              limit: Number(event.target.value)
            })
          }
        />
      )}
    </>
  )
}

export default EnableDXVKFpsLimit
