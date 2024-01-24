import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import { useGlobalConfig } from 'frontend/hooks/config'
import ContextProvider from 'frontend/state/ContextProvider'

const UseFramelessWindow = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [framelessWindow, setFramelessWindow] =
    useGlobalConfig('framelessWindow')

  if (window.isSteamDeckGameMode) {
    return <></>
  }

  async function toggleFramelessWindow() {
    if (!framelessWindow) {
      showDialogModal({
        title: t(
          'setting.frameless-window.confirmation.title',
          'Experimental feature ahead'
        ),
        message: t(
          'setting.frameless-window.confirmation.message',
          'This feature is still experimental. Please report any issues you encounter with it on GitHub.'
        ),
        buttons: [
          {
            text: t('box.ok'),
            onClick: async () => setFramelessWindow(true)
          },
          {
            text: t('button.cancel')
          }
        ],
        type: 'MESSAGE'
      })
      return
    }
    setFramelessWindow(!framelessWindow)
  }

  return (
    <ToggleSwitch
      htmlId="framelessWindow"
      value={framelessWindow}
      handleChange={toggleFramelessWindow}
      title={t(
        'setting.frameless-window.description',
        'Use frameless window (requires restart)'
      )}
    />
  )
}

export default UseFramelessWindow
