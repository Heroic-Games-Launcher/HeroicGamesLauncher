import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField, ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
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
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="enableFSR"
          value={enableFSR || false}
          handleChange={() => setEnableFSR(!enableFSR)}
          title={t(
            'setting.enableFSRHack',
            'Enable FSR Hack (Wine version needs to support it)'
          )}
        />

        <FontAwesomeIcon
          className="helpIcon"
          icon={faCircleInfo}
          title={t(
            'help.amdfsr',
            "AMD's FSR helps boost framerate by upscaling lower resolutions in Fullscreen Mode. Image quality increases from 5 to 1 at the cost of a slight performance hit. Enabling may improve performance."
          )}
        />
      </div>

      {enableFSR && (
        <SelectField
          htmlId="setFsrSharpness"
          onChange={(event) => setFsrSharpness(Number(event.target.value))}
          value={maxSharpness.toString()}
          label={t('setting.FsrSharpnessStrenght', 'FSR Sharpness Strength')}
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
