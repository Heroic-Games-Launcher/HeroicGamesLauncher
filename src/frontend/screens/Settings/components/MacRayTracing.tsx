import ContextProvider from 'frontend/state/ContextProvider'
import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import SettingsContext from '../SettingsContext'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import InfoIcon from 'frontend/components/UI/InfoIcon'
import { defaultWineVersion } from '../util'

const MacRayTracing = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isMacNative } = useContext(SettingsContext)
  const isMac = platform === 'darwin'
  const [macRayTracing, setMacRayTracing] = useSetting('macRayTracing', false)
  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  // DirectX Raytracing is translated by D3DMetal only (GPTK, CrossOver)
  const usesD3DMetal =
    (wineVersion.type === 'toolkit' || wineVersion.type === 'crossover') &&
    !wineVersion.name.endsWith('-DXMT')
  if (!isMac || isMacNative || !usesD3DMetal) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="macRayTracingToggle"
        value={macRayTracing}
        handleChange={() => setMacRayTracing(!macRayTracing)}
        title={t('setting.macRayTracing', 'Hardware ray tracing (DXR)')}
      />

      <InfoIcon
        text={t(
          'help.macRayTracing',
          "Lets Direct3D 12 games use DirectX Raytracing through D3DMetal, so they can offer ray-traced effects in their graphics options. Needs an M3 or newer chip. Ray tracing looks better but lowers the frame rate, and games without ray-traced effects don't change."
        )}
      />
    </div>
  )
}

export default MacRayTracing
