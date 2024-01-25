import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import SettingsContext from '../SettingsContext'

const EnableFsync = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const { isLinuxNative } = useContext(SettingsContext)
  const isLinux = platform === 'linux'
  const [
    enableFsync,
    setEnableFsync,
    fsyncConfigFetched,
    isSetToDefault,
    resetToDefaultValue
  ] = useSharedConfig('fSync')

  if (!isLinux || isLinuxNative || !fsyncConfigFetched) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="fsyncToggle"
        value={enableFsync || false}
        handleChange={async () => setEnableFsync(!enableFsync)}
        title={t('setting.fsync', 'Enable Fsync')}
        isSetToDefaultValue={isSetToDefault}
        resetToDefaultValue={resetToDefaultValue}
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
