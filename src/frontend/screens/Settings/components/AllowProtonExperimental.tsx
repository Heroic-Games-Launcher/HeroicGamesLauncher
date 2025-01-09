import React, { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import useSetting from 'frontend/hooks/useSetting'
import { ToggleSwitch } from 'frontend/components/UI'
import ContextProvider from 'frontend/state/ContextProvider'

const AllowProtonExperimental = () => {
  const { t } = useTranslation()
  const { showDialogModal } = useContext(ContextProvider)
  const [allowProtonExperimental, setAllowProtonExperimental] = useSetting(
    'allowProtonExperimental',
    false
  )

  const toggleConfig = () => {
    if (allowProtonExperimental) {
      setAllowProtonExperimental(false)
    } else {
      showDialogModal({
        title: t(
          'setting.allow_proton_experimental.confirmation.title',
          'Are you sure?'
        ),
        message: t(
          'setting.allow_proton_experimental.confirmation.message',
          "'Proton - Experimental' is, by nature, meant for experimentation and not for stable use. Using it as a default for all games can unexpectedly break games previously working during an upgrade. Use it only if you know what you are doing."
        ),
        buttons: [
          {
            text: t(
              'setting.allow_proton_experimental.confirmation.understand',
              'I understand, allow it'
            ),
            onClick: () => setAllowProtonExperimental(true)
          },
          {
            text: t(
              'setting.allow_proton_experimental.confirmation.understand',
              "Don't allow it"
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
        htmlId="allowProtonExperimental"
        value={allowProtonExperimental}
        handleChange={() => toggleConfig()}
        title={t(
          'setting.allow_proton_experimental.label',
          'Allow using "Proton - Experimental" to run games'
        )}
      />
    </div>
  )
}

export default AllowProtonExperimental
