import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

const ShowValveProton = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [showValveProton, setShowValveProton] = useSetting(
    'showValveProton',
    false
  )

  const toggleConfig = () => {
    if (showValveProton) {
      setShowValveProton(false)
    } else {
      showDialogModal({
        title: t(
          'setting.show_valve_proton.confirmation.title',
          'Are you sure?'
        ),
        message: t(
          'setting.show_valve_proton.confirmation.message',
          "We recommend custom Proton forks (GE-Proton, Proton-CachyOS, etc.) to be used with Heroic because Valve's Proton builds lack winetricks and protofixes. You can still use then if you want."
        ),
        buttons: [
          {
            text: t(
              'setting.show_valve_proton.confirmation.show',
              'I understand, show them'
            ),
            onClick: () => setShowValveProton(true)
          },
          {
            text: t(
              'setting.show_valve_proton.confirmation.dont_show',
              "Don't show them"
            )
          }
        ],
        type: 'MESSAGE'
      })
    }
  }

  return (
    <div className="toggleRow">
      <ToggleSwitch
        htmlId="showValveProton"
        value={showValveProton}
        handleChange={() => toggleConfig()}
        title={t(
          'setting.show_valve_proton.label',
          'Allow using Valve Proton builds to run games'
        )}
      />
    </div>
  )
}

export default ShowValveProton
