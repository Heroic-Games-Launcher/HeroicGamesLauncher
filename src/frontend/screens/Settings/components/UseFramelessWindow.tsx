import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import ContextProvider from 'frontend/state/ContextProvider'

const UseFramelessWindow = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [framelessWindow, setFramelessWindow] = useSetting(
    'framelessWindow',
    false
  )

  if (window.isSteamDeckGameMode) {
    return <></>
  }

  function toggleFramelessWindow() {
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
            onClick: () => setFramelessWindow(true)
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
