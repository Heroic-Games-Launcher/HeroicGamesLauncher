import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'

const Mangohud = () => {
  const { t } = useTranslation()
  const [showMangohud, setShowMangohud] = useSetting('showMangohud', false)

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

export default Mangohud
