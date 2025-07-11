import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'
import InfoIcon from 'frontend/components/UI/InfoIcon'

const EscapeFlatpakSandbox = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [escapeFlatpakSandbox, setEscapeFlatpakSandbox] = useSetting(
    'escapeFlatpakSandbox',
    false
  )
  const [useGameMode] = useSetting('useGameMode', false)
  const [showMangohud] = useSetting('showMangohud', false)
  const [gamescope] = useSetting('gamescope', {
    enableUpscaling: false,
    enableLimiter: false,
    enableForceGrabCursor: false,
    windowType: 'fullscreen',
    gameWidth: '',
    gameHeight: '',
    upscaleHeight: '',
    upscaleWidth: '',
    upscaleMethod: 'fsr',
    fpsLimiter: '',
    fpsLimiterNoFocus: '',
    additionalOptions: ''
  })

  if (!window.isFlatpak) {
    return <></>
  }

  function handleEscapeFlatpakSandbox() {
    if (
      (!escapeFlatpakSandbox && useGameMode) ||
      (!escapeFlatpakSandbox && showMangohud) ||
      ((gamescope.enableLimiter || gamescope.enableUpscaling) &&
        !escapeFlatpakSandbox)
    ) {
      showDialogModal({
        showDialog: true,
        title: t(
          'settings.EscapeFlatpakSandbox.escapeSandboxEnabled.title',
          'MangoHud, Gamescope and/or GameMode enabled together with Escape Flatpak Sandbox'
        ),
        message: t(
          'settings.EscapeFlatpakSandbox.escapeSandboxEnabled.message',
          'Escaping the Flatpak Sandbox is incompatible with the Flatpak versions of MangoHud, Gamescope and GameMode. If you want to use that combination, install them natively and add them in the $PATH or as custom wrapper.'
        ),
        buttons: [{ text: t('box.ok') }]
      })
    }
    setEscapeFlatpakSandbox(!escapeFlatpakSandbox)
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="escapeflatpaksandbox"
        value={escapeFlatpakSandbox}
        handleChange={handleEscapeFlatpakSandbox}
        title={t('setting.escapeFlatpakSandbox', 'Escape the Flatpak Sandbox')}
      />

      <InfoIcon
        text={t(
          'help.EscapeFlatpakSandbox',
          'Enabling this option makes Games escape the Flatpak sandbox, which mainly allows better integration with Steam, but may also cause problems. You will have to allow Heroic to talk to "org.freedesktop.Flatpak" on the session bus manually (in Flatseal or the KDE-Systemsettings).'
        )}
      />
    </div>
  )
}

export default EscapeFlatpakSandbox
