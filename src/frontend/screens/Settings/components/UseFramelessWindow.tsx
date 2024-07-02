import React from 'react'
import { useTranslation } from 'react-i18next'
import { ToggleSwitch } from 'frontend/components/UI'
import useSetting from 'frontend/hooks/useSetting'
import { useGlobalState } from 'frontend/state/GlobalStateV2'
import { DialogModalOptions } from 'frontend/types'

const UseFramelessWindow = () => {
  const { t } = useTranslation()
  const [framelessWindow, setFramelessWindow] = useSetting(
    'framelessWindow',
    false
  )

  if (window.isSteamDeckGameMode) {
    return <></>
  }

  async function toggleFramelessWindow() {
    if (!framelessWindow) {
      const experimentalWarning: DialogModalOptions = {
        showDialog: true,
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
      }
      useGlobalState.setState({ dialogModalOptions: experimentalWarning })
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
