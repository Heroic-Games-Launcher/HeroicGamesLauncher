import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const PreferSystemLibs = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isWin = platform === 'win32'
  const [
    preferSystemLibs,
    setPreferSystemLibs,
    systemLibsConfigFetched,
    isSetToDefault,
    resetToDefaultValue
  ] = useSharedConfig('preferSystemLibraries')
  const [wineVersion, , wineVersionFetched] = useSharedConfig('wineVersion')

  if (!systemLibsConfigFetched || !wineVersionFetched) return <></>

  const isSystemWine = wineVersion.bin.startsWith('/usr')
  const isProton = wineVersion.type === 'proton'
  const isCrossOver = wineVersion.type === 'crossover'
  const shouldNotRender = isProton || isWin || isCrossOver || isSystemWine

  if (shouldNotRender) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="systemLibsToggle"
        value={preferSystemLibs || false}
        handleChange={async () => setPreferSystemLibs(!preferSystemLibs)}
        title={t('setting.preferSystemLibs', 'Prefer system libraries')}
        isSetToDefaultValue={isSetToDefault}
        resetToDefaultValue={resetToDefaultValue}
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
