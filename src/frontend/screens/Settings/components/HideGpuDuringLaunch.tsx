import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MenuItem } from '@mui/material'
import { InfoBox, SelectField } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import SettingsContext from '../SettingsContext'
import { WindowsDisplayDevice } from 'common/types'

const HideGpuDuringLaunch = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isDefault } = useContext(SettingsContext)
  const isWindows = platform === 'win32'

  const [hiddenGpu, setHiddenGpu] = useSetting('hideGpuDuringLaunch', '')
  const [devices, setDevices] = useState<WindowsDisplayDevice[]>([])

  useEffect(() => {
    if (isWindows) {
      void window.api.getWindowsDisplayDevices().then(setDevices)
    }
  }, [isWindows])

  // Only useful on Windows PCs with more than one GPU, but keep showing it
  // if it's set so users can turn it off
  if (!isWindows || (devices.length < 2 && !hiddenGpu)) {
    return <></>
  }

  const hiddenGpuMissing =
    hiddenGpu && !devices.some((device) => device.instanceId === hiddenGpu)

  return (
    <SelectField
      htmlId="hideGpuDuringLaunch"
      value={hiddenGpu || 'none'}
      onChange={(event) =>
        setHiddenGpu(event.target.value === 'none' ? '' : event.target.value)
      }
      label={t('setting.hide_gpu_during_launch.title', 'Hide GPU from game')}
      afterSelect={
        <InfoBox text={t('infobox.help')}>
          {t(
            'help.hide_gpu_during_launch.details',
            "On PCs with more than one GPU, some games ignore the GPU chosen in Windows' graphics settings, the GPU driver's control panel and launch arguments like -graphicsadapter, and end up on the wrong GPU. While the game starts, this disables the selected GPU so the game can't pick it, and enables it again once the game has chosen a GPU."
          )}
          <br />
          <br />
          {t(
            'help.hide_gpu_during_launch.admin',
            'Disabling a GPU needs administrator rights, so you will see a UAC prompt every time you launch the game. Do not select the GPU your displays are connected to.'
          )}
          {isDefault && (
            <>
              <br />
              <br />
              {t(
                'help.hide_gpu_during_launch.default',
                'This applies to all games. A game can pick a different GPU, or none, in its own settings.'
              )}
            </>
          )}
        </InfoBox>
      }
    >
      <MenuItem value="none">
        {t('setting.hide_gpu_during_launch.none', "Don't hide any GPU")}
      </MenuItem>
      {devices.map((device) => (
        <MenuItem key={device.instanceId} value={device.instanceId}>
          {device.name}
        </MenuItem>
      ))}
      {hiddenGpuMissing && (
        <MenuItem value={hiddenGpu}>
          {t('setting.hide_gpu_during_launch.missing', 'GPU not found')}
        </MenuItem>
      )}
    </SelectField>
  )
}

export default HideGpuDuringLaunch
