import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useSharedConfig } from 'frontend/hooks/config'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const Mangohud = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [
    showMangohud,
    setShowMangohud,
    ,
    isSetToDefaultValue,
    resetToDefaultValue
  ] = useSharedConfig('showMangohud')

  if (!isLinux) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="mongohud"
        value={showMangohud}
        handleChange={async () => setShowMangohud(!showMangohud)}
        title={t('setting.mangohud')}
        isSetToDefaultValue={isSetToDefaultValue}
        resetToDefaultValue={resetToDefaultValue}
      />

      <FontAwesomeIcon
        className="helpIcon"
        icon={faCircleInfo}
        title={t(
          'help.mangohud',
          'MangoHUD is an overlay that displays and monitors FPS, temperatures, CPU/GPU load and other system resources.'
        )}
      />
    </div>
  )
}

export default Mangohud
