import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import { defaultWineVersion } from '../util'

const EnableMetalFX = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [enableMetalFX, setEnableMetalFX] = useSetting('enableMetalFX', false)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  // Only D3DMetal (GPTK, CrossOver) and DXMT translate DLSS
  const translatesDLSS =
    wineVersion.type !== 'wine' || wineVersion.name.endsWith('-DXMT')
  if (!isMac || isMacNative || !translatesDLSS) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="enableMetalFXToggle"
        value={enableMetalFX}
        handleChange={() => setEnableMetalFX(!enableMetalFX)}
        title={t('setting.enableMetalFX', 'DLSS via MetalFX')}
      />

      <InfoIcon
        text={t(
          'help.enableMetalFX',
          "Lets games that support NVIDIA DLSS use Apple's MetalFX upscaling instead, and MetalFX frame interpolation for DLSS Frame Generation on macOS 26 or newer. Needs Game Porting Toolkit 3, CrossOver with D3DMetal 3 or a DXMT Wine build. Select DLSS in the game's graphics options afterwards."
        )}
      />
    </div>
  )
}

export default EnableMetalFX
