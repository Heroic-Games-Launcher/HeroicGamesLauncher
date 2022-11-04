import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { defaultWineVersion } from '..'

const PreferSystemLibs = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [preferSystemLibs, setPreferSystemLibs] = useSetting(
    'preferSystemLibs',
    false
  )

  const [wineVersion] = useSetting('wineVersion', defaultWineVersion)

  const isProton = wineVersion.type === 'proton'

  if (!isLinux || isProton) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="systemLibsToggle"
        value={preferSystemLibs || false}
        handleChange={() => setPreferSystemLibs(!preferSystemLibs)}
        title={t('setting.preferSystemLibs', 'Prefer system libraries')}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.preferSystemLibs',
          'Custom Wine versions (Wine-GE, Wine-Lutris) are shipped with their library dependencies. By enabling this option, these shipped libraries will be ignored and Wine will load system libraries instead. Warning! Issues may occur if dependencies are not met.'
        )}
      />
    </div>
  )
}

export default PreferSystemLibs
