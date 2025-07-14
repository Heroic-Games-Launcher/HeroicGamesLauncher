import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const Mangohud = () => {
  const { t } = useTranslation()
  const { platform, showDialogModal } = useContext(ContextProvider)
  const isLinux = platform === 'linux'
  const [showMangohud, setShowMangohud] = useSetting('showMangohud', false)
  const [escapeFlatpakSandbox] = useSetting('escapeFlatpakSandbox', false)

  if (!isLinux) {
    return <></>
  }

  function handleShowMangohud() {
    if (!showMangohud && escapeFlatpakSandbox && window.isFlatpak) {
      showDialogModal({
        showDialog: true,
        title: t('settings.EscapeFlatpakSandbox.escapeSandboxEnabled.title'),
        message: t(
          'settings.EscapeFlatpakSandbox.escapeSandboxEnabled.message'
        ),
        buttons: [{ text: t('box.ok') }]
      })
    }
    setShowMangohud(!showMangohud)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="mongohud"
        value={showMangohud}
        handleChange={handleShowMangohud}
        title={t('setting.mangohud')}
      />

      <InfoIcon
        text={t(
          'help.mangohud',
          'MangoHUD is an overlay that displays and monitors FPS, temperatures, CPU/GPU load and other system resources.'
        )}
      />
    </div>
  )
}

export default Mangohud
