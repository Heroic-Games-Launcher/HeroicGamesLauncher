import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import SettingsContext from '../SettingsContext'

const EnableFsync = () => {
  const { t } = useTranslation()
  const { isLinuxNative } = useContext(SettingsContext)
  const [enableFsync, setEnableFsync] = useSetting('enableFsync', false)

  if (!isLinux || isLinuxNative) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="fsyncToggle"
        value={enableFsync || false}
        handleChange={() => setEnableFsync(!enableFsync)}
        title={t('setting.fsync', 'Enable Fsync')}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.fsync',
          'Fsync aims to reduce wineserver overhead in CPU-intensive games. Enabling may improve performance on supported Linux kernels.'
        )}
      />
    </div>
  )
}

export default EnableFsync
