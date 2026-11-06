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

  // GPTK and CrossOver ship D3DMetal. A Wine build translates DLSS only with DXMT.
  // Proton is not treated as capable: the backend requires D3DMetal 3 or DXMT.
  const translatesDLSS =
    wineVersion.type === 'toolkit' ||
    wineVersion.type === 'crossover' ||
    wineVersion.name.endsWith('-DXMT')
  if (!isMac || isMacNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="enableMetalFXToggle"
        value={enableMetalFX}
        disabled={!translatesDLSS}
        handleChange={() => {
          if (translatesDLSS) setEnableMetalFX(!enableMetalFX)
        }}
        title={t('setting.enableMetalFX', 'DLSS via MetalFX')}
      />

      <InfoIcon
        text={
          translatesDLSS
            ? t(
                'help.enableMetalFX',
                "Lets games that support NVIDIA DLSS use Apple's MetalFX upscaling instead. Needs Game Porting Toolkit 3, CrossOver with D3DMetal 3 or a DXMT Wine build. Select DLSS in the game's graphics options afterwards."
              )
            : t(
                'help.metalFXUnsupported',
                'This Wine build cannot translate DLSS. DLSS via MetalFX needs Game Porting Toolkit, CrossOver, or a DXMT build, so the toggle stays disabled.'
              )
        }
      />
    </div>
  )
}

export default EnableMetalFX
