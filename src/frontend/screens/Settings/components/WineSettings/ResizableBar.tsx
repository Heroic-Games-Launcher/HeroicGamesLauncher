import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const ResizableBar = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [enableResizableBar, setEnableResizableBar] = useSetting<boolean>(
    'enableResizableBar',
    false
  )

  if (!isLinux) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="resizableBar"
        value={enableResizableBar || false}
        handleChange={() => setEnableResizableBar(!enableResizableBar)}
        title={t(
          'setting.resizableBar',
          'Enable Resizable BAR (NVIDIA RTX only)'
        )}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.resizablebar',
          "NVIDIA's Resizable Bar helps boost framerate by making the CPU access the entire graphics buffer. Enabling may improve performance for Vulkan-based games."
        )}
      />
    </div>
  )
}

export default ResizableBar
