import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import { MenuItem } from '@mui/material'

const EnableFSR = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const [enableFSR, setEnableFSR] = useSetting('enableFSR', false)
  const [maxSharpness, setFsrSharpness] = useSetting('maxSharpness', 5)

  if (!isLinux || isLinuxNative) {
    return <></>
  }

  return (
    <>
      <ToggleSwitch
        info={t(
          'help.amdfsr',
          "AMD's FSR 1.0 fullscreen hack only works with GE-Proton/TKG under X11. It is not available in Valve Proton or upstream Wine and is incompatible with Wine-Wayland."
        )}
        description={t(
          'setting.enableFSRHack-description',
          'Legacy fullscreen upscaling for DirectX games (X11 only)'
        )}
        htmlId="enableFSR"
        value={enableFSR || false}
        handleChange={() => setEnableFSR(!enableFSR)}
        title={t('setting.enableFSRHack', 'Wine FSR 1 (fshack, X11 only)')}
      />

      {enableFSR && (
        <SelectField
          htmlId="setFsrSharpness"
          onChange={(event) => setFsrSharpness(Number(event.target.value))}
          value={maxSharpness.toString()}
          label={t('setting.FsrSharpnessStrenght', 'FSR sharpness strength')}
          extraClass="smaller"
        >
          {Array.from(Array(5).keys()).map((n) => (
            <MenuItem key={n + 1} value={n + 1}>
              {n + 1}
            </MenuItem>
          ))}
        </SelectField>
      )}
    </>
  )
}

export default EnableFSR
