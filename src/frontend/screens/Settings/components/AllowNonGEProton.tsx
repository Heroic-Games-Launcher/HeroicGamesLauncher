import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

const AllowNonGEProton = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [allowNonGEProton, setAllowNonGEProton] = useSetting(
    'allowNonGEProton',
    false
  )

  const toggleConfig = () => {
    if (allowNonGEProton) {
      setAllowNonGEProton(false)
    } else {
      showDialogModal({
        title: t(
          'setting.allow_non_ge_proton.confirmation.title',
          'Are you sure?'
        ),
        message: t(
          'setting.allow_non_ge_proton.confirmation.message',
          'We recommend GE-Proton to be used with Heroic because non-GE Proton builds lack winetricks and protofixes. You can still use then if you want.'
        ),
        buttons: [
          {
            text: t(
              'setting.allow_non_ge_proton.confirmation.show',
              'I understand, show them'
            ),
            onClick: () => setAllowNonGEProton(true)
          },
          {
            text: t(
              'setting.allow_non_ge_proton.confirmation.dont_show',
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
        htmlId="allowNonGEProton"
        value={allowNonGEProton}
        handleChange={() => toggleConfig()}
        title={t(
          'setting.allow_non_ge_proton.label',
          'Allow using non-GE Proton builds to run games'
        )}
      />
    </div>
  )
}

export default AllowNonGEProton
