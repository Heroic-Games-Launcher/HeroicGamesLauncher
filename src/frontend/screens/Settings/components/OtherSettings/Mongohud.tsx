import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const Mongohud = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [showMangohud, setShowMangohud] = useSetting<boolean>(
    'showMangohud',
    false
  )

  if (!isLinux) {
    return <></>
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="mongohud"
        value={showMangohud}
        handleChange={() => setShowMangohud(!showMangohud)}
        title={t('setting.mangohud')}
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

export default Mongohud
