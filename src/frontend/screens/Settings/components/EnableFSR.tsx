import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField, ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import SettingsContext from '../SettingsContext'
import { useSharedConfig } from 'frontend/hooks/config'

const EnableFSR = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const [FSR, setFSR, FSRConfigFetched] = useSharedConfig('fsr')

  if (!isLinux || isLinuxNative || !FSRConfigFetched) {
    return <></>
  }

  return (
    <>
      <div className="toggleRow">
        <ToggleSwitch
          htmlId="enableFSR"
          value={FSR.enabled}
          handleChange={async () =>
            setFSR({ enabled: !FSR.enabled, sharpness: 0 })
          }
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

      {FSR.enabled && (
        <SelectField
          htmlId="setFsrSharpness"
          onChange={async (event) =>
            setFSR({ enabled: true, sharpness: Number(event.target.value) })
          }
          value={FSR.sharpness.toString()}
          label={t('setting.FsrSharpnessStrenght', 'FSR Sharpness Strength')}
          extraClass="smaller"
        >
          {Array.from(Array(5).keys()).map((n) => (
            <option key={n + 1}>{n + 1}</option>
          ))}
        </SelectField>
      )}
    </>
  )
}

export default EnableFSR
