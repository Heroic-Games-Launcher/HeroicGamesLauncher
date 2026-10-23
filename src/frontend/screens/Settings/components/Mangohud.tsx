import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const Mangohud = () => {
  const { t } = useTranslation()
  const { platform } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [showMangohud, setShowMangohud] = useSetting('showMangohud', false)

  if (!isLinux) {
    return <></>
  }

  return (
    <ToggleSwitch
      info={t(
        'help.mangohud',
        'MangoHUD is an overlay that displays and monitors FPS, temperatures, CPU/GPU load and other system resources.'
      )}
      description={t(
        'setting.mangohud.description',
        'Show an overlay with frame rate, temperatures and system load'
      )}
      htmlId="mongohud"
      value={showMangohud}
      handleChange={() => setShowMangohud(!showMangohud)}
      title={t('setting.mangohud')}
    />
  )
}

export default Mangohud
